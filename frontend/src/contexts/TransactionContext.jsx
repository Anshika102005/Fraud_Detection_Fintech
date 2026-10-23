/* ============================================================
   FraudGuard AI — Transaction Context
   Central state for personal payment activity, KPI calculations,
   live transaction ingestion, and empty-state toggling.
============================================================ */

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { transactionsApi } from '../services/api/transactionsApi';
import { fraudAlertsApi } from '../services/api/fraudAlertsApi';
import { useAuth } from './AuthContext';

const TransactionContext = createContext();

export const TransactionProvider = ({ children }) => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEmptyMode, setIsEmptyMode] = useState(() => transactionsApi.getEmptyStateMode());

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (isEmptyMode) {
        setTransactions([]);
        setAlerts([]);
      } else {
        const resTxns = await transactionsApi.getTransactions({ limit: 100 });
        setTransactions(resTxns.transactions || []);

        const resAlerts = await fraudAlertsApi.getAlerts();
        setAlerts(resAlerts.alerts || []);
      }
    } catch (err) {
      console.error('Error loading transaction context data:', err);
      setError(err.message || 'Failed to load transaction data.');
    } finally {
      setLoading(false);
    }
  }, [isEmptyMode, user?.id]);

  useEffect(() => {
    // Reload whenever the signed-in account changes (login/logout) so one
    // user's data never lingers into another user's session.
    setIsEmptyMode(transactionsApi.getEmptyStateMode());
    loadData();
  }, [loadData]);

  // Dynamically compute KPIs
  const kpis = useMemo(() => {
    if (isEmptyMode || transactions.length === 0) {
      return {
        totalTransactions: 0,
        fraudCount: 0,
        suspiciousCount: 0,
        fraudRate: '0.00%',
        totalValue: 0,
        averageAmount: 0,
      };
    }

    const total = transactions.length;
    const fraud = transactions.filter((t) => t.status === 'fraudulent').length;
    const suspicious = transactions.filter((t) => t.status === 'suspicious').length;
    const totalVal = transactions.reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
    const avg = total > 0 ? Math.round(totalVal / total) : 0;
    const rate = total > 0 ? ((fraud / total) * 100).toFixed(2) + '%' : '0.00%';

    return {
      totalTransactions: total,
      fraudCount: fraud,
      suspiciousCount: suspicious,
      fraudRate: rate,
      totalValue: totalVal,
      averageAmount: avg,
    };
  }, [transactions, isEmptyMode]);

  const addTransaction = async (formData) => {
    const res = await transactionsApi.addTransaction(formData);
    setIsEmptyMode(false);
    await loadData();
    return res;
  };

  const processCsv = async (csvText) => {
    const res = await transactionsApi.processCsvData(csvText);
    setIsEmptyMode(false);
    await loadData();
    return res;
  };

  const toggleEmptyMode = () => {
    const nextState = !isEmptyMode;
    setIsEmptyMode(nextState);
    transactionsApi.setEmptyStateMode(nextState);
  };

  const updateAlertStatus = async (alertId, status) => {
    await fraudAlertsApi.updateAlertStatus(alertId, status);
    setAlerts((prev) => prev.map((a) => (a.id === alertId ? { ...a, status } : a)));
  };

  const value = {
    transactions,
    alerts,
    kpis,
    loading,
    error,
    isEmptyMode,
    toggleEmptyMode,
    addTransaction,
    processCsv,
    updateAlertStatus,
    refreshData: loadData,
  };

  return <TransactionContext.Provider value={value}>{children}</TransactionContext.Provider>;
};

export const useTransactions = () => {
  const context = useContext(TransactionContext);
  if (!context) {
    throw new Error('useTransactions must be used within TransactionProvider');
  }
  return context;
};
