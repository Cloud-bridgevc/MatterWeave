// POST /matters/{matterId}/documents/upload-url
// Issues a short-lived, single-object presigned PUT into the caller's tenant
// prefix, encrypted with the tenant's KMS key. The browser uploads directly
// to S3; an S3 ObjectCreated event then queues processing.
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from 'aws-lambda';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { audit } from '../shared/audit.js';
import { json, tenantContext } from '../shared/auth.js';
import { withTenant } from '../shared/db.js';

const s3 = new S3Client({});
const ALLOWED = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];

const Body = z.object({
  title: z.string().min(1).max(300),
  docType: z.string().min(1).max(60),
  documentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  contentType: z.enum(ALLOWED as [string, ...string[]]),
  sizeBytes: z.number().int().positive().max(200 * 1024 * 1024),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  privileged: z.boolean().default(false),
});

export const handler = async (event: APIGatewayProxyEventV2WithJWTAuthorizer) => {
  const ctx = tenantContext(event);
  const matterId = event.pathParameters?.matterId ?? '';
  const parsed = Body.safeParse(JSON.parse(event.body ?? '{}'));
  if (!parsed.success) return json(400, { error: 'invalid_request', issues: parsed.error.issues });
  const b = parsed.data;

  return withTenant(ctx, async (c) => {
    // RLS hides matters the user is not staffed on, so this also enforces the ethical wall.
    const m = await c.query(`SELECT m.id, t.kms_key_arn, t.s3_prefix FROM matters m JOIN tenants t ON t.id = m.tenant_id WHERE m.id = $1`, [matterId]);
    if (!m.rowCount) return json(404, { error: 'not_found' });
    const role = await c.query(`SELECT role FROM users WHERE id = current_app_user()`);
    if (!['partner', 'associate', 'paralegal'].includes(role.rows[0]?.role)) return json(403, { error: 'forbidden' });

    const docId = randomUUID();
    const key = `${m.rows[0].s3_prefix}matters/${matterId}/docs/${docId}/v1`;
    await c.query(
      `INSERT INTO documents (id, tenant_id, matter_id, title, doc_type, document_date, s3_key, sha256, size_bytes, privileged, uploaded_by)
       VALUES ($1, current_tenant(), $2, $3, $4, $5, $6, $7, $8, $9, current_app_user())`,
      [docId, matterId, b.title, b.docType, b.documentDate ?? null, key, b.sha256, b.sizeBytes, b.privileged],
    );
    await audit(c, { action: 'document.upload_requested', targetType: 'document', targetId: docId, matterId, detail: { docType: b.docType, sizeBytes: b.sizeBytes }, requestId: ctx.requestId });

    const url = await getSignedUrl(
      s3,
      new PutObjectCommand({
        Bucket: process.env.DOCUMENT_BUCKET!,
        Key: key,
        ContentType: b.contentType,
        ContentLength: b.sizeBytes,
        ChecksumSHA256: Buffer.from(b.sha256, 'hex').toString('base64'),
        ServerSideEncryption: 'aws:kms',
        SSEKMSKeyId: m.rows[0].kms_key_arn,
        Metadata: { 'tenant-id': ctx.tenantId, 'matter-id': matterId, 'document-id': docId },
      }),
      { expiresIn: 300 },
    );
    return json(200, { documentId: docId, uploadUrl: url, expiresInSeconds: 300 });
  });
};
