import React, { useState, useEffect } from 'react';
import { analystApi } from '../../services/api/analystApi';
import {
  Users,
  Search,
  Eye,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  X,
  Lock,
  Activity,
  Receipt,
  BarChart3,
  CheckCircle2,
  Calendar,
  CreditCard
} from 'lucide-react';

export default function AnalystUsers() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [drilldownData, setDrilldownData] = useState(null);
  const [drawerTab, setDrawerTab] = useState('overview'); // 'overview' | 'transactions' | 'alerts' | 'risk' | 'analytics'

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      try {
        const res = await analystApi.getUsers({ search, status: statusFilter });
        setUsers(res.users);
      } catch (err) {
        console.error('Failed to load users:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, [search, statusFilter]);

  const handleSelectUser = async (u) => {
    setSelectedUser(u);
    setDrawerTab('overview');
    const details = await analystApi.getUserDetails(u.id);
    setDrilldownData(details);
  };

  const getRiskBadge = (level, score) => {
    switch (level) {
      case 'CRITICAL':
        return <span style={{ padding: '3px 8px', borderRadius: '4px', background: 'rgba(220,38,38,0.2)', color: '#f87171', fontSize: '0.72rem', fontWeight: '700' }}>CRITICAL ({score})</span>;
      case 'HIGH':
        return <span style={{ padding: '3px 8px', borderRadius: '4px', background: 'rgba(239,68,68,0.2)', color: '#ef4444', fontSize: '0.72rem', fontWeight: '700' }}>HIGH ({score})</span>;
      case 'MEDIUM':
        return <span style={{ padding: '3px 8px', borderRadius: '4px', background: 'rgba(245,158,11,0.2)', color: '#f59e0b', fontSize: '0.72rem', fontWeight: '700' }}>MEDIUM ({score})</span>;
      default:
        return <span style={{ padding: '3px 8px', borderRadius: '4px', background: 'rgba(16,185,129,0.2)', color: '#10b981', fontSize: '0.72rem', fontWeight: '700' }}>LOW ({score})</span>;
    }
  };

  return (
    <div className="page-container" style={{ padding: '24px', color: '#f8fafc' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: '800', color: '#ffffff', fontFamily: 'Plus Jakarta Sans', margin: 0 }}>
          Users & Accounts Management
        </h1>
        <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#94a3b8' }}>
          Inspect user accounts, fraud exposure records, and investigate individual customer safety profiles.
        </p>
      </div>

      {/* Filter and Search */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#111827', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '8px 14px', flex: 1, minWidth: '240px' }}>
          <Search size={16} style={{ color: '#64748b' }} />
          <input
            type="text"
            placeholder="Search user name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '0.875rem', width: '100%', outline: 'none' }}
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.1)', color: '#cbd5e1', borderRadius: '10px', padding: '8px 14px', fontSize: '0.85rem', outline: 'none' }}
        >
          <option value="ALL">All Account Statuses</option>
          <option value="active">Active</option>
          <option value="flagged">Flagged</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      {/* Users Table */}
      <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                <th style={{ padding: '14px 16px' }}>User</th>
                <th style={{ padding: '14px 16px' }}>Email</th>
                <th style={{ padding: '14px 16px' }}>Transactions</th>
                <th style={{ padding: '14px 16px' }}>Fraud Cases</th>
                <th style={{ padding: '14px 16px' }}>Risk Level</th>
                <th style={{ padding: '14px 16px' }}>Last Activity</th>
                <th style={{ padding: '14px 16px' }}>Status</th>
                <th style={{ padding: '14px 16px', textAlign: 'center' }}>Investigate</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr
                  key={u.id}
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background-color 0.15s' }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.02)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <img
                        src={u.avatar}
                        alt={u.name}
                        style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }}
                      />
                      <span style={{ fontWeight: '600', color: '#ffffff' }}>{u.name}</span>
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px', color: '#94a3b8' }}>{u.email}</td>
                  <td style={{ padding: '14px 16px', fontWeight: '600', color: '#ffffff' }}>{u.transactionsCount}</td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{ color: u.fraudCases > 0 ? '#ef4444' : '#10b981', fontWeight: '700' }}>
                      {u.fraudCases}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px' }}>{getRiskBadge(u.riskLevel, u.riskScore)}</td>
                  <td style={{ padding: '14px 16px', color: '#64748b', fontSize: '0.8rem' }}>{u.lastActive}</td>
                  <td style={{ padding: '14px 16px' }}>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '9999px',
                        fontSize: '0.72rem',
                        fontWeight: '700',
                        background: u.status === 'active' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)',
                        color: u.status === 'active' ? '#10b981' : '#ef4444',
                      }}
                    >
                      {u.status.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                    <button
                      onClick={() => handleSelectUser(u)}
                      style={{ background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.3)', color: '#60a5fa', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    >
                      <Eye size={13} /> Open Profile
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Investigation Drawer / Modal */}
      {selectedUser && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ width: '100%', maxWidth: '620px', background: '#111827', height: '100%', overflowY: 'auto', borderLeft: '1px solid rgba(255,255,255,0.12)', padding: '32px 28px', boxShadow: '-10px 0 35px rgba(0,0,0,0.6)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <img
                  src={selectedUser.avatar}
                  alt={selectedUser.name}
                  style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #3b82f6' }}
                />
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.3rem', color: '#ffffff', fontFamily: 'Plus Jakarta Sans' }}>{selectedUser.name}</h2>
                  <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{selectedUser.email} • {selectedUser.city}</span>
                </div>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: '#94a3b8', borderRadius: '8px', padding: '8px', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Drawer Tabs (User Overview, Transactions, Fraud Alerts, Risk Analysis, Analytics) */}
            <div style={{ display: 'flex', gap: '6px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '10px', marginBottom: '24px', flexWrap: 'wrap' }}>
              {[
                { id: 'overview', label: 'User Overview' },
                { id: 'transactions', label: 'Transactions' },
                { id: 'alerts', label: 'Fraud Alerts' },
                { id: 'risk', label: 'Risk Analysis' },
                { id: 'analytics', label: 'Analytics' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setDrawerTab(tab.id)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: 'none',
                    background: drawerTab === tab.id ? '#2563eb' : 'transparent',
                    color: drawerTab === tab.id ? '#ffffff' : '#94a3b8',
                    fontSize: '0.825rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab 1: User Overview */}
            {drawerTab === 'overview' && (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '24px' }}>
                  <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '16px' }}>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Safety Score</div>
                    <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#10b981' }}>{selectedUser.safetyScore}/100</div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '16px' }}>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Risk Index</div>
                    <div style={{ fontSize: '1.6rem', fontWeight: '800', color: selectedUser.riskScore > 60 ? '#ef4444' : '#f59e0b' }}>{selectedUser.riskScore}/100</div>
                  </div>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '18px', marginBottom: '20px' }}>
                  <h4 style={{ margin: '0 0 12px 0', fontSize: '0.925rem', color: '#ffffff' }}>Account Details</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.85rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#64748b' }}>Account ID:</span> <strong>{selectedUser.id}</strong></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#64748b' }}>Joined:</span> <span>{selectedUser.createdAt}</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#64748b' }}>Account Status:</span> <span style={{ color: '#10b981', fontWeight: '700' }}>{selectedUser.status.toUpperCase()}</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#64748b' }}>Data Isolation:</span> <span style={{ color: '#38bdf8' }}>Cryptographically Isolated</span></div>
                  </div>
                </div>

                {drilldownData?.recentActivity && (
                  <div>
                    <h4 style={{ margin: '0 0 12px 0', fontSize: '0.925rem', color: '#ffffff' }}>Audit Trail</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {drilldownData.recentActivity.map((act, i) => (
                        <div key={i} style={{ padding: '10px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', fontSize: '0.8rem' }}>
                          <div style={{ color: '#cbd5e1' }}>{act.action}</div>
                          <div style={{ color: '#64748b', fontSize: '0.72rem', marginTop: '2px' }}>{act.time}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: Transactions */}
            {drawerTab === 'transactions' && (
              <div>
                <h4 style={{ margin: '0 0 14px 0', fontSize: '0.925rem', color: '#ffffff' }}>User Ingested Transactions</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {[
                    { id: 'TXN-01', merchant: 'Swiggy', amount: '₹480', date: 'Today 10:14 AM', status: 'Safe' },
                    { id: 'TXN-02', merchant: 'Zepto', amount: '₹340', date: 'Yesterday 08:30 PM', status: 'Safe' },
                    { id: 'TXN-03', merchant: 'Unknown Collect', amount: '₹14,500', date: 'Sep 10, 02:41 AM', status: 'Flagged' },
                  ].map((t) => (
                    <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', fontSize: '0.85rem' }}>
                      <div>
                        <div style={{ fontWeight: '600', color: '#ffffff' }}>{t.merchant}</div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{t.date}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: '700', color: '#ffffff' }}>{t.amount}</div>
                        <span style={{ fontSize: '0.7rem', color: t.status === 'Safe' ? '#10b981' : '#ef4444', fontWeight: '700' }}>{t.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tab 3: Fraud Alerts */}
            {drawerTab === 'alerts' && (
              <div>
                <h4 style={{ margin: '0 0 14px 0', fontSize: '0.925rem', color: '#ffffff' }}>Flagged User Alerts</h4>
                <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '12px', padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#ef4444' }}>CRITICAL ALERT</span>
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Sep 10, 02:41 AM</span>
                  </div>
                  <div style={{ fontSize: '0.9rem', fontWeight: '600', color: '#ffffff', marginBottom: '4px' }}>
                    Unsolicited late-night collect request (₹14,500)
                  </div>
                  <p style={{ fontSize: '0.8rem', color: '#cbd5e1', margin: 0 }}>
                    Flagged by behavioral deviation engine. Amount is 8.4× higher than typical baseline.
                  </p>
                </div>
              </div>
            )}

            {/* Tab 4: Risk Analysis */}
            {drawerTab === 'risk' && (
              <div>
                <h4 style={{ margin: '0 0 14px 0', fontSize: '0.925rem', color: '#ffffff' }}>Account Risk Radar</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.825rem', marginBottom: '4px' }}>
                      <span>Amount Deviation Risk</span>
                      <strong style={{ color: '#ef4444' }}>HIGH (84%)</strong>
                    </div>
                    <div style={{ height: '5px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px' }}>
                      <div style={{ width: '84%', height: '100%', background: '#ef4444' }} />
                    </div>
                  </div>
                  <div style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.825rem', marginBottom: '4px' }}>
                      <span>Velocity Anomaly</span>
                      <strong style={{ color: '#10b981' }}>LOW (18%)</strong>
                    </div>
                    <div style={{ height: '5px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px' }}>
                      <div style={{ width: '18%', height: '100%', background: '#10b981' }} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 5: Analytics */}
            {drawerTab === 'analytics' && (
              <div>
                <h4 style={{ margin: '0 0 14px 0', fontSize: '0.925rem', color: '#ffffff' }}>Monthly Activity Breakdown</h4>
                <div style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', fontSize: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}><span style={{ color: '#64748b' }}>Total Monthly Volume:</span> <strong>₹24,800</strong></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}><span style={{ color: '#64748b' }}>Primary Channel:</span> <strong>UPI (PhonePe)</strong></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#64748b' }}>Top Category:</span> <strong>Food & Dining (Swiggy, Zomato)</strong></div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
