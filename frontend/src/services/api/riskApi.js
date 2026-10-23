/* ============================================================
   FraudGuard AI — Risk Analysis API Service
   Behavioral risk summary computed by the backend from the
   signed-in account's own transactions. No mock scores.
============================================================ */

import { apiClient } from './client';

export const riskApi = {
  async getRiskSummary() {
    return apiClient.get('/risk-analysis');
  },
};
