'use client';

import { useQuery } from '@tanstack/react-query';
import {
  TrendingUp, Users, Handshake, CheckSquare,
  DollarSign, Activity,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import api from '@/lib/api/client';
import { getCurrencySymbol } from '@/lib/utils';
import type { DashboardKpis } from '@crm/types';

// ─── API calls ──────────────────────────────────────────────────────────────

async function fetchKpis(): Promise<DashboardKpis> {
  const { data } = await api.get('/dashboard/kpis');
  return data.data;
}

async function fetchLeadSources() {
  const { data } = await api.get('/dashboard/lead-sources');
  return data.data as { source: string; count: number }[];
}

async function fetchActivities() {
  const { data } = await api.get('/dashboard/activities?limit=8');
  return data.data;
}

async function fetchPipeline() {
  const { data } = await api.get('/dashboard/pipeline');
  return data.data;
}

// ─── KPI Card ────────────────────────────────────────────────────────────────

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#3b82f6', '#ec4899', '#14b8a6'];

interface KpiCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  iconBg: string;
}

function KpiCard({ label, value, icon, iconBg }: KpiCardProps) {
  return (
    <div className="kpi-card">
      <div className="flex items-start justify-between">
        <div>
          <p className="kpi-label">{label}</p>
          <p className="kpi-value mt-1">{value}</p>
        </div>
        <div className={`rounded-lg p-2.5 ${iconBg}`}>{icon}</div>
      </div>
    </div>
  );
}

// ─── Activity Item ───────────────────────────────────────────────────────────

function ActivityItem({ activity }: { activity: any }) {
  const user = activity.performedBy;
  const initials = user
    ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
    : '?';
  const date = new Date(activity.createdAt);
  const timeStr = date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

  return (
    <div className="flex items-start gap-3 py-3 border-b last:border-0">
      <div className="avatar-sm flex-shrink-0">{initials}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-800 leading-snug">{activity.title}</p>
        <p className="text-xs text-slate-500 mt-0.5">{timeStr}</p>
      </div>
    </div>
  );
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

function KpiSkeleton() {
  return (
    <div className="kpi-card">
      <div className="flex justify-between">
        <div className="space-y-2">
          <div className="skeleton h-3 w-24" />
          <div className="skeleton h-7 w-16" />
        </div>
        <div className="skeleton h-10 w-10 rounded-lg" />
      </div>
      <div className="skeleton h-3 w-20 mt-2" />
    </div>
  );
}

// ─── Main Dashboard ──────────────────────────────────────────────────────────

export default function DashboardClient() {
  const { data: kpis, isLoading: kpisLoading } = useQuery({
    queryKey: ['dashboard-kpis'],
    queryFn: fetchKpis,
  });

  const { data: sources, isLoading: sourcesLoading } = useQuery({
    queryKey: ['lead-sources'],
    queryFn: fetchLeadSources,
  });

  const { data: activities, isLoading: activitiesLoading } = useQuery({
    queryKey: ['recent-activities'],
    queryFn: fetchActivities,
  });

  const { data: pipelines } = useQuery({
    queryKey: ['pipeline-data'],
    queryFn: fetchPipeline,
  });

  const symbol = getCurrencySymbol();
  const fmt = (n: number) =>
    n >= 1_00_000
      ? `${symbol}${(n / 1_00_000).toFixed(1)}L`
      : n >= 1_000
      ? `${symbol}${(n / 1_000).toFixed(0)}K`
      : `${symbol}${n}`;

  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpisLoading ? (
          Array.from({ length: 8 }).map((_, i) => <KpiSkeleton key={i} />)
        ) : kpis ? (
          <>
            <KpiCard
              label="Total Leads"
              value={kpis.totalLeads.toLocaleString()}
              icon={<TrendingUp className="h-5 w-5 text-brand-600" />}
              iconBg="bg-brand-50"
            />
            <KpiCard
              label="New This Month"
              value={kpis.newLeads.toLocaleString()}
              icon={<TrendingUp className="h-5 w-5 text-blue-600" />}
              iconBg="bg-blue-50"
            />
            <KpiCard
              label="Qualified Leads"
              value={kpis.qualifiedLeads.toLocaleString()}
              icon={<Users className="h-5 w-5 text-violet-600" />}
              iconBg="bg-violet-50"
            />
            <KpiCard
              label="Open Deals"
              value={kpis.openDeals.toLocaleString()}
              icon={<Handshake className="h-5 w-5 text-amber-600" />}
              iconBg="bg-amber-50"
            />
            <KpiCard
              label="Won Deals (Month)"
              value={kpis.wonDeals.toLocaleString()}
              icon={<Handshake className="h-5 w-5 text-emerald-600" />}
              iconBg="bg-emerald-50"
            />
            <KpiCard
              label="Total Revenue"
              value={fmt(kpis.totalRevenue)}
              icon={<DollarSign className="h-5 w-5 text-emerald-600" />}
              iconBg="bg-emerald-50"
            />
            <KpiCard
              label="Conversion Rate"
              value={`${kpis.conversionRate}%`}
              icon={<Activity className="h-5 w-5 text-brand-600" />}
              iconBg="bg-brand-50"
            />
            <KpiCard
              label="Tasks Due Today"
              value={kpis.tasksDueToday.toLocaleString()}
              icon={<CheckSquare className="h-5 w-5 text-red-600" />}
              iconBg="bg-red-50"
            />
          </>
        ) : null}
      </div>

      {/* Charts + Activity Row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Lead Sources Pie */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-sm font-semibold text-slate-800">Lead Sources</h3>
          </div>
          <div className="card-body">
            {sourcesLoading ? (
              <div className="skeleton h-48 rounded-lg" />
            ) : sources && sources.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={sources}
                    dataKey="count"
                    nameKey="source"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                  >
                    {sources.map((_, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend
                    formatter={(value: string) =>
                      value.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
                    }
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-state py-8">
                <p className="empty-state-desc">No lead source data yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Pipeline Bar Chart */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-sm font-semibold text-slate-800">Pipeline Overview</h3>
          </div>
          <div className="card-body">
            {pipelines && pipelines[0]?.stages ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={pipelines[0].stages} margin={{ left: -20 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="skeleton h-48 rounded-lg" />
            )}
          </div>
        </div>

        {/* Recent Activities */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-sm font-semibold text-slate-800">Recent Activities</h3>
          </div>
          <div className="card-body p-0 px-5">
            {activitiesLoading ? (
              <div className="space-y-3 py-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="skeleton h-7 w-7 rounded-full flex-shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="skeleton h-3 w-3/4" />
                      <div className="skeleton h-2.5 w-1/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : activities && activities.length > 0 ? (
              <div>
                {activities.map((activity: any) => (
                  <ActivityItem key={activity.id} activity={activity} />
                ))}
              </div>
            ) : (
              <div className="empty-state py-8">
                <p className="empty-state-desc">No activities yet</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
