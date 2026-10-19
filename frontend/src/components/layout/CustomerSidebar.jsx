import React from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTransactions } from '../../contexts/TransactionContext';
import { avatarFor } from '../../utils/helpers';
import {
  Shield,
  LayoutDashboard,
  Receipt,
  PlusCircle,
  UploadCloud,
  AlertTriangle,
  ShieldCheck,
  BarChart3,
  SearchCode,
  LifeBuoy,
  FileText,
  User,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  X
} from 'lucide-react';

export default function CustomerSidebar({ collapsed, setCollapsed, mobileOpen, onCloseMobile }) {
  const { user, logout } = useAuth();
  const { alerts } = useTransactions();
  const navigate = useNavigate();

  const unreadAlertsCount = alerts.filter(
    (a) => a.status === 'new' || a.status === 'investigating'
  ).length;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const primaryNavItems = [
    { label: 'Dashboard', path: '/app/dashboard', icon: LayoutDashboard },
    { label: 'Transactions', path: '/app/transactions', icon: Receipt },
    { label: 'Add Transaction', path: '/app/add-transaction', icon: PlusCircle },
    { label: 'Upload CSV', path: '/app/upload', icon: UploadCloud },
    { label: 'Fraud Alerts', path: '/app/fraud-alerts', icon: AlertTriangle, badge: unreadAlertsCount },
    { label: 'Risk Analysis', path: '/app/risk-analysis', icon: ShieldCheck },
    { label: 'Analytics', path: '/app/analytics', icon: BarChart3 },
    { label: 'Scam Checker', path: '/app/scam-checker', icon: SearchCode },
    { label: 'Safety Center', path: '/app/safety-center', icon: LifeBuoy },
    { label: 'Monthly Report', path: '/app/monthly-report', icon: FileText },
  ];

  const secondaryNavItems = [
    { label: 'Profile', path: '/app/profile', icon: User },
    { label: 'Settings', path: '/app/settings', icon: Settings },
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
        className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}
      >
        <div>
          {/* Header */}
          <div className="sidebar-header">
            <Link to="/" className="sidebar-brand-link">
              <div className="sidebar-brand-badge">
                <Shield size={20} />
              </div>
              {!collapsed && (
                <div>
                  <div className="sidebar-brand-name">
                    FraudGuard AI
                  </div>
                  <div className="sidebar-brand-sub">
                    PERSONAL PROTECTION
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

          {/* Primary Nav List */}
          <nav className="sidebar-nav">
            {primaryNavItems.map((item) => {
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
                  {!collapsed && item.badge > 0 && (
                    <span className="sidebar-badge">
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              );
            })}

            <div className="sidebar-divider" />

            {/* Secondary Nav List (Profile & Settings) */}
            {secondaryNavItems.map((item) => {
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
                alt={user?.name || 'Customer'}
                className="sidebar-user-avatar"
              />
              <div className="sidebar-user-info">
                <div className="sidebar-user-name">
                  {user?.name || 'Customer'}
                </div>
                <div className="sidebar-user-role">{user?.role === 'customer' ? 'Customer Account' : 'Account'}</div>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <button
              onClick={() => setCollapsed && setCollapsed(!collapsed)}
              className="collapse-toggle-btn"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#94a3b8',
                borderRadius: '8px',
                padding: '6px',
                cursor: 'pointer',
              }}
              title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            >
              {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </button>

            <button
              onClick={handleLogout}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'transparent',
                border: 'none',
                color: '#ef4444',
                fontSize: '0.8rem',
                cursor: 'pointer',
                padding: '6px',
              }}
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
