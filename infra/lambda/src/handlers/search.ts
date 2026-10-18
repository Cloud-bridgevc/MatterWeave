// POST /search  { question, matterId? }
// Retrieval-augmented answers over passages the caller may see. RLS restricts
// retrieval to the caller's tenant and matter teams before anything reaches
// the model, so the model can never be shown an unauthorized passage.
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from 'aws-lambda';
import { z } from 'zod';
import { audit } from '../shared/audit.js';
import { json, tenantContext } from '../shared/auth.js';
import { answerFromPassages } from '../shared/bedrock.js';
import { withTenant } from '../shared/db.js';

const Body = z.object({ question: z.string().min(3).max(1000), matterId: z.string().uuid().optional() });

export const handler = async (event: APIGatewayProxyEventV2WithJWTAuthorizer) => {
  const ctx = tenantContext(event);
  const parsed = Body.safeParse(JSON.parse(event.body ?? '{}'));
  if (!parsed.success) return json(400, { error: 'invalid_request' });
  const { question, matterId } = parsed.data;

  const passages = await withTenant(ctx, async (c) => {
    const viewer = await c.query(`SELECT role FROM users WHERE id = current_app_user()`);
    if (viewer.rows[0]?.role === 'viewer') return [];
    // Lexical retrieval (tsvector). Production adds pgvector similarity and
    // reciprocal-rank fusion; privileged docs are included only for staffed users (RLS).
    const r = await c.query(
      `SELECT p.document_id || ':' || p.ordinal AS id, d.title AS doc_title, d.matter_id, p.text,
              ts_rank_cd(p.tsv, websearch_to_tsquery('english', $1)) AS score
         FROM document_passages p JOIN documents d ON d.id = p.document_id
        WHERE d.deleted_at IS NULL
          AND ($2::uuid IS NULL OR d.matter_id = $2)
          AND p.tsv @@ websearch_to_tsquery('english', $1)
        ORDER BY score DESC LIMIT 8`,
      [question, matterId ?? null],
    );
    await audit(c, { action: 'ai.search', targetType: 'query', targetId: 'search', matterId, detail: { question, retrieved: r.rowCount }, requestId: ctx.requestId });
    return r.rows as { id: string; doc_title: string; matter_id: string; text: string; score: number }[];
  });

  if (!passages.length) {
    return json(200, { supported: false, answer: [], passages: [], note: 'No passage in your authorized documents matched this question.' });
  }
  const result = await answerFromPassages(question, passages.map((p) => ({ id: p.id, docTitle: p.doc_title, text: p.text })));
  return json(200, {
    ...result,
    passages: passages.map((p) => ({ id: p.id, documentTitle: p.doc_title, text: p.text, score: p.score })),
    disclaimer: 'AI-assisted answer grounded in the cited passages. Not legal advice; review sources before relying on it.',
  });
};
