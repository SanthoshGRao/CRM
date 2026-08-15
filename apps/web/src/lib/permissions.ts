'use client';

import { useAuthStore } from '@/stores/auth.store';

/**
 * Permission helpers for the CRM UI.
 *
 * These hide controls a user cannot use — they are not the security boundary.
 * The API enforces the same permissions on every request, so a hidden button
 * that someone re-enables in devtools still fails server-side.
 */
export function usePermissions() {
  const session = useAuthStore((s) => s.session) as any;
  const permissions: string[] = session?.permissions ?? [];

  const can = (permission: string) => permissions.includes(permission);
  const canAny = (...list: string[]) => list.some((p) => permissions.includes(p));
  const canAll = (...list: string[]) => list.every((p) => permissions.includes(p));

  return {
    can,
    canAny,
    canAll,
    permissions,
    roles: (session?.roles ?? []) as string[],
    /** 'OWN' means this user only sees records they own. */
    dataScope: (session?.dataScope ?? 'COMPANY') as string,
    isOwnScoped: (session?.dataScope ?? 'COMPANY') === 'OWN',
    isImpersonating: Boolean(session?.impersonation),
  };
}
