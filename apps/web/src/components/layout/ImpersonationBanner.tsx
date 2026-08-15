'use client';

import { useState } from 'react';
import { ShieldCheck, LogOut } from 'lucide-react';
import api from '@/lib/api/client';
import { useAuthStore } from '@/stores/auth.store';

/**
 * Shown while platform staff are working inside a customer workspace, so it is
 * never ambiguous whose data is on screen.
 */
export function ImpersonationBanner() {
  const session = useAuthStore((s) => s.session) as any;
  const logout = useAuthStore((s) => s.logout);
  const [leaving, setLeaving] = useState(false);

  const impersonation = session?.impersonation;
  if (!impersonation) return null;

  async function exitWorkspace() {
    setLeaving(true);
    try {
      // Revokes the staff session server-side and clears its refresh cookie —
      // otherwise the workspace would come back on the next reload.
      await api.post('/auth/logout');
    } catch {
      // Leaving matters even if the call fails.
    }
    logout();
    // Full navigation so the CRM tree tears down instead of racing its guard.
    window.location.href = '/admin/customers';
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 bg-amber-500 px-6 py-2">
      <div className="flex items-center gap-2 text-sm text-amber-950">
        <ShieldCheck className="h-4 w-4 shrink-0" />
        <span>
          Staff session — you are working inside{' '}
          <span className="font-semibold">{session?.tenant?.name}</span> as {impersonation.by}.
        </span>
      </div>
      <button
        className="inline-flex items-center gap-1.5 rounded-md bg-amber-950/10 px-2.5 py-1 text-xs font-medium text-amber-950 hover:bg-amber-950/20 disabled:opacity-60"
        onClick={exitWorkspace}
        disabled={leaving}
      >
        <LogOut className="h-3.5 w-3.5" /> {leaving ? 'Leaving…' : 'Exit workspace'}
      </button>
    </div>
  );
}
