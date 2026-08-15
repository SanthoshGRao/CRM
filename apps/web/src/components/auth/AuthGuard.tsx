'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { isNetworkError, refreshAccessToken } from '@/lib/api/client';
import { authApi } from '@/lib/api/services';
import { useAuthStore } from '@/stores/auth.store';

/**
 * Restores the in-memory access token before rendering the CRM.
 *
 * The token is never persisted, so on every reload the app starts with nothing
 * but the HttpOnly refresh cookie. Without this the first API call would 401 and
 * the interceptor would bounce the user to /login — which is what "it logs me
 * out every time I reload" looked like.
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const status = useAuthStore((s) => s.status);

  // Gates the first client render so the server-rendered HTML and the hydrated
  // tree agree, regardless of what is in localStorage.
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    let cancelled = false;
    const store = useAuthStore.getState();

    // Already restored in this tab (client-side navigation, not a reload).
    if (store.accessToken) {
      store.setStatus('authenticated');
      return;
    }

    store.setStatus('restoring');

    (async () => {
      try {
        const token = await refreshAccessToken();

        // Roles and permissions may have changed since they were cached.
        try {
          const fresh = await authApi.me();
          if (!cancelled) useAuthStore.getState().setSession(token, fresh);
        } catch {
          // Token is valid; keep the cached session rather than failing the boot.
          if (!cancelled) useAuthStore.getState().setStatus('authenticated');
        }
      } catch (error) {
        if (cancelled) return;

        // The API never answered (restarting, offline). Signing out over that
        // would lose a session that is probably still fine, so keep the cached
        // one and let individual requests retry.
        if (isNetworkError(error) && useAuthStore.getState().session) {
          useAuthStore.getState().setStatus('authenticated');
          return;
        }

        useAuthStore.getState().logout();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!mounted || status !== 'anonymous') return;

    const next = encodeURIComponent(pathname ?? '/dashboard');
    router.replace(`/login?next=${next}`);
  }, [mounted, status, pathname, router]);

  if (!mounted || status !== 'authenticated') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
        <span className="sr-only">Restoring your session…</span>
      </div>
    );
  }

  return <>{children}</>;
}
