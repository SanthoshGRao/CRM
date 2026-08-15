import React, { useState } from 'react';
import { Lead, LeadStatus } from '../../types/crm';
import { StorageEngine } from '../../services/storage';
import { Plus, LayoutGrid, List, Trash2, Edit3, X } from 'lucide-react';

interface LeadsViewProps {
  searchQuery: string;
  isAddModalOpen: boolean;
  onCloseAddModal: () => void;
}

const STAGES: { id: LeadStatus; label: string }[] = [
  { id: 'new', label: 'New Lead' },
  { id: 'contacted', label: 'Contacted' },
  { id: 'qualified', label: 'Qualified' },
  { id: 'proposal', label: 'Proposal Sent' },
  { id: 'won', label: 'Closed Won' },
  { id: 'lost', label: 'Closed Lost' },
];

export const LeadsView: React.FC<LeadsViewProps> = ({
  searchQuery,
  isAddModalOpen,
  onCloseAddModal,
}) => {
  const [leads, setLeads] = useState<Lead[]>(() => StorageEngine.getLeads());
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    source: 'Website',
    status: 'new' as LeadStatus,
    value: 100000,
    notes: '',
  });

  const refreshLeads = () => {
    setLeads(StorageEngine.getLeads());
  };

  const handleStatusChange = (leadId: string, newStatus: LeadStatus) => {
    StorageEngine.updateLead(leadId, { status: newStatus });
    refreshLeads();
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this lead?')) {
      StorageEngine.deleteLead(id);
      refreshLeads();
    }
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.company) return;

    StorageEngine.addLead({
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      company: formData.company,
      source: formData.source,
      status: formData.status,
      value: Number(formData.value) || 0,
      assignedTo: 'Santhosh Kumar',
      notes: formData.notes,
    });

    refreshLeads();
    onCloseAddModal();
    setFormData({
      name: '',
      email: '',
      phone: '',
      company: '',
      source: 'Website',
      status: 'new',
      value: 100000,
      notes: '',
    });
  };

  const filteredLeads = leads.filter(
    (l) =>
      l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const fmtCurrency = (val: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Leads Management</h2>
          <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
            Track and convert sales leads across your pipeline.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* View Toggle */}
          <div style={{ display: 'flex', background: '#e2e8f0', borderRadius: '6px', padding: '2px' }}>
            <button
              className="btn"
              style={{
                padding: '6px 12px',
                background: viewMode === 'kanban' ? '#fff' : 'transparent',
                boxShadow: viewMode === 'kanban' ? 'var(--shadow-sm)' : 'none',
              }}
              onClick={() => setViewMode('kanban')}
            >
              <LayoutGrid size={16} />
              <span>Kanban</span>
            </button>
            <button
              className="btn"
              style={{
                padding: '6px 12px',
                background: viewMode === 'table' ? '#fff' : 'transparent',
                boxShadow: viewMode === 'table' ? 'var(--shadow-sm)' : 'none',
              }}
              onClick={() => setViewMode('table')}
            >
              <List size={16} />
              <span>Table</span>
            </button>
          </div>

          <button className="btn btn-primary" onClick={onCloseAddModal}>
            <Plus size={16} />
            <span>Add Lead</span>
          </button>
        </div>
      </div>

      {/* View Content */}
      {viewMode === 'kanban' ? (
        <div className="kanban-board">
          {STAGES.map((stage) => {
            const stageLeads = filteredLeads.filter((l) => l.status === stage.id);
            return (
              <div key={stage.id} className="kanban-col">
                <div className="kanban-col-header">
                  <span className="kanban-col-title">{stage.label}</span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, background: '#cbd5e1', padding: '2px 8px', borderRadius: '999px' }}>
                    {stageLeads.length}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {stageLeads.map((lead) => (
                    <div key={lead.id} className="kanban-card">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{lead.name}</div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{lead.company}</div>
                        </div>
                        <button
                          style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8' }}
                          onClick={() => handleDelete(lead.id)}
                          title="Delete Lead"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#4f46e5' }}>
                        {fmtCurrency(lead.value)}
                      </div>

                      {/* Stage Selector */}
                      <select
                        style={{
                          fontSize: '0.75rem',
                          padding: '4px',
                          borderRadius: '4px',
                          border: '1px solid #cbd5e1',
                          background: '#f8fafc',
                        }}
                        value={lead.status}
                        onChange={(e) => handleStatusChange(lead.id, e.target.value as LeadStatus)}
                      >
                        {STAGES.map((s) => (
                          <option key={s.id} value={s.id}>
                            Move to {s.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}

                  {stageLeads.length === 0 && (
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', textAlign: 'center', padding: '20px 0' }}>
                      No leads
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Lead Name</th>
                <th>Company</th>
                <th>Email / Phone</th>
                <th>Source</th>
                <th>Est. Value</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredLeads.map((lead) => (
                <tr key={lead.id}>
                  <td style={{ fontWeight: 600 }}>{lead.name}</td>
                  <td>{lead.company}</td>
                  <td>
                    <div>{lead.email}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{lead.phone}</div>
                  </td>
                  <td>{lead.source}</td>
                  <td style={{ fontWeight: 600 }}>{fmtCurrency(lead.value)}</td>
                  <td>
                    <span className={`status-badge badge-${lead.status}`}>{lead.status}</span>
                  </td>
                  <td>
                    <button
                      style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#ef4444' }}
                      onClick={() => handleDelete(lead.id)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Lead Modal */}
      {isAddModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Create New Lead</h3>
              <button
                style={{ border: 'none', background: 'none', cursor: 'pointer' }}
                onClick={onCloseAddModal}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Contact Name *</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  placeholder="e.g. Aarav Sharma"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Company Name *</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  placeholder="e.g. TechCorp Solutions"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input
                    type="email"
                    className="form-input"
                    placeholder="email@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone Number</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="+91 98765 43210"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Lead Source</label>
                  <select
                    className="form-select"
                    value={formData.source}
                    onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                  >
                    <option value="Website">Website</option>
                    <option value="Referral">Referral</option>
                    <option value="LinkedIn">LinkedIn</option>
                    <option value="Cold Outreach">Cold Outreach</option>
                    <option value="Event">Event</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Estimated Deal Value (₹)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
                <button type="button" className="btn btn-secondary" onClick={onCloseAddModal}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Lead
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
