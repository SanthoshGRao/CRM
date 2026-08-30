/**
 * Whether a tenant's subscription currently entitles it to CRM access.
 *
 * Entitlement is computed on the fly rather than stored as a status, so a
 * lapsed trial or unrenewed period blocks access without needing a cron job
 * to flip a flag. `past_due`/`cancelled` are never entitled regardless of
 * date; `active`/`trialing` are entitled only while `currentPeriodEnd` hasn't
 * passed.
 */

export type EntitlementReason =
  | 'ok'
  | 'no_subscription'
  | 'trial_expired'
  | 'period_expired'
  | 'past_due'
  | 'cancelled';

export interface SubscriptionLike {
  status: string;
  currentPeriodEnd: Date | string;
}

export interface Entitlement {
  entitled: boolean;
  reason: EntitlementReason;
}

export function computeEntitlement(subscription: SubscriptionLike | null | undefined): Entitlement {
  if (!subscription) {
    return { entitled: false, reason: 'no_subscription' };
  }

  if (subscription.status === 'cancelled') {
    return { entitled: false, reason: 'cancelled' };
  }

  if (subscription.status === 'past_due') {
    return { entitled: false, reason: 'past_due' };
  }

  const periodEnd = new Date(subscription.currentPeriodEnd);
  const expired = periodEnd.getTime() <= Date.now();

  if (subscription.status === 'trialing' && expired) {
    return { entitled: false, reason: 'trial_expired' };
  }

  if (subscription.status === 'active' && expired) {
    return { entitled: false, reason: 'period_expired' };
  }

  if (subscription.status === 'active' || subscription.status === 'trialing') {
    return { entitled: true, reason: 'ok' };
  }

  return { entitled: false, reason: 'no_subscription' };
}

/** Whole days left until currentPeriodEnd; 0 once it's passed. */
export function daysLeftInTrial(subscription: SubscriptionLike | null | undefined): number {
  if (!subscription) return 0;
  const periodEnd = new Date(subscription.currentPeriodEnd);
  const msLeft = periodEnd.getTime() - Date.now();
  return Math.max(0, Math.ceil(msLeft / (24 * 60 * 60 * 1000)));
}
