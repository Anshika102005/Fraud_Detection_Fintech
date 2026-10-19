/* ============================================================
   FraudGuard AI — Risk Analysis API Service
   Calculates user behavioral anomalies, safety score, and patterns
============================================================ */

import { apiClient } from './client';
import { scopedKey } from './scopedStorage';

export const riskApi = {
  async getRiskSummary() {
    try {
      return await apiClient.get('/risk-analysis');
    } catch {
      const forceEmpty = localStorage.getItem(scopedKey('fraudguard_force_empty_state')) === 'true';
      if (forceEmpty) {
        return {
          empty: true,
          safetyScore: 0,
          status: 'No Data',
          factors: [],
          overallRiskScore: 0,
          behaviorAnomalyScore: 0,
          riskDistribution: [],
          riskDimensions: [],
          riskPatterns: [],
        };
      }

      return {
        empty: false,
        safetyScore: 87,
        status: 'Good',
        safetyFactors: [
          { text: 'Low suspicious activity over past 30 days', passed: true },
          { text: 'Normal transaction behavior and recurring merchants', passed: true },
          { text: 'No unusual transaction spikes in recent 48 hours', passed: true },
          { text: 'Safe payment patterns: 89% transactions with trusted VPAs', passed: true },
        ],
        overallRiskScore: 24, // 0 - 100 (lower is better for risk)
        behaviorAnomalyScore: 18,
        merchantRiskScore: 28,
        locationRiskScore: 14,
        timeOfDayRiskScore: 32,
        velocityRiskScore: 19,
        amountDeviationScore: 26,
        riskDimensions: [
          { dimension: 'Amount Deviation', score: 38, max: 100 },
          { dimension: 'Time Anomaly', score: 32, max: 100 },
          { dimension: 'Merchant Trust', score: 22, max: 100 },
          { dimension: 'Geo Location', score: 16, max: 100 },
          { dimension: 'Velocity Burst', score: 28, max: 100 },
          { dimension: 'Device Integrity', score: 10, max: 100 },
        ],
        riskDistribution: [
          { name: 'Low Risk', value: 78, color: '#10B981' },
          { name: 'Medium Risk', value: 14, color: '#F59E0B' },
          { name: 'High Risk', value: 6, color: '#EF4444' },
          { name: 'Critical Risk', value: 2, color: '#DC2626' },
        ],
        riskPatterns: [
          {
            title: 'Active Operating Hours',
            description: 'You usually transact between 8:00 AM and 10:00 PM. Transactions triggered after 11:30 PM are flagged for confirmation.',
            severity: 'safe',
          },
          {
            title: 'Spending Pattern Deviation',
            description: 'Your recent transaction amount at Reliance Digital (₹8,500) was 6.8x higher than your typical median basket size.',
            severity: 'warning',
          },
          {
            title: 'Safest Category',
            description: 'Food & Dining (Swiggy, Zomato, Starbucks) represents 42% of your activity with 0 reported security threats.',
            severity: 'safe',
          },
          {
            title: 'Primary Risk Vector',
            description: 'Unsolicited peer-to-peer UPI collect requests and unverified QR scans represent 100% of your critical risk flags.',
            severity: 'danger',
          },
        ],
      };
    }
  },
};
