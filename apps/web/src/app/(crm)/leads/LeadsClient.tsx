'use client';

import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Search, Filter, LayoutGrid, List, Download, Upload,
  ChevronUp, ChevronDown, MoreHorizontal, ArrowUpDown,
  Building2, User, ChevronsUpDown, Inbox, ArrowRightLeft,
} from 'lucide-react';
import { clsx } from 'clsx';
import Link from 'next/link';
import api from '@/lib/api/client';
import { Can } from '@/components/ui/Can';
import { usePermissions } from '@/lib/permissions';
import { formatCurrency, formatRelativeTime, getInitials } from '@/lib/utils';
import type { Lead } from '@crm/types';
import { ConvertLeadDialog } from './ConvertLeadDialog';

// ─── API calls ────────────────────────────────────────────────────────────────

async function fetchLeads(params: Record<string, any>) {
  const query = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== ''))
  ).toString();
  const { data } = await api.get(`/leads?${query}`);
  return data;
}

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_CLASSES: Record<string, string> = {
  new:         'badge-blue',
  working:     'badge-yellow',
  qualified:   'badge-purple',
  unqualified: 'badge-red',
  converted:   'badge-green',
  lost:        'badge-gray',
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={clsx('badge', STATUS_CLASSES[status] ?? 'badge-gray')}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}

// ─── Source badge ─────────────────────────────────────────────────────────────

const SOURCE_LABELS: Record<string, string> = {
  website: 'Website', referral: 'Referral', cold_call: 'Cold Call',
  email: 'Email', social: 'Social', advertisement: 'Ad', event: 'Event', other: 'Other',
};

// ─── Table skeleton ───────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <div className="space-y-2 p-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex gap-4 items-center py-2">
          <div className="skeleton h-4 w-4 rounded" />
          <div className="skeleton h-4 flex-1 max-w-[200px]" />
          <div className="skeleton h-4 flex-1 max-w-[140px]" />
          <div className="skeleton h-5 w-20 rounded-full" />
          <div className="skeleton h-4 flex-1 max-w-[100px]" />
          <div className="skeleton h-4 w-16" />
        </div>
      ))}
    </div>
  );
}

// ─── Kanban ───────────────────────────────────────────────────────────────────

type Stage = { id: string; name: string; color?: string };

const DEFAULT_STAGES: Stage[] = [
  { id: 'stage-new', name: 'New', color: '#94a3b8' },
  { id: 'stage-contacted', name: 'Contacted', color: '#60a5fa' },
  { id: 'stage-qualified', name: 'Qualified', color: '#a78bfa' },
  { id: 'stage-proposal', name: 'Proposal', color: '#f59e0b' },
  { id: 'stage-negotiation', name: 'Negotiation', color: '#fb923c' },
  { id: 'stage-won', name: 'Won', color: '#22c55e' },
  { id: 'stage-lost', name: 'Lost', color: '#ef4444' },
];

const STAGE_FALLBACK_COLOR = '#6366f1';

/** ₹12,50,000 → ₹12.5L — keeps column headers readable at 290px wide. */
function compactCurrency(value: number): string {
  const abs = Math.abs(value);
  const shorten = (n: number, suffix: string) =>
    `₹${(Math.round((n + Number.EPSILON) * 10) / 10).toString()}${suffix}`;

  if (abs >= 1e7) return shorten(value / 1e7, 'Cr');
  if (abs >= 1e5) return shorten(value / 1e5, 'L');
  if (abs >= 1e3) return shorten(value / 1e3, 'K');
  return `₹${value.toLocaleString('en-IN')}`;
}

function KanbanSkeleton() {
  return (
    <div className="flex gap-4 p-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="w-[290px] flex-shrink-0 rounded-xl border border-slate-200 bg-white p-3">
          <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div className="skeleton h-4 w-24" />
            <div className="skeleton h-3.5 w-12" />
          </div>
          <div className="space-y-2.5">
            {Array.from({ length: 3 - (i % 2) }).map((_, j) => (
              <div key={j} className="skeleton h-24 w-full rounded-lg" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function KanbanCard({
  lead,
  color,
  stages,
  isDragging,
  canConvert,
  onDragStart,
  onDragEnd,
  onMove,
  onConvert,
}: {
  lead: any;
  color: string;
  stages: Stage[];
  isDragging: boolean;
  canConvert: boolean;
  onDragStart: (e: React.DragEvent, leadId: string) => void;
  onDragEnd: () => void;
  onMove: (leadId: string, stageId: string) => void;
  onConvert: (lead: any) => void;
}) {
  return (
    <article
      draggable
      onDragStart={(e) => onDragStart(e, lead.id)}
      onDragEnd={onDragEnd}
      className={clsx(
        'group relative cursor-grab rounded-lg border border-slate-200 bg-white p-3 pl-4 shadow-sm',
        'transition-all duration-150 hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md',
        'active:cursor-grabbing',
        isDragging && 'rotate-1 border-brand-400 opacity-50 shadow-lg'
      )}
    >
      {/* Stage accent rail */}
      <span
        aria-hidden
        className="absolute inset-y-2.5 left-px w-1 rounded-full"
        style={{ backgroundColor: color }}
      />

      <div className="mb-2 flex items-start gap-1.5">
        <Link
          href={`/leads/${lead.id}`}
          className="line-clamp-2 flex-1 text-sm font-semibold leading-snug text-slate-900 transition-colors hover:text-brand-600"
        >
          {lead.title}
        </Link>

        {/* Convert to deal */}
        {canConvert && !lead.convertedDealId && (
          <button
            type="button"
            title="Convert to deal"
            aria-label={`Convert ${lead.title} to a deal`}
            onClick={() => onConvert(lead)}
            className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md text-slate-400 opacity-70 transition-all hover:bg-brand-50 hover:text-brand-600 focus:opacity-100 group-hover:opacity-100 md:opacity-0"
          >
            <ArrowRightLeft className="h-3.5 w-3.5" />
          </button>
        )}

        {/* Stage picker — keyboard/touch fallback for drag & drop */}
        <div className="relative flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md text-slate-400 opacity-70 transition-all hover:bg-surface-2 hover:text-slate-600 focus-within:opacity-100 group-hover:opacity-100 md:opacity-0">
          <ChevronsUpDown className="h-3.5 w-3.5" />
          <select
            aria-label={`Move ${lead.title} to another stage`}
            title="Move to stage"
            value={stages.some((s) => s.id === lead.stageId) ? lead.stageId : ''}
            onChange={(e) => onMove(lead.id, e.target.value)}
            className="absolute inset-0 cursor-pointer opacity-0"
          >
            {!stages.some((s) => s.id === lead.stageId) && (
              <option value="" disabled>Move to stage…</option>
            )}
            {stages.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-1">
        {lead.company?.name && (
          <p className="flex items-center gap-1.5 text-xs text-slate-500">
            <Building2 className="h-3.5 w-3.5 flex-shrink-0 text-slate-400" />
            <span className="truncate">{lead.company.name}</span>
          </p>
        )}
        {lead.contact && (
          <p className="flex items-center gap-1.5 text-xs text-slate-500">
            <User className="h-3.5 w-3.5 flex-shrink-0 text-slate-400" />
            <span className="truncate">{lead.contact.firstName} {lead.contact.lastName}</span>
          </p>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-2.5">
        <span className="rounded-md bg-surface-2 px-1.5 py-0.5 text-xs font-semibold tabular-nums text-slate-700">
          {formatCurrency(Number(lead.value ?? 0))}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-400">{formatRelativeTime(lead.createdAt)}</span>
          {lead.owner ? (
            <div
              className="avatar-sm h-6 w-6 text-[10px]"
              title={`Assigned to ${lead.owner.firstName} ${lead.owner.lastName}`}
            >
              {getInitials(lead.owner.firstName, lead.owner.lastName)}
            </div>
          ) : (
            <div
              title="Unassigned"
              className="flex h-6 w-6 items-center justify-center rounded-full border border-dashed border-slate-300 text-slate-300"
            >
              <User className="h-3 w-3" />
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

function KanbanColumn({
  stage,
  leads,
  stages,
  isOver,
  draggingId,
  droppable = true,
  canConvert,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
  onMove,
  onConvert,
}: {
  stage: Stage;
  leads: any[];
  stages: Stage[];
  isOver: boolean;
  draggingId: string | null;
  droppable?: boolean;
  canConvert: boolean;
  onDragStart: (e: React.DragEvent, leadId: string) => void;
  onDragEnd: () => void;
  onDragOver: (e: React.DragEvent, stageId: string) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, stageId: string) => void;
  onMove: (leadId: string, stageId: string) => void;
  onConvert: (lead: any) => void;
}) {
  const color = stage.color || STAGE_FALLBACK_COLOR;
  const total = leads.reduce((acc, l) => acc + Number(l.value ?? 0), 0);

  return (
    <section
      onDragOver={droppable ? (e) => onDragOver(e, stage.id) : undefined}
      onDragLeave={droppable ? onDragLeave : undefined}
      onDrop={droppable ? (e) => onDrop(e, stage.id) : undefined}
      className={clsx(
        'flex w-[290px] flex-shrink-0 flex-col overflow-hidden rounded-xl border bg-white transition-colors duration-150',
        isOver ? 'border-brand-400 bg-brand-50/50 ring-2 ring-brand-200' : 'border-slate-200'
      )}
    >
      {/* Colour rail */}
      <div aria-hidden className="h-1 w-full" style={{ backgroundColor: color }} />

      <header className="flex items-center justify-between gap-2 border-b border-slate-100 px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <h3 className="truncate text-sm font-semibold text-slate-800">{stage.name}</h3>
          <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-surface-2 px-1.5 text-[11px] font-semibold tabular-nums text-slate-600">
            {leads.length}
          </span>
        </div>
        <span className="flex-shrink-0 text-xs font-semibold tabular-nums text-slate-500">
          {compactCurrency(total)}
        </span>
      </header>

      <div className="flex max-h-[calc(100vh-24rem)] min-h-[9rem] flex-1 flex-col gap-2.5 overflow-y-auto p-3">
        {leads.length === 0 ? (
          <div
            className={clsx(
              'flex flex-1 flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed text-center transition-colors',
              isOver ? 'border-brand-400 bg-brand-50 text-brand-600' : 'border-slate-200 text-slate-400'
            )}
          >
            <Inbox className="h-5 w-5" />
            <span className="text-[11px] font-medium">
              {droppable ? 'Drop leads here' : 'Nothing here'}
            </span>
          </div>
        ) : (
          leads.map((lead) => (
            <KanbanCard
              key={lead.id}
              lead={lead}
              color={color}
              stages={stages}
              isDragging={draggingId === lead.id}
              canConvert={canConvert}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              onMove={onMove}
              onConvert={onConvert}
            />
          ))
        )}
      </div>
    </section>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

type ViewMode = 'table' | 'kanban';

export default function LeadsClient() {
  const queryClient = useQueryClient();
  const { canAll } = usePermissions();
  const canConvert = canAll('leads.update', 'deals.create');
  const [leadToConvert, setLeadToConvert] = useState<any | null>(null);
  const [view, setView] = useState<ViewMode>('table');
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['leads', { search, sortBy, sortOrder, page }],
    queryFn: () => fetchLeads({ search, sortBy, sortOrder, page, limit: 25 }),
    placeholderData: (prev) => prev,
  });

  const leads: Lead[] = data?.data ?? [];
  const pagination = data?.pagination;

  // Fetch pipeline stages for Kanban columns
  const { data: pipelinesData, isLoading: pipelinesLoading } = useQuery({
    queryKey: ['pipelines', 'lead'],
    queryFn: async () => {
      const { data } = await api.get('/pipelines?entityType=lead');
      return data?.data ?? [];
    },
  });

  const defaultPipeline = Array.isArray(pipelinesData)
    ? pipelinesData.find((p: any) => p.isDefault) ?? pipelinesData[0]
    : null;

  const stages: Stage[] = useMemo(
    () => defaultPipeline?.stages ?? DEFAULT_STAGES,
    [defaultPipeline]
  );

  // Bucket leads into their stage column; anything the pipeline doesn't cover
  // lands in a read-only "No stage" column instead of silently vanishing.
  const { columns, orphans } = useMemo(() => {
    const buckets = new Map<string, Lead[]>(stages.map((s) => [s.id, [] as Lead[]]));
    const unplaced: Lead[] = [];

    for (const lead of leads) {
      const match = stages.find(
        (s) =>
          (lead as any).stageId === s.id ||
          (lead as any).stage?.name?.toLowerCase() === s.name.toLowerCase()
      );
      if (match) buckets.get(match.id)!.push(lead);
      else unplaced.push(lead);
    }

    return { columns: buckets, orphans: unplaced };
  }, [leads, stages]);

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);

  const updateStageMutation = useMutation({
    mutationFn: async ({ leadId, stageId }: { leadId: string; stageId: string }) => {
      await api.patch(`/leads/${leadId}`, { stageId });
    },
    // Move the card immediately, roll back if the request fails.
    onMutate: async ({ leadId, stageId }) => {
      await queryClient.cancelQueries({ queryKey: ['leads'] });
      const snapshot = queryClient.getQueriesData({ queryKey: ['leads'] });
      const nextStage = stages.find((s) => s.id === stageId);

      queryClient.setQueriesData({ queryKey: ['leads'] }, (old: any) => {
        if (!old?.data) return old;
        return {
          ...old,
          data: old.data.map((l: any) =>
            l.id === leadId ? { ...l, stageId, stage: nextStage ?? l.stage } : l
          ),
        };
      });

      return { snapshot };
    },
    onError: (_err, _vars, context) => {
      context?.snapshot.forEach(([key, data]) => queryClient.setQueryData(key, data));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });

  const moveLead = (leadId: string, stageId: string) => {
    updateStageMutation.mutate({ leadId, stageId });
  };

  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    e.dataTransfer.setData('text/plain', leadId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggingId(leadId);
  };

  const handleDragEnd = () => {
    setDraggingId(null);
    setDragOverStage(null);
  };

  const handleDragOver = (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverStage !== stageId) setDragOverStage(stageId);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Ignore bubbling from child cards — only clear when the column itself is left.
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
      setDragOverStage(null);
    }
  };

  const handleDrop = (e: React.DragEvent, targetStageId: string) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData('text/plain');
    const current = leads.find((l) => l.id === leadId) as any;
    handleDragEnd();
    if (leadId && targetStageId && current?.stageId !== targetStageId) {
      moveLead(leadId, targetStageId);
    }
  };

  function toggleSort(field: string) {
    if (sortBy === field) {
      setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  }

  function toggleAll() {
    if (selectedIds.size === leads.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(leads.map((l) => l.id)));
    }
  }

  function toggleOne(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const SortIcon = ({ field }: { field: string }) => {
    if (sortBy !== field) return <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />;
    return sortOrder === 'asc'
      ? <ChevronUp className="h-3.5 w-3.5 text-brand-600" />
      : <ChevronDown className="h-3.5 w-3.5 text-brand-600" />;
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1>Leads</h1>
          {pagination && (
            <p className="text-sm text-slate-500 mt-0.5">
              {pagination.total.toLocaleString()} total leads
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary btn-sm" id="import-leads-btn">
            <Upload className="h-3.5 w-3.5" />
            Import
          </button>
          <button className="btn-secondary btn-sm" id="export-leads-btn">
            <Download className="h-3.5 w-3.5" />
            Export
          </button>
          <Can permission="leads.create"><Link href="/leads/new" className="btn-primary btn-sm" id="create-lead-btn">
            <Plus className="h-3.5 w-3.5" />
            Add Lead
          </Link></Can>
        </div>
      </div>

      {/* Toolbar */}
      <div className="card">
        <div className="flex flex-wrap items-center gap-3 p-4">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search leads..."
              className="input pl-9"
              id="leads-search"
              value={search}
              onChange={(e) => { setSearch((e.target as HTMLInputElement).value); setPage(1); }}
            />
          </div>

          {/* Filter */}
          <button className="btn-secondary btn-sm" id="leads-filter-btn">
            <Filter className="h-3.5 w-3.5" />
            Filters
          </button>

          {/* View toggle */}
          <div className="ml-auto flex gap-1 rounded-lg bg-surface-2 p-1">
            {([
              { key: 'table', label: 'Table', icon: List, id: 'table-view-btn' },
              { key: 'kanban', label: 'Kanban', icon: LayoutGrid, id: 'kanban-view-btn' },
            ] as const).map(({ key, label, icon: Icon, id }) => (
              <button
                key={key}
                id={id}
                onClick={() => setView(key)}
                aria-pressed={view === key}
                className={clsx(
                  'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all',
                  view === key
                    ? 'bg-white text-brand-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                )}
              >
                <Icon className="h-4 w-4" /> {label}
              </button>
            ))}
          </div>
        </div>

        {/* Bulk action bar */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-3 border-t bg-brand-50 px-4 py-2.5">
            <span className="text-sm font-medium text-brand-700">
              {selectedIds.size} selected
            </span>
            <button className="btn-secondary btn-sm text-xs">Assign Owner</button>
            <button className="btn-secondary btn-sm text-xs">Update Status</button>
            <button className="btn-danger btn-sm text-xs">Delete</button>
            <button
              className="ml-auto text-xs text-slate-500 hover:text-slate-700"
              onClick={() => setSelectedIds(new Set())}
            >
              Clear selection
            </button>
          </div>
        )}

        {/* Table */}
        {view === 'table' && (
          <div className="overflow-x-auto">
            {isLoading ? (
              <TableSkeleton />
            ) : leads.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">
                  <Search className="h-8 w-8" />
                </div>
                <p className="empty-state-title">No leads found</p>
                <p className="empty-state-desc">
                  {search ? 'Try a different search term.' : 'Create your first lead to get started.'}
                </p>
                {!search && (
                  <Can permission="leads.create"><Link href="/leads/new" className="btn-primary" id="create-first-lead-btn">
                    <Plus className="h-4 w-4" /> Add Lead
                  </Link></Can>
                )}
              </div>
            ) : (
              <table className="data-table">
                <thead className="table-header">
                  <tr>
                    <th className="w-10">
                      <input
                        type="checkbox"
                        className="rounded border-slate-300"
                        checked={selectedIds.size === leads.length && leads.length > 0}
                        onChange={toggleAll}
                        id="select-all-leads"
                      />
                    </th>
                    <th>
                      <button className="flex items-center gap-1" onClick={() => toggleSort('title')}>
                        Lead Title <SortIcon field="title" />
                      </button>
                    </th>
                    <th>Contact</th>
                    <th>Company</th>
                    <th>Stage</th>
                    <th>Status</th>
                    <th>Source</th>
                    <th>
                      <button className="flex items-center gap-1" onClick={() => toggleSort('value')}>
                        Value <SortIcon field="value" />
                      </button>
                    </th>
                    <th>Owner</th>
                    <th>
                      <button className="flex items-center gap-1" onClick={() => toggleSort('createdAt')}>
                        Created <SortIcon field="createdAt" />
                      </button>
                    </th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody>
                  {leads.map((lead) => (
                    <tr key={lead.id} className="table-row">
                      <td onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          className="rounded border-slate-300"
                          checked={selectedIds.has(lead.id)}
                          onChange={() => toggleOne(lead.id)}
                        />
                      </td>
                      <td>
                        <Link href={`/leads/${lead.id}`} className="font-medium text-slate-900 hover:text-brand-600">
                          {lead.title}
                        </Link>
                      </td>
                      <td className="text-slate-600">
                        {(lead as any).contact
                          ? `${(lead as any).contact.firstName} ${(lead as any).contact.lastName}`
                          : '—'}
                      </td>
                      <td className="text-slate-600">{(lead as any).company?.name ?? '—'}</td>
                      <td>
                        {(lead as any).stage && (
                          <span className="flex items-center gap-1.5 text-sm">
                            <span
                              className="h-2 w-2 rounded-full flex-shrink-0"
                              style={{ backgroundColor: (lead as any).stage.color }}
                            />
                            {(lead as any).stage.name}
                          </span>
                        )}
                      </td>
                      <td><StatusBadge status={lead.status} /></td>
                      <td className="text-slate-600">{lead.source ? SOURCE_LABELS[lead.source] ?? lead.source : '—'}</td>
                      <td className="font-medium text-slate-800">
                        {lead.value != null
                          ? `₹${Number(lead.value).toLocaleString('en-IN')}`
                          : '—'}
                      </td>
                      <td>
                        {(lead as any).owner ? (
                          <div className="flex items-center gap-2">
                            <div className="avatar-sm text-[10px]">
                              {`${(lead as any).owner.firstName[0]}${(lead as any).owner.lastName[0]}`.toUpperCase()}
                            </div>
                            <span className="text-slate-600">
                              {(lead as any).owner.firstName}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400">Unassigned</span>
                        )}
                      </td>
                      <td className="text-slate-500">
                        {new Date(lead.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-0.5">
                          {canConvert && !lead.convertedDealId && (
                            <button
                              title="Convert to deal"
                              aria-label={`Convert ${lead.title} to a deal`}
                              onClick={() => setLeadToConvert(lead)}
                              className="rounded p-1 text-slate-400 hover:bg-brand-50 hover:text-brand-600"
                            >
                              <ArrowRightLeft className="h-4 w-4" />
                            </button>
                          )}
                          <button className="rounded p-1 text-slate-400 hover:text-slate-600 hover:bg-surface-2">
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Kanban view */}
        {view === 'kanban' && (
          <div
            className={clsx(
              'border-t bg-surface-1',
              !(pagination && pagination.totalPages > 1) && 'rounded-b-lg'
            )}
          >
            {isLoading || pipelinesLoading ? (
              <KanbanSkeleton />
            ) : leads.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">
                  <LayoutGrid className="h-8 w-8" />
                </div>
                <p className="empty-state-title">Nothing on the board</p>
                <p className="empty-state-desc">
                  {search ? 'Try a different search term.' : 'Create your first lead to get started.'}
                </p>
                {!search && (
                  <Can permission="leads.create"><Link href="/leads/new" className="btn-primary">
                    <Plus className="h-4 w-4" /> Add Lead
                  </Link></Can>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto p-4">
                <div className="flex items-stretch gap-4">
                  {stages.map((stage) => (
                    <KanbanColumn
                      key={stage.id}
                      stage={stage}
                      stages={stages}
                      leads={columns.get(stage.id) ?? []}
                      isOver={dragOverStage === stage.id}
                      draggingId={draggingId}
                      canConvert={canConvert}
                      onDragStart={handleDragStart}
                      onDragEnd={handleDragEnd}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onMove={moveLead}
                      onConvert={setLeadToConvert}
                    />
                  ))}

                  {orphans.length > 0 && (
                    <KanbanColumn
                      stage={{ id: '__unstaged__', name: 'No stage', color: '#cbd5e1' }}
                      stages={stages}
                      leads={orphans}
                      isOver={false}
                      draggingId={draggingId}
                      droppable={false}
                      canConvert={canConvert}
                      onDragStart={handleDragStart}
                      onDragEnd={handleDragEnd}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onMove={moveLead}
                      onConvert={setLeadToConvert}
                    />
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-4 py-3">
            <p className="text-sm text-slate-500">
              Showing {((page - 1) * 25) + 1}–{Math.min(page * 25, pagination.total)} of {pagination.total.toLocaleString()}
            </p>
            <div className="flex gap-1">
              <button
                className="btn-secondary btn-sm"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                id="leads-prev-page"
              >
                Previous
              </button>
              <button
                className="btn-secondary btn-sm"
                disabled={page === pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
                id="leads-next-page"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {leadToConvert && (
        <ConvertLeadDialog lead={leadToConvert} onClose={() => setLeadToConvert(null)} />
      )}
    </div>
  );
}
