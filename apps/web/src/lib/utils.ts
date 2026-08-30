import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Workspace-wide regional preferences (Settings → Preferences). Kept as a
 * module-level default so the ~40 existing `formatDate`/`formatCurrency`
 * call sites pick up the tenant's saved settings without threading props —
 * see PreferencesSync, which calls setAppPreferences() from the session.
 */
export interface AppPreferences {
  dateFormat: string;
  currency: string;
  locale: string;
  timezone: string;
}

let currentPreferences: AppPreferences = {
  dateFormat: 'DD/MM/YYYY',
  currency: 'INR',
  locale: 'en-IN',
  timezone: 'Asia/Kolkata',
};

export function setAppPreferences(prefs: Partial<AppPreferences>) {
  currentPreferences = { ...currentPreferences, ...prefs };
}

/** Just the symbol ("₹", "$", "€"…) for compact displays that build their own "12.5L"/"12K" suffixes. */
export function getCurrencySymbol(currency = currentPreferences.currency): string {
  return (
    new Intl.NumberFormat(currentPreferences.locale, {
      style: 'currency',
      currency,
      currencyDisplay: 'narrowSymbol',
      maximumFractionDigits: 0,
    })
      .formatToParts(0)
      .find((p) => p.type === 'currency')?.value ?? currency
  );
}

export function formatCurrency(amount: number, currency = currentPreferences.currency): string {
  return new Intl.NumberFormat(currentPreferences.locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: string | Date, format = currentPreferences.dateFormat): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: currentPreferences.timezone,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).formatToParts(new Date(date));
  const day = parts.find((p) => p.type === 'day')?.value ?? '';
  const month = parts.find((p) => p.type === 'month')?.value ?? '';
  const year = parts.find((p) => p.type === 'year')?.value ?? '';

  switch (format) {
    case 'MM/DD/YYYY':
      return `${month}/${day}/${year}`;
    case 'YYYY-MM-DD':
      return `${year}-${month}-${day}`;
    case 'DD/MM/YYYY':
    default:
      return `${day}/${month}/${year}`;
  }
}

export function formatRelativeTime(date: string | Date): string {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMinutes < 1) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(date);
}

export function getInitials(firstName: string, lastName: string): string {
  return `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase();
}

export function truncate(str: string, length: number): string {
  return str.length > length ? `${str.substring(0, length)}...` : str;
}
