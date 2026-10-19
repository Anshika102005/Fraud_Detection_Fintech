import React, { useState } from 'react';
import {
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Clock,
  Filter,
  Eye,
  FileCheck,
  ShieldCheck
} from 'lucide-react';

const INITIAL_INCIDENTS = [
  {
    incidentId: 'INC-9042',
    transactionId: 'TXN-7402',
    user: 'Anshika',
    amount: '₹14,500',
    risk: 'CRITICAL',
    riskScore: 94,
    fraudProbability: '94.2%',
    reason: 'Unsolicited late-night collect request from unverified VPA in Jaipur',
    status: 'New',
    createdAt: 'Today, 02:41 AM',
  },
  {
    incidentId: 'INC-9038',
    transactionId: 'TXN-7389',
    user: 'Rohan Verma',
    amount: '₹28,000',
    risk: 'HIGH',
    riskScore: 78,
    fraudProbability: '79.1%',
    reason: 'Unusual velocity spike: 4 consecutive transfers within 90 seconds',
    status: 'Under Review',
    createdAt: 'Yesterday, 11:20 PM',
  },
  {
    incidentId: 'INC-9025',
    transactionId: 'TXN-7250',
    user: 'Kavita Iyer',
    amount: '₹4,999',
    risk: 'HIGH',
    riskScore: 72,
    fraudProbability: '71.5%',
    reason: 'Static QR code payment redirected to overseas payment gateway',
    status: 'Confirmed Fraud',
    createdAt: 'Sep 11, 04:15 PM',
  },
  {
    incidentId: 'INC-9019',
    transactionId: 'TXN-7198',
    user: 'Arjun Mehta',
    amount: '₹1,200',
    risk: 'MEDIUM',
    riskScore: 48,
    fraudProbability: '46.0%',
    reason: 'New merchant classification mismatch (Utility vs Dining)',
    status: 'False Positive',
    createdAt: 'Sep 10, 01:10 PM',
  },
  {
    incidentId: 'INC-8994',
    transactionId: 'TXN-7088',
    user: 'Sneha Nair',
    amount: '₹8,500',
    risk: 'HIGH',
    riskScore: 76,
    fraudProbability: '75.8%',
    reason: 'Remote access tool signature detected during active payment session',
    status: 'Resolved',
    createdAt: 'Sep 09, 08:34 PM',
  },
];

export default function FraudIncidents() {
  const [incidents, setIncidents] = useState(INITIAL_INCIDENTS);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedIncident, setSelectedIncident] = useState(null);

  const statuses = ['ALL', 'New', 'Under Review', 'Confirmed Fraud', 'False Positive', 'Resolved'];

  const filteredIncidents = incidents.filter((inc) => {
    if (statusFilter === 'ALL') return true;
    return inc.status === statusFilter;
  });

  const handleUpdateStatus = (incidentId, newStatus) => {
    setIncidents((prev) =>
      prev.map((inc) => (inc.incidentId === incidentId ? { ...inc, status: newStatus } : inc))
    );
    if (selectedIncident && selectedIncident.incidentId === incidentId) {
      setSelectedIncident((prev) => ({ ...prev, status: newStatus }));
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'New':
        return <span style={{ padding: '2px 8px', borderRadius: '9999px', background: 'rgba(239,68,68,0.25)', color: '#ef4444', fontSize: '0.72rem', fontWeight: '700' }}>New</span>;
      case 'Under Review':
        return <span style={{ padding: '2px 8px', borderRadius: '9999px', background: 'rgba(245,158,11,0.25)', color: '#f59e0b', fontSize: '0.72rem', fontWeight: '700' }}>Under Review</span>;
      case 'Confirmed Fraud':
        return <span style={{ padding: '2px 8px', borderRadius: '9999px', background: 'rgba(220,38,38,0.3)', color: '#f87171', fontSize: '0.72rem', fontWeight: '700' }}>Confirmed Fraud</span>;
      case 'False Positive':
        return <span style={{ padding: '2px 8px', borderRadius: '9999px', background: 'rgba(99,102,241,0.25)', color: '#818cf8', fontSize: '0.72rem', fontWeight: '700' }}>False Positive</span>;
      case 'Resolved':
        return <span style={{ padding: '2px 8px', borderRadius: '9999px', background: 'rgba(16,185,129,0.25)', color: '#10b981', fontSize: '0.72rem', fontWeight: '700' }}>Resolved</span>;
      default:
        return <span>{status}</span>;
    }
  };

  return (
    <div className="page-container" style={{ padding: '24px', color: '#f8fafc' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '800', color: '#ffffff', fontFamily: 'Plus Jakarta Sans', margin: 0 }}>
            Fraud Incidents & Investigations
          </h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#94a3b8' }}>
            Triaged security incidents requiring analyst intervention, confirmation, or resolution.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <span style={{ fontSize: '0.8rem', background: 'rgba(239,68,68,0.15)', color: '#f87171', padding: '6px 12px', borderRadius: '8px', fontWeight: '600' }}>
            {incidents.filter((i) => i.status === 'New').length} New Unassigned
          </span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {statuses.map((st) => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: statusFilter === st ? '1px solid #3b82f6' : '1px solid rgba(255,255,255,0.08)',
              background: statusFilter === st ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.02)',
              color: statusFilter === st ? '#ffffff' : '#94a3b8',
              fontSize: '0.825rem',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            {st}
          </button>
        ))}
      </div>

      {/* Incidents Table */}
      <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                <th style={{ padding: '14px 16px' }}>Incident ID</th>
                <th style={{ padding: '14px 16px' }}>Transaction</th>
                <th style={{ padding: '14px 16px' }}>User</th>
                <th style={{ padding: '14px 16px' }}>Risk</th>
                <th style={{ padding: '14px 16px' }}>Fraud Probability</th>
                <th style={{ padding: '14px 16px' }}>Reason</th>
                <th style={{ padding: '14px 16px' }}>Status</th>
                <th style={{ padding: '14px 16px' }}>Created At</th>
                <th style={{ padding: '14px 16px', textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredIncidents.map((inc) => (
                <tr
                  key={inc.incidentId}
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background-color 0.15s' }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.02)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <td style={{ padding: '14px 16px', fontFamily: 'monospace', color: '#f87171', fontWeight: '700' }}>
                    {inc.incidentId}
                  </td>
                  <td style={{ padding: '14px 16px', fontFamily: 'monospace', color: '#60a5fa' }}>
                    {inc.transactionId} ({inc.amount})
                  </td>
                  <td style={{ padding: '14px 16px', fontWeight: '600', color: '#ffffff' }}>
                    {inc.user}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: '700', color: inc.risk === 'CRITICAL' ? '#f87171' : '#ef4444' }}>
                      {inc.risk} ({inc.riskScore})
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', fontWeight: '700', color: '#ef4444' }}>
                    {inc.fraudProbability}
                  </td>
                  <td style={{ padding: '14px 16px', color: '#cbd5e1', maxWidth: '280px' }}>
                    {inc.reason}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    {getStatusBadge(inc.status)}
                  </td>
                  <td style={{ padding: '14px 16px', color: '#64748b', fontSize: '0.8rem' }}>
                    {inc.createdAt}
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                    <button
                      onClick={() => setSelectedIncident(inc)}
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#60a5fa', padding: '5px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    >
                      <Eye size={13} /> Triage
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Triage Modal */}
      {selectedIncident && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '18px', maxWidth: '540px', width: '100%', padding: '28px', boxShadow: '0 25px 50px rgba(0,0,0,0.5)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase' }}>Incident Investigation</span>
                <h3 style={{ margin: '4px 0 0 0', color: '#ffffff', fontSize: '1.3rem' }}>{selectedIncident.incidentId}</h3>
              </div>
              {getStatusBadge(selectedIncident.status)}
            </div>

            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '14px', marginBottom: '18px', fontSize: '0.85rem' }}>
              <div style={{ marginBottom: '6px' }}><span style={{ color: '#64748b' }}>Affected User:</span> <strong>{selectedIncident.user}</strong></div>
              <div style={{ marginBottom: '6px' }}><span style={{ color: '#64748b' }}>Transaction:</span> <strong>{selectedIncident.transactionId} ({selectedIncident.amount})</strong></div>
              <div style={{ marginBottom: '6px' }}><span style={{ color: '#64748b' }}>Fraud Probability:</span> <strong style={{ color: '#ef4444' }}>{selectedIncident.fraudProbability}</strong></div>
              <div><span style={{ color: '#64748b' }}>Flag Reason:</span> {selectedIncident.reason}</div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: '600', marginBottom: '8px' }}>
                Set Incident Status:
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {['Under Review', 'Confirmed Fraud', 'False Positive', 'Resolved'].map((st) => (
                  <button
                    key={st}
                    onClick={() => handleUpdateStatus(selectedIncident.incidentId, st)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '6px',
                      border: selectedIncident.status === st ? '1px solid #3b82f6' : '1px solid rgba(255,255,255,0.1)',
                      background: selectedIncident.status === st ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.05)',
                      color: selectedIncident.status === st ? '#ffffff' : '#cbd5e1',
                      fontSize: '0.78rem',
                      cursor: 'pointer',
                    }}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => setSelectedIncident(null)}
              style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: '#ffffff', fontWeight: '600', cursor: 'pointer' }}
            >
              Close Investigation
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
