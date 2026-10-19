import React from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { avatarFor } from '../../utils/helpers';
import {
  ShieldAlert,
  LayoutDashboard,
  Receipt,
  AlertTriangle,
  ShieldCheck,
  Users,
  BarChart3,
  Cpu,
  Sliders,
  LogOut,
  ChevronLeft,
  ChevronRight,
  X
} from 'lucide-react';

export default function AnalystSidebar({ collapsed, setCollapsed, mobileOpen, onCloseMobile }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { label: 'Intelligence Overview', path: '/analyst/dashboard', icon: LayoutDashboard },
    { label: 'Transactions', path: '/analyst/transactions', icon: Receipt },
    { label: 'Fraud Incidents', path: '/analyst/fraud-incidents', icon: AlertTriangle, badge: 14 },
    { label: 'Risk Analysis', path: '/analyst/risk-analysis', icon: ShieldCheck },
    { label: 'Users & Accounts', path: '/analyst/users', icon: Users },
    { label: 'Macro Analytics', path: '/analyst/macro-analytics', icon: BarChart3 },
    { label: 'Model Performance', path: '/analyst/model-performance', icon: Cpu, badge: 'v3.4' },
    { label: 'Security Settings', path: '/analyst/settings', icon: Sliders },
  ];

  return (
    <>
      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          onClick={onCloseMobile}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            zIndex: 40,
            backdropFilter: 'blur(2px)',
          }}
        />
      )}

      <aside
        className={`sidebar analyst-sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}
      >
        <div>
          {/* Header */}
          <div className="sidebar-header">
            <Link to="/analyst/dashboard" className="sidebar-brand-link">
              <div className="sidebar-brand-badge analyst-brand-badge">
                <ShieldAlert size={20} />
              </div>
              {!collapsed && (
                <div>
                  <div className="sidebar-brand-name">
                    FraudGuard AI
                  </div>
                  <div className="sidebar-brand-sub analyst-brand-sub">
                    FRAUD INTELLIGENCE
                  </div>
                </div>
              )}
            </Link>

            {/* Mobile close button */}
            <button
              onClick={onCloseMobile}
              className="mobile-close-btn"
              style={{
                display: 'none',
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
              }}
            >
              <X size={20} />
            </button>
          </div>

          {/* Nav List */}
          <nav className="sidebar-nav">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={onCloseMobile}
                  className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon size={18} className="sidebar-icon" />
                  {!collapsed && <span className="sidebar-label">{item.label}</span>}
                  {!collapsed && item.badge && (
                    <span
                      className="sidebar-badge"
                      style={{
                        background: typeof item.badge === 'number' ? '#ef4444' : 'rgba(59, 130, 246, 0.2)',
                        color: typeof item.badge === 'number' ? '#ffffff' : '#60a5fa',
                      }}
                    >
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* User Card & Logout */}
        <div className="sidebar-footer">
          {!collapsed && (
            <div className="sidebar-user-card">
              <img
                src={user?.avatar || avatarFor(user)}
                alt={user?.name || 'Analyst'}
                className="sidebar-user-avatar"
              />
              <div className="sidebar-user-info">
                <div className="sidebar-user-name">
                  {user?.name || 'Analyst'}
                </div>
                <div className="sidebar-user-role" style={{ color: '#f87171' }}>
                  {user?.title || 'Fraud Analyst'}
                </div>
              </div>
            </div>
          )}

          <div className="sidebar-footer-actions">
            <button
              onClick={() => setCollapsed && setCollapsed(!collapsed)}
              className="sidebar-action-btn"
              title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            >
              {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </button>

            <button
              onClick={handleLogout}
              className="sidebar-logout-btn"
              title="Log Out"
            >
              <LogOut size={16} />
              {!collapsed && <span>Log Out</span>}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
