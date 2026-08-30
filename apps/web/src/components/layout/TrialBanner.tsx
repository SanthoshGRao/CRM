'use client';

import { Loader2 } from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import { usePermissions } from '@/lib/permissions';
import { useRazorpayCheckout } from '@/components/billing/useRazorpayCheckout';

/** Shown while a tenant is on an active trial, so nobody is surprised when it ends. */
export function TrialBanner() {
  const session = useAuthStore((s) => s.session);
  const { can } = usePermissions();
  const { pay, isPaying, error } = useRazorpayCheckout();

  const billing = session?.billing;
  if (!billing || billing.status !== 'trialing' || !billing.isEntitled) return null;

  // Only a plan that actually costs something can be paid for in one click
  // here; a free trial needs the plan picker in Settings → Billing instead.
  const onPaidPlan = Boolean(billing.plan && Number(billing.plan.price) > 0);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 bg-indigo-50 px-6 py-2">
      <div className="text-sm text-indigo-900">
        <span className="font-semibold">{billing.daysLeft} day{billing.daysLeft === 1 ? '' : 's'} left</span>{' '}
        in your trial{billing.plan ? <> — Plan: {billing.plan.name}</> : null}.
        {error && <span className="ml-2 text-red-600">{error}</span>}
      </div>
      {can('billing.manage') && onPaidPlan && (
        <button
          className="inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
          onClick={() => pay(billing.plan?.id)}
          disabled={isPaying}
        >
          {isPaying && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {isPaying ? 'Processing…' : 'Pay now'}
        </button>
      )}
    </div>
  );
}
