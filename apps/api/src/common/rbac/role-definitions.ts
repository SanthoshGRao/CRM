/**
 * Single source of truth for what a client workspace can do.
 *
 * `PERMISSION_CATALOGUE` is the full set of permission rows (global, shared by
 * every tenant). `ROLE_DEFINITIONS` maps each seeded role to the permissions it
 * holds and how much data it can see. Both the provisioning path and the
 * backfill script read from here, so roles can never drift between tenants.
 */

export type DataScope = 'OWN' | 'TEAM' | 'DEPARTMENT' | 'COMPANY' | 'ALL';

export interface PermissionSpec {
  resource: string;
  actions: string[];
  description: string;
}

export const PERMISSION_CATALOGUE: PermissionSpec[] = [
  { resource: 'contacts', actions: ['view', 'create', 'update', 'delete'], description: 'Contact records' },
  { resource: 'companies', actions: ['view', 'create', 'update', 'delete'], description: 'Company records' },
  { resource: 'leads', actions: ['view', 'create', 'update', 'delete'], description: 'Lead records' },
  { resource: 'deals', actions: ['view', 'create', 'update', 'delete'], description: 'Deal records' },
  { resource: 'tasks', actions: ['view', 'create', 'update', 'delete'], description: 'Tasks' },
  { resource: 'activities', actions: ['view', 'create'], description: 'Logged calls, notes and meetings' },
  { resource: 'pipelines', actions: ['view', 'create', 'update', 'delete'], description: 'Pipelines and stages' },
  { resource: 'custom_fields', actions: ['view', 'create', 'update', 'delete'], description: 'Custom fields (columns)' },
  { resource: 'reports', actions: ['view', 'create'], description: 'Reports and dashboards' },
  { resource: 'users', actions: ['view', 'create', 'update', 'delete'], description: 'Team members' },
  { resource: 'teams', actions: ['view', 'create', 'update', 'delete'], description: 'Groups for organizing team members, e.g. "Sales Team"' },
  { resource: 'roles', actions: ['view', 'create', 'update', 'delete'], description: 'Roles and access' },
  { resource: 'settings', actions: ['view', 'update'], description: 'Workspace settings' },
  { resource: 'api_keys', actions: ['view', 'create', 'delete'], description: 'API keys for integrations' },
  { resource: 'billing', actions: ['view', 'manage'], description: 'Plan, subscription and payments' },
];

/** Every permission string, e.g. "leads.create". */
export const ALL_PERMISSIONS: string[] = PERMISSION_CATALOGUE.flatMap((p) =>
  p.actions.map((a) => `${p.resource}.${a}`),
);

const CRM_RESOURCES = ['contacts', 'companies', 'leads', 'deals', 'tasks'];

const expand = (resources: string[], actions: string[]) =>
  resources.flatMap((r) => actions.map((a) => `${r}.${a}`));

export interface RoleDefinition {
  name: string;
  description: string;
  dataScope: DataScope;
  /** Ordered for display; lower rank = more powerful. */
  rank: number;
  permissions: string[];
}

export const ROLE_DEFINITIONS: RoleDefinition[] = [
  {
    name: 'Owner',
    description: 'Full control of the workspace, including roles and API keys.',
    dataScope: 'COMPANY',
    rank: 1,
    permissions: ALL_PERMISSIONS,
  },
  {
    name: 'Developer',
    description: 'Runs the workspace day to day and can issue API keys for integrations. Cannot manage team members or change roles.',
    dataScope: 'COMPANY',
    rank: 2,
    permissions: [
      ...expand(CRM_RESOURCES, ['view', 'create', 'update', 'delete']),
      'activities.view', 'activities.create',
      'pipelines.view', 'pipelines.create', 'pipelines.update', 'pipelines.delete',
      'custom_fields.view', 'custom_fields.create', 'custom_fields.update', 'custom_fields.delete',
      'reports.view', 'reports.create',
      'users.view',
      'teams.view',
      'roles.view',
      'settings.view', 'settings.update',
      'api_keys.view', 'api_keys.create', 'api_keys.delete',
      'billing.view',
    ],
  },
  {
    name: 'Manager',
    description: 'Full access to all records and reports. No team or workspace administration.',
    dataScope: 'COMPANY',
    rank: 3,
    permissions: [
      ...expand(CRM_RESOURCES, ['view', 'create', 'update', 'delete']),
      'activities.view', 'activities.create',
      'pipelines.view',
      'custom_fields.view',
      'reports.view', 'reports.create',
      'users.view',
      'teams.view',
      'roles.view',
      'settings.view',
      'billing.view',
    ],
  },
  {
    name: 'Sales Rep',
    description: 'Works their own pipeline. Sees only records they own and cannot delete.',
    dataScope: 'OWN',
    rank: 4,
    permissions: [
      ...expand(CRM_RESOURCES, ['view', 'create', 'update']),
      'activities.view', 'activities.create',
      'pipelines.view',
      'custom_fields.view',
      'settings.view',
      'billing.view',
    ],
  },
  {
    name: 'Viewer',
    description: 'Read-only access across the workspace.',
    dataScope: 'COMPANY',
    rank: 5,
    permissions: [
      ...expand(CRM_RESOURCES, ['view']),
      'activities.view',
      'pipelines.view',
      'custom_fields.view',
      'reports.view',
      'settings.view',
      'billing.view',
    ],
  },
];

export const DEFAULT_ROLE_NAME = 'Sales Rep';
export const OWNER_ROLE_NAME = 'Owner';

export function getRoleDefinition(name: string): RoleDefinition | undefined {
  return ROLE_DEFINITIONS.find((r) => r.name.toLowerCase() === name.toLowerCase());
}

/** Lower is more powerful. Roles a workspace added itself sort last. */
export function roleRank(name: string): number {
  return getRoleDefinition(name)?.rank ?? ROLE_DEFINITIONS.length + 1;
}

/** Most-powerful first, so role pickers read Owner → Admin → … → Viewer. */
export function sortRolesByRank<T extends { name: string }>(roles: T[]): T[] {
  return [...roles].sort(
    (a, b) => roleRank(a.name) - roleRank(b.name) || a.name.localeCompare(b.name),
  );
}

/** Broadest scope wins when a user holds more than one role. */
const SCOPE_RANK: Record<DataScope, number> = {
  OWN: 1, TEAM: 2, DEPARTMENT: 3, COMPANY: 4, ALL: 5,
};

export function broadestScope(scopes: DataScope[]): DataScope {
  if (scopes.length === 0) return 'OWN';
  return scopes.reduce((best, s) => (SCOPE_RANK[s] > SCOPE_RANK[best] ? s : best), scopes[0]);
}
