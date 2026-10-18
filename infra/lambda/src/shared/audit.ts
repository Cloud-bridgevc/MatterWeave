import type pg from 'pg';

export interface AuditInput {
  action: string;
  targetType: string;
  targetId: string;
  matterId?: string;
  actorType?: 'user' | 'system' | 'ai';
  detail?: Record<string, unknown>;
  requestId?: string;
}

/** Append-only audit write; runs inside the caller's tenant-scoped transaction. */
export async function audit(c: pg.PoolClient, a: AuditInput): Promise<void> {
  await c.query(
    `INSERT INTO audit_events (tenant_id, actor_id, actor_type, matter_id, action, target_type, target_id, detail, request_id)
     VALUES (current_tenant(), current_app_user(), $1, $2, $3, $4, $5, $6, $7)`,
    [a.actorType ?? 'user', a.matterId ?? null, a.action, a.targetType, a.targetId, a.detail ? JSON.stringify(a.detail) : null, a.requestId ?? null],
  );
}
