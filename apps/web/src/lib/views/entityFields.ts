import type { SavedViewEntityType } from '@crm/types';

export type FieldValueType = 'string' | 'number' | 'date' | 'select' | 'record';

export interface EntityFieldOption {
  value: string;
  label: string;
}

export interface EntityFieldDef {
  key: string;
  label: string;
  type: FieldValueType;
  /** Static choices, for `select` fields. */
  options?: EntityFieldOption[];
  /** Which RecordSelect collection backs a `record` field. */
  recordSource?: 'users' | 'companies' | 'contacts';
  /** Whether this column is shown by default when a list has no saved view applied. */
  defaultColumn?: boolean;
}

const STATUS: Record<string, EntityFieldOption[]> = {
  contact: [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'blocked', label: 'Blocked' },
  ],
  company: [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
  ],
  lead: [
    { value: 'new', label: 'New' },
    { value: 'working', label: 'Working' },
    { value: 'qualified', label: 'Qualified' },
    { value: 'unqualified', label: 'Unqualified' },
    { value: 'converted', label: 'Converted' },
    { value: 'lost', label: 'Lost' },
  ],
  deal: [
    { value: 'open', label: 'Open' },
    { value: 'won', label: 'Won' },
    { value: 'lost', label: 'Lost' },
  ],
  task: [
    { value: 'pending', label: 'Pending' },
    { value: 'in_progress', label: 'In progress' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
  ],
};

const LEAD_SOURCE: EntityFieldOption[] = [
  { value: 'website', label: 'Website' },
  { value: 'referral', label: 'Referral' },
  { value: 'cold_call', label: 'Cold Call' },
  { value: 'email', label: 'Email' },
  { value: 'social', label: 'Social' },
  { value: 'advertisement', label: 'Ad' },
  { value: 'event', label: 'Event' },
  { value: 'other', label: 'Other' },
];

const TASK_PRIORITY: EntityFieldOption[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

export const ENTITY_FIELDS: Record<SavedViewEntityType, EntityFieldDef[]> = {
  deal: [
    { key: 'name', label: 'Name', type: 'string', defaultColumn: true },
    { key: 'companyId', label: 'Company', type: 'record', recordSource: 'companies', defaultColumn: true },
    { key: 'status', label: 'Status', type: 'select', options: STATUS.deal, defaultColumn: true },
    { key: 'value', label: 'Value', type: 'number', defaultColumn: true },
    { key: 'probability', label: 'Probability', type: 'number', defaultColumn: true },
    { key: 'ownerId', label: 'Owner', type: 'record', recordSource: 'users', defaultColumn: true },
    { key: 'contactId', label: 'Contact', type: 'record', recordSource: 'contacts' },
    { key: 'expectedCloseDate', label: 'Expected close', type: 'date', defaultColumn: true },
    { key: 'createdAt', label: 'Created', type: 'date' },
  ],
  lead: [
    { key: 'title', label: 'Title', type: 'string', defaultColumn: true },
    { key: 'contactId', label: 'Contact', type: 'record', recordSource: 'contacts', defaultColumn: true },
    { key: 'companyId', label: 'Company', type: 'record', recordSource: 'companies', defaultColumn: true },
    { key: 'status', label: 'Status', type: 'select', options: STATUS.lead, defaultColumn: true },
    { key: 'source', label: 'Source', type: 'select', options: LEAD_SOURCE, defaultColumn: true },
    { key: 'value', label: 'Value', type: 'number', defaultColumn: true },
    { key: 'ownerId', label: 'Owner', type: 'record', recordSource: 'users', defaultColumn: true },
    { key: 'expectedCloseDate', label: 'Expected close', type: 'date' },
    { key: 'createdAt', label: 'Created', type: 'date', defaultColumn: true },
  ],
  contact: [
    { key: 'firstName', label: 'First name', type: 'string' },
    { key: 'lastName', label: 'Last name', type: 'string' },
    { key: 'email', label: 'Email', type: 'string', defaultColumn: true },
    { key: 'phone', label: 'Phone', type: 'string', defaultColumn: true },
    { key: 'companyId', label: 'Company', type: 'record', recordSource: 'companies', defaultColumn: true },
    { key: 'ownerId', label: 'Owner', type: 'record', recordSource: 'users', defaultColumn: true },
    { key: 'status', label: 'Status', type: 'select', options: STATUS.contact, defaultColumn: true },
    { key: 'createdAt', label: 'Created', type: 'date', defaultColumn: true },
  ],
  company: [
    { key: 'name', label: 'Name', type: 'string', defaultColumn: true },
    { key: 'industry', label: 'Industry', type: 'string', defaultColumn: true },
    { key: 'website', label: 'Website', type: 'string' },
    { key: 'phone', label: 'Phone', type: 'string', defaultColumn: true },
    { key: 'city', label: 'City', type: 'string' },
    { key: 'country', label: 'Country', type: 'string' },
    { key: 'employees', label: 'Employees', type: 'number', defaultColumn: true },
    { key: 'annualRevenue', label: 'Annual revenue', type: 'number', defaultColumn: true },
    { key: 'status', label: 'Status', type: 'select', options: STATUS.company, defaultColumn: true },
    { key: 'ownerId', label: 'Owner', type: 'record', recordSource: 'users', defaultColumn: true },
    { key: 'createdAt', label: 'Created', type: 'date', defaultColumn: true },
  ],
  task: [
    { key: 'title', label: 'Title', type: 'string', defaultColumn: true },
    { key: 'status', label: 'Status', type: 'select', options: STATUS.task, defaultColumn: true },
    { key: 'priority', label: 'Priority', type: 'select', options: TASK_PRIORITY, defaultColumn: true },
    { key: 'assignedToId', label: 'Assigned to', type: 'record', recordSource: 'users', defaultColumn: true },
    { key: 'dueDate', label: 'Due date', type: 'date', defaultColumn: true },
    { key: 'createdAt', label: 'Created', type: 'date' },
  ],
};

export function fieldsFor(entityType: SavedViewEntityType): EntityFieldDef[] {
  return ENTITY_FIELDS[entityType];
}

export function fieldLabel(entityType: SavedViewEntityType, key: string): string {
  return ENTITY_FIELDS[entityType].find((f) => f.key === key)?.label ?? key;
}

export function defaultColumns(entityType: SavedViewEntityType): string[] {
  return ENTITY_FIELDS[entityType].filter((f) => f.defaultColumn).map((f) => f.key);
}
