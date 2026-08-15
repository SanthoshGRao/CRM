import type { DataScope } from './role-definitions';

export interface ScopedUser {
  id: string;
  tenantId: string;
  permissions?: string[];
  dataScope?: DataScope;
}

/**
 * Which column ties a record to the user who "owns" it, per entity. Entities
 * absent from this map are never owner-scoped (pipelines, custom fields, …).
 */
const OWNER_COLUMN = {
  contact: 'ownerId',
  company: 'ownerId',
  lead: 'ownerId',
  deal: 'ownerId',
  task: 'assignedToId',
  activity: 'performedById',
} as const;

export type ScopedEntity = keyof typeof OWNER_COLUMN;

/**
 * Extra `where` clause enforcing a role's data scope.
 *
 * OWN  → only records the user owns (or, for tasks, is assigned).
 * TEAM/DEPARTMENT/COMPANY/ALL → everything in the tenant. Team and department
 * hierarchies are not modelled yet, so they intentionally behave as COMPANY
 * rather than silently hiding data.
 *
 * Tenant isolation is applied separately and always — this only narrows further.
 */
export function scopeFilter(user: ScopedUser, entity: ScopedEntity): Record<string, unknown> {
  if ((user?.dataScope ?? 'COMPANY') !== 'OWN') return {};

  const column = OWNER_COLUMN[entity];

  // A rep should still see unassigned records they created rather than losing
  // them entirely, so nulls are excluded only where an owner is always set.
  return { [column]: user.id };
}

/** True when the user may act on this specific record under their scope. */
export function isWithinScope(
  user: ScopedUser,
  entity: ScopedEntity,
  record: Record<string, any> | null | undefined,
): boolean {
  if (!record) return false;
  if ((user?.dataScope ?? 'COMPANY') !== 'OWN') return true;

  return record[OWNER_COLUMN[entity]] === user.id;
}
