/* ============================================================
   FraudGuard AI — Fraud Alerts API Service
   Alerts are created by the backend whenever it flags one of the
   account's transactions, and are read/updated with the
   authenticated session. Scoped to the signed-in account.
============================================================ */

import { apiClient } from './client';

export const fraudAlertsApi = {
  async getAlerts(params = {}) {
    return apiClient.get('/fraud-alerts', params);
  },

  async updateAlertStatus(id, newStatus) {
    return apiClient.patch(`/fraud-alerts/${id}`, { status: newStatus });
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
};
