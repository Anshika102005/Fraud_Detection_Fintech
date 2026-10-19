import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTransactions } from '../../contexts/TransactionContext';
import TransactionModal from '../../components/transactions/TransactionModal';
import {
  Search,
  Filter,
  PlusCircle,
  Eye,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Calendar,
  CreditCard,
  MapPin,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle
} from 'lucide-react';

export default function Transactions() {
  const { transactions, alerts, loading, error, isEmptyMode, restoreDemoData, refreshData } = useTransactions();

  const [searchTerm, setSearchTerm] = useState('');
  const [riskFilter, setRiskFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedTxn, setSelectedTxn] = useState(null);

  const itemsPerPage = 8;

  // Filter & Sort
  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      const matchSearch =
        t.merchant.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.location && t.location.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchRisk = riskFilter === 'ALL' || t.riskLevel.toUpperCase() === riskFilter.toUpperCase();
      const matchStatus = statusFilter === 'ALL' || t.status.toLowerCase() === statusFilter.toLowerCase();
      const matchMethod =
        paymentMethodFilter === 'ALL' ||
        t.paymentMethod.toLowerCase().includes(paymentMethodFilter.toLowerCase());
      const matchCategory =
        categoryFilter === 'ALL' || t.category.toLowerCase() === categoryFilter.toLowerCase();
      const matchFrom = !dateFrom || t.date >= dateFrom; // ISO dates compare lexicographically
      const matchTo = !dateTo || t.date <= dateTo;

      return matchSearch && matchRisk && matchStatus && matchMethod && matchCategory && matchFrom && matchTo;
    }).sort((a, b) => {
      if (sortBy === 'amount') {
        return sortOrder === 'asc' ? a.amount - b.amount : b.amount - a.amount;
      }
      if (sortBy === 'riskScore') {
        return sortOrder === 'asc' ? a.riskScore - b.riskScore : b.riskScore - a.riskScore;
      }
      const valA = `${a.date} ${a.time || '00:00'}`;
      const valB = `${b.date} ${b.time || '00:00'}`;
      return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
    });
  }, [transactions, searchTerm, riskFilter, statusFilter, paymentMethodFilter, categoryFilter, sortBy, sortOrder]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const toggleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const getRiskClass = (level) => {
    switch (level) {
      case 'CRITICAL': return 'risk-badge-critical';
      case 'HIGH': return 'risk-badge-high';
      case 'MEDIUM': return 'risk-badge-medium';
      default: return 'risk-badge-low';
    }
  };

  if (loading && transactions.length === 0) {
    return (
      <div className="page-container" style={{ padding: '24px' }}>
        <div className="empty-dashboard-card">
          <h2 className="empty-state-title">Loading your transactions…</h2>
          <p className="empty-state-msg">Fetching monitored payment activity from the fraud engine.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container" style={{ padding: '24px' }}>
        <div className="empty-dashboard-card">
          <h2 className="empty-state-title" style={{ color: '#f87171' }}>Could not load transactions</h2>
          <p className="empty-state-msg">{error}</p>
          <div className="empty-state-actions">
            <button onClick={refreshData} className="btn-landing-primary">
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isEmptyMode || transactions.length === 0) {
    return (
      <div className="page-container" style={{ padding: '24px' }}>
        <div className="empty-dashboard-card">
          <h2 className="empty-state-title">No transactions recorded yet</h2>
          <p className="empty-state-msg">
            Add a transaction or upload your payment statement to view fraud risk analysis.
          </p>
          <div className="empty-state-actions">
            <Link to="/app/add-transaction" className="btn-landing-primary">
              <PlusCircle size={16} />
              <span>+ Add Transaction</span>
            </Link>
            <button onClick={restoreDemoData} className="btn-landing-secondary">
              Explore Demo Transactions
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container" style={{ padding: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: '800', color: '#ffffff', fontFamily: 'Plus Jakarta Sans', margin: 0 }}>
            Payment Transactions
          </h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#94a3b8' }}>
            Showing {filtered.length} total monitored transactions in your Indian payment history.
          </p>
        </div>

        <Link to="/app/add-transaction" className="btn-landing-primary" style={{ padding: '9px 18px', fontSize: '0.875rem' }}>
          <PlusCircle size={16} />
          <span>+ Add Transaction</span>
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div
        style={{
          background: '#111827',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '16px',
          padding: '16px 20px',
          marginBottom: '20px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* Search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#0a0f1d', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '8px 14px', flex: '1', minWidth: '220px' }}>
          <Search size={16} style={{ color: '#64748b' }} />
          <input
            type="text"
            placeholder="Search merchant, ID, city..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '0.875rem', width: '100%', outline: 'none' }}
          />
        </div>

        {/* Filters Group */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
          {/* Date Range Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Calendar size={14} style={{ color: '#64748b' }} />
            <input
              type="date"
              aria-label="From date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setCurrentPage(1); }}
              style={{ background: '#0a0f1d', border: '1px solid rgba(255,255,255,0.1)', color: '#cbd5e1', borderRadius: '8px', padding: '7px 10px', fontSize: '0.8rem' }}
            />
            <span style={{ color: '#64748b', fontSize: '0.75rem' }}>to</span>
            <input
              type="date"
              aria-label="To date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setCurrentPage(1); }}
              style={{ background: '#0a0f1d', border: '1px solid rgba(255,255,255,0.1)', color: '#cbd5e1', borderRadius: '8px', padding: '7px 10px', fontSize: '0.8rem' }}
            />
          </div>

          {/* Risk Level Filter */}
          <select
            value={riskFilter}
            onChange={(e) => { setRiskFilter(e.target.value); setCurrentPage(1); }}
            style={{ background: '#0a0f1d', border: '1px solid rgba(255,255,255,0.1)', color: '#cbd5e1', borderRadius: '8px', padding: '8px 12px', fontSize: '0.825rem' }}
          >
            <option value="ALL">All Risk Levels</option>
            <option value="LOW">Low Risk</option>
            <option value="MEDIUM">Medium Risk</option>
            <option value="HIGH">High Risk</option>
            <option value="CRITICAL">Critical Risk</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            style={{ background: '#0a0f1d', border: '1px solid rgba(255,255,255,0.1)', color: '#cbd5e1', borderRadius: '8px', padding: '8px 12px', fontSize: '0.825rem' }}
          >
            <option value="ALL">All Statuses</option>
            <option value="legitimate">Legitimate</option>
            <option value="suspicious">Suspicious</option>
            <option value="fraudulent">Fraudulent</option>
          </select>

          {/* Payment Method Filter */}
          <select
            value={paymentMethodFilter}
            onChange={(e) => { setPaymentMethodFilter(e.target.value); setCurrentPage(1); }}
            style={{ background: '#0a0f1d', border: '1px solid rgba(255,255,255,0.1)', color: '#cbd5e1', borderRadius: '8px', padding: '8px 12px', fontSize: '0.825rem' }}
          >
            <option value="ALL">All Methods</option>
            <option value="UPI">UPI (Any)</option>
            <option value="PhonePe">PhonePe</option>
            <option value="Google Pay">Google Pay</option>
            <option value="Paytm">Paytm</option>
            <option value="CRED">CRED</option>
            <option value="QR Code">QR Code</option>
            <option value="Card">Cards</option>
          </select>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => { setCategoryFilter(e.target.value); setCurrentPage(1); }}
            style={{ background: '#0a0f1d', border: '1px solid rgba(255,255,255,0.1)', color: '#cbd5e1', borderRadius: '8px', padding: '8px 12px', fontSize: '0.825rem' }}
          >
            <option value="ALL">All Categories</option>
            <option value="Food & Dining">Food & Dining</option>
            <option value="Grocery">Grocery / Quick Comm</option>
            <option value="Online Shopping">Online Shopping</option>
            <option value="Electronics">Electronics</option>
            <option value="Travel">Travel</option>
            <option value="Utilities">Utilities</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </div>

      {/* Transactions Table Container */}
      <div style={{ background: '#111827', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '16px', overflow: 'hidden', marginBottom: '20px' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: 'rgba(255, 255, 255, 0.03)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', color: '#94a3b8' }}>
                <th style={{ padding: '14px 18px', cursor: 'pointer' }} onClick={() => toggleSort('date')}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>Date & Time</span>
                    <ArrowUpDown size={13} />
                  </div>
                </th>
                <th style={{ padding: '14px 18px' }}>Transaction ID</th>
                <th style={{ padding: '14px 18px' }}>Merchant</th>
                <th style={{ padding: '14px 18px' }}>Category</th>
                <th style={{ padding: '14px 18px', cursor: 'pointer' }} onClick={() => toggleSort('amount')}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>Amount (₹)</span>
                    <ArrowUpDown size={13} />
                  </div>
                </th>
                <th style={{ padding: '14px 18px' }}>Payment Method</th>
                <th style={{ padding: '14px 18px' }}>Location</th>
                <th style={{ padding: '14px 18px', cursor: 'pointer' }} onClick={() => toggleSort('riskScore')}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>Risk Level</span>
                    <ArrowUpDown size={13} />
                  </div>
                </th>
                <th style={{ padding: '14px 18px' }}>Status</th>
                <th style={{ padding: '14px 18px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan="10" style={{ textAlign: 'center', padding: '36px', color: '#64748b' }}>
                    No transactions matching selected filters.
                  </td>
                </tr>
              ) : (
                paginated.map((txn) => (
                  <tr
                    key={txn.id}
                    onClick={() => setSelectedTxn(txn)}
                    style={{
                      borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                      cursor: 'pointer',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '14px 18px', whiteSpace: 'nowrap' }}>
                      <div style={{ color: '#ffffff', fontWeight: '500' }}>{txn.date}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{txn.time || '12:00'} IST</div>
                    </td>

                    <td style={{ padding: '14px 18px', fontFamily: 'monospace', fontSize: '0.78rem', color: '#60a5fa', whiteSpace: 'nowrap' }}>
                      {txn.id}
                    </td>

                    <td style={{ padding: '14px 18px', fontWeight: '600', color: '#ffffff' }}>
                      {txn.merchant}
                    </td>

                    <td style={{ padding: '14px 18px', color: '#cbd5e1' }}>
                      {txn.category}
                    </td>

                    <td style={{ padding: '14px 18px', fontWeight: '700', color: '#ffffff', fontFamily: 'Plus Jakarta Sans' }}>
                      ₹{Number(txn.amount).toLocaleString('en-IN')}
                    </td>

                    <td style={{ padding: '14px 18px', color: '#cbd5e1' }}>
                      {txn.paymentMethod}
                    </td>

                    <td style={{ padding: '14px 18px', color: '#94a3b8' }}>
                      {txn.location || 'Bengaluru'}
                    </td>

                    <td style={{ padding: '14px 18px' }}>
                      <span className={`gauge-status-badge ${getRiskClass(txn.riskLevel)}`} style={{ marginTop: 0 }}>
                        {txn.riskLevel} ({txn.riskScore})
                      </span>
                    </td>

                    <td style={{ padding: '14px 18px' }}>
                      <span
                        style={{
                          textTransform: 'capitalize',
                          fontSize: '0.775rem',
                          fontWeight: '600',
                          color: txn.status === 'legitimate' ? '#10b981' : txn.status === 'fraudulent' ? '#ef4444' : '#f59e0b',
                        }}
                      >
                        {txn.status}
                      </span>
                    </td>

                    <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTxn(txn);
                        }}
                        style={{
                          background: 'rgba(59, 130, 246, 0.1)',
                          border: '1px solid rgba(59, 130, 246, 0.25)',
                          color: '#60a5fa',
                          borderRadius: '8px',
                          padding: '5px 10px',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <Eye size={13} />
                        <span>Inspect</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div style={{ padding: '14px 20px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: '#94a3b8' }}>
          <div>
            Page {currentPage} of {totalPages} ({filtered.length} items)
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: currentPage === 1 ? '#475569' : '#fff',
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
              }}
            >
              <ChevronLeft size={14} />
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: currentPage === totalPages ? '#475569' : '#fff',
                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
              }}
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Transaction Detail Modal */}
      {selectedTxn && (
        <TransactionModal transaction={selectedTxn} onClose={() => setSelectedTxn(null)} />
      )}
    </div>
  );
}
