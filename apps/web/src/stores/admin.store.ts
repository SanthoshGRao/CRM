import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface PlatformAdmin {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

interface AdminState {
  accessToken: string | null;
  admin: PlatformAdmin | null;
  isAuthenticated: boolean;

  setSession: (token: string, admin: PlatformAdmin) => void;
  logout: () => void;
}

/**
 * Platform-staff session. Deliberately separate from the customer auth store —
 * the two tokens are signed with different secrets and must never mix.
 */
export const useAdminStore = create<AdminState>()(
  persist(
    (set) => ({
      accessToken: null,
      admin: null,
      isAuthenticated: false,

      setSession: (accessToken, admin) => set({ accessToken, admin, isAuthenticated: true }),
      logout: () => set({ accessToken: null, admin: null, isAuthenticated: false }),
    }),
    { name: 'crm-admin-auth' },
  ),
);
