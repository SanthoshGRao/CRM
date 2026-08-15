import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthSession } from '@crm/types';

interface AuthState {
  accessToken: string | null;
  session: AuthSession | null;
  isAuthenticated: boolean;

  /**
   * The access token lives in memory only, so every reload starts without one
   * and has to trade the refresh cookie for a new token. Until that settles we
   * cannot tell "signed out" from "not restored yet".
   */
  status: 'restoring' | 'authenticated' | 'anonymous';

  setAccessToken: (token: string) => void;
  setSession: (token: string, session: AuthSession) => void;
  setStatus: (status: AuthState['status']) => void;
  logout: () => void;

  // Derived helpers
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (...permissions: string[]) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      session: null,
      isAuthenticated: false,
      status: 'restoring',

      setAccessToken: (token) =>
        set({ accessToken: token, isAuthenticated: true, status: 'authenticated' }),

      setSession: (token, session) =>
        set({ accessToken: token, session, isAuthenticated: true, status: 'authenticated' }),

      setStatus: (status) => set({ status }),

      logout: () =>
        set({ accessToken: null, session: null, isAuthenticated: false, status: 'anonymous' }),

      hasPermission: (permission) => {
        const { session } = get();
        return session?.permissions?.includes(permission) ?? false;
      },

      hasAnyPermission: (...permissions) => {
        const { session } = get();
        const userPerms = session?.permissions ?? [];
        return permissions.some((p) => userPerms.includes(p));
      },
    }),
    {
      name: 'crm-auth',
      // Only the session descriptor is persisted — the access token stays in
      // memory and is re-minted from the refresh cookie on boot.
      partialize: (state) => ({ session: state.session, isAuthenticated: state.isAuthenticated }),
    },
  ),
);
