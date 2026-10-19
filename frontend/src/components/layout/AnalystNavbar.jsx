import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { avatarFor } from '../../utils/helpers';
import { ShieldAlert, Sun, Moon, Menu } from 'lucide-react';

export default function AnalystNavbar({ onToggleSidebar, pageTitle }) {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="navbar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', borderBottom: '1px solid rgba(239, 68, 68, 0.2)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button
          onClick={onToggleSidebar}
          className="sidebar-toggle-btn"
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '8px',
            color: '#cbd5e1',
            padding: '8px',
            cursor: 'pointer',
          }}
          title="Toggle Navigation"
        >
          <Menu size={18} />
        </button>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.15rem', fontWeight: '700', color: '#ffffff', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
              Fraud Intelligence Dashboard
            </span>
            <span
              style={{
                fontSize: '0.68rem',
                fontWeight: '700',
                padding: '2px 8px',
                borderRadius: '6px',
                background: 'rgba(239, 68, 68, 0.18)',
                color: '#f87171',
                border: '1px solid rgba(239, 68, 68, 0.3)',
              }}
            >
              ANALYST WORKSPACE
            </span>
          </div>
          <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
            {pageTitle || 'Transaction monitoring, fraud investigation, and risk intelligence.'}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button
          onClick={toggleTheme}
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '10px',
            color: '#cbd5e1',
            padding: '8px',
            cursor: 'pointer',
          }}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingLeft: '8px', borderLeft: '1px solid rgba(255,255,255,0.08)' }}>
          <img
            src={user?.avatar || avatarFor(user)}
            alt={user?.name || 'Analyst'}
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '50%',
              border: '2px solid #ef4444',
              objectFit: 'cover',
            }}
          />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#f1f5f9' }}>
              {user?.name || 'Analyst'}
            </span>
            <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
              {user?.role === 'analyst' ? 'Analyst' : 'User'}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
