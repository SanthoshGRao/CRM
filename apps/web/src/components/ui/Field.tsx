'use client';

import { clsx } from 'clsx';

interface FieldProps {
  label: string;
  htmlFor?: string;
  required?: boolean;
  error?: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}

export function Field({ label, htmlFor, required, error, hint, className, children }: FieldProps) {
  return (
    <div className={clsx('form-group', className)}>
      <label htmlFor={htmlFor} className="label">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
      {error && <p className="form-error">{error}</p>}
    </div>
  );
}

/** Read-only label/value pair used on detail pages. */
export function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5">
      <span className="text-xs font-medium text-slate-500">{label}</span>
      <span className="text-right text-sm text-slate-800">{children ?? '—'}</span>
    </div>
  );
}

export function ErrorBanner({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3">
      <p className="text-sm text-red-700">{message}</p>
    </div>
  );
}
