// SQS consumer: S3 ObjectCreated → extract text → paragraphs → Bedrock analysis
// → store summary/entities and *candidate* deadlines for human review.
//
// Runs as `mw_worker`. Tenant context is taken from the S3 object's metadata
// written at presign time and cross-checked against the key prefix and the
// documents row, so a forged message cannot cross tenants.
import { GetObjectCommand, HeadObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { StartDocumentTextDetectionCommand, TextractClient } from '@aws-sdk/client-textract';
import type { S3Event, SQSBatchResponse, SQSEvent } from 'aws-lambda';
import { audit } from '../shared/audit.js';
import { analyzeDocument, MODEL_ID, PROMPT_VERSION } from '../shared/bedrock.js';
import { withTenant } from '../shared/db.js';

const s3 = new S3Client({});
const textract = new TextractClient({});
const SYSTEM_USER = process.env.SYSTEM_USER_ID!; // per-tenant "MatterWeave Processing" service user is resolved below

export const handler = async (event: SQSEvent): Promise<SQSBatchResponse> => {
  const failures: { itemIdentifier: string }[] = [];
  for (const record of event.Records) {
    try {
      const s3evt = JSON.parse(record.body) as S3Event;
      for (const r of s3evt.Records ?? []) await processObject(r.s3.bucket.name, decodeURIComponent(r.s3.object.key.replace(/\+/g, ' ')));
    } catch (e) {
      console.error('process-document failed', { messageId: record.messageId, error: (e as Error).message });
      failures.push({ itemIdentifier: record.messageId }); // retried, then DLQ
    }
  }
  return { batchItemFailures: failures };
};

async function processObject(bucket: string, key: string) {
  const head = await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
  const tenantId = head.Metadata?.['tenant-id'];
  const docId = head.Metadata?.['document-id'];
  if (!tenantId || !docId || !key.startsWith(`tenants/${tenantId}/`)) throw new Error('Object metadata does not match tenant prefix');

  const ctx = { tenantId, userId: SYSTEM_USER };

  const doc = await withTenant(ctx, async (c) => {
    const d = await c.query(`UPDATE documents SET status = 'processing' WHERE id = $1 AND s3_key = $2 RETURNING id, matter_id, title, doc_type`, [docId, key]);
    if (!d.rowCount) throw new Error('Document row not found for object');
    return d.rows[0] as { id: string; matter_id: string; title: string; doc_type: string };
  });

  let text: string;
  if (head.ContentType === 'application/pdf') {
    // Scans and PDFs go through Textract asynchronously; its SNS completion
    // notification re-enters this function via the `textract-complete` handler.
    await textract.send(new StartDocumentTextDetectionCommand({
      DocumentLocation: { S3Object: { Bucket: bucket, Name: key } },
      NotificationChannel: { SNSTopicArn: process.env.TEXTRACT_TOPIC_ARN!, RoleArn: process.env.TEXTRACT_ROLE_ARN! },
      JobTag: docId,
    }));
    return;
  } else {
    const obj = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    text = await obj.Body!.transformToString('utf-8'); // DOCX is converted to text by a layer (mammoth) before this point in production
  }
  await analyzeAndStore(ctx, doc, text);
}

export async function analyzeAndStore(
  ctx: { tenantId: string; userId: string },
  doc: { id: string; matter_id: string; title: string; doc_type: string },
  text: string,
) {
  const paragraphs = text.split(/\n\s*\n/).map((p) => p.replace(/\s+/g, ' ').trim()).filter(Boolean);

  // 1) Persist passages (used for citations and retrieval) and open an ai_run.
  const runId = await withTenant(ctx, async (c) => {
    await c.query(`DELETE FROM document_passages WHERE document_id = $1`, [doc.id]);
    for (let i = 0; i < paragraphs.length; i++) {
      await c.query(`INSERT INTO document_passages (tenant_id, document_id, ordinal, text) VALUES (current_tenant(), $1, $2, $3)`, [doc.id, i, paragraphs[i]]);
    }
    const r = await c.query(
      `INSERT INTO ai_runs (tenant_id, document_id, matter_id, kind, model_id, prompt_version, status, requested_by)
       VALUES (current_tenant(), $1, $2, 'analyze', $3, $4, 'running', current_app_user()) RETURNING id`,
      [doc.id, doc.matter_id, MODEL_ID, PROMPT_VERSION],
    );
    return r.rows[0].id as string;
  });

  // 2) Call Bedrock outside the DB transaction.
  const result = await analyzeDocument(doc.title, doc.doc_type, paragraphs);

  // 3) Store results. Dates are inserted with status='candidate' only.
  await withTenant(ctx, async (c) => {
    if (!result.ok) {
      await c.query(`UPDATE ai_runs SET status = $2, completed_at = now() WHERE id = $1`, [runId, `failed:${result.reason}`]);
      await c.query(`UPDATE documents SET status = 'failed' WHERE id = $1`, [doc.id]);
      await audit(c, { action: 'ai.analyze_document', actorType: 'ai', targetType: 'document', targetId: doc.id, matterId: doc.matter_id, detail: { ok: false, reason: result.reason } });
      return;
    }
    const a = result.analysis;
    await c.query(
      `INSERT INTO document_analyses (document_id, tenant_id, ai_run_id, summary, entities, key_passages)
       VALUES ($1, current_tenant(), $2, $3, $4, $5)
       ON CONFLICT (document_id) DO UPDATE SET ai_run_id = EXCLUDED.ai_run_id, summary = EXCLUDED.summary, entities = EXCLUDED.entities, key_passages = EXCLUDED.key_passages, created_at = now()`,
      [doc.id, runId, JSON.stringify(a.summary), JSON.stringify(a.entities), JSON.stringify(a.key_passages)],
    );
    let inserted = 0;
    for (const d of a.candidate_dates) {
      const r = await c.query(
        `INSERT INTO deadlines (tenant_id, matter_id, title, due_date, basis, computation, confidence, source_document_id, source_ordinal, status, created_by_ai_run)
         SELECT current_tenant(), $1, $2, $3::date, $4, $5, $6, $7, $8, 'candidate', $9
         WHERE NOT EXISTS (SELECT 1 FROM deadlines WHERE matter_id = $1 AND due_date = $3::date AND source_document_id = $7 AND source_ordinal = $8)`,
        [doc.matter_id, d.title, d.date, d.basis, d.computation, d.confidence, doc.id, d.paragraph, runId],
      );
      inserted += r.rowCount ?? 0;
    }
    await c.query(`UPDATE ai_runs SET status = 'succeeded', completed_at = now(), input_tokens = $2, output_tokens = $3 WHERE id = $1`, [runId, result.usage.input_tokens, result.usage.output_tokens]);
    await c.query(`UPDATE documents SET status = 'analyzed' WHERE id = $1`, [doc.id]);
    await audit(c, {
      action: 'ai.analyze_document', actorType: 'ai', targetType: 'document', targetId: doc.id, matterId: doc.matter_id,
      detail: { ok: true, model: MODEL_ID, promptVersion: PROMPT_VERSION, summaryPoints: a.summary.length, entities: a.entities.length, newCandidateDates: inserted },
    });
  });
}
