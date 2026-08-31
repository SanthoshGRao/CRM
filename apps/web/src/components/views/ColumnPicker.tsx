'use client';

import { Columns, ChevronUp, ChevronDown, X } from 'lucide-react';
import { Popover } from '@/components/ui/Popover';
import { fieldsFor } from '@/lib/views/entityFields';
import type { SavedViewEntityType } from '@crm/types';

interface ColumnPickerProps {
  entityType: SavedViewEntityType;
  value: string[];
  onChange: (columns: string[]) => void;
}

/** Which columns show on a list table, and in what order. Always includes at least one column. */
export function ColumnPicker({ entityType, value, onChange }: ColumnPickerProps) {
  const fields = fieldsFor(entityType);
  const visible = value.map((key) => fields.find((f) => f.key === key)).filter((f): f is NonNullable<typeof f> => Boolean(f));
  const hidden = fields.filter((f) => !value.includes(f.key));

  function move(index: number, dir: -1 | 1) {
    const next = [...value];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  function remove(key: string) {
    if (value.length <= 1) return;
    onChange(value.filter((k) => k !== key));
  }

  function add(key: string) {
    onChange([...value, key]);
  }

  return (
    <Popover
      align="right"
      panelClassName="w-64"
      trigger={({ toggle }) => (
        <button className="btn-secondary btn-sm" id="column-picker-btn" onClick={toggle}>
          <Columns className="h-3.5 w-3.5" /> Columns
        </button>
      )}
    >
      {() => (
        <div className="max-h-[70vh] overflow-y-auto p-3">
          <p className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Visible</p>
          <div className="flex flex-col gap-0.5">
            {visible.map((field, index) => (
              <div key={field.key} className="group flex items-center gap-1 rounded-md px-1 py-1 hover:bg-surface-2">
                <span className="flex-1 text-sm text-slate-700">{field.label}</span>
                <button
                  className="rounded p-0.5 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                  aria-label={`Move ${field.label} up`}
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                >
                  <ChevronUp className="h-3.5 w-3.5" />
                </button>
                <button
                  className="rounded p-0.5 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                  aria-label={`Move ${field.label} down`}
                  disabled={index === visible.length - 1}
                  onClick={() => move(index, 1)}
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
                <button
                  className="rounded p-0.5 text-slate-400 hover:text-red-600 disabled:opacity-30"
                  aria-label={`Remove ${field.label}`}
                  disabled={value.length <= 1}
                  onClick={() => remove(field.key)}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>

          {hidden.length > 0 && (
            <>
              <p className="mb-1.5 mt-3 px-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Hidden</p>
              <div className="flex flex-col gap-0.5">
                {hidden.map((field) => (
                  <button
                    key={field.key}
                    className="flex items-center rounded-md px-1 py-1 text-left text-sm text-slate-500 hover:bg-surface-2 hover:text-slate-800"
                    onClick={() => add(field.key)}
                  >
                    + {field.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </Popover>
  );
}
