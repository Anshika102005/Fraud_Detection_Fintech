import React, { useState, useEffect } from 'react';
import { reportsApi } from '../../services/api/reportsApi';
import { useNotification } from '../../contexts/NotificationContext';
import SafetyScoreGauge from '../../components/common/SafetyScoreGauge';
import {
  FileText,
  Download,
  ShieldCheck,
  Calendar,
  AlertTriangle,
  TrendingUp,
  Receipt,
  Sparkles,
  CheckCircle2
} from 'lucide-react';

export default function MonthlyReport() {
  const { showToast } = useNotification();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    const fetchReport = async () => {
      setLoading(true);
      try {
        const res = await reportsApi.getMonthlySecurityReport();
        setReport(res);
      } catch (err) {
        console.error('Failed to load report:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, []);

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      await reportsApi.downloadReport(report?.reportId);
      showToast('Security statement downloaded!', 'success');
    } catch (err) {
      showToast('Download failed: ' + err.message, 'error');
    } finally {
      setIsDownloading(false);
    }
  };

  if (loading || !report) {
    return <div className="page-container" style={{ padding: '24px', color: '#94a3b8' }}>Generating Security Statement...</div>;
  }

  return (
    <div className="page-container" style={{ padding: '24px', maxWidth: '900px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FileText size={24} style={{ color: '#60a5fa' }} />
            <h1 style={{ fontSize: '1.6rem', fontWeight: '800', color: '#ffffff', fontFamily: 'Plus Jakarta Sans', margin: 0 }}>
              Monthly Security Report
            </h1>
          </div>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#94a3b8' }}>
            Certified security & behavioral payment statement for {report.month}.
          </p>
        </div>

        <button
          onClick={handleDownload}
          disabled={isDownloading}
          className="btn-landing-primary"
          style={{ padding: '9px 18px', fontSize: '0.875rem' }}
        >
          <Download size={15} />
          <span>{isDownloading ? 'Generating...' : 'Download Report'}</span>
        </button>
      </div>

      {/* Main Statement Box */}
      <div
        style={{
          background: '#111827',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '20px',
          padding: '32px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
          marginBottom: '24px',
        }}
      >
        {/* Statement Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: '20px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', marginBottom: '24px', flexWrap: 'wrap', gap: '14px' }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Document Ref
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: '700', color: '#ffffff' }}>
              {report.reportId}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
              Generated on {report.generatedAt}
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase' }}>
              Account Holder
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: '700', color: '#60a5fa' }}>
              {report.user}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: '600' }}>
              ✓ Authenticated Google User
            </div>
          </div>
        </div>

        {/* Safety Score Highlight */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '30px', background: 'rgba(255, 255, 255, 0.02)', padding: '20px', borderRadius: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
          <SafetyScoreGauge score={report.personalSafetyScore} status={report.safetyRating} />
          <div style={{ flex: 1, minWidth: '240px' }}>
            <h3 style={{ margin: '0 0 6px 0', fontSize: '1.2rem', color: '#ffffff' }}>
              Personal Safety Rating: {report.safetyRating}
            </h3>
            <p style={{ margin: 0, fontSize: '0.875rem', color: '#94a3b8', lineHeight: '1.5' }}>
              Your account maintained strong behavioral consistency throughout {report.month}. 2 fraudulent collect vectors were successfully deflected.
            </p>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '28px' }}>
          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px' }}>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Total Transactions</div>
            <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#ffffff', fontFamily: 'Plus Jakarta Sans' }}>
              {report.metrics.totalTransactions}
            </div>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px' }}>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Processed Volume</div>
            <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#ffffff', fontFamily: 'Plus Jakarta Sans' }}>
              ₹{report.metrics.totalTransactionValue.toLocaleString('en-IN')}
            </div>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px' }}>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Fraud Rate</div>
            <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#10b981', fontFamily: 'Plus Jakarta Sans' }}>
              {report.metrics.fraudRate}
            </div>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px' }}>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Average Risk Score</div>
            <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#ffffff', fontFamily: 'Plus Jakarta Sans' }}>
              {report.metrics.averageRiskScore} / 100
            </div>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px' }}>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Top Payment Method</div>
            <div style={{ fontSize: '0.95rem', fontWeight: '700', color: '#60a5fa', marginTop: '4px' }}>
              {report.metrics.mostUsedPaymentMethod}
            </div>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px' }}>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Top Category</div>
            <div style={{ fontSize: '0.95rem', fontWeight: '700', color: '#ffffff', marginTop: '4px' }}>
              {report.metrics.mostUsedCategory}
            </div>
          </div>
        </div>

        {/* Highest Risk Transaction Flagged */}
        <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '14px', padding: '18px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444', fontWeight: '700', fontSize: '0.9rem' }}>
              <AlertTriangle size={16} />
              <span>Highest Risk Transaction Detected</span>
            </div>
            <span className="gauge-status-badge risk-badge-critical" style={{ marginTop: 0 }}>
              SCORE {report.metrics.highestRiskTransaction.riskScore}
            </span>
          </div>
          <div style={{ fontSize: '1.1rem', fontWeight: '700', color: '#ffffff' }}>
            {report.metrics.highestRiskTransaction.merchant} — ₹{report.metrics.highestRiskTransaction.amount.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '4px' }}>
            Ref: {report.metrics.highestRiskTransaction.id} (Unsolicited UPI collect attempt blocked)
          </div>
        </div>

        {/* Security Highlights */}
        <div style={{ marginBottom: '24px' }}>
          <h4 style={{ margin: '0 0 12px 0', fontSize: '0.95rem', color: '#ffffff' }}>
            Security Highlights
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {report.highlights.map((h, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '0.85rem', color: '#cbd5e1' }}>
                <CheckCircle2 size={16} style={{ color: '#10b981', flexShrink: 0, marginTop: '2px' }} />
                <span>{h}</span>
              </div>
            ))}
          </div>
        </div>

        {/* AI Advisor Note */}
        <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#60a5fa', fontWeight: '700', fontSize: '0.85rem', marginBottom: '6px' }}>
            <Sparkles size={16} />
            <span>AI Advisor Recommendation</span>
          </div>
          <p style={{ margin: 0, fontSize: '0.85rem', color: '#cbd5e1', lineHeight: '1.5' }}>
            {report.aiAdvisorNotes}
          </p>
        </div>
      </div>
    </div>
  );
}
