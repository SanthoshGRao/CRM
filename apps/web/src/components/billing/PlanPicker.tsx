'use client';

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Minus, Plus } from 'lucide-react';
import { clsx } from 'clsx';
import { billingApi } from '@/lib/api/services';

interface PlanPickerProps {
  value: string;
  onChange: (planId: string) => void;
  seats: number;
  onSeatsChange: (seats: number) => void;
  /** Seats already in use — the stepper never goes below this. */
  minSeats?: number;
}

/** Radio list of paid plans plus a seat count, with a live total for what's selected. */
export function PlanPicker({ value, onChange, seats, onSeatsChange, minSeats = 1 }: PlanPickerProps) {
  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['billing', 'plans'],
    queryFn: () => billingApi.getPlans(),
    staleTime: 60_000,
  });

  const selected = (plans as any[]).find((p) => p.id === value);
  const maxSeats = selected?.features?.maxUsers ?? undefined;

  // Keep the seat count valid as the plan (and its ceiling) changes.
  useEffect(() => {
    if (!selected) return;
    const floor = Math.max(minSeats, 1);
    const ceiling = maxSeats ?? Infinity;
    const clamped = Math.min(Math.max(seats, floor), ceiling);
    if (clamped !== seats) onSeatsChange(clamped);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id]);

  if (isLoading) return <div className="skeleton h-20" />;

  if ((plans as any[]).length === 0) {
    return <p className="text-sm text-slate-400">No paid plans are available yet — contact support.</p>;
  }

  const step = (delta: number) => {
    const floor = Math.max(minSeats, 1);
    const ceiling = maxSeats ?? Infinity;
    onSeatsChange(Math.min(Math.max(seats + delta, floor), ceiling));
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {(plans as any[]).map((p) => (
          <label
            key={p.id}
            className={clsx(
              'flex cursor-pointer items-center justify-between rounded-lg border p-3',
              value === p.id ? 'border-brand-600 bg-brand-50' : 'border-slate-200 hover:border-slate-300',
            )}
          >
            <span className="flex items-center gap-2.5">
              <input type="radio" name="plan" className="h-4 w-4" checked={value === p.id} onChange={() => onChange(p.id)} />
              <span className="text-sm font-medium text-slate-800">{p.name}</span>
            </span>
            <span className="text-right text-sm text-slate-500">
              {p.currency} {p.price} / user / {p.interval}
              {p.features?.maxUsers && <span className="block text-xs text-slate-400">up to {p.features.maxUsers} seats</span>}
            </span>
          </label>
        ))}
      </div>

      {selected && (
        <div className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
          <div>
            <p className="text-sm font-medium text-slate-800">Seats</p>
            {maxSeats && <p className="text-xs text-slate-400">Up to {maxSeats} on {selected.name}</p>}
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="rounded-md border border-slate-200 p-1.5 text-slate-500 hover:bg-surface-2 disabled:opacity-40"
              onClick={() => step(-1)}
              disabled={seats <= Math.max(minSeats, 1)}
              aria-label="Fewer seats"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <span className="w-6 text-center text-sm font-semibold text-slate-800">{seats}</span>
            <button
              type="button"
              className="rounded-md border border-slate-200 p-1.5 text-slate-500 hover:bg-surface-2 disabled:opacity-40"
              onClick={() => step(1)}
              disabled={maxSeats != null && seats >= maxSeats}
              aria-label="More seats"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {selected && (
        <p className="text-right text-sm text-slate-600">
          Total: <span className="font-semibold text-slate-900">{selected.currency} {(Number(selected.price) * seats).toFixed(2)}</span> / {selected.interval}
        </p>
      )}
    </div>
  );
}
