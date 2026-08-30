'use client';

import { useEffect, useState } from 'react';
import { CreditCard, Loader2, ShieldAlert } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import { usePermissions } from '@/lib/permissions';
import { useRazorpayCheckout } from './useRazorpayCheckout';
import { PlanPicker } from './PlanPicker';

const REASON_COPY: Record<string, string> = {
  no_subscription: 'This workspace has no plan assigned yet.',
  trial_expired: 'Your free trial has ended.',
  period_expired: 'Your subscription period has ended.',
  past_due: 'Your last payment did not go through.',
  cancelled: 'Your subscription was cancelled.',
};

/** Full-screen paywall shown to every user in a tenant with no active/trialing subscription. */
export function PaywallScreen() {
  const router = useRouter();
  const session = useAuthStore((s) => s.session);
  const logout = useAuthStore((s) => s.logout);
  const { can } = usePermissions();
  const { pay, isPaying, error } = useRazorpayCheckout();
  const [planId, setPlanId] = useState('');
  const [seats, setSeats] = useState(1);

  const billing = session?.billing;
  const reason = billing?.entitlementReason ?? 'no_subscription';
  const canPay = can('billing.manage');

  // A tenant already on a paid plan (past_due, period_expired) renews the
  // same plan by default; one with no plan or the free tier picks fresh.
  useEffect(() => {
    if (billing?.plan && Number(billing.plan.price) > 0 && !planId) {
      setPlanId(billing.plan.id);
      if (billing.seats) setSeats(billing.seats);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [billing?.plan]);

  async function handleLogout() {
    logout();
    router.push('/login');
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-1 px-4">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-50">
          <ShieldAlert className="h-6 w-6 text-amber-600" />
        </div>

        <h1 className="mt-4 text-lg font-semibold text-slate-800">Subscription required</h1>
        <p className="mt-1 text-sm text-slate-500">{REASON_COPY[reason] ?? REASON_COPY.no_subscription}</p>

        {canPay ? (
          <>
            <div className="mt-5 text-left">
              <PlanPicker value={planId} onChange={setPlanId} seats={seats} onSeatsChange={setSeats} />
            </div>

            <button
              className="btn-primary mt-4 w-full justify-center"
              id="paywall-pay-btn"
              onClick={() => pay(planId, seats)}
              disabled={isPaying || !planId}
            >
              {isPaying ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
              {isPaying ? 'Processing…' : 'Pay now'}
            </button>
            {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
          </>
        ) : (
          <p className="mt-6 text-sm text-slate-500">
            Ask your workspace Owner to renew the subscription to regain access.
          </p>
        )}

        <button
          className="mt-4 text-xs font-medium text-slate-400 hover:text-slate-600"
          onClick={handleLogout}
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
