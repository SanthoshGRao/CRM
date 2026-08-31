'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Popover } from '@/components/ui/Popover';
import { RecordSelect } from '@/components/ui/RecordSelect';
import { getErrorMessage } from '@/lib/api/errors';

interface StatusOption {
  value: string;
  label: string;
}

interface BulkActionBarProps {
  count: number;
  onClear: () => void;
  /** Field the "assign owner" action sets; omit to hide that action. */
  ownerField?: string;
  statusField?: string;
  statusOptions?: StatusOption[];
  onUpdate: (data: Record<string, unknown>) => Promise<unknown>;
  onDelete: () => Promise<unknown>;
  entityLabelPlural: string;
}

/** Assign owner / update status / delete, wired to an entity's bulk endpoints. Selection is owned by the caller. */
export function BulkActionBar({
  count,
  onClear,
  ownerField = 'ownerId',
  statusField = 'status',
  statusOptions,
  onUpdate,
  onDelete,
  entityLabelPlural,
}: BulkActionBarProps) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(action: () => Promise<unknown>) {
    setPending(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3 border-t bg-brand-50 px-4 py-2.5">
      <span className="text-sm font-medium text-brand-700">{count} selected</span>

      <Popover
        trigger={({ toggle }) => (
          <button className="btn-secondary btn-sm text-xs" onClick={toggle} disabled={pending}>
            Assign owner
          </button>
        )}
      >
        {({ close }) => (
          <div className="w-56 p-2.5">
            <RecordSelect
              source="users"
              value=""
              placeholder="Choose a user…"
              onChange={(userId) => {
                if (!userId) return;
                close();
                run(() => onUpdate({ [ownerField]: userId }));
              }}
            />
          </div>
        )}
      </Popover>

      {statusOptions && statusOptions.length > 0 && (
        <Popover
          trigger={({ toggle }) => (
            <button className="btn-secondary btn-sm text-xs" onClick={toggle} disabled={pending}>
              Update status
            </button>
          )}
        >
          {({ close }) => (
            <div className="flex w-44 flex-col gap-0.5 p-1.5">
              {statusOptions.map((opt) => (
                <button
                  key={opt.value}
                  className="rounded-md px-2.5 py-1.5 text-left text-sm text-slate-700 hover:bg-surface-2"
                  onClick={() => {
                    close();
                    run(() => onUpdate({ [statusField]: opt.value }));
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </Popover>
      )}

      <button
        className="btn-danger btn-sm text-xs"
        disabled={pending}
        onClick={() => {
          if (window.confirm(`Delete ${count} ${entityLabelPlural}? This cannot be undone.`)) run(onDelete);
        }}
      >
        Delete
      </button>

      {pending && <Loader2 className="h-3.5 w-3.5 animate-spin text-brand-600" />}
      {error && <span className="text-xs text-red-600">{error}</span>}

      <button className="ml-auto text-xs text-slate-500 hover:text-slate-700" onClick={onClear}>
        Clear selection
      </button>
    </div>
  );
}
