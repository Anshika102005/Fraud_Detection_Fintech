/* ============================================================
   FraudGuard AI — Fraud Alerts API Service
   Manages user fraud alerts, flagged explanations, and resolutions
============================================================ */

import { apiClient } from './client';
import { INITIAL_FRAUD_ALERTS } from '../../data/indianData';
import { scopedKey, DEMO_CUSTOMER_ID } from './scopedStorage';
import { getStoredUserSync } from './authApi';

const ALERTS_BASE = 'fraudguard_alerts_v2';
const EMPTY_STATE_BASE = 'fraudguard_force_empty_state';
const LEGACY_ALERTS_KEY = 'fraudguard_alerts_v2';

const currentUserId = () => getStoredUserSync()?.id || 'anon';

/* Seeded alerts belong to Anshika's demo account only. */
function seedForCurrentUser() {
  return currentUserId() === DEMO_CUSTOMER_ID ? [...INITIAL_FRAUD_ALERTS] : [];
}

function getStoredAlerts() {
  const forceEmpty = localStorage.getItem(scopedKey(EMPTY_STATE_BASE)) === 'true';
  if (forceEmpty) return [];

  const key = scopedKey(ALERTS_BASE);
  const stored = localStorage.getItem(key);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return seedForCurrentUser();
    }
  }

  /* One-time migration of the legacy unscoped alerts into Anshika's namespace. */
  if (currentUserId() === DEMO_CUSTOMER_ID) {
    const legacy = localStorage.getItem(LEGACY_ALERTS_KEY);
    if (legacy) {
      localStorage.setItem(key, legacy);
      localStorage.removeItem(LEGACY_ALERTS_KEY);
      try {
        return JSON.parse(legacy);
      } catch {
        /* fall through to seed */
      }
    }
  }
  return seedForCurrentUser();
}

function saveAlerts(list) {
  localStorage.setItem(scopedKey(ALERTS_BASE), JSON.stringify(list));
}

export const fraudAlertsApi = {
  async getAlerts(params = {}) {
    try {
      return await apiClient.get('/fraud-alerts', params);
    } catch {
      let alerts = getStoredAlerts();

      if (params.status && params.status !== 'ALL') {
        alerts = alerts.filter((a) => a.status.toLowerCase() === params.status.toLowerCase());
      }
      if (params.riskLevel && params.riskLevel !== 'ALL') {
        alerts = alerts.filter((a) => a.riskLevel.toUpperCase() === params.riskLevel.toUpperCase());
      }

      return {
        alerts,
        total: alerts.length,
        unresolvedCount: alerts.filter((a) => a.status === 'new' || a.status === 'investigating').length,
      };
    }
  },

  async updateAlertStatus(id, newStatus) {
    try {
      return await apiClient.patch(`/fraud-alerts/${id}`, { status: newStatus });
    } catch {
      const alerts = getStoredAlerts();
      const updated = alerts.map((a) => (a.id === id ? { ...a, status: newStatus } : a));
      saveAlerts(updated);
      return { success: true, id, status: newStatus };
    }
  },

  async dismissAlert(id) {
    return this.updateAlertStatus(id, 'dismissed');
  },

  async markAsFraud(id) {
    return this.updateAlertStatus(id, 'resolved');
  },

  async markAsLegitimate(id) {
    return this.updateAlertStatus(id, 'resolved');
  },

  resetAlerts() {
    localStorage.setItem(scopedKey(ALERTS_BASE), JSON.stringify(seedForCurrentUser()));
  }
};
