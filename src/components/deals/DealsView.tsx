import React, { useState } from 'react';
import { Deal } from '../../types/crm';
import { StorageEngine } from '../../services/storage';
import { Plus, Handshake, Calendar } from 'lucide-react';

const DEAL_STAGES = [
  { id: 'discovery', label: 'Discovery' },
  { id: 'proposal', label: 'Proposal' },
  { id: 'negotiation', label: 'Negotiation' },
  { id: 'won', label: 'Closed Won' },
  { id: 'lost', label: 'Closed Lost' },
];

export const DealsView: React.FC = () => {
  const [deals, setDeals] = useState<Deal[]>(() => StorageEngine.getDeals());
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [form, setForm] = useState({
    name: '',
    company: '',
    contactName: '',
    stage: 'discovery' as Deal['stage'],
    value: 200000,
    probability: 50,
    expectedCloseDate: '2026-09-30',
  });

  const refresh = () => setDeals(StorageEngine.getDeals());

  const handleStageChange = (id: string, stage: Deal['stage']) => {
    StorageEngine.updateDeal(id, { stage });
    refresh();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.company) return;

    StorageEngine.addDeal({
      ...form,
      assignedTo: 'Santhosh Kumar',
    });

    refresh();
    setIsModalOpen(false);
    setForm({
      name: '',
      company: '',
      contactName: '',
      stage: 'discovery',
      value: 200000,
      probability: 50,
      expectedCloseDate: '2026-09-30',
    });
  };

  const fmtCurrency = (val: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Deals Pipeline</h2>
          <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
            Monitor high-value opportunities and calculate projected revenue.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
          <Plus size={16} />
          <span>New Deal</span>
        </button>
      </div>

      <div className="kanban-board">
        {DEAL_STAGES.map((s) => {
          const stageDeals = deals.filter((d) => d.stage === s.id);
          const totalVal = stageDeals.reduce((sum, d) => sum + d.value, 0);

          return (
            <div key={s.id} className="kanban-col">
              <div className="kanban-col-header">
                <div>
                  <div className="kanban-col-title">{s.label}</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>
                    {fmtCurrency(totalVal)}
                  </div>
                </div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, background: '#cbd5e1', padding: '2px 8px', borderRadius: '999px' }}>
                  {stageDeals.length}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {stageDeals.map((deal) => (
                  <div key={deal.id} className="kanban-card">
                    <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{deal.name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{deal.company}</div>

                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#16a34a', marginTop: '4px' }}>
                      {fmtCurrency(deal.value)}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#64748b' }}>
                      <Calendar size={12} />
                      <span>Close: {deal.expectedCloseDate}</span>
                    </div>

                    <select
                      style={{
                        fontSize: '0.75rem',
                        padding: '4px',
                        borderRadius: '4px',
                        border: '1px solid #cbd5e1',
                        background: '#f8fafc',
                        marginTop: '4px',
                      }}
                      value={deal.stage}
                      onChange={(e) => handleStageChange(deal.id, e.target.value as Deal['stage'])}
                    >
                      {DEAL_STAGES.map((st) => (
                        <option key={st.id} value={st.id}>
                          Move to {st.label}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Create New Deal</h3>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Deal Name *</label>
                <input
                  className="form-input"
                  required
                  placeholder="e.g. Enterprise License Expansion"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Company Name *</label>
                <input
                  className="form-input"
                  required
                  placeholder="e.g. TechCorp Solutions"
                  value={form.company}
                  onChange={(e) => setForm({ ...form, company: e.target.value })}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Deal Value (₹)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={form.value}
                    onChange={(e) => setForm({ ...form, value: Number(e.target.value) })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Stage</label>
                  <select
                    className="form-select"
                    value={form.stage}
                    onChange={(e) => setForm({ ...form, stage: e.target.value as Deal['stage'] })}
                  >
                    {DEAL_STAGES.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Deal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
