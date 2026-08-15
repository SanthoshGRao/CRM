'use client';

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { pipelinesApi } from '@/lib/api/services';
import { Field } from '@/components/ui/Field';

interface PipelineStageSelectProps {
  entityType: 'lead' | 'deal';
  pipelineId: string;
  stageId: string;
  onChange: (next: { pipelineId: string; stageId: string }) => void;
}

/**
 * Paired pipeline + stage dropdowns. The API requires both ids, so the first
 * pipeline and its first stage are auto-selected once the list loads.
 */
export function PipelineStageSelect({ entityType, pipelineId, stageId, onChange }: PipelineStageSelectProps) {
  const { data: pipelines = [], isLoading } = useQuery({
    queryKey: ['pipelines', entityType],
    queryFn: () => pipelinesApi.list(entityType),
    staleTime: 60_000,
  });

  const selected = pipelines.find((p: any) => p.id === pipelineId) ?? pipelines[0];
  const stages = selected?.stages ?? [];

  // Seed defaults once pipelines arrive, and repair a stage that no longer belongs.
  useEffect(() => {
    if (pipelines.length === 0) return;

    const nextPipelineId = selected?.id ?? '';
    const stageBelongs = stages.some((s: any) => s.id === stageId);
    const nextStageId = stageBelongs ? stageId : (stages[0]?.id ?? '');

    if (nextPipelineId !== pipelineId || nextStageId !== stageId) {
      onChange({ pipelineId: nextPipelineId, stageId: nextStageId });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pipelines, pipelineId, stageId]);

  return (
    <>
      <Field label="Pipeline" htmlFor="pipeline-select" required>
        <select
          id="pipeline-select"
          className="input"
          disabled={isLoading || pipelines.length === 0}
          value={selected?.id ?? ''}
          onChange={(e) => {
            const next = pipelines.find((p: any) => p.id === (e.target as HTMLSelectElement).value);
            onChange({ pipelineId: next?.id ?? '', stageId: next?.stages?.[0]?.id ?? '' });
          }}
        >
          {isLoading && <option value="">Loading…</option>}
          {!isLoading && pipelines.length === 0 && <option value="">No pipeline available</option>}
          {pipelines.map((p: any) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </Field>

      <Field label="Stage" htmlFor="stage-select" required>
        <select
          id="stage-select"
          className="input"
          disabled={isLoading || stages.length === 0}
          value={stageId}
          onChange={(e) => onChange({ pipelineId: selected?.id ?? '', stageId: (e.target as HTMLSelectElement).value })}
        >
          {stages.length === 0 && <option value="">—</option>}
          {stages.map((s: any) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </Field>
    </>
  );
}
