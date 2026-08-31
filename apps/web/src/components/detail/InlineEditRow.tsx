'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2, Pencil } from 'lucide-react';
import { clsx } from 'clsx';
import { RecordSelect } from '@/components/ui/RecordSelect';
import { getErrorMessage } from '@/lib/api/errors';

interface SelectOption {
  value: string;
  label: string;
}

interface InlineEditRowProps {
  label: string;
  /** Raw value the edit control starts from. */
  value: string | number | null | undefined;
  /** Read-only rendering, e.g. a link or badge. Defaults to the raw value. */
  display?: React.ReactNode;
  editable?: boolean;
  type?: 'text' | 'number' | 'date' | 'select' | 'record';
  options?: SelectOption[];
  recordSource?: 'users' | 'companies' | 'contacts';
  onSave: (value: string | number | null) => Promise<unknown>;
}

/** A DetailRow that becomes an inline input on click, and PATCHes on save instead of opening the full edit form. */
export function InlineEditRow({
  label,
  value,
  display,
  editable = true,
  type = 'text',
  options,
  recordSource,
  onSave,
}: InlineEditRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<string>(value == null ? '' : String(value));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) inputRef.current.focus();
  }, [isEditing]);

  useEffect(() => {
    if (!isEditing) setDraft(value == null ? '' : String(value));
  }, [value, isEditing]);

  function cancel() {
    setDraft(value == null ? '' : String(value));
    setError(null);
    setIsEditing(false);
  }

  async function commit(nextRaw: string) {
    const next = nextRaw.trim();
    const previous = value == null ? '' : String(value);
    if (next === previous) {
      setIsEditing(false);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave(next === '' ? null : type === 'number' ? Number(next) : next);
      setIsEditing(false);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  if (!editable) {
    return (
      <div className="flex items-start justify-between gap-4 py-2.5">
        <span className="text-xs font-medium text-slate-500">{label}</span>
        <span className="text-right text-sm text-slate-800">{display ?? (value ?? '—')}</span>
      </div>
    );
  }

  if (!isEditing) {
    // A caller-supplied `display` may itself contain a link (e.g. to the linked
    // contact/company) — nesting that inside a clickable button would be invalid
    // HTML, so only the plain-value case is a single click target. When `display`
    // is set, the pencil button is the click target instead.
    if (display !== undefined) {
      return (
        <div className="group flex items-start justify-between gap-4 py-2.5">
          <span className="pt-0.5 text-xs font-medium text-slate-500">{label}</span>
          <span className="inline-flex items-center gap-1.5 text-right text-sm text-slate-800">
            {display}
            <button
              type="button"
              aria-label={`Edit ${label}`}
              className="rounded p-0.5 text-slate-300 opacity-0 hover:bg-surface-2 hover:text-slate-500 transition-opacity group-hover:opacity-100"
              onClick={() => setIsEditing(true)}
            >
              <Pencil className="h-3 w-3" />
            </button>
          </span>
        </div>
      );
    }
    return (
      <div className="group flex items-start justify-between gap-4 py-2.5">
        <span className="pt-0.5 text-xs font-medium text-slate-500">{label}</span>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded px-1 -mr-1 text-right text-sm text-slate-800 hover:bg-surface-2"
          onClick={() => setIsEditing(true)}
        >
          {value != null && value !== '' ? value : '—'}
          <Pencil className="h-3 w-3 text-slate-300 opacity-0 transition-opacity group-hover:opacity-100" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <span className="pt-1.5 text-xs font-medium text-slate-500">{label}</span>
      <div className="flex w-48 flex-col items-end gap-1">
        <div className="flex w-full items-center gap-1.5">
          {type === 'record' && recordSource ? (
            <RecordSelect source={recordSource} value={draft} onChange={(v) => { setDraft(v); commit(v); }} disabled={saving} />
          ) : type === 'select' && options ? (
            <select
              className="input !py-1.5 text-xs"
              value={draft}
              disabled={saving}
              onChange={(e) => { const v = (e.target as HTMLSelectElement).value; setDraft(v); commit(v); }}
            >
              <option value="">—</option>
              {options.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          ) : (
            <input
              ref={inputRef}
              type={type === 'number' ? 'number' : type === 'date' ? 'date' : 'text'}
              className={clsx('input !py-1.5 text-xs', saving && 'opacity-60')}
              value={type === 'date' && draft ? draft.slice(0, 10) : draft}
              disabled={saving}
              onChange={(e) => setDraft((e.target as HTMLInputElement).value)}
              onBlur={(e) => commit((e.target as HTMLInputElement).value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                if (e.key === 'Escape') cancel();
              }}
            />
          )}
          {saving && <Loader2 className="h-3.5 w-3.5 flex-shrink-0 animate-spin text-slate-400" />}
        </div>
        {error && <p className="text-[11px] text-red-600">{error}</p>}
      </div>
    </div>
  );
}
