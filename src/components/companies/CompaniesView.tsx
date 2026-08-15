import React, { useState } from 'react';
import { Company } from '../../types/crm';
import { StorageEngine } from '../../services/storage';
import { Plus, Globe, Phone, Mail, Building2 } from 'lucide-react';

export const CompaniesView: React.FC = () => {
  const [companies, setCompanies] = useState<Company[]>(() => StorageEngine.getCompanies());
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [form, setForm] = useState({
    name: '',
    industry: 'Software & Technology',
    website: '',
    phone: '',
    email: '',
    city: 'Bengaluru',
    country: 'India',
    employees: 50,
    annualRevenue: 10000000,
  });

  const refresh = () => setCompanies(StorageEngine.getCompanies());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) return;

    StorageEngine.addCompany({ ...form });
    refresh();
    setIsModalOpen(false);
    setForm({
      name: '',
      industry: 'Software & Technology',
      website: '',
      phone: '',
      email: '',
      city: 'Bengaluru',
      country: 'India',
      employees: 50,
      annualRevenue: 10000000,
    });
  };

  const fmtCurrency = (val: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Companies & Accounts</h2>
          <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
            Manage client organization profiles and revenue metrics.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
          <Plus size={16} />
          <span>Add Company</span>
        </button>
      </div>

      <div className="grid-3">
        {companies.map((comp) => (
          <div key={comp.id} className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '8px',
                  background: '#e0e7ff',
                  color: '#4f46e5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                }}
              >
                <Building2 size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>{comp.name}</h3>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{comp.industry}</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#475569' }}>
                <Globe size={14} />
                <a href={comp.website} target="_blank" rel="noreferrer" style={{ color: '#4f46e5', textDecoration: 'none' }}>
                  {comp.website || 'No website'}
                </a>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#475569' }}>
                <Phone size={14} />
                <span>{comp.phone || 'N/A'}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#475569' }}>
                <Mail size={14} />
                <span>{comp.email || 'N/A'}</span>
              </div>
            </div>

            <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase' }}>Employees</div>
                <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{comp.employees}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase' }}>Est. Revenue</div>
                <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#16a34a' }}>
                  {fmtCurrency(comp.annualRevenue)}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Create Company</h3>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Company Name *</label>
                <input
                  className="form-input"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Industry</label>
                <input
                  className="form-input"
                  value={form.industry}
                  onChange={(e) => setForm({ ...form, industry: e.target.value })}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input
                    className="form-input"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Website</label>
                  <input
                    className="form-input"
                    value={form.website}
                    onChange={(e) => setForm({ ...form, website: e.target.value })}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Company
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
