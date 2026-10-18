// POST /deadlines/{id}/decision  { decision: 'verify'|'reject', note, date?, title?, attest: true }
// The only path by which an AI candidate becomes a docketed deadline. The DB
// trigger enforces role and stamps verified_by/verified_at; this handler adds
// input validation, attestation and audit.
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from 'aws-lambda';
import { z } from 'zod';
import { audit } from '../shared/audit.js';
import { json, tenantContext } from '../shared/auth.js';
import { withTenant } from '../shared/db.js';

const Body = z.discriminatedUnion('decision', [
  z.object({ decision: z.literal('verify'), note: z.string().min(5).max(2000), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), title: z.string().max(200).optional(), attest: z.literal(true) }),
  z.object({ decision: z.literal('reject'), note: z.string().min(3).max(2000) }),
]);

export const handler = async (event: APIGatewayProxyEventV2WithJWTAuthorizer) => {
  const ctx = tenantContext(event);
  const id = event.pathParameters?.id ?? '';
  const parsed = Body.safeParse(JSON.parse(event.body ?? '{}'));
  if (!parsed.success) return json(400, { error: 'invalid_request', issues: parsed.error.issues });
  const b = parsed.data;

  try {
    return await withTenant(ctx, async (c) => {
      const cur = await c.query(`SELECT matter_id, title, due_date::text AS due_date, status FROM deadlines WHERE id = $1 FOR UPDATE`, [id]);
      if (!cur.rowCount) return json(404, { error: 'not_found' });
      if (cur.rows[0].status !== 'candidate') return json(409, { error: 'already_decided' });

      if (b.decision === 'verify') {
        await c.query(
          `UPDATE deadlines SET status = 'verified', verification_note = $2, due_date = coalesce($3::date, due_date), title = coalesce($4, title) WHERE id = $1`,
          [id, b.note, b.date ?? null, b.title ?? null],
        );
      } else {
        await c.query(`UPDATE deadlines SET status = 'rejected', verification_note = $2 WHERE id = $1`, [id, b.note]);
      }
      await audit(c, {
        action: `deadline.${b.decision}`, targetType: 'deadline', targetId: id, matterId: cur.rows[0].matter_id, requestId: ctx.requestId,
        detail: { note: b.note, aiDate: cur.rows[0].due_date, ...(b.decision === 'verify' && b.date && b.date !== cur.rows[0].due_date ? { correctedDate: b.date } : {}) },
      });
      return json(200, { ok: true });
    });
  } catch (e) {
    if ((e as { code?: string }).code === '42501') return json(403, { error: 'role_not_permitted_to_verify' });
    throw e;
  }
};
