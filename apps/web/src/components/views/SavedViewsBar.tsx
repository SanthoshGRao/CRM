'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clsx } from 'clsx';
import { Bookmark, Plus, Save, Trash2, Globe, Lock, Loader2 } from 'lucide-react';
import { Popover } from '@/components/ui/Popover';
import { savedViewsApi } from '@/lib/api/services';
import { getErrorMessage } from '@/lib/api/errors';
import type { FilterCondition, SavedView, SavedViewEntityType } from '@crm/types';

export interface ViewState {
  filters: FilterCondition[];
  columns: string[];
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

interface SavedViewsBarProps {
  entityType: SavedViewEntityType;
  entityLabel: string;
  activeView: SavedView | null;
  current: ViewState;
  onSelect: (view: SavedView | null) => void;
}

function statesMatch(a: ViewState, b: ViewState): boolean {
  return (
    JSON.stringify(a.filters) === JSON.stringify(b.filters) &&
    JSON.stringify(a.columns) === JSON.stringify(b.columns) &&
    a.sortBy === b.sortBy &&
    a.sortOrder === b.sortOrder
  );
}

export function SavedViewsBar({ entityType, entityLabel, activeView, current, onSelect }: SavedViewsBarProps) {
  const queryClient = useQueryClient();

  const { data: views = [] } = useQuery({
    queryKey: ['saved-views', entityType],
    queryFn: () => savedViewsApi.list(entityType),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['saved-views', entityType] });

  const createView = useMutation({
    mutationFn: (payload: { name: string; isPublic: boolean }) =>
      savedViewsApi.create({ entityType, name: payload.name, isPublic: payload.isPublic, ...current }),
    onSuccess: (view) => {
      invalidate();
      onSelect(view);
    },
  });

  const updateView = useMutation({
    mutationFn: (id: string) => savedViewsApi.update(id, current),
    onSuccess: (view) => {
      invalidate();
      onSelect(view);
    },
  });

  const removeView = useMutation({
    mutationFn: (id: string) => savedViewsApi.remove(id),
    onSuccess: () => {
      invalidate();
      if (activeView) onSelect(null);
    },
  });

  const isDirty = Boolean(activeView) && !statesMatch(current, {
    filters: activeView!.filters ?? [],
    columns: activeView!.columns ?? [],
    sortBy: activeView!.sortBy ?? undefined,
    sortOrder: (activeView!.sortOrder as 'asc' | 'desc' | undefined) ?? undefined,
  });

  return (
    <div className="flex flex-wrap items-center gap-1.5 border-b px-4 pt-2">
      <button
        className={clsx(
          'inline-flex items-center gap-1.5 rounded-t-md border-b-2 px-3 py-2 text-sm font-medium transition-colors',
          !activeView ? 'border-brand-600 text-brand-700' : 'border-transparent text-slate-500 hover:text-slate-800',
        )}
        onClick={() => onSelect(null)}
      >
        All {entityLabel}
      </button>

      {views.map((view) => (
        <button
          key={view.id}
          className={clsx(
            'group inline-flex items-center gap-1.5 rounded-t-md border-b-2 px-3 py-2 text-sm font-medium transition-colors',
            activeView?.id === view.id ? 'border-brand-600 text-brand-700' : 'border-transparent text-slate-500 hover:text-slate-800',
          )}
          onClick={() => onSelect(view)}
        >
          {view.isPublic ? <Globe className="h-3 w-3 opacity-60" /> : <Bookmark className="h-3 w-3 opacity-60" />}
          {view.name}
          {view.isMine && (
            <span
              role="button"
              aria-label={`Delete ${view.name}`}
              className="ml-0.5 rounded p-0.5 opacity-0 hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
              onClick={(e) => {
                e.stopPropagation();
                if (window.confirm(`Delete the view "${view.name}"?`)) removeView.mutate(view.id);
              }}
            >
              <Trash2 className="h-3 w-3" />
            </span>
          )}
        </button>
      ))}

      <div className="ml-auto flex items-center gap-1.5 pb-1.5">
        {isDirty && activeView?.isMine && (
          <button
            className="btn-ghost btn-sm text-xs"
            disabled={updateView.isPending}
            onClick={() => updateView.mutate(activeView.id)}
          >
            {updateView.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Update view
          </button>
        )}
        <SaveViewButton onSave={(name, isPublic) => createView.mutate({ name, isPublic })} pending={createView.isPending} error={createView.error} />
      </div>
    </div>
  );
}

function SaveViewButton({
  onSave,
  pending,
  error,
}: {
  onSave: (name: string, isPublic: boolean) => void;
  pending: boolean;
  error: unknown;
}) {
  const [name, setName] = useState('');
  const [isPublic, setIsPublic] = useState(false);

  return (
    <Popover
      align="right"
      panelClassName="w-72 p-3"
      trigger={({ toggle }) => (
        <button className="btn-secondary btn-sm text-xs" id="save-view-btn" onClick={toggle}>
          <Plus className="h-3.5 w-3.5" /> Save view
        </button>
      )}
    >
      {({ close }) => (
        <form
          className="flex flex-col gap-2.5"
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) return;
            onSave(name.trim(), isPublic);
            setName('');
            setIsPublic(false);
            close();
          }}
        >
          <div>
            <label className="label" htmlFor="save-view-name">View name</label>
            <input
              id="save-view-name"
              className="input"
              autoFocus
              placeholder="e.g. My open deals"
              value={name}
              onChange={(e) => setName((e.target as HTMLInputElement).value)}
            />
          </div>
          <label className="flex items-center gap-2 text-xs text-slate-600">
            <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic((e.target as HTMLInputElement).checked)} />
            Share with the whole workspace
          </label>
          {error != null && <p className="text-xs text-red-600">{getErrorMessage(error)}</p>}
          <button type="submit" className="btn-primary btn-sm justify-center" disabled={pending || !name.trim()}>
            {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Save view
          </button>
        </form>
      )}
    </Popover>
  );
}
