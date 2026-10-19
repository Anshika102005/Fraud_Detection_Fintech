/* ============================================================
   Utility Helper Functions - Part 1: Formatting
============================================================ */
import { RISK_LEVELS, RISK_LEVEL_NAMES } from '../utils/constants';

export const formatNumber = (num) => {
  if (num === null || num === undefined) return '-';
  if (typeof num === 'string') num = parseFloat(num);
  if (isNaN(num)) return '-';
  return new Intl.NumberFormat('en-US').format(Math.round(num));
};

export const formatCurrency = (amount, currency = 'USD') => {
  if (amount === null || amount === undefined) return '-';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

export const formatCompact = (num) => {
  if (num === null || num === undefined) return '-';
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(num);
};

export const formatDateTime = (dateString, options = {}) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '-';
  const { time = true, date: showDate = true } = options;
  const parts = [];
  if (showDate) {
    parts.push(date.toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    }));
  }
  if (time) {
    parts.push(date.toLocaleTimeString('en-US', {
      hour: '2-digit', minute: '2-digit', hour12: true,
    }));
  }
  return parts.join(', ');
};

export const formatTime = (dateString) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '-';
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
};

/**
 * Get risk level from score
 */
export const getRiskLevel = (score) => {
  if (score <= RISK_LEVELS.LOW.max) return 'low';
  if (score <= RISK_LEVELS.MEDIUM.max) return 'medium';
  if (score <= RISK_LEVELS.HIGH.max) return 'high';
  return 'critical';
};

export const getRiskLabel = (score) => {
  const level = getRiskLevel(score);
  return RISK_LEVEL_NAMES[level.toUpperCase()] || 'Unknown';
};

export const getRiskColor = (score) => {
  const level = getRiskLevel(score);
  switch (level) {
    case 'low': return 'var(--risk-low)';
    case 'medium': return 'var(--risk-medium)';
    case 'high': return 'var(--risk-high)';
    case 'critical': return 'var(--risk-critical)';
    default: return 'var(--text-muted)';
  }
};

export const getRiskBgColor = (score) => {
  const level = getRiskLevel(score);
  switch (level) {
    case 'low': return 'var(--risk-low-bg)';
    case 'medium': return 'var(--risk-medium-bg)';
    case 'high': return 'var(--risk-high-bg)';
    case 'critical': return 'var(--risk-critical-bg)';
    default: return 'var(--bg-surface-alt)';
  }
};

export const getStatusBadgeClass = (status) => {
  switch (status) {
    case 'legitimate': return 'status-badge legitimate';
    case 'suspicious': return 'status-badge suspicious';
    case 'fraudulent': return 'status-badge fraudulent';
    case 'blocked': return 'status-badge blocked';
    default: return 'status-badge';
  }
};

export const getStatusLabel = (status) => {
  switch (status) {
    case 'legitimate': return 'Legitimate';
    case 'suspicious': return 'Suspicious';
    case 'fraudulent': return 'Fraudulent';
    case 'blocked': return 'Blocked';
    default: return status;
  }
};

export const getPriorityLabel = (priority) => {
  return priority.charAt(0).toUpperCase() + priority.slice(1);
};

export const getAlertStatusClass = (status) => {
  switch (status) {
    case 'new': return 'status-badge fraudulent';
    case 'investigating': return 'status-badge suspicious';
    case 'resolved': return 'status-badge legitimate';
    case 'dismissed': return 'status-badge';
    default: return 'status-badge';
  }
};

export const getAlertStatusLabel = (status) => {
  switch (status) {
    case 'new': return 'New';
    case 'investigating': return 'Investigating';
    case 'resolved': return 'Resolved';
    case 'dismissed': return 'Dismissed';
    default: return status;
  }
};

export const calculateChange = (current, previous) => {
  if (!previous || previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
};

export const formatChange = (change) => {
  const sign = change >= 0 ? '+' : '';
  return `${sign}${change.toFixed(2)}%`;
};

export const shortenId = (id, length = 8) => {
  if (!id) return '-';
  return id.length <= length ? id : `${id.slice(0, length)}...`;
};

export const stringToColor = (str) => {
  const colors = ['#3b82f6','#8b5cf6','#10b981','#f59e0b','#ef4444','#06b6d4','#6366f1','#84cc16','#f97316','#0ea5e9'];
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
};

export const getInitials = (name) => {
  if (!name) return '?';
  const parts = name.split(' ');
  if (parts.length === 1) return parts[0][0]?.toUpperCase() || '?';
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Deterministic initials avatar (data URI) so accounts without a photo never
 * inherit another user's picture. Matches the app's dark theme.
 */
export const avatarFor = (user) => {
  const name = user?.name || 'User';
  const initials = getInitials(name);
  const bg = stringToColor(name);
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='150' height='150'>` +
    `<rect width='100%' height='100%' fill='${bg}'/>` +
    `<text x='50%' y='50%' dy='.35em' text-anchor='middle' ` +
    `font-family='sans-serif' font-size='56' fill='#ffffff'>${initials}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

/**
 * Resolve a CSS variable (from variables.css) at runtime, so charts
 * and UI adapt to the active light/dark theme.
 */
export const cssVar = (name, fallback = '#888888') => {
  if (typeof document === 'undefined' || typeof getComputedStyle === 'undefined') return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
};

export const truncate = (text, maxLength) => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
};
