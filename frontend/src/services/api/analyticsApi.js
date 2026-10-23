/* ============================================================
   FraudGuard AI — Analytics API Service
   Time-filtered metrics, volume/value trends, payment
   distributions, and hourly activity — all aggregated by the
   backend from the signed-in account's own transactions.
============================================================ */

import { apiClient } from './client';

export const analyticsApi = {
  async getAnalytics(range = '30d') {
    return apiClient.get('/analytics/summary', { range });
  },
};
