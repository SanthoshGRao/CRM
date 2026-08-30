'use client';

import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Columns3, Plus, Loader2, Trash2, X, Pencil, Users } from 'lucide-react';
import { clsx } from 'clsx';
import { customFieldsApi, teamsApi, usersApi } from '@/lib/api/services';
import { getErrorMessage } from '@/lib/api/errors';
import { Field, ErrorBanner } from '@/components/ui/Field';

export const CUSTOM_FIELD_ENTITIES = [
  { value: 'contact', label: 'Contacts' },
  { value: 'company', label: 'Companies' },
  { value: 'lead', label: 'Leads' },
  { value: 'deal', label: 'Deals' },
  { value: 'task', label: 'Tasks' },
];

export const CUSTOM_FIELD_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'long_text', label: 'Long text' },
  { value: 'number', label: 'Number' },
  { value: 'currency', label: 'Currency' },
  { value: 'percentage', label: 'Percentage' },
  { value: 'date', label: 'Date' },
  { value: 'datetime', label: 'Date & time' },
  { value: 'boolean', label: 'Yes / No' },
  { value: 'dropdown', label: 'Dropdown (single choice)' },
  { value: 'multi_select', label: 'Multi-select' },
  { value: 'phone', label: 'Phone' },
  { value: 'email', label: 'Email' },
  { value: 'url', label: 'URL' },
];

const CHOICE_TYPES = ['dropdown', 'multi_select'];

export function CustomFieldsPanel() {
  const queryClient = useQueryClient();
  const [entityType, setEntityType] = useState('contact');
  const [isCreating, setIsCreating] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: fields = [], isLoading } = useQuery({
    queryKey: ['custom-fields', entityType],
    queryFn: () => customFieldsApi.list({ entityType, includeInactive: 'true' }),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['custom-fields'] });

  const remove = useMutation({
    mutationFn: (id: string) => customFieldsApi.remove(id),
    onSuccess: invalidate,
    onError: (err) => setError(getErrorMessage(err)),
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      customFieldsApi.update(id, { isActive }),
    onSuccess: invalidate,
    onError: (err) => setError(getErrorMessage(err)),
  });

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <ErrorBanner message={error} />

      <div className="card">
        <div className="card-header">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">Custom fields</h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Extra columns your team can fill in on each record.
            </p>
          </div>
          <button
            className="btn-primary btn-sm"
            id="create-custom-field-btn"
            onClick={() => { setEditing(null); setIsCreating(true); }}
          >
            <Plus className="h-3.5 w-3.5" /> New field
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-b p-4">
          {CUSTOM_FIELD_ENTITIES.map((e) => (
            <button
              key={e.value}
              className={clsx(
                'rounded-md px-3 py-1.5 text-sm',
                entityType === e.value ? 'bg-brand-600 text-white' : 'bg-surface-2 text-slate-600 hover:bg-surface-3',
              )}
              onClick={() => { setEntityType(e.value); setIsCreating(false); setEditing(null); }}
            >
              {e.label}
            </button>
          ))}
        </div>

        {(isCreating || editing) && (
          <FieldForm
            entityType={entityType}
            field={editing}
            onClose={() => { setIsCreating(false); setEditing(null); }}
            onSaved={() => { setIsCreating(false); setEditing(null); invalidate(); }}
          />
        )}

        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="skeleton h-4 max-w-[180px] flex-1" />
                  <div className="skeleton h-4 w-24" />
                  <div className="skeleton h-5 w-16 rounded-full" />
                </div>
              ))}
            </div>
          ) : (fields as any[]).length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center">
              <div className="mb-3 rounded-full bg-surface-2 p-4 text-slate-400"><Columns3 className="h-6 w-6" /></div>
              <p className="text-sm font-semibold text-slate-900">No custom fields yet</p>
              <p className="mt-1 max-w-sm text-sm text-slate-500">
                Add a field and it appears on every {entityType} form and detail page.
              </p>
            </div>
          ) : (
            <table className="data-table">
              <thead className="table-header">
                <tr><th>Label</th><th>API name</th><th>Type</th><th>Required</th><th>In use</th><th>Status</th><th className="w-20" /></tr>
              </thead>
              <tbody>
                {(fields as any[]).map((f) => (
                  <tr key={f.id} className="table-row cursor-default">
                    <td className="font-medium text-slate-900">{f.label}</td>
                    <td className="font-mono text-xs text-slate-500">{f.fieldName}</td>
                    <td className="text-slate-600">
                      {CUSTOM_FIELD_TYPES.find((t) => t.value === f.fieldType)?.label ?? f.fieldType}
                      {CHOICE_TYPES.includes(f.fieldType) && (
                        <span className="ml-1 text-xs text-slate-400">({f.options?.length ?? 0} options)</span>
                      )}
                    </td>
                    <td>{f.required ? <span className="badge badge-yellow">Required</span> : <span className="text-slate-400">—</span>}</td>
                    <td className="text-slate-600">{f._count?.values ?? 0} records</td>
                    <td>
                      <button
                        className={clsx('badge', f.isActive ? 'badge-green' : 'badge-gray')}
                        onClick={() => toggleActive.mutate({ id: f.id, isActive: !f.isActive })}
                        title={f.isActive ? 'Hide from forms' : 'Show on forms'}
                      >
                        {f.isActive ? 'Active' : 'Hidden'}
                      </button>
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        <button
                          className="rounded p-1 text-slate-400 hover:bg-surface-2 hover:text-brand-600"
                          aria-label="Edit field"
                          onClick={() => { setIsCreating(false); setEditing(f); }}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          className="rounded p-1 text-slate-400 hover:bg-surface-2 hover:text-red-600"
                          aria-label="Delete field"
                          disabled={remove.isPending}
                          onClick={() => {
                            const used = f._count?.values ?? 0;
                            const warning = used > 0
                              ? `Delete "${f.label}"? The stored values on ${used} record(s) will be removed too.`
                              : `Delete "${f.label}"?`;
                            if (window.confirm(warning)) remove.mutate(f.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

function FieldForm({
  entityType, field, onClose, onSaved,
}: {
  entityType: string;
  field: any | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = Boolean(field);
  const [label, setLabel] = useState(field?.label ?? '');
  const [fieldType, setFieldType] = useState(field?.fieldType ?? 'text');
  const [required, setRequired] = useState(field?.required ?? false);
  const [options, setOptions] = useState<string[]>((field?.options ?? []).map((o: any) => o.label));
  const [error, setError] = useState<string | null>(null);

  const needsOptions = CHOICE_TYPES.includes(fieldType);
  const cleanOptions = options.map((o) => o.trim()).filter(Boolean);

  const save = useMutation({
    mutationFn: () => {
      const payload: any = { label: label.trim(), fieldType, required };
      if (needsOptions) payload.options = cleanOptions.map((label) => ({ label }));

      return isEdit
        ? customFieldsApi.update(field.id, payload)
        : customFieldsApi.create({ ...payload, entityType });
    },
    onSuccess: onSaved,
    onError: (err) => setError(getErrorMessage(err)),
  });

  return (
    <form
      className="border-b bg-surface-1 p-4"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        save.mutate();
      }}
    >
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-medium text-slate-800">
          {isEdit ? `Edit "${field.label}"` : `New field on ${entityType}s`}
        </p>
        <button type="button" className="rounded p-1 text-slate-400 hover:bg-surface-2" onClick={onClose} aria-label="Close">
          <X className="h-4 w-4" />
        </button>
      </div>

      {error && <div className="mb-3"><ErrorBanner message={error} /></div>}

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Label" htmlFor="field-label" required hint="Shown on forms, e.g. Account manager">
          <input id="field-label" className="input" required maxLength={100} placeholder="Account manager"
            value={label} onChange={(e) => setLabel((e.target as HTMLInputElement).value)} />
        </Field>

        <Field label="Type" htmlFor="field-type" required>
          <select id="field-type" className="input" value={fieldType}
            onChange={(e) => setFieldType((e.target as HTMLSelectElement).value)}>
            {CUSTOM_FIELD_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </Field>

        {needsOptions && (
          <Field label="Options" htmlFor="field-options" required className="sm:col-span-2">
            <OptionListEditor options={options} onChange={setOptions} />
          </Field>
        )}

        <Field label="Required" htmlFor="field-required" className="sm:col-span-2">
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input id="field-required" type="checkbox" className="h-4 w-4 rounded border-slate-300"
              checked={required} onChange={(e) => setRequired((e.target as HTMLInputElement).checked)} />
            Users must fill this in
          </label>
        </Field>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <button type="submit" className="btn-primary btn-sm"
          disabled={save.isPending || !label.trim() || (needsOptions && cleanOptions.length === 0)}>
          {save.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Columns3 className="h-3.5 w-3.5" />}
          {isEdit ? 'Save changes' : 'Create field'}
        </button>
        <button type="button" className="btn-secondary btn-sm" onClick={onClose}>Cancel</button>
      </div>
    </form>
  );
}

/** Editable list of option rows, each with its own remove button — no raw text entry. */
function OptionListEditor({ options, onChange }: { options: string[]; onChange: (options: string[]) => void }) {
  const update = (i: number, value: string) => onChange(options.map((o, idx) => (idx === i ? value : o)));
  const remove = (i: number) => onChange(options.filter((_, idx) => idx !== i));
  const add = (values: string[]) => onChange([...options, ...values]);

  return (
    <div>
      <div className="space-y-1.5">
        {options.map((opt, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <input
              className="input !h-8 flex-1 text-sm"
              placeholder="Option"
              value={opt}
              autoFocus={i === options.length - 1 && opt === ''}
              onChange={(e) => update(i, (e.target as HTMLInputElement).value)}
            />
            <button type="button" className="shrink-0 rounded p-1.5 text-slate-400 hover:bg-surface-2 hover:text-red-600"
              onClick={() => remove(i)} aria-label="Remove option">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>

      <div className="mt-2 flex items-center gap-2">
        <button type="button" className="btn-secondary btn-sm" onClick={() => add([''])}>
          <Plus className="h-3.5 w-3.5" /> Add option
        </button>
        <TeamMemberPicker options={options} onChange={onChange} />
      </div>
    </div>
  );
}

/**
 * Populates options from real team members instead of typing each name —
 * grouped by group ("team"), with a checkbox per person that toggles
 * inclusion directly, so the list itself is always the source of truth.
 */
function TeamMemberPicker({ options, onChange }: { options: string[]; onChange: (options: string[]) => void }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const { data: users = [] } = useQuery({
    queryKey: ['team-member-picker', 'users'],
    queryFn: async () => (await usersApi.list({ limit: 200 })).data ?? [],
    enabled: open,
    staleTime: 60_000,
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['team-member-picker', 'teams'],
    queryFn: () => teamsApi.list(),
    enabled: open,
    staleTime: 60_000,
  });

  const teamIds = (teams as any[]).map((t) => t.id).join(',');
  const { data: teamsWithMembers = [], isLoading } = useQuery({
    queryKey: ['team-member-picker', 'team-members', teamIds],
    queryFn: () => Promise.all((teams as any[]).map((t) => teamsApi.get(t.id))),
    enabled: open && (teams as any[]).length > 0,
    staleTime: 60_000,
  });

  const nameOf = (u: any) => `${u.firstName} ${u.lastName}`.trim();
  const existingLower = new Set(options.map((o) => o.trim().toLowerCase()).filter(Boolean));

  const groupedIds = new Set((teamsWithMembers as any[]).flatMap((t) => (t.members ?? []).map((m: any) => m.id)));
  const groups = [
    ...(teamsWithMembers as any[]).map((t) => ({ id: t.id, name: t.name, members: t.members ?? [] })),
    { id: '__unassigned', name: 'Unassigned', members: (users as any[]).filter((u) => !groupedIds.has(u.id)) },
  ].filter((g) => g.members.length > 0);

  const query = search.trim().toLowerCase();
  const visible = groups
    .map((g) => ({ ...g, members: g.members.filter((m: any) => !query || nameOf(m).toLowerCase().includes(query)) }))
    .filter((g) => g.members.length > 0);

  const toggleMember = (m: any) => {
    const lower = nameOf(m).toLowerCase();
    const idx = options.findIndex((o) => o.trim().toLowerCase() === lower);
    onChange(idx === -1 ? [...options.filter((o) => o.trim() !== ''), nameOf(m)] : options.filter((_, i) => i !== idx));
  };

  const toggleGroup = (members: any[]) => {
    const names = members.map(nameOf);
    const allIn = names.every((n) => existingLower.has(n.toLowerCase()));
    if (allIn) {
      const lowerNames = new Set(names.map((n) => n.toLowerCase()));
      onChange(options.filter((o) => !lowerNames.has(o.trim().toLowerCase())));
    } else {
      const toAdd = names.filter((n) => !existingLower.has(n.toLowerCase()));
      onChange([...options.filter((o) => o.trim() !== ''), ...toAdd]);
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button type="button" className="btn-secondary btn-sm" onClick={() => setOpen((o) => !o)}>
        <Users className="h-3.5 w-3.5" /> Team members
      </button>

      {open && (
        <div className="absolute left-0 z-20 mt-1 w-64 overflow-hidden rounded-md border border-slate-200 bg-white shadow-lg">
          <div className="border-b border-slate-100 p-2">
            <input
              autoFocus
              className="input !h-8 text-sm"
              placeholder="Search"
              value={search}
              onChange={(e) => setSearch((e.target as HTMLInputElement).value)}
            />
          </div>

          <div className="max-h-56 overflow-y-auto py-1">
            {isLoading ? (
              <div className="space-y-2 p-3">
                {Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-4" />)}
              </div>
            ) : visible.length === 0 ? (
              <p className="px-3 py-4 text-center text-xs text-slate-400">No matches</p>
            ) : (
              visible.map((g) => {
                const groupChecked = g.members.every((m: any) => existingLower.has(nameOf(m).toLowerCase()));
                return (
                  <div key={g.id} className="py-1">
                    <label className="flex cursor-pointer items-center gap-2 px-3 py-1 text-xs font-semibold text-slate-500 hover:bg-surface-2">
                      <input type="checkbox" className="h-3.5 w-3.5 rounded border-slate-300"
                        checked={groupChecked} onChange={() => toggleGroup(g.members)} />
                      {g.name}
                    </label>
                    {g.members.map((m: any) => (
                      <label key={m.id} className="flex cursor-pointer items-center gap-2 px-3 py-1.5 pl-8 text-sm text-slate-700 hover:bg-surface-2">
                        <input type="checkbox" className="h-3.5 w-3.5 rounded border-slate-300"
                          checked={existingLower.has(nameOf(m).toLowerCase())} onChange={() => toggleMember(m)} />
                        {nameOf(m)}
                      </label>
                    ))}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
