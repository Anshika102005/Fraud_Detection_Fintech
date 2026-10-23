import React, { useState, useMemo, useEffect } from 'react';
import { analystApi } from '../../services/api/analystApi';
import {
  Search,
  Filter,
  Download,
  ShieldAlert,
  AlertTriangle,
  CheckCircle,
  Eye,
  ArrowUpDown,
  RefreshCw
} from 'lucide-react';

export default function AnalystTransactions() {
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [methodFilter, setMethodFilter] = useState('ALL');
  const [locationFilter, setLocationFilter] = useState('ALL');
  const [selectedTxn, setSelectedTxn] = useState(null);

  // All accounts' transactions, fetched from the backend with the analyst
  // session. Owner names come from the users table — nothing is hardcoded.
  const [networkTransactions, setNetworkTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await analystApi.getTransactions({ limit: 1000 });
        if (active) setNetworkTransactions(res.transactions || []);
      } catch (err) {
        if (active) setError(err.message || 'Failed to load network transactions.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(() => {
    return networkTransactions.filter((txn) => {
      const matchSearch =
        txn.merchant.toLowerCase().includes(search.toLowerCase()) ||
        txn.id.toLowerCase().includes(search.toLowerCase()) ||
        txn.user.toLowerCase().includes(search.toLowerCase()) ||
        txn.location.toLowerCase().includes(search.toLowerCase());
      const matchRisk = riskFilter === 'ALL' || txn.riskLevel === riskFilter;
      const matchStatus = statusFilter === 'ALL' || txn.status.toLowerCase() === statusFilter.toLowerCase();
      const matchMethod = methodFilter === 'ALL' || txn.paymentMethod.toLowerCase().includes(methodFilter.toLowerCase());
      const matchLocation = locationFilter === 'ALL' || txn.location.toLowerCase().includes(locationFilter.toLowerCase());
      return matchSearch && matchRisk && matchStatus && matchMethod && matchLocation;
    });
  }, [networkTransactions, search, riskFilter, statusFilter, methodFilter, locationFilter]);

  const uniqueLocations = useMemo(() => {
    return Array.from(new Set(networkTransactions.map((t) => t.location)));
  }, [networkTransactions]);

  const getRiskBadge = (level, score) => {
    if (level === 'CRITICAL' || score >= 80) {
      return <span style={{ padding: '3px 8px', borderRadius: '4px', background: 'rgba(220,38,38,0.2)', color: '#f87171', fontSize: '0.72rem', fontWeight: '700' }}>CRITICAL ({score})</span>;
    }
    if (level === 'HIGH' || score >= 60) {
      return <span style={{ padding: '3px 8px', borderRadius: '4px', background: 'rgba(239,68,68,0.2)', color: '#ef4444', fontSize: '0.72rem', fontWeight: '700' }}>HIGH ({score})</span>;
    }
    if (level === 'MEDIUM' || score >= 35) {
      return <span style={{ padding: '3px 8px', borderRadius: '4px', background: 'rgba(245,158,11,0.2)', color: '#f59e0b', fontSize: '0.72rem', fontWeight: '700' }}>MEDIUM ({score})</span>;
    }
    return <span style={{ padding: '3px 8px', borderRadius: '4px', background: 'rgba(16,185,129,0.2)', color: '#10b981', fontSize: '0.72rem', fontWeight: '700' }}>LOW ({score})</span>;
  };

  const getStatusBadge = (status) => {
    switch (status.toLowerCase()) {
      case 'fraudulent':
        return <span style={{ padding: '2px 8px', borderRadius: '9999px', background: 'rgba(239,68,68,0.25)', color: '#ef4444', fontSize: '0.7rem', fontWeight: '700' }}>FRAUDULENT</span>;
      case 'blocked':
        return <span style={{ padding: '2px 8px', borderRadius: '9999px', background: 'rgba(147,51,234,0.25)', color: '#c084fc', fontSize: '0.7rem', fontWeight: '700' }}>BLOCKED</span>;
      case 'suspicious':
        return <span style={{ padding: '2px 8px', borderRadius: '9999px', background: 'rgba(245,158,11,0.25)', color: '#f59e0b', fontSize: '0.7rem', fontWeight: '700' }}>SUSPICIOUS</span>;
      default:
        return <span style={{ padding: '2px 8px', borderRadius: '9999px', background: 'rgba(16,185,129,0.25)', color: '#10b981', fontSize: '0.7rem', fontWeight: '700' }}>LEGITIMATE</span>;
    }
  };

  return (
    <div className="page-container" style={{ padding: '24px', color: '#f8fafc' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '800', color: '#ffffff', fontFamily: 'Plus Jakarta Sans', margin: 0 }}>
            Network Transactions Monitoring
          </h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#94a3b8' }}>
            Inspect, filter, and audit payment ingestion across all connected user accounts.
          </p>
        </div>
        <div style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>
          Showing <strong>{filtered.length}</strong> of {networkTransactions.length} ingested records
        </div>
      </div>

      {loading && (
        <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '16px' }}>
          Loading network transactions from the database...
        </p>
      )}

      {error && (
        <div
          role="alert"
          style={{
            padding: '12px 14px',
            marginBottom: '16px',
            borderRadius: '10px',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#fca5a5',
            fontSize: '0.85rem',
          }}
        >
          {error}
        </div>
      )}

      {/* Filter Bar */}
      <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '16px', marginBottom: '24px', display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: '1 1 220px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
          <input
            type="text"
            placeholder="Search by ID, User, Merchant, City..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '100%', padding: '9px 12px 9px 36px', background: '#0a0f1d', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#ffffff', fontSize: '0.85rem', outline: 'none' }}
          />
        </div>

        {/* Risk Filter */}
        <select
          value={riskFilter}
          onChange={(e) => setRiskFilter(e.target.value)}
          style={{ padding: '9px 12px', background: '#0a0f1d', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#cbd5e1', fontSize: '0.85rem', outline: 'none' }}
        >
          <option value="ALL">All Risk Levels</option>
          <option value="LOW">LOW</option>
          <option value="MEDIUM">MEDIUM</option>
          <option value="HIGH">HIGH</option>
          <option value="CRITICAL">CRITICAL</option>
        </select>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ padding: '9px 12px', background: '#0a0f1d', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#cbd5e1', fontSize: '0.85rem', outline: 'none' }}
        >
          <option value="ALL">All Statuses</option>
          <option value="legitimate">Legitimate</option>
          <option value="suspicious">Suspicious</option>
          <option value="fraudulent">Fraudulent</option>
          <option value="blocked">Blocked</option>
        </select>

        {/* Location Filter */}
        <select
          value={locationFilter}
          onChange={(e) => setLocationFilter(e.target.value)}
          style={{ padding: '9px 12px', background: '#0a0f1d', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#cbd5e1', fontSize: '0.85rem', outline: 'none' }}
        >
          <option value="ALL">All Locations</option>
          {uniqueLocations.map((loc) => (
            <option key={loc} value={loc}>{loc}</option>
          ))}
        </select>

        {/* Reset */}
        {(search || riskFilter !== 'ALL' || statusFilter !== 'ALL' || locationFilter !== 'ALL') && (
          <button
            onClick={() => { setSearch(''); setRiskFilter('ALL'); setStatusFilter('ALL'); setLocationFilter('ALL'); }}
            style={{ background: 'transparent', border: 'none', color: '#60a5fa', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <RefreshCw size={12} /> Reset
          </button>
        )}
      </div>

      {/* Table */}
      <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                <th style={{ padding: '14px 16px' }}>Transaction ID</th>
                <th style={{ padding: '14px 16px' }}>User</th>
                <th style={{ padding: '14px 16px' }}>Amount</th>
                <th style={{ padding: '14px 16px' }}>Merchant</th>
                <th style={{ padding: '14px 16px' }}>Category</th>
                <th style={{ padding: '14px 16px' }}>Location</th>
                <th style={{ padding: '14px 16px' }}>Payment Method</th>
                <th style={{ padding: '14px 16px' }}>Risk Score</th>
                <th style={{ padding: '14px 16px' }}>Status</th>
                <th style={{ padding: '14px 16px' }}>Timestamp</th>
                <th style={{ padding: '14px 16px', textAlign: 'center' }}>Inspect</th>
              </tr>
            </thead>
            <tbody>
              {!loading && filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={11}
                    style={{ padding: '28px 16px', textAlign: 'center', color: '#64748b' }}
                  >
                    No transactions match the current filters. Records appear here
                    after customers add or upload transactions.
                  </td>
                </tr>
              )}
              {filtered.map((t) => (
                <tr
                  key={t.id}
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background-color 0.15s' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.02)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <td style={{ padding: '14px 16px', fontFamily: 'monospace', color: '#93c5fd', fontSize: '0.8rem' }}>
                    {t.id}
                  </td>
                  <td style={{ padding: '14px 16px', fontWeight: '600', color: '#ffffff' }}>
                    {t.user}
                  </td>
                  <td style={{ padding: '14px 16px', fontWeight: '700', color: '#ffffff' }}>
                    ₹{t.amount.toLocaleString('en-IN')}
                  </td>
                  <td style={{ padding: '14px 16px', color: '#cbd5e1' }}>
                    {t.merchant}
                  </td>
                  <td style={{ padding: '14px 16px', color: '#94a3b8' }}>
                    {t.category}
                  </td>
                  <td style={{ padding: '14px 16px', color: '#94a3b8', fontSize: '0.8rem' }}>
                    {t.location}
                  </td>
                  <td style={{ padding: '14px 16px', color: '#cbd5e1' }}>
                    {t.paymentMethod}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    {getRiskBadge(t.riskLevel, t.riskScore)}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    {getStatusBadge(t.status)}
                  </td>
                  <td style={{ padding: '14px 16px', color: '#64748b', fontSize: '0.8rem' }}>
                    {t.date} {t.time}
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                    <button
                      onClick={() => setSelectedTxn(t)}
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#60a5fa', padding: '5px 10px', borderRadius: '6px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem' }}
                    >
                      <Eye size={13} /> View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedTxn && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '18px', maxWidth: '520px', width: '100%', padding: '28px', boxShadow: '0 25px 50px rgba(0,0,0,0.5)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase' }}>Transaction Telemetry</span>
                <h3 style={{ margin: '4px 0 0 0', color: '#ffffff', fontSize: '1.25rem' }}>{selectedTxn.id}</h3>
              </div>
              {getStatusBadge(selectedTxn.status)}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '20px', fontSize: '0.85rem' }}>
              <div><span style={{ color: '#64748b' }}>Account:</span> <div style={{ color: '#ffffff', fontWeight: '600' }}>{selectedTxn.user}</div></div>
              <div><span style={{ color: '#64748b' }}>Amount:</span> <div style={{ color: '#ffffff', fontWeight: '700' }}>₹{selectedTxn.amount.toLocaleString('en-IN')}</div></div>
              <div><span style={{ color: '#64748b' }}>Merchant:</span> <div style={{ color: '#ffffff' }}>{selectedTxn.merchant}</div></div>
              <div><span style={{ color: '#64748b' }}>Category:</span> <div style={{ color: '#ffffff' }}>{selectedTxn.category}</div></div>
              <div><span style={{ color: '#64748b' }}>Method:</span> <div style={{ color: '#ffffff' }}>{selectedTxn.paymentMethod}</div></div>
              <div><span style={{ color: '#64748b' }}>Location:</span> <div style={{ color: '#ffffff' }}>{selectedTxn.location}</div></div>
              <div><span style={{ color: '#64748b' }}>Device:</span> <div style={{ color: '#ffffff' }}>{selectedTxn.device}</div></div>
              <div><span style={{ color: '#64748b' }}>Timestamp:</span> <div style={{ color: '#ffffff' }}>{selectedTxn.date} {selectedTxn.time}</div></div>
            </div>

            <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '10px', padding: '12px', marginBottom: '20px' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#ef4444', textTransform: 'uppercase', marginBottom: '4px' }}>
                Risk Analysis Breakdown ({selectedTxn.riskLevel} - Score: {selectedTxn.riskScore}/100)
              </div>
              <div style={{ fontSize: '0.825rem', color: '#cbd5e1' }}>
                {selectedTxn.flaggedReasons?.[0] ||
                  'Flagged by behavioral deviation anomaly engine based on user transaction velocity.'}
              </div>
            </div>

            <button
              onClick={() => setSelectedTxn(null)}
              style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: '#ffffff', fontWeight: '600', cursor: 'pointer' }}
            >
              Close Telemetry
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
