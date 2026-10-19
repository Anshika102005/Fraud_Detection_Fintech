/* ============================================================
   FraudGuard AI — Notification Context
   Manages in-app alerts, unread badges, and toast feedback
============================================================ */

import React, { createContext, useContext, useState } from 'react';

const INITIAL_NOTIFICATIONS = [
  {
    id: 'notif-1',
    type: 'critical',
    title: 'High-risk transaction detected',
    message: '₹14,500 UPI Collect request from an unknown VPA in Jaipur.',
    time: '12 mins ago',
    unread: true,
    link: '/app/alerts',
  },
  {
    id: 'notif-2',
    type: 'warning',
    title: 'Suspicious transaction flagged',
    message: '₹8,500 purchase at Reliance Digital triggered 3 rapid authentications.',
    time: '2 hours ago',
    unread: true,
    link: '/app/alerts',
  },
  {
    id: 'notif-3',
    type: 'success',
    title: 'Monthly security report ready',
    message: 'Your August 2026 FraudGuard Protection Statement is generated.',
    time: '1 day ago',
    unread: false,
    link: '/app/monthly-report',
  },
  {
    id: 'notif-4',
    type: 'info',
    title: 'New safety advisory available',
    message: 'Advisory: Beware of fake Electricity Bill SMS claiming disconnection at night.',
    time: '2 days ago',
    unread: false,
    link: '/app/safety-center',
  },
];

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS);
  const [toasts, setToasts] = useState([]);

  const unreadCount = notifications.filter((n) => n.unread).length;

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
  };

  const markAsRead = (id) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, unread: false } : n)));
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  const showToast = (message, type = 'info', duration = 4000) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const value = {
    notifications,
    unreadCount,
    markAllAsRead,
    markAsRead,
    clearNotifications,
    showToast,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      {/* Global Toast Render */}
      <div className="fraudguard-toast-container" style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`fraudguard-toast toast-${toast.type}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              minWidth: '320px',
              maxWidth: '420px',
              padding: '14px 18px',
              borderRadius: '12px',
              background: toast.type === 'error' || toast.type === 'danger' ? '#7f1d1d' : toast.type === 'success' ? '#064e3b' : toast.type === 'warning' ? '#78350f' : '#1e293b',
              color: '#ffffff',
              boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
              border: '1px solid rgba(255,255,255,0.12)',
              fontSize: '14px',
              animation: 'slideInRight 0.25s ease-out',
            }}
          >
            <span>{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                marginLeft: '12px',
                fontSize: '16px',
              }}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within NotificationProvider');
  }
  return context;
};
