/**
 * The shared vocabulary between the workflow builder (web) and the engine (api).
 * `apps/web/src/lib/workflows/vocabulary.ts` mirrors this — keep them in step.
 */

export type WorkflowEntity = 'lead' | 'deal' | 'contact' | 'company' | 'task';

export const WORKFLOW_ENTITIES: WorkflowEntity[] = ['lead', 'deal', 'contact', 'company', 'task'];

/** Triggers the engine can actually fire. `time_based` needs a scheduler and is not one of them. */
export const SUPPORTED_TRIGGERS = [
  'record_created',
  'record_updated',
  'record_deleted',
  'stage_changed',
  'field_changed',
] as const;

export type SupportedTrigger = (typeof SUPPORTED_TRIGGERS)[number];

/**
 * Fields a workflow may read in conditions or write with `update_field`.
 * Anything outside this list is rejected, so a rule can never touch tenant ids,
 * timestamps or relations it has no business writing.
 */
export const ENTITY_FIELDS: Record<WorkflowEntity, string[]> = {
  lead: ['title', 'status', 'source', 'value', 'probability', 'ownerId', 'stageId', 'expectedCloseDate'],
  deal: ['name', 'status', 'value', 'probability', 'ownerId', 'stageId', 'expectedCloseDate'],
  contact: ['firstName', 'lastName', 'email', 'phone', 'mobile', 'status', 'ownerId'],
  company: ['name', 'industry', 'website', 'phone', 'email', 'city', 'status', 'ownerId'],
  task: ['title', 'status', 'priority', 'assignedToId', 'dueDate'],
};

/** Numeric fields get compared as numbers rather than strings. */
export const NUMERIC_FIELDS = new Set(['value', 'probability', 'employees', 'annualRevenue']);

/** The human-readable label for a record, used in task titles and templates. */
export const ENTITY_LABEL_FIELD: Record<WorkflowEntity, string> = {
  lead: 'title',
  deal: 'name',
  contact: 'firstName',
  company: 'name',
  task: 'title',
};

/** Only these entities own a pipeline stage. */
export const STAGED_ENTITIES: WorkflowEntity[] = ['lead', 'deal'];

/** The owner column differs on tasks. */
export const OWNER_FIELD: Record<WorkflowEntity, string> = {
  lead: 'ownerId',
  deal: 'ownerId',
  contact: 'ownerId',
  company: 'ownerId',
  task: 'assignedToId',
};

export type ConditionOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'greater_than'
  | 'less_than'
  | 'is_empty'
  | 'is_not_empty';

export interface WorkflowCondition {
  field: string;
  operator: ConditionOperator;
  value?: string;
}

export interface WorkflowAction {
  type: string;
  config?: Record<string, any>;
}

/** Who an action targets: the record's owner, whoever triggered it, or a specific user. */
export type UserTarget = 'record_owner' | 'actor' | string;

export interface WorkflowEvent {
  tenantId: string;
  /** The user whose request caused the event — tasks and activities are attributed to them. */
  actorId: string;
  entity: WorkflowEntity;
  action: 'created' | 'updated' | 'deleted';
  record: Record<string, any>;
  /** The record as it was before an update, used by `stage_changed` / `field_changed`. */
  previous?: Record<string, any> | null;
}

export interface ActionOutcome {
  type: string;
  status: 'success' | 'skipped' | 'failed';
  detail: string;
}
