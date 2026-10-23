import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTransactions } from '../../contexts/TransactionContext';
import { Database } from 'lucide-react';

/**
 * Empty-state preview toggle (a UI preference only — no user data lives
 * client-side). Identity is intentionally NOT shown here: the current user is
 * displayed in the navbar/sidebar, and roles cannot be switched from the UI.
 */
export default function RoleBanner() {
  const { role } = useAuth();
  const { isEmptyMode, toggleEmptyMode } = useTransactions();

  if (role !== 'customer') {
    return null;
  }

  return (
    <aside aria-label="Demo data controls" className="demo-role-banner">
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <button
          onClick={toggleEmptyMode}
          className={`role-pill-btn ${isEmptyMode ? 'active' : ''}`}          title="Toggle between your real transactions and a zero-data empty-state preview"
          >
          <Database size={12} style={{ display: 'inline', marginRight: '4px' }} />
          {isEmptyMode ? 'Empty State Active (Click to Fill)' : 'Simulate Empty State'}
        </button>
      </div>
    </aside>
  );
}
