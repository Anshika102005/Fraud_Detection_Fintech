/* ============================================================
   FraudGuard AI — Reports API Service
   Generates comprehensive Monthly Security Statements
============================================================ */

import { apiClient } from './client';
import { getStoredUserSync } from './authApi';

export const reportsApi = {
  async getMonthlySecurityReport(month = 'August 2026') {
    try {
      return await apiClient.get('/reports/monthly', { month });
    } catch {
      return {
        reportId: 'FG-RPT-2026-08',
        month: month,
        generatedAt: '2026-09-01 00:00 IST',
        user: getStoredUserSync()?.name || 'Account Holder',
        personalSafetyScore: 87,
        safetyRating: 'Good',
        metrics: {
          totalTransactions: 124,
          totalTransactionValue: 84250,
          fraudTransactions: 2,
          suspiciousTransactions: 4,
          fraudRate: '1.61%',
          averageRiskScore: 24,
          highestRiskTransaction: {
            id: 'TXN-90241',
            merchant: 'Unknown P2P UPI Collect',
            amount: 14500,
            riskScore: 94,
            riskLevel: 'CRITICAL',
          },
          mostUsedPaymentMethod: 'UPI - Google Pay (44%)',
          mostUsedCategory: 'Food & Dining (38%)',
          spendingChange: '+18% compared to July 2026',
        },
        highlights: [
          'Successfully deflected 2 unsolicited UPI collect attempts totaling ₹19,499.',
          'Your overall Personal Safety Score improved by +4 points from last month.',
          'Zero account compromise or OTP leak incidents recorded.',
          'Primary spending period concentrated between 6:00 PM and 10:00 PM.',
        ],
        aiAdvisorNotes:
          'Maintain vigilance regarding urgent SMS notices mimicking utility or electricity providers. Never authorize unexpected collect requests on UPI applications.',
      };
    }
  },

  async downloadReport(reportId) {
    // Generate text blob download
    const report = await this.getMonthlySecurityReport();
    const content = `======================================================
FRAUDGUARD AI — MONTHLY SECURITY STATEMENT
Tagline: Your Personal AI-Powered Fraud Protection
Report ID: ${report.reportId}
Account Holder: ${report.user}
Billing Period: ${report.month}
Generated: ${report.generatedAt}
======================================================

EXECUTIVE SUMMARY
------------------------------------------------------
Personal Safety Score: ${report.personalSafetyScore} / 100 (${report.safetyRating})
Fraud Rate: ${report.metrics.fraudRate}
Total Transactions: ${report.metrics.totalTransactions}
Total Transaction Value: INR ${report.metrics.totalTransactionValue.toLocaleString('en-IN')}
Fraud Transactions Detected: ${report.metrics.fraudTransactions}
Suspicious Transactions Flagged: ${report.metrics.suspiciousTransactions}
Average Risk Score: ${report.metrics.averageRiskScore} / 100

KEY METRICS & BEHAVIOR
------------------------------------------------------
Most Used Payment Method: ${report.metrics.mostUsedPaymentMethod}
Most Used Category: ${report.metrics.mostUsedCategory}
Spending Trajectory: ${report.metrics.spendingChange}
Highest Risk Alert: ${report.metrics.highestRiskTransaction.merchant} (INR ${report.metrics.highestRiskTransaction.amount.toLocaleString('en-IN')}) - Score ${report.metrics.highestRiskTransaction.riskScore}/100

SECURITY HIGHLIGHTS
------------------------------------------------------
${report.highlights.map((h, i) => `${i + 1}. ${h}`).join('\n')}

AI ADVISOR NOTE
------------------------------------------------------
${report.aiAdvisorNotes}

======================================================
FraudGuard AI — Protected by Multi-Layer Behavior ML
Support: safety@fraudguard.ai | Helpline: 1930
======================================================`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `FraudGuard_Security_Report_${report.reportId}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return { success: true };
  },
};
