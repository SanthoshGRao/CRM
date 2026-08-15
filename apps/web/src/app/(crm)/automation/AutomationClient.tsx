'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Zap, Trash2, Loader2, Pencil, Play, History, CheckCircle2,
  XCircle, MinusCircle, ChevronDown, ChevronRight, Filter, ListChecks,
} from 'lucide-react';
import { clsx } from 'clsx';
import { workflowsApi } from '@/lib/api/services';
import { getErrorMessage } from '@/lib/api/errors';
import { formatRelativeTime } from '@/lib/utils';
import { PageHeader } from '@/components/ui/PageHeader';
import { ErrorBanner } from '@/components/ui/Field';
import { WorkflowBuilder } from './WorkflowBuilder';
import {
  TEMPLATES, WorkflowTemplate, actionDef, describeWorkflow, entityLabel,
  normalizeActions, statusStageWarning, triggerDef, whatItWaitsFor,
} from '@/lib/workflows/vocabulary';
import { useWorkflowLabels } from '@/lib/workflows/useWorkflowLabels';

type Editing =
  | { mode: 'closed' }
  | { mode: 'new' }
  | { mode: 'template'; template: WorkflowTemplate }
  | { mode: 'edit'; workflow: any };

export default function AutomationClient() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Editing>({ mode: 'closed' });
  const [expanded, setExpanded] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['workflows'],
    queryFn: () => workflowsApi.list({ limit: 50 }),
  });

  const workflows: any[] = (data as any)?.data ?? [];

  const toggleActive = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => workflowsApi.update(id, { isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['workflows'] }),
    onError: (err) => setError(getErrorMessage(err)),
  });

  const remove = useMutation({
    mutationFn: (id: string) => workflowsApi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['workflows'] }),
    onError: (err) => setError(getErrorMessage(err)),
  });

  function closeBuilder() {
    setEditing({ mode: 'closed' });
  }

  function onSaved() {
    closeBuilder();
    queryClient.invalidateQueries({ queryKey: ['workflows'] });
  }

  return (
    <div className="page-container">
      <PageHeader
        title="Automation"
        subtitle="Rules that run by themselves whenever records change in your CRM."
        actions={
          <button className="btn-primary btn-sm" id="create-workflow-btn" onClick={() => setEditing({ mode: 'new' })}>
            <Plus className="h-3.5 w-3.5" /> New workflow
          </button>
        }
      />

      <ErrorBanner message={error} />

      <HowItWorks />

      {editing.mode !== 'closed' && (
        <WorkflowBuilder
          initial={editing.mode === 'edit' ? editing.workflow : undefined}
          template={editing.mode === 'template' ? editing.template : undefined}
          onCancel={closeBuilder}
          onSaved={onSaved}
        />
      )}

      {editing.mode === 'closed' && workflows.length > 0 && (
        <Templates onPick={(template) => setEditing({ mode: 'template', template })} />
      )}

      {isLoading ? (
        <div className="card space-y-3 p-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="skeleton h-4 max-w-[240px] flex-1" />
              <div className="skeleton h-5 w-16 rounded-full" />
              <div className="skeleton h-4 w-20" />
            </div>
          ))}
        </div>
      ) : workflows.length === 0 ? (
        <EmptyState
          onBlank={() => setEditing({ mode: 'new' })}
          onPick={(template) => setEditing({ mode: 'template', template })}
        />
      ) : (
        <div className="flex flex-col gap-3">
          {workflows.map((w) => (
            <WorkflowCard
              key={w.id}
              workflow={w}
              isExpanded={expanded === w.id}
              onToggleExpand={() => setExpanded((prev) => (prev === w.id ? null : w.id))}
              onEdit={() => setEditing({ mode: 'edit', workflow: w })}
              onToggleActive={() => toggleActive.mutate({ id: w.id, isActive: !w.isActive })}
              onDelete={() => { if (window.confirm(`Delete "${w.name}"?`)) remove.mutate(w.id); }}
              isBusy={toggleActive.isPending || remove.isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Guidance ────────────────────────────────────────────────────────────────

function HowItWorks() {
  const steps = [
    { icon: Zap, title: 'A trigger fires', body: 'Someone creates a lead, moves a deal, changes a field.' },
    { icon: Filter, title: 'Conditions are checked', body: 'All of them must hold, otherwise the run is skipped.' },
    { icon: ListChecks, title: 'Actions run', body: 'Tasks, assignments, notifications — each one logged.' },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {steps.map(({ icon: Icon, title, body }, i) => (
        <div key={title} className="card flex items-start gap-3 p-4">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
            <Icon className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">
              <span className="text-slate-400">{i + 1}.</span> {title}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">{body}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function Templates({ onPick }: { onPick: (t: WorkflowTemplate) => void }) {
  return (
    <div className="card">
      <div className="card-header">
        <h3 className="text-sm font-semibold text-slate-800">Start from a recipe</h3>
      </div>
      <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
        {TEMPLATES.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onPick(t)}
            className="rounded-lg border border-slate-200 bg-white p-3 text-left transition-all hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md"
          >
            <p className="text-sm font-semibold text-slate-800">{t.name}</p>
            <p className="mt-1 text-xs text-slate-500">{t.description}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

function EmptyState({
  onBlank, onPick,
}: { onBlank: () => void; onPick: (t: WorkflowTemplate) => void }) {
  return (
    <div className="card">
      <div className="empty-state">
        <div className="empty-state-icon"><Zap className="h-8 w-8" /></div>
        <p className="empty-state-title">No workflows yet</p>
        <p className="empty-state-desc">
          Pick a recipe below to get something useful running in a few clicks, or start from scratch.
        </p>
        <button className="btn-primary" onClick={onBlank}>
          <Plus className="h-4 w-4" /> Start from scratch
        </button>
      </div>
      <div className="grid gap-3 border-t p-4 sm:grid-cols-2 lg:grid-cols-4">
        {TEMPLATES.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onPick(t)}
            className="rounded-lg border border-slate-200 bg-white p-3 text-left transition-all hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md"
          >
            <p className="text-sm font-semibold text-slate-800">{t.name}</p>
            <p className="mt-1 text-xs text-slate-500">{t.description}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Workflow card ───────────────────────────────────────────────────────────

function WorkflowCard({
  workflow: w, isExpanded, onToggleExpand, onEdit, onToggleActive, onDelete, isBusy,
}: {
  workflow: any;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onEdit: () => void;
  onToggleActive: () => void;
  onDelete: () => void;
  isBusy: boolean;
}) {
  const entity = w.triggerConfig?.entity ?? 'lead';
  const labels = useWorkflowLabels();
  const mixUp = statusStageWarning(w);

  return (
    <div className="card">
      <div className="flex flex-wrap items-start gap-3 p-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-900">{w.name}</h3>
            <span className="badge badge-gray capitalize">{entityLabel(entity)}</span>
            {!w.isActive && <span className="badge badge-yellow">Paused</span>}
          </div>

          <p className="mt-1 text-sm text-slate-600">{describeWorkflow(w, labels)}</p>

          {w.description && <p className="mt-1 text-xs text-slate-500">{w.description}</p>}

          {mixUp && (
            <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs text-amber-700">
              {mixUp}
            </p>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-400">
            <span>{w.runCount ?? 0} run{(w.runCount ?? 0) === 1 ? '' : 's'}</span>
            {w.lastRunAt && <span>Last run {formatRelativeTime(w.lastRunAt)}</span>}
            {triggerDef(w.triggerType)?.available === false && (
              <span className="text-amber-600">
                This trigger is not supported yet, so the rule never fires
              </span>
            )}
            {normalizeActions(w.actions).length === 0 ? (
              <span className="text-amber-600">
                No actions saved — open Edit and re-save to fix this rule
              </span>
            ) : (
              normalizeActions(w.actions).some((a) => actionDef(a.type)?.available === false) && (
                <span className="text-amber-600">Contains an action this deployment cannot run</span>
              )
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            className={clsx('badge cursor-pointer', w.isActive ? 'badge-green' : 'badge-gray')}
            disabled={isBusy}
            onClick={onToggleActive}
            title={w.isActive ? 'Pause this workflow' : 'Activate this workflow'}
          >
            {w.isActive ? 'Active' : 'Paused'}
          </button>
          <button className="btn-secondary btn-sm" onClick={onToggleExpand}>
            <History className="h-3.5 w-3.5" /> Runs
            {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          </button>
          <button className="btn-secondary btn-sm" onClick={onEdit}>
            <Pencil className="h-3.5 w-3.5" /> Edit
          </button>
          <button
            className="rounded p-1.5 text-slate-400 hover:bg-surface-2 hover:text-red-600"
            aria-label="Delete workflow"
            disabled={isBusy}
            onClick={onDelete}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {isExpanded && <WorkflowRuns workflow={w} labels={labels} />}
    </div>
  );
}

// ─── Runs + dry run ──────────────────────────────────────────────────────────

const STATUS_STYLE: Record<string, { icon: typeof CheckCircle2; className: string; label: string }> = {
  success: { icon: CheckCircle2, className: 'text-emerald-600', label: 'Succeeded' },
  failed: { icon: XCircle, className: 'text-red-600', label: 'Failed' },
  skipped: { icon: MinusCircle, className: 'text-slate-400', label: 'Skipped' },
  pending: { icon: MinusCircle, className: 'text-slate-400', label: 'Pending' },
  running: { icon: Loader2, className: 'text-brand-600', label: 'Running' },
};

function WorkflowRuns({ workflow, labels }: { workflow: any; labels: Record<string, string> }) {
  const workflowId = workflow.id;
  const isActive = workflow.isActive;
  const [simulation, setSimulation] = useState<any | null>(null);
  const [simError, setSimError] = useState<string | null>(null);

  const { data: runs = [], isLoading } = useQuery({
    queryKey: ['workflow-executions', workflowId],
    queryFn: () => workflowsApi.executions(workflowId),
  });

  const simulate = useMutation({
    mutationFn: () => workflowsApi.simulate(workflowId),
    onSuccess: (result) => { setSimError(null); setSimulation(result); },
    onError: (err) => { setSimulation(null); setSimError(getErrorMessage(err)); },
  });

  return (
    <div className="border-t bg-surface-1 px-4 py-3">
      <p className="mb-3 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
        <span className="font-medium text-slate-700">Waiting for:</span>{' '}
        {whatItWaitsFor(workflow, labels)}. Anything else leaves this rule untouched — and runs are
        only listed once the trigger matches.
      </p>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Recent runs</p>
        <button className="btn-secondary btn-sm" onClick={() => simulate.mutate()} disabled={simulate.isPending}>
          {simulate.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
          Test against a real record
        </button>
      </div>

      <ErrorBanner message={simError} />

      {simulation && (
        <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3">
          <p className="text-sm font-medium text-slate-800">
            {simulation.sampled
              ? `Tested against "${simulation.sampled.label}"`
              : 'Nothing to test against'}
          </p>
          <p className={clsx('mt-0.5 text-xs', simulation.matched ? 'text-emerald-600' : 'text-amber-600')}>
            {simulation.message}
          </p>

          {(simulation.conditions ?? []).length > 0 && (
            <ul className="mt-2 space-y-1">
              {simulation.conditions.map((c: any, i: number) => (
                <li key={i} className="flex items-center gap-1.5 text-xs text-slate-600">
                  {c.passed
                    ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    : <XCircle className="h-3.5 w-3.5 text-red-500" />}
                  {c.field ?? 'field'} {String(c.operator ?? '').replace(/_/g, ' ')}
                  {c.value ? ` "${c.value}"` : ''}
                  <span className="text-slate-400">— actual: {c.actual || '(empty)'}</span>
                </li>
              ))}
            </ul>
          )}

          {simulation.matched && (
            (simulation.actions ?? []).length > 0 ? (
              <p className="mt-2 text-xs text-slate-500">
                Would run: {simulation.actions.map((a: any) => actionDef(a.type)?.label ?? a.type).join(', ')}.
                Nothing was changed by this test.
              </p>
            ) : (
              <p className="mt-2 text-xs text-amber-600">
                This rule has no valid actions saved, so nothing would happen. Open Edit and re-save it.
              </p>
            )
          )}

          {!isActive && (
            <p className="mt-2 text-xs text-amber-600">
              This workflow is paused, so it will not run for real until you activate it.
            </p>
          )}
        </div>
      )}

      {isLoading ? (
        <div className="mt-3 space-y-2">
          {Array.from({ length: 2 }).map((_, i) => <div key={i} className="skeleton h-9 w-full" />)}
        </div>
      ) : runs.length === 0 ? (
        <p className="mt-3 text-xs text-slate-500">
          No runs yet. {isActive
            ? 'This rule fires the next time a matching record changes.'
            : 'Activate it so it can fire.'}
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-slate-200">
          {runs.map((run: any) => {
            const style = STATUS_STYLE[run.status] ?? STATUS_STYLE.pending;
            const Icon = style.icon;
            // `result` is free-form JSON on the record — never assume its shape.
            const actions: any[] = Array.isArray(run.result?.actions) ? run.result.actions : [];

            return (
              <li key={run.id} className="flex items-start gap-2.5 py-2">
                <Icon className={clsx('mt-0.5 h-4 w-4 flex-shrink-0', style.className)} />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-slate-700">
                    {style.label}
                    {run.triggerData?.recordLabel && (
                      <span className="font-normal text-slate-500"> · {run.triggerData.recordLabel}</span>
                    )}
                  </p>
                  {run.errorMessage && <p className="text-xs text-slate-500">{run.errorMessage}</p>}
                  {actions.length > 0 && (
                    <p className="text-xs text-slate-500">
                      {actions
                        .map((a) => `${actionDef(a.type)?.label ?? a.type ?? 'Action'}: ${a.detail ?? '—'}`)
                        .join(' · ')}
                    </p>
                  )}
                </div>
                <span className="flex-shrink-0 text-xs text-slate-400">{formatRelativeTime(run.createdAt)}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
