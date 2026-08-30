'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { setAppPreferences } from '@/lib/utils';

/**
 * Applies the tenant's saved Settings → Preferences (timezone, currency,
 * date format, locale, brand colour) app-wide. Renders nothing — it just
 * keeps `formatDate`/`formatCurrency` and the --brand-accent CSS variable
 * in sync whenever the session (re)loads.
 */
export function PreferencesSync() {
  const settings = useAuthStore((s) => s.session?.tenant?.settings);

  useEffect(() => {
    if (!settings) return;
    setAppPreferences({
      dateFormat: settings.dateFormat,
      currency: settings.currency,
      locale: settings.locale,
      timezone: settings.timezone,
    });
    if (settings.brandColor) {
      document.documentElement.style.setProperty('--brand-accent', settings.brandColor);
    } else {
      document.documentElement.style.removeProperty('--brand-accent');
    }
  }, [settings]);

  return null;
}
