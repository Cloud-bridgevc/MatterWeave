import type { Matter, Role, User } from '../types';

// Role-based capabilities. Matter-level access is additionally restricted to the
// matter team (ethical walls) — enforced server-side by PostgreSQL row-level
// security in production (see infra/db/schema.sql).
const CAPS: Record<Role, Set<string>> = {
  partner: new Set(['matter.create', 'matter.assign', 'document.upload', 'ai.run', 'deadline.verify', 'task.write', 'task.approve', 'comm.write', 'billing.edit', 'audit.read']),
  associate: new Set(['document.upload', 'ai.run', 'deadline.verify', 'task.write', 'task.approve', 'comm.write', 'audit.read']),
  paralegal: new Set(['document.upload', 'ai.run', 'deadline.verify', 'task.write', 'comm.write']),
  legal_ops: new Set(['matter.create', 'matter.assign', 'task.write', 'billing.edit', 'audit.read']),
  viewer: new Set([]),
};

export type Capability =
  | 'matter.create' | 'matter.assign' | 'document.upload' | 'ai.run' | 'deadline.verify'
  | 'task.write' | 'task.approve' | 'comm.write' | 'billing.edit' | 'audit.read';

export function can(user: User, cap: Capability): boolean {
  return CAPS[user.role].has(cap);
}

/** Legal ops and viewers (billing) see matters firm-wide for coordination; legal staff only see their team's matters. */
export function canSeeMatter(user: User, matter: Matter): boolean {
  if (user.role === 'legal_ops' || user.role === 'viewer') return true;
  return matter.teamIds.includes(user.id);
}

export const ROLE_LABEL: Record<Role, string> = {
  partner: 'Partner',
  associate: 'Attorney',
  paralegal: 'Paralegal',
  legal_ops: 'Legal Ops',
  viewer: 'Read-only',
};
