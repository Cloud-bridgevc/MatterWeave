import pg from 'pg';
import { getSecretJson } from './secrets.js';

let pool: pg.Pool | undefined;

async function getPool(): Promise<pg.Pool> {
  if (pool) return pool;
  const creds = await getSecretJson<{ host: string; port: number; username: string; password: string; dbname: string }>(process.env.DB_SECRET_ARN!);
  pool = new pg.Pool({
    host: creds.host,
    port: creds.port,
    user: creds.username,
    password: creds.password,
    database: creds.dbname,
    max: 2,
    ssl: { rejectUnauthorized: true }, // RDS CA bundle is baked into the Lambda layer
  });
  return pool;
}

export interface TenantContext {
  tenantId: string;
  userId: string;
  requestId?: string;
}

/**
 * Run `fn` in a transaction scoped to one tenant and one user. Row-level
 * security policies read these settings, so a query can never see another
 * tenant's rows even if a WHERE clause is forgotten.
 */
export async function withTenant<T>(ctx: TenantContext, fn: (c: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await (await getPool()).connect();
  try {
    await client.query('BEGIN');
    await client.query(`SELECT set_config('app.tenant_id', $1, true), set_config('app.user_id', $2, true)`, [ctx.tenantId, ctx.userId]);
    const out = await fn(client);
    await client.query('COMMIT');
    return out;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}
