'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import { usePushStore } from '@/stores/push.store';
import api from '@/lib/api/client';

/**
 * No-ops outside the Android app shell (Capacitor.isNativePlatform() is only
 * true inside the WebView the native app loads) and in a plain browser tab.
 * Runs once per authenticated session to ask for notification permission,
 * grab an FCM token from the native bridge, and hand it to the backend.
 */
export function PushRegistration() {
  const status = useAuthStore((s) => s.status);
  const router = useRouter();
  const setDeviceToken = usePushStore((s) => s.setDeviceToken);
  const started = useRef(false);

  useEffect(() => {
    if (status !== 'authenticated' || started.current) return;
    started.current = true;

    (async () => {
      const { Capacitor } = await import('@capacitor/core');
      if (!Capacitor.isNativePlatform()) return;

      const { PushNotifications } = await import('@capacitor/push-notifications');

      const current = await PushNotifications.checkPermissions();
      let receive = current.receive;
      if (receive === 'prompt' || receive === 'prompt-with-rationale') {
        receive = (await PushNotifications.requestPermissions()).receive;
      }
      if (receive !== 'granted') return;

      await PushNotifications.addListener('registration', (token) => {
        setDeviceToken(token.value);
        api.post('/push-tokens', { token: token.value, platform: 'android' }).catch(() => {
          // A failed registration just means no push until the next app open — not fatal.
        });
      });

      await PushNotifications.addListener('registrationError', (err) => {
        console.error('Push registration failed', err);
      });

      await PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
        const data = action.notification.data as { taskId?: string } | undefined;
        if (data?.taskId) router.push(`/tasks/${data.taskId}`);
      });

      await PushNotifications.register();
    })();
  }, [status, router, setDeviceToken]);

  return null;
}
