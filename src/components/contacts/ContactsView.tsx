import React, { useState } from 'react';
import { Contact } from '../../types/crm';
import { StorageEngine } from '../../services/storage';
import { Plus, Trash2, Mail, Phone, Building } from 'lucide-react';

interface ContactsViewProps {
  searchQuery: string;
}

export const ContactsView: React.FC<ContactsViewProps> = ({ searchQuery }) => {
  const [contacts, setContacts] = useState<Contact[]>(() => StorageEngine.getContacts());
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    company: '',
    position: '',
  });

  const refreshContacts = () => setContacts(StorageEngine.getContacts());

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.firstName || !form.lastName) return;

    StorageEngine.addContact({
      firstName: form.firstName,
      lastName: form.lastName,
      email: form.email,
      phone: form.phone,
      company: form.company,
      position: form.position,
      status: 'active',
    });

    refreshContacts();
    setIsModalOpen(false);
    setForm({ firstName: '', lastName: '', email: '', phone: '', company: '', position: '' });
  };

  const handleDelete = (id: string) => {
    if (confirm('Delete contact?')) {
      StorageEngine.deleteContact(id);
      refreshContacts();
    }
  };

  const filtered = contacts.filter(
    (c) =>
      `${c.firstName} ${c.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Contacts Directory</h2>
          <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
            Manage individual contact people and communication histories.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
          <Plus size={16} />
          <span>Add Contact</span>
        </button>
      </div>

      {/* Table */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Contact Name</th>
              <th>Company & Role</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id}>
                <td style={{ fontWeight: 600 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div className="avatar" style={{ width: '32px', height: '32px', fontSize: '0.8rem' }}>
                      {c.firstName[0]}
                      {c.lastName[0]}
                    </div>
                    <div>
                      <div>
                        {c.firstName} {c.lastName}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{c.position}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Building size={14} color="#64748b" />
                    <span>{c.company}</span>
                  </div>
                </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Mail size={14} color="#64748b" />
                    <span>{c.email}</span>
                  </div>
                </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Phone size={14} color="#64748b" />
                    <span>{c.phone}</span>
                  </div>
                </td>
                <td>
                  <span className="status-badge badge-won">Active</span>
                </td>
                <td>
                  <button
                    style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#ef4444' }}
                    onClick={() => handleDelete(c.id)}
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Add New Contact</h3>
            <form onSubmit={handleAddSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">First Name *</label>
                  <input
                    className="form-input"
                    required
                    value={form.firstName}
                    onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Last Name *</label>
                  <input
                    className="form-input"
                    required
                    value={form.lastName}
                    onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input
                  type="email"
                  className="form-input"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input
                  className="form-input"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Company</label>
                  <input
                    className="form-input"
                    value={form.company}
                    onChange={(e) => setForm({ ...form, company: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Job Title / Position</label>
                  <input
                    className="form-input"
                    value={form.position}
                    onChange={(e) => setForm({ ...form, position: e.target.value })}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Contact
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
