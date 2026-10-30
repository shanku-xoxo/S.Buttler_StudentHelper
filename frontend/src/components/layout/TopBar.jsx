import React from 'react';
import { Search, User, Activity } from 'lucide-react';

export default function TopBar({ title, activeSemester, backendOnline }) {
  return (
    <header style={{
      height: '60px',
      backgroundColor: 'var(--bg-base)',
      borderBottom: '1px solid var(--border-hairline)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      position: 'sticky',
      top: 0,
      zIndex: 5
    }}>
      {/* Title & Context */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <h1 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' }}>
          {title}
        </h1>
        {activeSemester && (
          <span className="badge" style={{ backgroundColor: 'var(--bg-surface-raised)', color: 'var(--text-secondary)', border: '1px solid var(--border-hairline)' }}>
            {activeSemester.name}
          </span>
        )}
      </div>

      {/* Actions & Profile */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* Backend Status Indicator */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '12px',
          color: backendOnline ? '#10B981' : '#EF4444',
          backgroundColor: backendOnline ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          padding: '4px 10px',
          borderRadius: '12px',
          border: `1px solid ${backendOnline ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`
        }}>
          <Activity size={13} />
          <span>{backendOnline ? 'API Connected' : 'API Offline'}</span>
        </div>

        {/* Global Search Bar */}
        <div style={{ position: 'relative', width: '220px' }}>
          <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search workspace..."
            className="input"
            style={{ paddingLeft: '32px', height: '34px', fontSize: '12px' }}
          />
        </div>

        {/* Profile Avatar */}
        <div style={{
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          backgroundColor: 'var(--bg-surface-raised)',
          border: '1px solid var(--border-hairline)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-secondary)',
          cursor: 'pointer'
        }}>
          <User size={16} />
        </div>
      </div>
    </header>
  );
}
