import React from 'react';
import {
  LayoutDashboard,
  TrendingUp,
  Users,
  Building2,
  Handshake,
  CheckSquare,
  Settings,
  Sparkles,
} from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onTabChange }) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, section: 'Main' },
    { id: 'leads', label: 'Leads', icon: TrendingUp, section: 'CRM' },
    { id: 'contacts', label: 'Contacts', icon: Users, section: 'CRM' },
    { id: 'companies', label: 'Companies', icon: Building2, section: 'CRM' },
    { id: 'deals', label: 'Deals Pipeline', icon: Handshake, section: 'CRM' },
    { id: 'tasks', label: 'Tasks', icon: CheckSquare, section: 'Work' },
    { id: 'settings', label: 'Settings', icon: Settings, section: 'System' },
  ];

  const sections = Array.from(new Set(navItems.map((item) => item.section)));

  return (
    <aside className="sidebar">
      {/* Brand */}
      <div className="sidebar-brand">
        <div className="brand-icon">C</div>
        <span>CRM Platform</span>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {sections.map((section) => (
          <div key={section}>
            <div className="nav-section-title">{section}</div>
            {navItems
              .filter((item) => item.section === section)
              .map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    className={`nav-link ${isActive ? 'active' : ''}`}
                    onClick={() => onTabChange(item.id)}
                  >
                    <Icon size={18} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
          </div>
        ))}
      </nav>

      {/* Bottom Footer */}
      <div style={{ padding: '16px 12px', borderTop: '1px solid #1e293b' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.75rem',
            color: '#64748b',
          }}
        >
          <Sparkles size={14} color="#6366f1" />
          <span>Local Storage Mode</span>
        </div>
      </div>
    </aside>
  );
};
