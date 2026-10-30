import React from 'react';
import { 
  LayoutDashboard, 
  Bot, 
  Calendar, 
  CheckSquare, 
  FileText, 
  Settings, 
  ChevronLeft, 
  ChevronRight,
  GraduationCap
} from 'lucide-react';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'assistant', label: 'AI Assistant', icon: Bot },
  { id: 'calendar', label: 'Calendar', icon: Calendar },
  { id: 'planner', label: 'Planner', icon: CheckSquare },
  { id: 'notes', label: 'Notes & Docs', icon: FileText },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export default function Sidebar({ activeTab, setActiveTab, collapsed, setCollapsed }) {
  return (
    <aside style={{
      width: collapsed ? 'var(--sidebar-collapsed-width)' : 'var(--sidebar-width)',
      backgroundColor: 'var(--bg-surface)',
      borderRight: '1px solid var(--border-hairline)',
      display: 'flex',
      flexDirection: 'column',
      transition: 'width 0.2s ease',
      position: 'relative',
      zIndex: 10
    }}>
      {/* Brand Header */}
      <div style={{
        height: '60px',
        display: 'flex',
        alignItems: 'center',
        padding: collapsed ? '0 16px' : '0 20px',
        borderBottom: '1px solid var(--border-hairline)',
        gap: '12px'
      }}>
        <div style={{
          width: '32px',
          height: '32px',
          borderRadius: '8px',
          backgroundColor: 'var(--accent)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#FFF',
          flexShrink: 0
        }}>
          <GraduationCap size={20} />
        </div>

        {!collapsed && (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontWeight: 600, fontSize: '15px', color: 'var(--text-primary)', letterSpacing: '-0.2px' }}>
              S.Butler
            </span>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Academic Assistant</span>
          </div>
        )}
      </div>

      {/* Navigation List */}
      <nav style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              title={collapsed ? item.label : undefined}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                width: '100%',
                padding: collapsed ? '10px' : '10px 12px',
                justifyContent: collapsed ? 'center' : 'flex-start',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: isActive ? 'var(--bg-surface-raised)' : 'transparent',
                color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                fontWeight: isActive ? 500 : 400,
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                position: 'relative'
              }}
            >
              {isActive && (
                <div style={{
                  position: 'absolute',
                  left: '0',
                  top: '6px',
                  bottom: '6px',
                  width: '3px',
                  backgroundColor: 'var(--accent)',
                  borderRadius: '0 2px 2px 0'
                }} />
              )}
              <Icon size={18} style={{ color: isActive ? 'var(--accent)' : 'inherit', flexShrink: 0 }} />
              {!collapsed && <span>{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Collapse Toggle */}
      <div style={{
        padding: '12px',
        borderTop: '1px solid var(--border-hairline)',
        display: 'flex',
        justifyContent: collapsed ? 'center' : 'flex-end'
      }}>
        <button
          onClick={() => setCollapsed(!collapsed)}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            padding: '6px',
            borderRadius: '4px'
          }}
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>
    </aside>
  );
}
