/* ============================================================
   FraudGuard AI — Analyst API Service
   Macro intelligence, account management, investigation cases,
   and model telemetry — all read from the backend database with
   an analyst session token. No mock fallbacks: if the backend is
   unreachable the error surfaces instead of fake data.
============================================================ */

import { apiClient } from './client';

/* The backend returns real registered accounts (safe fields only) with
   aggregates computed from their own database rows. Missing aggregates
   (accounts with no recorded activity) show as "—" rather than invented
   metrics. */
function toUiUser(u) {
  return {
    ...u,
    transactionsCount: u.transactionsCount ?? null,
    fraudCases: u.fraudCases ?? null,
    riskLevel: u.riskLevel ?? null,
    riskScore: u.riskScore ?? null,
    safetyScore: u.safetyScore ?? null,
    totalVolume: u.totalVolume ?? null,
    lastActive: u.lastLogin || '—',
    status: u.status || 'active',
  };
}

export const analystApi = {
  /** Fraud Intelligence dashboard — computed from live database rows. */
  async getAnalystDashboard() {
    return apiClient.get('/analyst/overview');
  },

  async getUsers(params = {}) {
    const res = await apiClient.get('/analyst/users', params);
    let users = (res.users || []).map(toUiUser);
    if (params.search) {
      const q = params.search.toLowerCase();
      users = users.filter(
        (u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q),
      );
    }
    if (params.status && params.status !== 'ALL') {
      users = users.filter((u) => u.status.toLowerCase() === params.status.toLowerCase());
    }
    return { users, total: users.length };
  },

  async getUserDetails(userId) {
    const res = await apiClient.get(`/analyst/users/${userId}`);
    return {
      user: toUiUser(res.user),
      accountIsolated: res.accountIsolated !== false,
      riskSummary: res.riskSummary || {},
      recentActivity: res.recentActivity || [],
    };
  },

  /** Real training metrics from the serving bundle + training artifacts. */
  async getModelPerformance() {
    return apiClient.get('/analyst/model-performance');
  },

  /** All accounts' transactions with owner names — analyst monitoring. */
  async getTransactions(params = {}) {
    return apiClient.get('/analyst/transactions', params);
  },

  /** Investigation cases raised from customer fraud alerts. */
  async getCases(params = {}) {
    return apiClient.get('/analyst/cases', params);
  },

  /** Triage a case: change status and/or claim it for the signed-in analyst. */
  async updateCase(caseId, { status, assign } = {}) {
    const body = {};
    if (status !== undefined) body.status = status;
    if (assign !== undefined) body.assign = assign;
    return apiClient.patch(`/analyst/cases/${caseId}`, body);
  },
};
