'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Loader2, Plus, Save, Trash2, X, Zap } from 'lucide-react';
import { clsx } from 'clsx';
import { customFieldsApi, pipelinesApi, usersApi, workflowsApi } from '@/lib/api/services';
import { getErrorMessage } from '@/lib/api/errors';
import { Field, ErrorBanner } from '@/components/ui/Field';
import {
  ACTIONS,
  ActionDef,
  ActionFieldDef,
  describeWorkflow,
  ENTITIES,
  EntityKey,
  FIELDS,
  FieldDef,
  OPERATORS,
  ROLE_TARGETS,
  TRIGGERS,
  USER_TARGETS,
  WorkflowTemplate,
  actionDef,
  normalizeActions,
  normalizeConditions,
  triggerDef,
} from '@/lib/workflows/vocabulary';
import { useWorkflowLabels } from '@/lib/workflows/useWorkflowLabels';

interface Condition {
  field: string;
  operator: string;
  value?: string;
}

interface ActionRow {
  type: string;
  config: Record<string, any>;
}

interface WorkflowBuilderProps {
  /** An existing workflow to edit, or a template to start from. */
  initial?: any;
  template?: WorkflowTemplate;
  onCancel: () => void;
  onSaved: () => void;
}

/** Seeds an action's config with the defaults declared in the vocabulary. */
function defaultConfig(def: ActionDef): Record<string, any> {
  const config: Record<string, any> = {};
  for (const field of def.fields) {
    if (field.default !== undefined) config[field.key] = field.default;
  }
  return config;
}

export function WorkflowBuilder({ initial, template, onCancel, onSaved }: WorkflowBuilderProps) {
  const seed = initial ?? template;
  const isEdit = Boolean(initial?.id);

  const [name, setName] = useState<string>(seed?.name ?? '');
  const [description, setDescription] = useState<string>(seed?.description ?? '');
  const [entity, setEntity] = useState<EntityKey>((seed?.triggerConfig?.entity as EntityKey) ?? 'lead');
  const [triggerType, setTriggerType] = useState<string>(seed?.triggerType ?? 'record_created');
  const [watchField, setWatchField] = useState<string>(seed?.triggerConfig?.field ?? '');
  const [toStage, setToStage] = useState<string>(seed?.triggerConfig?.toStage ?? '');
  const [conditions, setConditions] = useState<Condition[]>(() => normalizeConditions(seed?.conditions));
  const [actions, setActions] = useState<ActionRow[]>(() => {
    const stored = normalizeActions(seed?.actions);
    if (stored.length > 0) return stored;
    const first = ACTIONS[0];
    return [{ type: first.value, config: defaultConfig(first) }];
  });
  const [isActive, setIsActive] = useState<boolean>(seed?.isActive ?? true);
  const [error, setError] = useState<string | null>(null);

  const { data: customFields = [] } = useQuery({
    queryKey: ['custom-fields', entity],
    queryFn: () => customFieldsApi.list({ entityType: entity }),
    staleTime: 60_000,
  });

  const combinedFields: FieldDef[] = useMemo(() => {
    const base = FIELDS[entity] || [];
    const custom: FieldDef[] = (customFields || []).map((cf: any) => ({
      value: cf.fieldName || cf.label || cf.id,
      label: `${cf.label} (Custom)`,
      type: cf.fieldType === 'number' ? 'number' : cf.fieldType === 'date' ? 'date' : cf.fieldType === 'select' ? 'select' : 'text',
      options: cf.options,
      hint: 'Custom field',
    }));
    return [...base, ...custom];
  }, [entity, customFields]);

  const availableTriggers = TRIGGERS.filter((t) => !t.entities || t.entities.includes(entity));
  const availableActions = ACTIONS.filter((a) => !a.entities || a.entities.includes(entity));
  const trigger = triggerDef(triggerType);

  const labels = useWorkflowLabels();

  const summary = useMemo(
    () =>
      describeWorkflow(
        {
          triggerType,
          triggerConfig: { entity, field: watchField, toStage },
          conditions,
          actions,
        },
        labels,
      ),
    [triggerType, entity, watchField, toStage, conditions, actions, labels],
  );

  /** Switching record type invalidates every field reference on the rule. */
  function changeEntity(next: EntityKey) {
    setEntity(next);
    setWatchField('');
    setToStage('');
    setConditions([]);
    setActions((prev) =>
      prev.map((a) => {
        const { field, stageId, ...rest } = a.config ?? {};
        return { ...a, config: rest };
      }),
    );
    if (!TRIGGERS.some((t) => t.value === triggerType && (!t.entities || t.entities.includes(next)))) {
      setTriggerType('record_created');
    }
  }

  const save = useMutation({
    mutationFn: () => {
      const payload = {
        name: name.trim(),
        description: description.trim() || undefined,
        triggerType,
        triggerConfig: {
          entity,
          ...(triggerType === 'field_changed' ? { field: watchField } : {}),
          ...(triggerType === 'stage_changed' && toStage ? { toStage } : {}),
        },
        conditions,
        actions,
        isActive,
      };
      return isEdit ? workflowsApi.update(initial.id, payload) : workflowsApi.create(payload);
    },
    onSuccess: onSaved,
    onError: (err) => setError(getErrorMessage(err)),
  });

  function validate(): string | null {
    if (!name.trim()) return 'Give the workflow a name.';
    if (trigger && !trigger.available) return `${trigger.label} is not available yet.`;
    if (triggerType === 'field_changed' && !watchField) return 'Pick the field this rule should watch.';
    if (actions.length === 0) return 'Add at least one action.';

    for (const action of actions) {
      const def = actionDef(action.type);
      if (!def) continue;
      if (!def.available) return `"${def.label}" is not available: ${def.unavailableReason}`;
      for (const f of def.fields) {
        if (f.required && !String(action.config?.[f.key] ?? '').trim()) {
          return `"${def.label}" needs ${f.label.toLowerCase()}.`;
        }
      }
    }

    for (const condition of conditions) {
      if (!condition.field) return 'Every condition needs a field.';
      const op = OPERATORS.find((o) => o.value === condition.operator);
      if (op?.needsValue && !String(condition.value ?? '').trim()) {
        return `Condition on ${condition.field} needs a value.`;
      }
    }

    return null;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const problem = validate();
    setError(problem);
    if (!problem) save.mutate();
  }

  return (
    <form onSubmit={handleSubmit} className="card">
      <div className="card-header">
        <h3 className="text-sm font-semibold text-slate-800">
          {isEdit ? `Edit "${initial.name}"` : 'New workflow'}
        </h3>
        <button type="button" className="rounded p-1 text-slate-400 hover:bg-surface-2" onClick={onCancel} aria-label="Close">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="card-body flex flex-col gap-6">
        <ErrorBanner message={error} />

        <Step index={1} title="Name this rule" hint="Something your team will recognise in the list.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name" htmlFor="workflow-name" required>
              <input
                id="workflow-name"
                className="input"
                required
                maxLength={100}
                value={name}
                onChange={(e) => setName((e.target as HTMLInputElement).value)}
              />
            </Field>
            <Field label="Description" htmlFor="workflow-description">
              <input
                id="workflow-description"
                className="input"
                value={description}
                onChange={(e) => setDescription((e.target as HTMLInputElement).value)}
              />
            </Field>
          </div>
        </Step>

        <Step index={2} title="When should it run?" hint="The trigger decides what wakes this rule up.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Record type" htmlFor="workflow-entity" required>
              <select
                id="workflow-entity"
                className="input"
                value={entity}
                onChange={(e) => changeEntity((e.target as HTMLSelectElement).value as EntityKey)}
              >
                {ENTITIES.map((e2) => (
                  <option key={e2.value} value={e2.value}>{e2.label}</option>
                ))}
              </select>
            </Field>

            <Field label="Trigger" htmlFor="workflow-trigger" required hint={trigger?.hint}>
              <select
                id="workflow-trigger"
                className="input"
                value={triggerType}
                onChange={(e) => setTriggerType((e.target as HTMLSelectElement).value)}
              >
                {availableTriggers.map((t) => (
                  <option key={t.value} value={t.value} disabled={!t.available}>
                    {t.label}{t.available ? '' : ' — not available yet'}
                  </option>
                ))}
              </select>
            </Field>

            {triggerType === 'field_changed' && (
              <Field
                label="Field to watch"
                htmlFor="workflow-watch-field"
                required
                hint={combinedFields.find((f) => f.value === watchField)?.hint}
              >
                <select
                  id="workflow-watch-field"
                  className="input"
                  value={watchField}
                  onChange={(e) => setWatchField((e.target as HTMLSelectElement).value)}
                >
                  <option value=""></option>
                  {combinedFields.map((f) => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </select>
              </Field>
            )}

            {trigger?.stageFilter && (
              <Field
                label="Only when it moves into"
                htmlFor="workflow-to-stage"
                hint="Leave empty to run on every stage move."
              >
                <StageSelect
                  id="workflow-to-stage"
                  entity={entity}
                  value={toStage}
                  onChange={setToStage}
                />
              </Field>
            )}
          </div>
        </Step>

        <Step
          index={3}
          title="Only when… (optional)"
          hint="All conditions must hold, or the run is recorded as skipped."
        >
          <div className="flex flex-col gap-2">
            {conditions.map((condition, i) => (
              <ConditionRow
                key={i}
                condition={condition}
                fields={combinedFields}
                entity={entity}
                onChange={(next) =>
                  setConditions((prev) => prev.map((c, idx) => (idx === i ? next : c)))
                }
                onRemove={() => setConditions((prev) => prev.filter((_, idx) => idx !== i))}
              />
            ))}

            <button
              type="button"
              className="btn-secondary btn-sm self-start"
              onClick={() =>
                setConditions((prev) => [...prev, { field: combinedFields[0]?.value ?? '', operator: 'equals', value: '' }])
              }
            >
              <Plus className="h-3.5 w-3.5" /> Add condition
            </button>
          </div>
        </Step>

        <Step index={4} title="Then do this" hint="Actions run top to bottom. Each one is logged in the run history.">
          <div className="flex flex-col gap-3">
            {actions.map((action, i) => (
              <ActionCard
                key={i}
                action={action}
                entity={entity}
                fields={combinedFields}
                customFields={customFields}
                available={availableActions}
                onChange={(next) => setActions((prev) => prev.map((a, idx) => (idx === i ? next : a)))}
                onRemove={
                  actions.length > 1
                    ? () => setActions((prev) => prev.filter((_, idx) => idx !== i))
                    : undefined
                }
              />
            ))}

            <button
              type="button"
              className="btn-secondary btn-sm self-start"
              onClick={() => {
                const def = availableActions[0];
                setActions((prev) => [...prev, { type: def.value, config: defaultConfig(def) }]);
              }}
            >
              <Plus className="h-3.5 w-3.5" /> Add action
            </button>
          </div>
        </Step>

        <div className="rounded-lg border border-brand-200 bg-brand-50 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">In plain English</p>
          <p className="mt-1 text-sm text-slate-700">{summary}</p>
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-slate-300"
            checked={isActive}
            onChange={(e) => setIsActive((e.target as HTMLInputElement).checked)}
          />
          Turn this on as soon as it is saved
        </label>

        <div className="flex items-center gap-2 border-t pt-4">
          <button type="submit" className="btn-primary" disabled={save.isPending}>
            {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : isEdit ? <Save className="h-4 w-4" /> : <Zap className="h-4 w-4" />}
            {isEdit ? 'Save changes' : 'Create workflow'}
          </button>
          <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </form>
  );
}

// ─── Layout ──────────────────────────────────────────────────────────────────

function Step({
  index, title, hint, children,
}: { index: number; title: string; hint: string; children: React.ReactNode }) {
  return (
    <section className="flex gap-3">
      <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">
        {index}
      </div>
      <div className="min-w-0 flex-1">
        <h4 className="text-sm font-semibold text-slate-800">{title}</h4>
        <p className="mb-3 text-xs text-slate-500">{hint}</p>
        {children}
      </div>
    </section>
  );
}

// ─── Conditions ──────────────────────────────────────────────────────────────

function ConditionRow({
  condition, fields, entity, onChange, onRemove,
}: {
  condition: Condition;
  fields: FieldDef[];
  entity: EntityKey;
  onChange: (next: Condition) => void;
  onRemove: () => void;
}) {
  const field = fields.find((f) => f.value === condition.field) ?? fields[0];
  const operator = OPERATORS.find((o) => o.value === condition.operator);

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-surface-1 p-2">
      <select
        className="input max-w-[11rem]"
        value={condition.field}
        onChange={(e) => onChange({ ...condition, field: (e.target as HTMLSelectElement).value, value: '' })}
        aria-label="Condition field"
      >
        {fields.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
      </select>

      <select
        className="input max-w-[10rem]"
        value={condition.operator}
        onChange={(e) => onChange({ ...condition, operator: (e.target as HTMLSelectElement).value })}
        aria-label="Condition operator"
      >
        {OPERATORS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>

      {operator?.needsValue && (
        <div className="min-w-[10rem] flex-1">
          <ValueInput
            field={field}
            entity={entity}
            value={condition.value ?? ''}
            onChange={(value) => onChange({ ...condition, value })}
          />
        </div>
      )}

      <button
        type="button"
        className="rounded p-1.5 text-slate-400 hover:bg-white hover:text-red-600"
        onClick={onRemove}
        aria-label="Remove condition"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

/** Renders the right control for whatever field was picked. */
function ValueInput({
  field, entity, value, onChange,
}: { field: FieldDef; entity: EntityKey; value: string; onChange: (v: string) => void }) {
  if (field?.type === 'select') {
    return (
      <select className="input" value={value} onChange={(e) => onChange((e.target as HTMLSelectElement).value)}>
        <option value=""></option>
        {(field.options ?? []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    );
  }
  if (field?.type === 'user') return <UserSelect value={value} onChange={onChange} />;
  if (field?.type === 'stage') return <StageSelect entity={entity} value={value} onChange={onChange} />;

  return (
    <input
      className="input"
      type={field?.type === 'number' ? 'number' : field?.type === 'date' ? 'date' : 'text'}
      value={value}
      onChange={(e) => onChange((e.target as HTMLInputElement).value)}
    />
  );
}

// ─── Actions ─────────────────────────────────────────────────────────────────

function ActionCard({
  action, entity, fields, customFields, available, onChange, onRemove,
}: {
  action: ActionRow;
  entity: EntityKey;
  fields: FieldDef[];
  customFields: any[];
  available: ActionDef[];
  onChange: (next: ActionRow) => void;
  onRemove?: () => void;
}) {
  const def = actionDef(action.type);

  return (
    <div className="rounded-lg border border-slate-200 bg-surface-1 p-3">
      <div className="flex items-start gap-2">
        <select
          className="input max-w-xs"
          value={action.type}
          onChange={(e) => {
            const next = actionDef((e.target as HTMLSelectElement).value);
            onChange({ type: next?.value ?? action.type, config: next ? defaultConfig(next) : {} });
          }}
          aria-label="Action"
        >
          {available.map((a) => (
            <option key={a.value} value={a.value} disabled={!a.available}>
              {a.label}{a.available ? '' : ' — unavailable'}
            </option>
          ))}
        </select>

        {onRemove && (
          <button
            type="button"
            className="ml-auto rounded p-1.5 text-slate-400 hover:bg-white hover:text-red-600"
            onClick={onRemove}
            aria-label="Remove action"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      {def && (
        <p className={clsx('mt-2 text-xs', def.available ? 'text-slate-500' : 'text-amber-600')}>
          {def.available ? def.hint : def.unavailableReason}
        </p>
      )}

      {def && def.fields.length > 0 && (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {def.fields.map((f) => (
            <ActionField
              key={f.key}
              def={f}
              entity={entity}
              fields={fields}
              customFields={customFields}
              value={action.config?.[f.key] ?? ''}
              onChange={(value) => onChange({ ...action, config: { ...action.config, [f.key]: value } })}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ActionField({
  def, entity, fields, customFields = [], value, onChange,
}: {
  def: ActionFieldDef;
  entity: EntityKey;
  fields: FieldDef[];
  customFields?: any[];
  value: any;
  onChange: (v: any) => void;
}) {
  const id = `action-${def.key}`;
  const isTextField = def.type === 'text' || def.type === 'textarea';

  return (
    <Field label={def.label} htmlFor={id} required={def.required} hint={def.hint}>
      {def.type === 'user' ? (
        <UserSelect id={id} value={String(value ?? '')} onChange={onChange} allowRelative={def.allowRelative} />
      ) : def.type === 'stage' ? (
        <StageSelect id={id} entity={entity} value={String(value ?? '')} onChange={onChange} />
      ) : def.type === 'field' ? (
        <select id={id} className="input" value={String(value ?? '')} onChange={(e) => onChange((e.target as HTMLSelectElement).value)}>
          <option value=""></option>
          {fields.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
        </select>
      ) : def.type === 'select' ? (
        <select id={id} className="input" value={String(value ?? '')} onChange={(e) => onChange((e.target as HTMLSelectElement).value)}>
          <option value=""></option>
          {(def.options ?? []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      ) : def.type === 'textarea' ? (
        <textarea
          id={id}
          className="input min-h-[70px]"
          value={String(value ?? '')}
          onChange={(e) => onChange((e.target as HTMLTextAreaElement).value)}
        />
      ) : (
        <input
          id={id}
          className="input"
          type={def.type === 'number' ? 'number' : 'text'}
          value={String(value ?? '')}
          onChange={(e) => onChange((e.target as HTMLInputElement).value)}
        />
      )}

      {isTextField && (
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-medium text-slate-500">Insert tag:</span>
          <select
            className="input py-0.5 px-2 text-xs max-w-[220px] h-7 bg-white"
            value=""
            onChange={(e) => {
              const tag = e.target.value;
              if (tag) {
                const current = String(value ?? '');
                const space = current && !current.endsWith(' ') ? ' ' : '';
                onChange(current + space + tag);
                e.target.value = '';
              }
            }}
          >
            <option value="">+ Insert variable {"{{...}}"}</option>
            <optgroup label="Standard Fields">
              <option value="{{label}}">Record Name/Title ({"{{label}}"})</option>
              <option value="{{firstName}}">First Name ({"{{firstName}}"})</option>
              <option value="{{lastName}}">Last Name ({"{{lastName}}"})</option>
              <option value="{{email}}">Email ({"{{email}}"})</option>
              <option value="{{phone}}">Phone ({"{{phone}}"})</option>
              <option value="{{status}}">Status ({"{{status}}"})</option>
              <option value="{{company}}">Company ({"{{company}}"})</option>
              <option value="{{owner}}">Owner ({"{{owner}}"})</option>
            </optgroup>
            {customFields && customFields.length > 0 && (
              <optgroup label="Custom Fields">
                {customFields.map((cf: any) => (
                  <option key={cf.id} value={`{{${cf.label}}}`}>
                    {cf.label} ({`{{${cf.label}}}`})
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </div>
      )}
    </Field>
  );
}

// ─── Shared pickers ──────────────────────────────────────────────────────────

function UserSelect({
  value, onChange, id, allowRelative,
}: { value: string; onChange: (v: string) => void; id?: string; allowRelative?: boolean }) {
  const { data: users = [], isLoading } = useQuery({
    queryKey: ['record-select', 'users'],
    queryFn: async () => {
      const res = await usersApi.list({ limit: 200 });
      return (res?.data ?? []).map((u: any) => ({ id: u.id, label: `${u.firstName} ${u.lastName}` }));
    },
    staleTime: 60_000,
  });

  return (
    <select id={id} className="input" value={value} onChange={(e) => onChange((e.target as HTMLSelectElement).value)}>
      <option value="">{isLoading ? 'Loading…' : ''}</option>
      {allowRelative && (
        <optgroup label="Relative to this record">
          {USER_TARGETS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </optgroup>
      )}
      {allowRelative && (
        <optgroup label="Team">
          {ROLE_TARGETS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </optgroup>
      )}
      <optgroup label="People">
        {users.map((u: any) => <option key={u.id} value={u.id}>{u.label}</option>)}
      </optgroup>
    </select>
  );
}

function StageSelect({
  entity, value, onChange, id,
}: {
  entity: EntityKey;
  value: string;
  onChange: (v: string) => void;
  id?: string;
}) {
  const staged = entity === 'lead' || entity === 'deal';

  const { data: pipelines = [], isLoading } = useQuery({
    queryKey: ['pipelines', entity],
    queryFn: () => pipelinesApi.list(entity as 'lead' | 'deal'),
    enabled: staged,
    staleTime: 60_000,
  });

  if (!staged) {
    return <p className="text-xs text-amber-600">Only leads and deals have pipeline stages.</p>;
  }

  return (
    <select id={id} className="input" value={value} onChange={(e) => onChange((e.target as HTMLSelectElement).value)}>
      <option value="">{isLoading ? 'Loading…' : ''}</option>
      {pipelines.map((p: any) => (
        <optgroup key={p.id} label={p.name}>
          {(p.stages ?? []).map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </optgroup>
      ))}
    </select>
  );
}
