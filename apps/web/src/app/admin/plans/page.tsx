'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Tag, Plus, Loader2, Trash2, X, Pencil, Users } from 'lucide-react';
import { clsx } from 'clsx';
import { adminPlansApi } from '@/lib/api/admin-client';
import { getErrorMessage } from '@/lib/api/errors';
import { formatCurrency } from '@/lib/utils';
import { PageHeader } from '@/components/ui/PageHeader';
import { Field, ErrorBanner } from '@/components/ui/Field';

interface Plan {
  id: string;
  name: string;
  description?: string | null;
  price: string | number;
  currency: string;
  interval: string;
  features?: Record<string, any> | null;
  isActive: boolean;
  _count?: { subscriptions: number };
}

export default function AdminPlansPage() {
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [editing, setEditing] = useState<Plan | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: plans = [], isLoading } = useQuery<Plan[]>({
    queryKey: ['admin', 'plans'],
    queryFn: () => adminPlansApi.list(),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin', 'plans'] });

  const toggleActive = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => adminPlansApi.update(id, { isActive }),
    onSuccess: invalidate,
    onError: (err) => setError(getErrorMessage(err)),
  });

  const remove = useMutation({
    mutationFn: (id: string) => adminPlansApi.remove(id),
    onSuccess: invalidate,
    onError: (err) => setError(getErrorMessage(err)),
  });

  return (
    <div className="page-container">
      <PageHeader
        title="Plans"
        subtitle="Pricing tiers customers can be subscribed to."
        actions={
          !isCreating && !editing ? (
            <button className="btn-primary btn-sm" onClick={() => setIsCreating(true)}>
              <Plus className="h-3.5 w-3.5" /> New plan
            </button>
          ) : undefined
        }
      />

      <ErrorBanner message={error} />

      {(isCreating || editing) && (
        <PlanForm
          plan={editing}
          onClose={() => { setIsCreating(false); setEditing(null); }}
          onSaved={() => { setIsCreating(false); setEditing(null); invalidate(); }}
        />
      )}

      <div className="card">
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-6"><div className="skeleton h-32 w-full" /></div>
          ) : plans.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"><Tag className="h-8 w-8" /></div>
              <p className="empty-state-title">No plans yet</p>
              <p className="empty-state-desc">Create a pricing tier before assigning it to a customer.</p>
              <button className="btn-primary" onClick={() => setIsCreating(true)}>
                <Plus className="h-4 w-4" /> New plan
              </button>
            </div>
          ) : (
            <table className="data-table">
              <thead className="table-header">
                <tr>
                  <th>Plan</th><th>Price</th><th>Interval</th><th>Seats</th><th>Subscribers</th><th>Status</th><th className="w-20" />
                </tr>
              </thead>
              <tbody>
                {plans.map((p) => (
                  <tr key={p.id} className="table-row cursor-default">
                    <td>
                      <p className="font-medium text-slate-900">{p.name}</p>
                      {p.description && <p className="text-xs text-slate-500">{p.description}</p>}
                    </td>
                    <td className="text-slate-700">{formatCurrency(Number(p.price), p.currency)}</td>
                    <td className="text-slate-600">/ {p.interval}</td>
                    <td className="text-slate-600">{p.features?.maxUsers ? `Up to ${p.features.maxUsers}` : 'Unlimited'}</td>
                    <td className="text-slate-600">
                      <span className="inline-flex items-center gap-1">
                        <Users className="h-3.5 w-3.5 text-slate-400" /> {p._count?.subscriptions ?? 0}
                      </span>
                    </td>
                    <td>
                      <button
                        className={clsx('badge', p.isActive ? 'badge-green' : 'badge-gray')}
                        disabled={toggleActive.isPending}
                        onClick={() => toggleActive.mutate({ id: p.id, isActive: !p.isActive })}
                        title="Click to toggle"
                      >
                        {p.isActive ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        <button
                          className="rounded p-1 text-slate-400 hover:bg-surface-2 hover:text-brand-600"
                          aria-label="Edit plan"
                          onClick={() => { setEditing(p); setIsCreating(false); }}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          className="rounded p-1 text-slate-400 hover:bg-surface-2 hover:text-red-600"
                          aria-label="Delete plan"
                          disabled={remove.isPending}
                          title={(p._count?.subscriptions ?? 0) > 0 ? 'Cannot delete — customers are subscribed' : 'Delete plan'}
                          onClick={() => { if (window.confirm(`Delete the "${p.name}" plan?`)) remove.mutate(p.id); }}
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

function PlanForm({ plan, onClose, onSaved }: { plan: Plan | null; onClose: () => void; onSaved: () => void }) {
  const isEdit = !!plan;
  const [form, setForm] = useState({
    name: plan?.name ?? '',
    description: plan?.description ?? '',
    price: plan ? String(plan.price) : '',
    currency: plan?.currency ?? 'INR',
    interval: plan?.interval ?? 'month',
    maxUsers: plan?.features?.maxUsers ? String(plan.features.maxUsers) : '',
    isActive: plan?.isActive ?? true,
  });
  const [error, setError] = useState<string | null>(null);

  const set = (key: keyof typeof form) => (value: any) => setForm((p) => ({ ...p, [key]: value }));

  const save = useMutation({
    mutationFn: () => {
      const { maxUsers, ...rest } = form;
      const dto = {
        ...rest,
        price: Number(form.price),
        features: { ...(plan?.features ?? {}), maxUsers: maxUsers ? Number(maxUsers) : undefined },
      };
      return isEdit ? adminPlansApi.update(plan!.id, dto) : adminPlansApi.create(dto);
    },
    onSuccess: onSaved,
    onError: (err) => setError(getErrorMessage(err)),
  });

  return (
    <form
      className="card"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        if (!form.name.trim() || !form.price || Number(form.price) < 0) {
          setError('Name and a valid price are required.');
          return;
        }
        save.mutate();
      }}
    >
      <div className="card-header">
        <h3 className="text-sm font-semibold text-slate-800">{isEdit ? `Edit ${plan!.name}` : 'New plan'}</h3>
        <button type="button" className="rounded p-1 text-slate-400 hover:bg-surface-2" onClick={onClose} aria-label="Close">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="card-body">
        {error && <div className="mb-3"><ErrorBanner message={error} /></div>}

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Name" htmlFor="plan-name" required>
            <input id="plan-name" className="input" required maxLength={50}
              value={form.name} onChange={(e) => set('name')((e.target as HTMLInputElement).value)} />
          </Field>
          <Field label="Description" htmlFor="plan-description">
            <input id="plan-description" className="input" maxLength={500}
              value={form.description} onChange={(e) => set('description')((e.target as HTMLInputElement).value)} />
          </Field>
          <Field label="Price" htmlFor="plan-price" required>
            <input id="plan-price" type="number" min={0} step="0.01" className="input" required
              value={form.price} onChange={(e) => set('price')((e.target as HTMLInputElement).value)} />
          </Field>
          <Field label="Currency" htmlFor="plan-currency">
            <input id="plan-currency" className="input" maxLength={10}
              value={form.currency} onChange={(e) => set('currency')((e.target as HTMLInputElement).value)} />
          </Field>
          <Field label="Billing interval" htmlFor="plan-interval">
            <select id="plan-interval" className="input" value={form.interval}
              onChange={(e) => set('interval')((e.target as HTMLSelectElement).value)}>
              <option value="month">Monthly</option>
              <option value="year">Yearly</option>
            </select>
          </Field>
          <Field label="Max users (seats)" htmlFor="plan-max-users" hint="Leave blank for unlimited">
            <input id="plan-max-users" type="number" min={1} step="1" className="input"
              value={form.maxUsers} onChange={(e) => set('maxUsers')((e.target as HTMLInputElement).value)} />
          </Field>
          <Field label="Status" htmlFor="plan-active">
            <label className="flex h-9 items-center gap-2 text-sm text-slate-700">
              <input id="plan-active" type="checkbox" className="h-4 w-4 rounded border-slate-300"
                checked={form.isActive} onChange={(e) => set('isActive')((e.target as HTMLInputElement).checked)} />
              Available for new subscriptions
            </label>
          </Field>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <button type="submit" className="btn-primary btn-sm" disabled={save.isPending}>
            {save.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Tag className="h-3.5 w-3.5" />}
            {isEdit ? 'Save changes' : 'Create plan'}
          </button>
          <button type="button" className="btn-secondary btn-sm" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </form>
  );
}
