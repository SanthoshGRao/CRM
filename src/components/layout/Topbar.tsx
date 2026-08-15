import React from 'react';
import { Search, Bell, User as UserIcon } from 'lucide-react';

interface TopbarProps {
  title: string;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

export const Topbar: React.FC<TopbarProps> = ({ title, searchQuery, onSearchChange }) => {
  return (
    <header className="topbar">
      {/* Title */}
      <h1 className="page-title">{title}</h1>

      {/* Right Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* Search */}
        <div className="search-box">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search records..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        {/* Notifications */}
        <button
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '6px',
            color: '#64748b',
          }}
          title="Notifications"
        >
          <Bell size={20} />
        </button>

        {/* User Profile */}
        <div className="user-profile">
          <div className="avatar">SK</div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Santhosh Kumar</span>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Admin</span>
          </div>
        </div>
      </div>
    </header>
  );
};
