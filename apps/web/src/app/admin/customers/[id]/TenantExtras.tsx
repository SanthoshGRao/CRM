'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CreditCard, Globe, Loader2, Plus, Star, Trash2, X } from 'lucide-react';
import { clsx } from 'clsx';
import { adminTenantsApi, adminPlansApi } from '@/lib/api/admin-client';
import { getErrorMessage } from '@/lib/api/errors';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Field, DetailRow, ErrorBanner } from '@/components/ui/Field';

const FEATURE_LABELS: Record<string, string> = {
  crm: 'CRM',
  whatsapp: 'WhatsApp',
  automation: 'Automation',
  ai: 'AI',
  calling: 'Calling',
};

const featureLabel = (key: string) => FEATURE_LABELS[key] ?? key.replace(/[_-]/g, ' ').replace(/^./, (c) => c.toUpperCase());

const STATUS_BADGE: Record<string, string> = {
  active: 'badge-green',
  trialing: 'badge-blue',
  past_due: 'badge-yellow',
  cancelled: 'badge-red',
};

// ─── Subscription ──────────────────────────────────────────────────────────

export function SubscriptionCard({ tenantId, subscription }: { tenantId: string; subscription: any }) {
  const queryClient = useQueryClient();
  const [planId, setPlanId] = useState(subscription?.planId ?? '');
  const [error, setError] = useState<string | null>(null);

  const { data: plans = [] } = useQuery({ queryKey: ['admin', 'plans'], queryFn: () => adminPlansApi.list() });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['admin', 'tenant', tenantId] });
    queryClient.invalidateQueries({ queryKey: ['admin', 'plans'] });
  };

  const assign = useMutation({
    mutationFn: () => adminTenantsApi.upsertSubscription(tenantId, { planId }),
    onSuccess: invalidate,
    onError: (err) => setError(getErrorMessage(err)),
  });

  const cancel = useMutation({
    mutationFn: () => adminTenantsApi.cancelSubscription(tenantId),
    onSuccess: invalidate,
    onError: (err) => setError(getErrorMessage(err)),
  });

  const activePlans: any[] = plans.filter((p: any) => p.isActive || p.id === subscription?.planId);
  const isSamePlan = subscription?.planId === planId;

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="text-sm font-semibold text-slate-800">Subscription</h3>
        <CreditCard className="h-4 w-4 text-slate-400" />
      </div>
      <div className="card-body">
        {error && <div className="mb-3"><ErrorBanner message={error} /></div>}

        {subscription ? (
          <div className="divide-y divide-slate-100">
            <DetailRow label="Plan">{subscription.plan?.name ?? '—'}</DetailRow>
            <DetailRow label="Price">
              {subscription.plan ? `${formatCurrency(Number(subscription.plan.price), subscription.plan.currency)} / ${subscription.plan.interval}` : '—'}
            </DetailRow>
            <DetailRow label="Status">
              <span className={clsx('badge', STATUS_BADGE[subscription.status] ?? 'badge-gray')}>{subscription.status}</span>
            </DetailRow>
            <DetailRow label="Current period">
              {formatDate(subscription.currentPeriodStart)} → {formatDate(subscription.currentPeriodEnd)}
            </DetailRow>
            {subscription.cancelledAt && <DetailRow label="Cancelled">{formatDate(subscription.cancelledAt)}</DetailRow>}
          </div>
        ) : (
          <p className="mb-3 text-sm text-slate-500">This workspace has no subscription yet.</p>
        )}

        <div className="mt-3 flex items-end gap-2">
          <Field label={subscription ? 'Change plan' : 'Assign plan'} htmlFor="sub-plan" className="flex-1">
            <select id="sub-plan" className="input" value={planId} onChange={(e) => setPlanId((e.target as HTMLSelectElement).value)}>
              <option value="">Select a plan…</option>
              {activePlans.map((p: any) => (
                <option key={p.id} value={p.id}>{p.name} — {formatCurrency(Number(p.price), p.currency)}/{p.interval}</option>
              ))}
            </select>
          </Field>
          <button
            className="btn-primary btn-sm"
            disabled={!planId || isSamePlan || assign.isPending}
            onClick={() => assign.mutate()}
          >
            {assign.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            {subscription ? 'Update' : 'Assign'}
          </button>
        </div>

        {subscription && subscription.status !== 'cancelled' && (
          <button
            className="btn-danger btn-sm mt-3"
            disabled={cancel.isPending}
            onClick={() => { if (window.confirm('Cancel this subscription?')) cancel.mutate(); }}
          >
            {cancel.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            Cancel subscription
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Feature flags ─────────────────────────────────────────────────────────

export function FeatureFlagsCard({ tenantId, features }: { tenantId: string; features: any[] }) {
  const queryClient = useQueryClient();
  const [newFeature, setNewFeature] = useState('');
  const [error, setError] = useState<string | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin', 'tenant', tenantId] });

  const toggle = useMutation({
    mutationFn: ({ feature, enabled }: { feature: string; enabled: boolean }) =>
      adminTenantsApi.setFeature(tenantId, feature, { enabled }),
    onSuccess: invalidate,
    onError: (err) => setError(getErrorMessage(err)),
  });

  const add = useMutation({
    mutationFn: (feature: string) => adminTenantsApi.setFeature(tenantId, feature, { enabled: true }),
    onSuccess: () => { setNewFeature(''); invalidate(); },
    onError: (err) => setError(getErrorMessage(err)),
  });

  const known = new Set(features.map((f) => f.feature));

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="text-sm font-semibold text-slate-800">Feature flags</h3>
      </div>
      <div className="card-body">
        {error && <div className="mb-3"><ErrorBanner message={error} /></div>}

        <div className="divide-y divide-slate-100">
          {features.length === 0 && <p className="py-2 text-sm text-slate-500">No features configured.</p>}
          {features.map((f) => (
            <label key={f.feature} className="flex items-center justify-between gap-4 py-2.5">
              <span className="text-sm text-slate-700">{featureLabel(f.feature)}</span>
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300"
                checked={f.enabled}
                disabled={toggle.isPending}
                onChange={(e) => toggle.mutate({ feature: f.feature, enabled: (e.target as HTMLInputElement).checked })}
              />
            </label>
          ))}
        </div>

        <div className="mt-3 flex items-center gap-2">
          <input
            className="input flex-1"
            placeholder="custom-feature-key"
            maxLength={50}
            value={newFeature}
            onChange={(e) => setNewFeature((e.target as HTMLInputElement).value.trim())}
          />
          <button
            className="btn-secondary btn-sm"
            disabled={!newFeature || known.has(newFeature) || add.isPending}
            onClick={() => add.mutate(newFeature)}
          >
            {add.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            Add
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Custom domains ─────────────────────────────────────────────────────────

export function DomainsCard({ tenantId, domains }: { tenantId: string; domains: any[] }) {
  const queryClient = useQueryClient();
  const [newDomain, setNewDomain] = useState('');
  const [error, setError] = useState<string | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin', 'tenant', tenantId] });

  const add = useMutation({
    mutationFn: () => adminTenantsApi.addDomain(tenantId, { domain: newDomain }),
    onSuccess: () => { setNewDomain(''); invalidate(); },
    onError: (err) => setError(getErrorMessage(err)),
  });

  const update = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: any }) => adminTenantsApi.updateDomain(tenantId, id, dto),
    onSuccess: invalidate,
    onError: (err) => setError(getErrorMessage(err)),
  });

  const remove = useMutation({
    mutationFn: (id: string) => adminTenantsApi.removeDomain(tenantId, id),
    onSuccess: invalidate,
    onError: (err) => setError(getErrorMessage(err)),
  });

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="text-sm font-semibold text-slate-800">Custom domains</h3>
        <Globe className="h-4 w-4 text-slate-400" />
      </div>
      <div className="card-body">
        {error && <div className="mb-3"><ErrorBanner message={error} /></div>}

        {domains.length === 0 ? (
          <p className="mb-3 text-sm text-slate-500">No custom domains attached to this workspace.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {domains.map((d) => (
              <div key={d.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-800">{d.domain}</span>
                  {d.isPrimary && <span className="badge badge-blue">Primary</span>}
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 text-xs text-slate-500">
                    <input
                      type="checkbox"
                      className="h-3.5 w-3.5 rounded border-slate-300"
                      checked={d.verified}
                      disabled={update.isPending}
                      onChange={(e) => update.mutate({ id: d.id, dto: { verified: (e.target as HTMLInputElement).checked } })}
                    />
                    Verified
                  </label>
                  {!d.isPrimary && (
                    <button
                      className="rounded p-1 text-slate-400 hover:bg-surface-2 hover:text-brand-600"
                      aria-label="Make primary"
                      title="Make primary"
                      disabled={update.isPending}
                      onClick={() => update.mutate({ id: d.id, dto: { isPrimary: true } })}
                    >
                      <Star className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <button
                    className="rounded p-1 text-slate-400 hover:bg-surface-2 hover:text-red-600"
                    aria-label="Remove domain"
                    disabled={remove.isPending}
                    onClick={() => { if (window.confirm(`Remove ${d.domain}?`)) remove.mutate(d.id); }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-3 flex items-center gap-2">
          <input
            className="input flex-1"
            placeholder="crm.customer.com"
            maxLength={255}
            value={newDomain}
            onChange={(e) => setNewDomain((e.target as HTMLInputElement).value.trim())}
          />
          <button
            className="btn-secondary btn-sm"
            disabled={!newDomain || add.isPending}
            onClick={() => add.mutate()}
          >
            {add.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
