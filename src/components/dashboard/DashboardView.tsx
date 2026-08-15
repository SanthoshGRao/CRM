import React from 'react';
import { StorageEngine } from '../../services/storage';
import { TrendingUp, DollarSign, Handshake, CheckSquare, Plus, ArrowRight } from 'lucide-react';

interface DashboardViewProps {
  onNavigate: (tab: string) => void;
  onOpenAddLeadModal: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate, onOpenAddLeadModal }) => {
  const leads = StorageEngine.getLeads();
  const deals = StorageEngine.getDeals();
  const tasks = StorageEngine.getTasks();
  const activities = StorageEngine.getActivities();

  const totalRevenue = deals
    .filter((d) => d.stage === 'won')
    .reduce((sum, d) => sum + d.value, 0);

  const activeLeads = leads.filter((l) => l.status !== 'won' && l.status !== 'lost').length;
  const wonDealsCount = deals.filter((d) => d.stage === 'won').length;
  const pendingTasksCount = tasks.filter((t) => t.status !== 'completed').length;

  const fmtCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Header Row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Welcome back, Santhosh</h2>
          <p style={{ fontSize: '0.875rem', color: '#64748b' }}>
            Here is your CRM performance overview for today.
          </p>
        </div>
        <button className="btn btn-primary" onClick={onOpenAddLeadModal}>
          <Plus size={16} />
          <span>New Lead</span>
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid-4">
        <div className="card kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">Total Revenue</span>
            <div style={{ padding: '8px', background: '#e0e7ff', borderRadius: '8px', color: '#4f46e5' }}>
              <DollarSign size={20} />
            </div>
          </div>
          <div className="kpi-value">{fmtCurrency(totalRevenue)}</div>
          <span className="kpi-badge">+18% vs last month</span>
        </div>

        <div className="card kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">Active Leads</span>
            <div style={{ padding: '8px', background: '#e0f2fe', borderRadius: '8px', color: '#0284c7' }}>
              <TrendingUp size={20} />
            </div>
          </div>
          <div className="kpi-value">{activeLeads}</div>
          <span className="kpi-badge" style={{ background: '#fef3c7', color: '#b45309' }}>
            {leads.length} Total Leads
          </span>
        </div>

        <div className="card kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">Deals Closed Won</span>
            <div style={{ padding: '8px', background: '#dcfce7', borderRadius: '8px', color: '#16a34a' }}>
              <Handshake size={20} />
            </div>
          </div>
          <div className="kpi-value">{wonDealsCount}</div>
          <span className="kpi-badge">{deals.length} Total Deals</span>
        </div>

        <div className="card kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">Pending Tasks</span>
            <div style={{ padding: '8px', background: '#fee2e2', borderRadius: '8px', color: '#dc2626' }}>
              <CheckSquare size={20} />
            </div>
          </div>
          <div className="kpi-value">{pendingTasksCount}</div>
          <span className="kpi-badge" style={{ background: '#fee2e2', color: '#b91c1c' }}>
            Action Required
          </span>
        </div>
      </div>

      {/* Main Overview Grid */}
      <div className="grid-3">
        {/* Pipeline Overview */}
        <div className="card" style={{ gridColumn: 'span 2' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Lead Pipeline Breakdown</h3>
            <button
              className="btn btn-secondary"
              style={{ padding: '4px 10px', fontSize: '0.75rem' }}
              onClick={() => onNavigate('leads')}
            >
              <span>View Board</span>
              <ArrowRight size={14} />
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
            {[
              { label: 'New Leads', count: leads.filter((l) => l.status === 'new').length, color: '#0284c7' },
              { label: 'Contacted', count: leads.filter((l) => l.status === 'contacted').length, color: '#d97706' },
              { label: 'Qualified', count: leads.filter((l) => l.status === 'qualified').length, color: '#7c3aed' },
              { label: 'Proposal Sent', count: leads.filter((l) => l.status === 'proposal').length, color: '#4f46e5' },
            ].map((stage) => (
              <div
                key={stage.label}
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '16px',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: stage.color }}>
                  {stage.count}
                </div>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginTop: '4px' }}>
                  {stage.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activities */}
        <div className="card">
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '16px' }}>Recent Activity Timeline</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {activities.slice(0, 5).map((act) => (
              <div key={act.id} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <div className="avatar" style={{ width: '28px', height: '28px', fontSize: '0.75rem' }}>
                  SK
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>{act.title}</div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                    {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
