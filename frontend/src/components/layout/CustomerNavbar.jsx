import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { useTheme } from '../../contexts/ThemeContext';
import { avatarFor } from '../../utils/helpers';
import { Link } from 'react-router-dom';
import { Bell, Settings, User, Sun, Moon, Menu, Check, Trash2, ExternalLink } from 'lucide-react';

export default function CustomerNavbar({ onToggleSidebar, pageTitle }) {
  const { user } = useAuth();
  const { notifications, unreadCount, markAllAsRead, markAsRead, clearNotifications } = useNotification();
  const { theme, toggleTheme } = useTheme();

  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const firstName = user?.name ? user.name.split(' ')[0] : 'User';

  return (
    <header className="navbar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px' }}>
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
          <div style={{ fontSize: '1.15rem', fontWeight: '700', color: '#ffffff', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
            Welcome, <span style={{ color: '#60a5fa' }}>{firstName}</span>
          </div>
          <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
            {pageTitle || 'Personal AI-Powered Fraud Protection'}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '10px',
            color: '#cbd5e1',
            padding: '8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
        </button>

        {/* Notification Bell with Dropdown */}
        <div style={{ position: 'relative' }} ref={notifRef}>
          <button
            onClick={() => setNotifOpen(!notifOpen)}
            style={{
              position: 'relative',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '10px',
              color: '#cbd5e1',
              padding: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="Notifications"
          >
            <Bell size={17} />
            {unreadCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-4px',
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  background: '#ef4444',
                  color: '#ffffff',
                  fontSize: '0.65rem',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '2px solid #0f172a',
                }}
              >
                {unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {notifOpen && (
            <div
              style={{
                position: 'absolute',
                top: '46px',
                right: '0',
                width: '340px',
                maxHeight: '450px',
                overflowY: 'auto',
                background: '#111827',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '14px',
                boxShadow: '0 15px 35px rgba(0,0,0,0.5)',
                zIndex: 110,
                padding: '16px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '8px' }}>
                <span style={{ fontWeight: '700', color: '#ffffff', fontSize: '0.9rem' }}>
                  Notifications ({unreadCount} new)
                </span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={markAllAsRead}
                    style={{ background: 'none', border: 'none', color: '#60a5fa', fontSize: '0.75rem', cursor: 'pointer' }}
                  >
                    Mark read
                  </button>
                  <button
                    onClick={clearNotifications}
                    style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '0.75rem', cursor: 'pointer' }}
                  >
                    Clear
                  </button>
                </div>
              </div>

              {notifications.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px 0', color: '#64748b', fontSize: '0.85rem' }}>
                  No new notifications
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => markAsRead(n.id)}
                      style={{
                        padding: '10px 12px',
                        borderRadius: '10px',
                        background: n.unread ? 'rgba(59, 130, 246, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid ' + (n.unread ? 'rgba(59, 130, 246, 0.25)' : 'rgba(255, 255, 255, 0.05)'),
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontSize: '0.825rem', fontWeight: '600', color: n.type === 'critical' ? '#ef4444' : n.type === 'warning' ? '#f59e0b' : '#38bdf8' }}>
                          {n.title}
                        </span>
                        <span style={{ fontSize: '0.7rem', color: '#64748b' }}>{n.time}</span>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.78rem', color: '#cbd5e1', lineHeight: '1.4' }}>
                        {n.message}
                      </p>
                      {n.link && (
                        <Link
                          to={n.link}
                          onClick={() => setNotifOpen(false)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            marginTop: '6px',
                            fontSize: '0.725rem',
                            color: '#60a5fa',
                            textDecoration: 'none',
                          }}
                        >
                          View Details <ExternalLink size={11} />
                        </Link>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Settings Shortcut */}
        <Link
          to="/app/settings"
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '10px',
            color: '#cbd5e1',
            padding: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textDecoration: 'none',
          }}
          title="Settings"
        >
          <Settings size={17} />
        </Link>

        {/* Profile Avatar */}
        <Link to="/app/profile" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
          <img
            src={user?.avatar || avatarFor(user)}
            alt="Profile"
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              border: '2px solid rgba(59, 130, 246, 0.5)',
              objectFit: 'cover',
            }}
          />
        </Link>
      </div>
    </header>
  );
}
