import React, { useState } from 'react';
import { StorageEngine } from '../../services/storage';
import { Save, Download, Upload, RotateCcw, ShieldCheck } from 'lucide-react';

export const SettingsView: React.FC = () => {
  const [settings, setSettings] = useState(() => StorageEngine.getSettings());
  const [jsonText, setJsonText] = useState('');
  const [msg, setMsg] = useState('');

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    StorageEngine.saveSettings(settings);
    setMsg('Settings updated successfully!');
    setTimeout(() => setMsg(''), 3000);
  };

  const handleExport = () => {
    const dataStr = StorageEngine.exportBackupJSON();
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `crm_backup_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setMsg('Backup JSON downloaded successfully!');
    setTimeout(() => setMsg(''), 3000);
  };

  const handleImport = () => {
    if (!jsonText) return;
    const ok = StorageEngine.importBackupJSON(jsonText);
    if (ok) {
      setMsg('CRM Data restored from JSON backup!');
      setJsonText('');
      setTimeout(() => setMsg(''), 3000);
    } else {
      alert('Invalid JSON backup file or format.');
    }
  };

  const handleReset = () => {
    if (confirm('Reset all CRM data to default sample records? This cannot be undone.')) {
      StorageEngine.resetAllData();
      window.location.reload();
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '800px' }}>
      <div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>CRM Platform Settings</h2>
        <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
          Configure company preferences and backup/restore local data.
        </p>
      </div>

      {msg && (
        <div
          style={{
            padding: '12px 16px',
            background: '#dcfce7',
            color: '#15803d',
            borderRadius: '6px',
            fontSize: '0.875rem',
            fontWeight: 600,
          }}
        >
          {msg}
        </div>
      )}

      {/* Company Branding Settings */}
      <div className="card">
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '16px' }}>Organization Branding</h3>
        <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="form-group">
            <label className="form-label">Company Name</label>
            <input
              className="form-input"
              value={settings.companyName}
              onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Default Currency</label>
              <select
                className="form-select"
                value={settings.currency}
                onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
              >
                <option value="INR">INR (₹)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Timezone</label>
              <select
                className="form-select"
                value={settings.timezone}
                onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
              >
                <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                <option value="UTC">UTC</option>
                <option value="America/New_York">America/New_York (EST)</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn btn-primary">
              <Save size={16} />
              <span>Save Preferences</span>
            </button>
          </div>
        </form>
      </div>

      {/* Backup & Export Data */}
      <div className="card">
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '8px' }}>Local Storage Data Backup & Restore</h3>
        <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '16px' }}>
          Export your entire CRM database (Leads, Contacts, Companies, Deals, Tasks) to a single JSON file or restore from a backup.
        </p>

        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" onClick={handleExport}>
            <Download size={16} />
            <span>Export JSON Backup</span>
          </button>

          <button className="btn btn-danger" onClick={handleReset}>
            <RotateCcw size={16} />
            <span>Reset Demo Data</span>
          </button>
        </div>

        <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label className="form-label">Paste JSON Backup Content to Restore:</label>
          <textarea
            className="form-textarea"
            rows={4}
            placeholder="Paste backup JSON string here..."
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn btn-primary" onClick={handleImport} disabled={!jsonText}>
              <Upload size={16} />
              <span>Restore Data</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
