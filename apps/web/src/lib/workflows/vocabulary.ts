/**
 * The vocabulary the automation builder speaks: which triggers exist, which
 * fields each record type exposes, and what every action needs configured.
 *
 * Mirrors `apps/api/src/workflows/workflow-types.ts` — when one changes, the
 * other has to follow, or rules will save but never fire.
 */

export type EntityKey = 'lead' | 'deal' | 'contact' | 'company' | 'task';

export interface Option {
  value: string;
  label: string;
}

export const ENTITIES: Array<Option & { article: string; plural: string }> = [
  { value: 'lead', label: 'Lead', article: 'a', plural: 'leads' },
  { value: 'deal', label: 'Deal', article: 'a', plural: 'deals' },
  { value: 'contact', label: 'Contact', article: 'a', plural: 'contacts' },
  { value: 'company', label: 'Company', article: 'a', plural: 'companies' },
  { value: 'task', label: 'Task', article: 'a', plural: 'tasks' },
];

export interface TriggerDef extends Option {
  /** Shown under the trigger picker so the choice is self-explanatory. */
  hint: string;
  /** Reads as "When a lead <verb>". */
  verb: string;
  available: boolean;
  unavailableReason?: string;
  /** `field_changed` needs to know which field to watch. */
  needsField?: boolean;
  /** `stage_changed` can optionally narrow to arrivals at one stage. */
  stageFilter?: boolean;
  /** Stages only exist on leads and deals. */
  entities?: EntityKey[];
}

export const TRIGGERS: TriggerDef[] = [
  {
    value: 'record_created',
    label: 'is created',
    verb: 'is created',
    hint: 'Runs once, the moment a new record is saved.',
    available: true,
  },
  {
    value: 'record_updated',
    label: 'is updated',
    verb: 'is updated',
    hint: 'Runs on every edit. Add conditions so it does not fire on every keystroke-level change.',
    available: true,
  },
  {
    value: 'field_changed',
    label: 'has a field changed',
    verb: 'has a field changed',
    hint: 'Runs only when the field you pick actually changes value.',
    available: true,
    needsField: true,
  },
  {
    value: 'stage_changed',
    label: 'moves to another stage',
    verb: 'moves stage',
    hint: 'Runs when the record moves to a different pipeline stage — this is what dragging a card on the Kanban board does.',
    available: true,
    stageFilter: true,
    entities: ['lead', 'deal'],
  },
  {
    value: 'record_deleted',
    label: 'is deleted',
    verb: 'is deleted',
    hint: 'Runs after the record is removed. Actions that change the record are skipped.',
    available: true,
  },
  {
    value: 'time_based',
    label: 'on a schedule',
    verb: 'on a schedule',
    hint: 'Scheduled rules need a background scheduler, which this deployment does not run yet.',
    available: false,
    unavailableReason: 'Scheduled runs are not supported yet.',
  },
];

export type FieldType = 'text' | 'number' | 'date' | 'select' | 'user' | 'stage';

export interface FieldDef extends Option {
  type: FieldType;
  options?: Option[];
  /** Shown when the field is chosen, to head off a wrong pick. */
  hint?: string;
}

/**
 * Leads and deals carry a `status` field *and* a pipeline `stage`, and they move
 * independently — the Kanban board only ever changes the stage. Watching the
 * wrong one is the easiest way to build a rule that never fires.
 */
export const STATUS_NOT_STAGE_HINT =
  'This is the Status field on the record form. Dragging a card between Kanban columns changes the Stage instead — use the “moves to another stage” trigger for that.';

const STAGE_HINT = 'The pipeline stage — the column a card sits in on the Kanban board.';

const LEAD_STATUS: Option[] = [
  { value: 'new', label: 'New' },
  { value: 'working', label: 'Working' },
  { value: 'qualified', label: 'Qualified' },
  { value: 'unqualified', label: 'Unqualified' },
  { value: 'converted', label: 'Converted' },
  { value: 'lost', label: 'Lost' },
];

const LEAD_SOURCE: Option[] = [
  { value: 'website', label: 'Website' },
  { value: 'referral', label: 'Referral' },
  { value: 'cold_call', label: 'Cold call' },
  { value: 'email', label: 'Email' },
  { value: 'social', label: 'Social' },
  { value: 'advertisement', label: 'Advertisement' },
  { value: 'event', label: 'Event' },
  { value: 'other', label: 'Other' },
];

const TASK_PRIORITY: Option[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

/** Must stay a subset of ENTITY_FIELDS on the API, which rejects anything else. */
export const FIELDS: Record<EntityKey, FieldDef[]> = {
  lead: [
    { value: 'title', label: 'Title', type: 'text' },
    { value: 'status', label: 'Status', type: 'select', options: LEAD_STATUS, hint: STATUS_NOT_STAGE_HINT },
    { value: 'source', label: 'Source', type: 'select', options: LEAD_SOURCE },
    { value: 'value', label: 'Value', type: 'number' },
    { value: 'probability', label: 'Probability', type: 'number' },
    { value: 'ownerId', label: 'Owner', type: 'user' },
    { value: 'stageId', label: 'Stage', type: 'stage', hint: STAGE_HINT },
    { value: 'expectedCloseDate', label: 'Expected close date', type: 'date' },
  ],
  deal: [
    { value: 'name', label: 'Name', type: 'text' },
    {
      value: 'status',
      label: 'Status',
      type: 'select',
      hint: STATUS_NOT_STAGE_HINT,
      options: [
        { value: 'open', label: 'Open' },
        { value: 'won', label: 'Won' },
        { value: 'lost', label: 'Lost' },
      ],
    },
    { value: 'value', label: 'Value', type: 'number' },
    { value: 'probability', label: 'Probability', type: 'number' },
    { value: 'ownerId', label: 'Owner', type: 'user' },
    { value: 'stageId', label: 'Stage', type: 'stage', hint: STAGE_HINT },
    { value: 'expectedCloseDate', label: 'Expected close date', type: 'date' },
  ],
  contact: [
    { value: 'firstName', label: 'First name', type: 'text' },
    { value: 'lastName', label: 'Last name', type: 'text' },
    { value: 'email', label: 'Email', type: 'text' },
    { value: 'phone', label: 'Phone', type: 'text' },
    { value: 'mobile', label: 'Mobile', type: 'text' },
    {
      value: 'status',
      label: 'Status',
      type: 'select',
      options: [
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Inactive' },
        { value: 'blocked', label: 'Blocked' },
      ],
    },
    { value: 'ownerId', label: 'Owner', type: 'user' },
  ],
  company: [
    { value: 'name', label: 'Name', type: 'text' },
    { value: 'industry', label: 'Industry', type: 'text' },
    { value: 'website', label: 'Website', type: 'text' },
    { value: 'phone', label: 'Phone', type: 'text' },
    { value: 'email', label: 'Email', type: 'text' },
    { value: 'city', label: 'City', type: 'text' },
    {
      value: 'status',
      label: 'Status',
      type: 'select',
      options: [
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Inactive' },
      ],
    },
    { value: 'ownerId', label: 'Owner', type: 'user' },
  ],
  task: [
    { value: 'title', label: 'Title', type: 'text' },
    {
      value: 'status',
      label: 'Status',
      type: 'select',
      options: [
        { value: 'pending', label: 'Pending' },
        { value: 'in_progress', label: 'In progress' },
        { value: 'completed', label: 'Completed' },
        { value: 'cancelled', label: 'Cancelled' },
      ],
    },
    { value: 'priority', label: 'Priority', type: 'select', options: TASK_PRIORITY },
    { value: 'assignedToId', label: 'Assignee', type: 'user' },
    { value: 'dueDate', label: 'Due date', type: 'date' },
  ],
};

export const OPERATORS: Array<Option & { needsValue: boolean }> = [
  { value: 'equals', label: 'is', needsValue: true },
  { value: 'not_equals', label: 'is not', needsValue: true },
  { value: 'contains', label: 'contains', needsValue: true },
  { value: 'greater_than', label: 'is greater than', needsValue: true },
  { value: 'less_than', label: 'is less than', needsValue: true },
  { value: 'is_empty', label: 'is empty', needsValue: false },
  { value: 'is_not_empty', label: 'is not empty', needsValue: false },
];

export type ActionFieldType = 'text' | 'textarea' | 'number' | 'select' | 'user' | 'stage' | 'field';

export interface ActionFieldDef {
  key: string;
  label: string;
  type: ActionFieldType;
  placeholder?: string;
  hint?: string;
  required?: boolean;
  options?: Option[];
  /** For `user` inputs: allow the relative choices as well as a named person. */
  allowRelative?: boolean;
  default?: string | number;
}

export interface ActionDef extends Option {
  hint: string;
  available: boolean;
  unavailableReason?: string;
  /** Actions that write to the record only make sense for some entities. */
  entities?: EntityKey[];
  fields: ActionFieldDef[];
  /** Reads as "then <summary>" in the plain-English preview. */
  summary: (config: Record<string, any>, labels?: LabelMap) => string;
}

export const ACTIONS: ActionDef[] = [
  {
    value: 'create_task',
    label: 'Create a task',
    hint: 'Adds a to-do linked back to the record that triggered the rule.',
    available: true,
    fields: [
      {
        key: 'title',
        label: 'Task title',
        type: 'text',
        required: true,
        default: 'Follow up: {{label}}',
        hint: 'Use {{label}} for the record name, or any field like {{status}}.',
      },
      { key: 'assignTo', label: 'Assign to', type: 'user', allowRelative: true, default: 'record_owner' },
      { key: 'dueInDays', label: 'Due in (days)', type: 'number', placeholder: '1', default: 1 },
      { key: 'priority', label: 'Priority', type: 'select', options: TASK_PRIORITY, default: 'medium' },
    ],
    summary: (c) => `create a task "${c.title ?? 'Follow up'}"`,
  },
  {
    value: 'assign_record',
    label: 'Assign the record',
    hint: 'Sets the owner of the record that triggered the rule.',
    available: true,
    fields: [{ key: 'userId', label: 'Assign to', type: 'user', required: true, allowRelative: true }],
    summary: (c, labels) => `assign the record to ${userLabel(labels ?? {}, c.userId)}`,
  },
  {
    value: 'update_field',
    label: 'Update a field',
    hint: 'Writes a new value onto the triggering record.',
    available: true,
    fields: [
      { key: 'field', label: 'Field', type: 'field', required: true },
      { key: 'value', label: 'New value', type: 'text', required: true },
    ],
    summary: (c) => `set ${c.field ?? 'a field'} to "${c.value ?? ''}"`,
  },
  {
    value: 'move_stage',
    label: 'Move to a stage',
    hint: 'Moves the record along its pipeline.',
    available: true,
    entities: ['lead', 'deal'],
    fields: [{ key: 'stageId', label: 'Target stage', type: 'stage', required: true }],
    summary: (c, labels) => `move it to ${(labels ?? {})[c.stageId] ?? 'another stage'}`,
  },
  {
    value: 'notify_user',
    label: 'Notify a user',
    hint: 'Stores an in-app notification for someone on the team.',
    available: true,
    fields: [
      { key: 'userId', label: 'Notify', type: 'user', required: true, allowRelative: true },
      { key: 'title', label: 'Title', type: 'text', placeholder: 'Lead needs attention' },
      { key: 'body', label: 'Message', type: 'textarea', placeholder: '{{label}} was just updated.' },
    ],
    summary: (c, labels) => `notify ${userLabel(labels ?? {}, c.userId)}`,
  },
  {
    value: 'send_email',
    label: 'Send an email',
    hint: 'Sends through the API’s SMTP settings. Without SMTP_USER / SMTP_PASS the step is skipped and says so in the run history.',
    available: true,
    fields: [
      {
        key: 'to',
        label: 'Send to',
        type: 'select',
        required: true,
        options: [
          { value: 'record_owner', label: 'The record owner' },
          { value: 'record_contact', label: 'The linked contact' },
        ],
        hint: 'Or type an address directly in the box below.',
      },
      { key: 'subject', label: 'Subject', type: 'text', required: true, default: 'Update on {{label}}' },
      { key: 'body', label: 'Body', type: 'textarea', default: '{{label}} was just updated in the CRM.' },
    ],
    summary: (c) => `email ${c.to === 'record_contact' ? 'the contact' : 'the owner'}`,
  },
  {
    value: 'webhook',
    label: 'Call a webhook',
    hint: 'POSTs the record as JSON to a URL you control. Times out after 5 seconds.',
    available: true,
    fields: [
      { key: 'url', label: 'URL', type: 'text', required: true, placeholder: 'https://example.com/hooks/crm' },
    ],
    summary: () => 'call a webhook',
  },
  {
    value: 'send_whatsapp',
    label: 'Send a WhatsApp message',
    hint: 'No WhatsApp provider is connected to this deployment.',
    available: false,
    unavailableReason: 'No WhatsApp provider configured.',
    fields: [],
    summary: () => 'send a WhatsApp message',
  },
];

/** Relative targets accepted anywhere a user is picked. */
export const USER_TARGETS: Option[] = [
  { value: 'record_owner', label: 'The record owner' },
  { value: 'actor', label: 'Whoever triggered it' },
];

/** Renders a user target — relative keyword or a real person's name. */
function userLabel(labels: Record<string, string>, target?: string): string {
  if (target === 'record_owner') return 'the record owner';
  if (target === 'actor') return 'whoever triggered it';
  return (target && labels[target]) || 'someone';
}

export function entityLabel(entity: string): string {
  return ENTITIES.find((e) => e.value === entity)?.label.toLowerCase() ?? entity;
}

export function fieldLabel(entity: string, field: string): string {
  if (!field) return 'field';
  return FIELDS[entity as EntityKey]?.find((f) => f.value === field)?.label ?? field;
}

export interface StoredCondition {
  field: string;
  operator: string;
  value?: string;
}

export interface StoredAction {
  type: string;
  config: Record<string, any>;
}

/**
 * Workflow conditions and actions come back as free-form JSON, and older rows
 * can hold shapes the builder never produced. Everything that reads them goes
 * through these, so one malformed row cannot take down the page.
 */
export function normalizeConditions(raw: unknown): StoredCondition[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (c): c is StoredCondition =>
        Boolean(c) && typeof c === 'object' && !Array.isArray(c) && typeof (c as any).field === 'string',
    )
    .map((c) => ({ field: c.field, operator: c.operator ?? 'equals', value: c.value }));
}

export function normalizeActions(raw: unknown): StoredAction[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (a): a is StoredAction =>
        Boolean(a) && typeof a === 'object' && !Array.isArray(a) && typeof (a as any).type === 'string',
    )
    .map((a) => ({ type: a.type, config: (a as any).config ?? {} }));
}

export function actionDef(type: string): ActionDef | undefined {
  return ACTIONS.find((a) => a.value === type);
}

export function triggerDef(type: string): TriggerDef | undefined {
  return TRIGGERS.find((t) => t.value === type);
}

export interface WorkflowShape {
  triggerType: string;
  triggerConfig?: { entity?: string; field?: string; toStage?: string } | null;
  /** Free-form JSON straight from the database — normalized before use. */
  conditions?: unknown;
  actions?: unknown;
}

/**
 * Maps stage and user ids to names. Rules store ids, so without this every
 * description reads "moves into 46ad8d64-38bf…".
 */
export type LabelMap = Record<string, string>;

const label = (labels: LabelMap, id: string | undefined, fallback: string) =>
  (id && labels[id]) || fallback;

/** Plain-English answer to "what is this rule waiting for?". */
export function whatItWaitsFor(w: WorkflowShape, labels: LabelMap = {}): string {
  const entity = w.triggerConfig?.entity ?? 'lead';
  const noun = entityLabel(entity);

  switch (w.triggerType) {
    case 'record_created':
      return `a new ${noun} to be created`;
    case 'record_updated':
      return `any ${noun} to be edited`;
    case 'record_deleted':
      return `a ${noun} to be deleted`;
    case 'field_changed':
      return `the ${fieldLabel(entity, w.triggerConfig?.field ?? '').toLowerCase()} of a ${noun} to change`;
    case 'stage_changed':
      return w.triggerConfig?.toStage
        ? `a ${noun} to move into ${label(labels, w.triggerConfig.toStage, 'the chosen stage')}`
        : `a ${noun} to move to a different pipeline stage`;
    default:
      return 'a trigger this deployment cannot fire';
  }
}

/**
 * Flags the status/stage mix-up: a rule watching `status` on a lead or deal will
 * not fire when someone drags the card on the Kanban board.
 */
export function statusStageWarning(w: WorkflowShape): string | null {
  const entity = w.triggerConfig?.entity ?? 'lead';
  if (entity !== 'lead' && entity !== 'deal') return null;
  if (w.triggerType !== 'field_changed' || w.triggerConfig?.field !== 'status') return null;
  return STATUS_NOT_STAGE_HINT;
}

/** The one-line plain-English description shown on every workflow card. */
export function describeWorkflow(w: WorkflowShape, labels: LabelMap = {}): string {
  const entity = w.triggerConfig?.entity ?? 'lead';
  const trigger = triggerDef(w.triggerType);
  const noun = entityLabel(entity);

  let when = `When a ${noun} ${trigger?.verb ?? w.triggerType}`;
  if (w.triggerType === 'field_changed' && w.triggerConfig?.field) {
    when = `When a ${noun}'s ${fieldLabel(entity, w.triggerConfig.field).toLowerCase()} changes`;
  }
  if (w.triggerType === 'stage_changed' && w.triggerConfig?.toStage) {
    when = `When a ${noun} moves into ${label(labels, w.triggerConfig.toStage, 'a chosen stage')}`;
  }

  const conditions = normalizeConditions(w.conditions);
  const ifPart =
    conditions.length === 0
      ? ''
      : ` and ${conditions
          .map((c) => {
            const op = OPERATORS.find((o) => o.value === c.operator);
            const name = fieldLabel(entity, c.field).toLowerCase();
            const shown = label(labels, c.value, c.value ?? '');
            return op?.needsValue ? `${name} ${op.label} "${shown}"` : `${name} ${op?.label ?? c.operator}`;
          })
          .join(' and ')}`;

  const actions = normalizeActions(w.actions);
  const thenPart =
    actions.length === 0
      ? 'do nothing'
      : actions.map((a) => actionDef(a.type)?.summary(a.config, labels) ?? a.type).join(', then ');

  return `${when}${ifPart}, ${thenPart}.`;
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  triggerType: string;
  triggerConfig: Record<string, any>;
  conditions: Array<{ field: string; operator: string; value?: string }>;
  actions: Array<{ type: string; config: Record<string, any> }>;
}

/** One-click starting points, so nobody faces an empty builder. */
export const TEMPLATES: WorkflowTemplate[] = [
  {
    id: 'follow-up-new-leads',
    name: 'Follow up on new leads',
    description: 'Every new lead gets a call task for its owner, due tomorrow.',
    triggerType: 'record_created',
    triggerConfig: { entity: 'lead' },
    conditions: [],
    actions: [
      {
        type: 'create_task',
        config: { title: 'Call {{label}}', assignTo: 'record_owner', dueInDays: 1, priority: 'high' },
      },
    ],
  },
  {
    id: 'lead-stage-alert',
    name: 'Alert when a lead reaches a stage',
    description:
      'Notifies the owner when a lead is dragged to another Kanban column. Pick which stage in step 2.',
    triggerType: 'stage_changed',
    triggerConfig: { entity: 'lead' },
    conditions: [],
    actions: [
      {
        type: 'notify_user',
        config: { userId: 'record_owner', title: 'Lead moved stage', body: '{{label}} moved to a new stage.' },
      },
    ],
  },
  {
    id: 'big-deal-watch',
    name: 'Watch high-value deals',
    description: 'Any deal above ₹5,00,000 creates a review task for whoever added it.',
    triggerType: 'record_created',
    triggerConfig: { entity: 'deal' },
    conditions: [{ field: 'value', operator: 'greater_than', value: '500000' }],
    actions: [
      {
        type: 'create_task',
        config: { title: 'Review high-value deal: {{label}}', assignTo: 'actor', dueInDays: 2, priority: 'urgent' },
      },
    ],
  },
  {
    id: 'stage-move-handoff',
    name: 'Task on every deal stage move',
    description: 'Keeps momentum by creating a next-step task whenever a deal moves stage.',
    triggerType: 'stage_changed',
    triggerConfig: { entity: 'deal' },
    conditions: [],
    actions: [
      {
        type: 'create_task',
        config: { title: 'Next step for {{label}}', assignTo: 'record_owner', dueInDays: 3, priority: 'medium' },
      },
    ],
  },
];
