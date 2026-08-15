'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { pipelinesApi, usersApi } from '@/lib/api/services';
import type { LabelMap } from './vocabulary';

/**
 * Stage and user ids → display names. Workflow rules store ids, so without this
 * every description reads "moves into 46ad8d64-38bf-41d0…".
 *
 * Query keys match the ones the pickers already use, so this shares their cache
 * rather than refetching.
 */
export function useWorkflowLabels(): LabelMap {
  const { data: leadPipelines = [] } = useQuery({
    queryKey: ['pipelines', 'lead'],
    queryFn: () => pipelinesApi.list('lead'),
    staleTime: 60_000,
  });

  const { data: dealPipelines = [] } = useQuery({
    queryKey: ['pipelines', 'deal'],
    queryFn: () => pipelinesApi.list('deal'),
    staleTime: 60_000,
  });

  const { data: users = [] } = useQuery({
    queryKey: ['record-select', 'users'],
    queryFn: async () => {
      const res = await usersApi.list({ limit: 200 });
      return (res?.data ?? []).map((u: any) => ({ id: u.id, label: `${u.firstName} ${u.lastName}` }));
    },
    staleTime: 60_000,
  });

  return useMemo(() => {
    const map: LabelMap = {};
    for (const pipeline of [...leadPipelines, ...dealPipelines]) {
      for (const stage of (pipeline as any)?.stages ?? []) {
        map[stage.id] = stage.name;
      }
    }
    for (const user of users as Array<{ id: string; label: string }>) {
      map[user.id] = user.label;
    }
    return map;
  }, [leadPipelines, dealPipelines, users]);
}
