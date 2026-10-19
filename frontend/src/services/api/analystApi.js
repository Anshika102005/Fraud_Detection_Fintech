/* ============================================================
   FraudGuard AI — Analyst API Service
   Macro intelligence, user management, and model telemetry
============================================================ */

import { apiClient } from './client';
import { DEMO_USERS_LIST, DEMO_MODEL_METRICS } from '../../data/indianData';

/* The backend returns real registered accounts (safe fields only). Known demo
   profiles keep their existing risk data; any other account shows "—" rather
   than invented metrics. */
function toUiUser(u) {
  const demo = DEMO_USERS_LIST.find(
    (d) => d.id === u.id || d.email.toLowerCase() === (u.email || '').toLowerCase(),
  );
  return {
    ...u,
    transactionsCount: demo?.transactionsCount ?? null,
    fraudCases: demo?.fraudCases ?? null,
    riskLevel: demo?.riskLevel ?? null,
    riskScore: demo?.riskScore ?? null,
    safetyScore: demo?.safetyScore ?? null,
    totalVolume: demo?.totalVolume ?? null,
    lastActive: u.lastLogin || demo?.lastActive || '—',
    status: demo?.status ?? 'active',
    isDemoProfile: !!demo,
  };
}

export const analystApi = {
  async getAnalystDashboard() {
    try {
      return await apiClient.get('/analyst/overview');
    } catch {
      return {
        macroKpis: {
          totalTransactions: 1420000,
          fraudTransactions: 4892,
          suspiciousTransactions: 18450,
          fraudRate: '0.34%',
          totalTransactionValue: 482000000, // ₹48.2 Cr
          averageRiskScore: 31,
        },
        fraudTrend: [
          { month: 'Apr', detected: 820, prevented: 790 },
          { month: 'May', detected: 940, prevented: 910 },
          { month: 'Jun', detected: 1100, prevented: 1040 },
          { month: 'Jul', detected: 890, prevented: 860 },
          { month: 'Aug', detected: 1050, prevented: 1020 },
          { month: 'Sep', detected: 489, prevented: 472 },
        ],
        vectorBreakdown: [
          { name: 'UPI Collect & VPA Spoofing', percentage: 46, cases: 2250, color: '#EF4444' },
          { name: 'QR Phishing & Fake Portals', percentage: 24, cases: 1174, color: '#F59E0B' },
          { name: 'Remote Access / Screen Mirror', percentage: 16, cases: 782, color: '#DC2626' },
          { name: 'Card Anomaly & Velocity Spikes', percentage: 14, cases: 686, color: '#3B82F6' },
        ],
      };
    }
  },

  async getUsers(params = {}) {
    try {
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
    } catch {
      let users = [...DEMO_USERS_LIST];
      if (params.search) {
        const q = params.search.toLowerCase();
        users = users.filter((u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
      }
      if (params.status && params.status !== 'ALL') {
        users = users.filter((u) => u.status.toLowerCase() === params.status.toLowerCase());
      }
      return {
        users,
        total: users.length,
      };
    }
  },

  async getUserDetails(userId) {
    try {
      const res = await apiClient.get(`/analyst/users/${userId}`);
      const user = toUiUser(res.user);
      return {
        user,
        accountIsolated: true,
        riskSummary: {
          riskScore: user.riskScore,
          safetyScore: user.safetyScore,
          flaggedIncidents: user.fraudCases,
        },
        recentActivity: user.lastLogin
          ? [{ time: user.lastLogin, action: 'Most recent authenticated session' }]
          : [],
      };
    } catch {
      const found = DEMO_USERS_LIST.find((u) => u.id === userId) || DEMO_USERS_LIST[0];
      return {
        user: found,
        accountIsolated: true,
        riskSummary: {
          riskScore: found.riskScore,
          safetyScore: found.safetyScore,
          flaggedIncidents: found.fraudCases,
          dominantCategory: 'Food & Quick Commerce',
          primaryMethod: 'UPI - PhonePe',
        },
        recentActivity: [
          { time: '12 mins ago', action: 'Login from iPhone 15 Pro (Bengaluru)' },
          { time: 'Yesterday 11:45 PM', action: 'CRITICAL Risk UPI Collect Alert flagged & declined' },
          { time: 'Yesterday 8:12 PM', action: 'High-value transaction at Reliance Digital (₹8,500)' },
        ],
      };
    }
  },

  async getModelPerformance() {
    try {
      return await apiClient.get('/analyst/model-performance');
    } catch {
      return DEMO_MODEL_METRICS;
    }
  },
};
