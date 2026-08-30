'use client';

import { useAuthStore } from '@/stores/auth.store';
import { PaywallScreen } from './PaywallScreen';

/** Blocks the CRM shell for every user in a tenant without an entitled subscription. */
export function PaywallGate({ children }: { children: React.ReactNode }) {
  // Fails closed: a session with no billing block at all (rather than one
  // explicitly saying isEntitled: false) should never read as entitled.
  const isEntitled = useAuthStore((s) => s.session?.billing?.isEntitled ?? false);

  if (!isEntitled) {
    return <PaywallScreen />;
  }

  return <>{children}</>;
}
