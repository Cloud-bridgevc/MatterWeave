// EventBridge schedule (daily). Identifies documents eligible for disposition
// under each tenant's retention policy. It never deletes on its own when the
// policy requires approval: it opens a disposition review task instead.
// Matters under legal hold are always skipped, and S3 Object Lock / lifecycle
// rules on held prefixes are suspended by a separate legal-hold handler.
import { audit } from '../shared/audit.js';
import { withTenant } from '../shared/db.js';

export const handler = async () => {
  const tenants = (process.env.TENANT_IDS ?? '').split(',').filter(Boolean); // production: read from a tenant registry table via a privileged role
  for (const tenantId of tenants) {
    await withTenant({ tenantId, userId: process.env.SYSTEM_USER_ID! }, async (c) => {
      const due = await c.query(
        `SELECT m.id AS matter_id, m.number, rp.requires_approval, m.lead_user_id
           FROM matters m JOIN retention_policies rp ON rp.id = m.retention_policy_id
          WHERE m.status = 'closed' AND NOT m.legal_hold AND NOT rp.is_legal_hold
            AND m.closed_on + make_interval(years => rp.retain_years) <= current_date`,
      );
      for (const row of due.rows) {
        await c.query(
          `INSERT INTO tasks (tenant_id, matter_id, title, assignee_id, status, created_by)
           SELECT current_tenant(), $1, 'Disposition review: retention period elapsed', $2, 'todo', current_app_user()
           WHERE NOT EXISTS (SELECT 1 FROM tasks WHERE matter_id = $1 AND title LIKE 'Disposition review%' AND status <> 'done')`,
          [row.matter_id, row.lead_user_id],
        );
        await audit(c, { action: 'retention.disposition_review_opened', actorType: 'system', targetType: 'matter', targetId: row.matter_id, matterId: row.matter_id });
      }
    });
  }
};
