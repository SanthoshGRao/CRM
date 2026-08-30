'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CreditCard, Loader2 } from 'lucide-react';
import { clsx } from 'clsx';
import { billingApi } from '@/lib/api/services';
import { getErrorMessage } from '@/lib/api/errors';
import { formatDate } from '@/lib/utils';
import { usePermissions } from '@/lib/permissions';
import { DetailRow, ErrorBanner } from '@/components/ui/Field';
import { useRazorpayCheckout } from '@/components/billing/useRazorpayCheckout';
import { PlanPicker } from '@/components/billing/PlanPicker';

const STATUS_LABEL: Record<string, string> = {
  active: 'Active',
  trialing: 'Trial',
  past_due: 'Payment failed',
  cancelled: 'Cancelled',
};

export function BillingPanel() {
  const { can } = usePermissions();
  const { pay, isPaying, error } = useRazorpayCheckout();
  const [planId, setPlanId] = useState('');
  const [seats, setSeats] = useState(1);
  const [changingPlan, setChangingPlan] = useState(false);

  const { data: subscription, isLoading, isError, error: loadError } = useQuery({
    queryKey: ['billing', 'subscription'],
    queryFn: () => billingApi.getSubscription(),
  });

  const { data: payments = [] } = useQuery({
    queryKey: ['billing', 'payments'],
    queryFn: () => billingApi.getPayments(),
    enabled: can('billing.view'),
  });

  // A tenant already paying for a real plan can just renew it by default;
  // one with no plan or the free tier has to pick something first.
  const onPaidPlan = Boolean(subscription?.plan) && Number(subscription?.plan?.price) > 0;

  useEffect(() => {
    if (onPaidPlan && !planId) {
      setPlanId(subscription.plan.id);
      setSeats(subscription.seats ?? 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onPaidPlan, subscription?.plan?.id]);

  if (isLoading) return <div className="skeleton h-64 max-w-2xl" />;
  if (isError) return <ErrorBanner message={getErrorMessage(loadError, 'Could not load billing details.')} />;

  const canPay = can('billing.manage');
  const needsPlanPick = !onPaidPlan || !subscription?.isEntitled;
  const showPicker = needsPlanPick || changingPlan;

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <div className="card">
        <div className="card-header"><h3 className="text-sm font-semibold text-slate-800">Plan</h3></div>
        <div className="card-body divide-y divide-slate-100">
          {subscription?.plan ? (
            <>
              <DetailRow label="Plan">{subscription.plan.name}</DetailRow>
              <DetailRow label="Price">
                {subscription.plan.currency} {subscription.plan.price} / user / {subscription.plan.interval}
              </DetailRow>
              {subscription.seats != null && (
                <DetailRow label="Seats">
                  {subscription.seatsUsed} of {subscription.seats} used
                </DetailRow>
              )}
              <DetailRow label="Status">
                <span className={clsx('badge', subscription.isEntitled ? 'badge-green' : 'badge-gray')}>
                  {STATUS_LABEL[subscription.status] ?? subscription.status}
                </span>
              </DetailRow>
              <DetailRow label={subscription.status === 'trialing' ? 'Trial ends' : 'Renews'}>
                {subscription.currentPeriodEnd ? formatDate(subscription.currentPeriodEnd) : '—'}
                {subscription.status === 'trialing' && ` (${subscription.daysLeft} day${subscription.daysLeft === 1 ? '' : 's'} left)`}
              </DetailRow>
            </>
          ) : (
            <DetailRow label="Plan">No plan assigned yet — contact support.</DetailRow>
          )}
        </div>

        {canPay && (
          <div className="border-t border-slate-100 p-4">
            {showPicker && (
              <div className="mb-3">
                <PlanPicker
                  value={planId}
                  onChange={setPlanId}
                  seats={seats}
                  onSeatsChange={setSeats}
                  minSeats={subscription?.seatsUsed ?? 1}
                />
              </div>
            )}

            <div className="flex items-center gap-2">
              <button
                className="btn-primary"
                id="billing-pay-btn"
                onClick={() => pay(planId, seats)}
                disabled={isPaying || !planId}
              >
                {isPaying ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                {isPaying ? 'Processing…' : showPicker ? 'Pay now' : 'Renew now'}
              </button>
              {!needsPlanPick && (
                <button
                  type="button"
                  className="btn-secondary btn-sm"
                  onClick={() => {
                    // Cancelling reverts the selection to the plan/seats actually being renewed.
                    if (changingPlan && subscription?.plan) {
                      setPlanId(subscription.plan.id);
                      setSeats(subscription.seats ?? 1);
                    }
                    setChangingPlan((v) => !v);
                  }}
                >
                  {changingPlan ? 'Cancel' : 'Change plan'}
                </button>
              )}
            </div>
            {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
          </div>
        )}
        {!canPay && (
          <div className="border-t border-slate-100 p-4">
            <p className="text-xs text-slate-400">Only the workspace Owner can make payments.</p>
          </div>
        )}
      </div>

      {subscription?.plan?.features && Object.keys(subscription.plan.features).length > 0 && (
        <div className="card">
          <div className="card-header"><h3 className="text-sm font-semibold text-slate-800">Features</h3></div>
          <div className="card-body divide-y divide-slate-100">
            {Object.entries(subscription.plan.features as Record<string, unknown>).map(([key, value]) => (
              <DetailRow key={key} label={key.replace(/_/g, ' ')}>{String(value)}</DetailRow>
            ))}
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header"><h3 className="text-sm font-semibold text-slate-800">Payment history</h3></div>
        <div className="overflow-x-auto">
          {payments.length === 0 ? (
            <p className="p-4 text-sm text-slate-400">No payments yet.</p>
          ) : (
            <table className="data-table">
              <thead className="table-header">
                <tr><th>Date</th><th>Plan</th><th>Amount</th><th>Status</th></tr>
              </thead>
              <tbody>
                {payments.map((p: any) => (
                  <tr key={p.id} className="table-row cursor-default">
                    <td className="text-slate-600">{formatDate(p.createdAt)}</td>
                    <td className="text-slate-600">{p.plan?.name ?? '—'}</td>
                    <td className="text-slate-600">{p.currency} {p.amount}</td>
                    <td>
                      <span className={clsx('badge', p.status === 'captured' ? 'badge-green' : 'badge-gray')}>
                        {p.status}
                      </span>
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
