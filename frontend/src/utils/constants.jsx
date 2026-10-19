/* ============================================================
   Application Constants
============================================================ */

export const RISK_LEVELS = {
  LOW: { min: 0, max: 30, label: 'LOW', color: 'var(--risk-low)' },
  MEDIUM: { min: 31, max: 70, label: 'MEDIUM', color: 'var(--risk-medium)' },
  HIGH: { min: 71, max: 90, label: 'HIGH', color: 'var(--risk-high)' },
  CRITICAL: { min: 91, max: 100, label: 'CRITICAL', color: 'var(--risk-critical)' },
};

export const RISK_LEVEL_NAMES = {
  LOW: 'Low Risk',
  MEDIUM: 'Medium Risk',
  HIGH: 'High Risk',
  CRITICAL: 'Critical Risk',
};

export const TRANSACTION_STATUSES = {
  LEGITIMATE: 'legitimate',
  SUSPICIOUS: 'suspicious',
  FRAUDULENT: 'fraudulent',
  BLOCKED: 'blocked',
};

export const ALERT_PRIORITIES = {
  CRITICAL: 'critical',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
};

export const ALERT_STATUS = {
  NEW: 'new',
  INVESTIGATING: 'investigating',
  RESOLVED: 'resolved',
  DISMISSED: 'dismissed',
};

export const MERCHANT_CATEGORIES = {
  ONLINE_SHOPPING: 'Online Shopping',
  TRAVEL: 'Travel',
  FOOD: 'Food & Dining',
  ELECTRONICS: 'Electronics',
  GROCERY: 'Grocery',
  ENTERTAINMENT: 'Entertainment',
  OTHER: 'Other',
};

export const TIME_FILTERS = {
  HOURS_24: { value: '24h', label: '24 Hours' },
  DAYS_7: { value: '7d', label: '7 Days' },
  DAYS_30: { value: '30d', label: '30 Days' },
  DAYS_90: { value: '90d', label: '90 Days' },
};

export const NAVIGATION_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard', path: '/' },
  { id: 'transactions', label: 'Transactions', icon: 'Receipt', path: '/transactions' },
  { id: 'alerts', label: 'Fraud Alerts', icon: 'AlertTriangle', path: '/alerts' },
  { id: 'risk', label: 'Risk Analysis', icon: 'ShieldCheck', path: '/risk-analysis' },
  { id: 'analytics', label: 'Analytics', icon: 'BarChart3', path: '/analytics' },
  { id: 'users', label: 'Users / Accounts', icon: 'Users', path: '/users' },
  { id: 'model', label: 'Model Performance', icon: 'Brain', path: '/model-performance' },
  { id: 'settings', label: 'Settings', icon: 'Settings', path: '/settings' },
];

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export const TOAST_POSITIONS = {
  TOP_RIGHT: 'top-right',
  TOP_LEFT: 'top-left',
  BOTTOM_RIGHT: 'bottom-right',
  BOTTOM_LEFT: 'bottom-left',
};

export const TOAST_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info',
};
