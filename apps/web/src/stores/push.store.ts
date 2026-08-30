import { create } from 'zustand';

interface PushState {
  deviceToken: string | null;
  setDeviceToken: (token: string | null) => void;
}

/** Tracks the current device's FCM token so logout can best-effort unregister it. */
export const usePushStore = create<PushState>((set) => ({
  deviceToken: null,
  setDeviceToken: (deviceToken) => set({ deviceToken }),
}));
