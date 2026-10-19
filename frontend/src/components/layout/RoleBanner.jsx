import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTransactions } from '../../contexts/TransactionContext';
import { Database } from 'lucide-react';

/**
 * Demo data controls. Identity is intentionally NOT shown here — the current
 * user is displayed in the navbar/sidebar, and roles cannot be switched from
 * the UI. Only the customer's demo-data (empty state) toggle remains.
 */
export default function RoleBanner() {
  const { role } = useAuth();
  const { isEmptyMode, toggleEmptyMode, restoreDemoData } = useTransactions();

  if (role !== 'customer') {
    return null;
  }

  return (
    <aside aria-label="Demo data controls" className="demo-role-banner">
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <button
          onClick={toggleEmptyMode}
          className={`role-pill-btn ${isEmptyMode ? 'active' : ''}`}
          title="Toggle between populated demo transactions and zero-data empty state"
        >
          <Database size={12} style={{ display: 'inline', marginRight: '4px' }} />
          {isEmptyMode ? 'Empty State Active (Click to Fill)' : 'Simulate Empty State'}
        </button>
        {isEmptyMode && (
          <button
            onClick={restoreDemoData}
            className="role-pill-btn"
            style={{ background: '#059669', color: '#fff', borderColor: '#10b981' }}
          >
            Reset Demo Data
          </button>
        )}
      </div>
    </aside>
  );
}
