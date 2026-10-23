/* ============================================================
   FraudGuard AI — Reports API Service
   The Monthly Security Statement is computed by the backend
   from the signed-in account's own transactions. The client
   only renders it and builds the downloadable text file from
   the fetched report.
============================================================ */

import { apiClient } from './client';

export const reportsApi = {
  async getMonthlySecurityReport(month) {
    const params = month ? { month } : {};
    return apiClient.get('/reports/monthly', params);
  },

  async downloadReport(reportId) {
    const report = await this.getMonthlySecurityReport();
    const highest = report.metrics.highestRiskTransaction;
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
Highest Risk Alert: ${
  highest
    ? `${highest.merchant} (INR ${highest.amount.toLocaleString('en-IN')}) - Score ${highest.riskScore}/100`
    : 'No flagged transactions recorded'
}

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
    link.download = `FraudGuard_Security_Report_${reportId || report.reportId}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return { success: true };
  },
};
