'use client';

import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { BarChart3, TrendingUp, Handshake, IndianRupee, Percent } from 'lucide-react';
import { dashboardApi } from '@/lib/api/services';
import { formatCurrency } from '@/lib/utils';
import { PageHeader } from '@/components/ui/PageHeader';

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#3b82f6', '#ec4899', '#14b8a6', '#a78bfa', '#fb923c'];

export default function ReportsClient() {
  const { data: kpis, isLoading: kpisLoading } = useQuery({
    queryKey: ['dashboard', 'kpis'],
    queryFn: () => dashboardApi.kpis(),
  });

  const { data: pipelines = [], isLoading: pipelineLoading } = useQuery({
    queryKey: ['dashboard', 'pipeline'],
    queryFn: () => dashboardApi.pipeline(),
  });

  const { data: leadSources = [], isLoading: sourcesLoading } = useQuery({
    queryKey: ['dashboard', 'lead-sources'],
    queryFn: () => dashboardApi.leadSources(),
  });

  const cards = [
    { label: 'Total leads', value: kpis?.totalLeads ?? 0, icon: TrendingUp, tone: 'bg-brand-50 text-brand-600' },
    { label: 'Open deals', value: kpis?.openDeals ?? 0, icon: Handshake, tone: 'bg-blue-50 text-blue-600' },
    { label: 'Won revenue', value: formatCurrency(Number(kpis?.totalRevenue ?? 0)), icon: IndianRupee, tone: 'bg-emerald-50 text-emerald-600' },
    { label: 'Conversion rate', value: `${kpis?.conversionRate ?? 0}%`, icon: Percent, tone: 'bg-amber-50 text-amber-600' },
  ];

  const sourceData = (leadSources as any[]).map((s) => ({
    name: String(s.source).replace(/_/g, ' '),
    value: s.count,
  }));

  const hasSourceData = sourceData.some((s) => s.value > 0);

  return (
    <div className="page-container">
      <PageHeader title="Reports" subtitle="Pipeline health and lead performance across your workspace." />

      {/* KPI row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="kpi-card">
            <div className="flex items-start justify-between">
              <div>
                <p className="kpi-label">{c.label}</p>
                <p className="kpi-value mt-1">{kpisLoading ? '—' : c.value}</p>
              </div>
              <div className={`rounded-lg p-2.5 ${c.tone}`}>
                <c.icon className="h-5 w-5" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Lead sources */}
        <div className="card">
          <div className="card-header"><h3 className="text-sm font-semibold text-slate-800">Leads by source</h3></div>
          <div className="card-body h-[320px]">
            {sourcesLoading ? (
              <div className="skeleton h-full w-full" />
            ) : !hasSourceData ? (
              <EmptyChart message="No lead source data yet." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={sourceData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                    {sourceData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Activity snapshot */}
        <div className="card">
          <div className="card-header"><h3 className="text-sm font-semibold text-slate-800">This week at a glance</h3></div>
          <div className="card-body">
            <dl className="divide-y divide-slate-100">
              <Stat label="New leads this month" value={kpis?.newLeads ?? 0} />
              <Stat label="Qualified leads" value={kpis?.qualifiedLeads ?? 0} />
              <Stat label="Deals won this month" value={kpis?.wonDeals ?? 0} />
              <Stat label="Tasks due today" value={kpis?.tasksDueToday ?? 0} />
              <Stat label="Activities this week" value={kpis?.activitiesThisWeek ?? 0} />
            </dl>
          </div>
        </div>
      </div>

      {/* Pipeline breakdown — one chart per pipeline */}
      {pipelineLoading ? (
        <div className="card"><div className="card-body"><div className="skeleton h-64 w-full" /></div></div>
      ) : (pipelines as any[]).length === 0 ? (
        <div className="card">
          <div className="card-body"><EmptyChart message="No pipelines configured yet." /></div>
        </div>
      ) : (
        (pipelines as any[]).map((pipeline) => {
          const stageData = (pipeline.stages ?? []).map((s: any) => ({
            name: s.name,
            count: s.count,
            fill: s.color,
          }));
          const total = stageData.reduce((sum: number, s: any) => sum + s.count, 0);

          return (
            <div key={pipeline.id} className="card">
              <div className="card-header">
                <h3 className="text-sm font-semibold text-slate-800">
                  {pipeline.name}
                  <span className="ml-2 text-xs font-normal capitalize text-slate-400">{pipeline.entityType}</span>
                </h3>
                <span className="text-xs text-slate-400">{total} records</span>
              </div>
              <div className="card-body h-[300px]">
                {total === 0 ? (
                  <EmptyChart message={`No ${pipeline.entityType}s in this pipeline yet.`} />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stageData} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} />
                      <Tooltip cursor={{ fill: '#f1f5f9' }} />
                      <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                        {stageData.map((s: any, i: number) => <Cell key={i} fill={s.fill ?? COLORS[i % COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <dt className="text-sm text-slate-600">{label}</dt>
      <dd className="text-sm font-semibold text-slate-900">{value}</dd>
    </div>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center text-center">
      <div className="mb-3 rounded-full bg-surface-2 p-4 text-slate-400">
        <BarChart3 className="h-6 w-6" />
      </div>
      <p className="text-sm text-slate-500">{message}</p>
    </div>
  );
}
