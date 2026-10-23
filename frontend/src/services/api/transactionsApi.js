/* ============================================================
   FraudGuard AI — Transactions API Service
   Every transaction is read from and written to the backend
   database with the authenticated session token. There is no
   local dataset, no seed data, and no client-side verdict: all
   scoring happens on the server.
============================================================ */

import { apiClient } from './client';
import { scopedKey } from './scopedStorage';

const EMPTY_STATE_BASE = 'fraudguard_force_empty_state';

export const transactionsApi = {
  /** List/search own transactions — server filters, sorts, paginates. */
  async getTransactions(params = {}) {
    return apiClient.get('/transactions', params);
  },

  async getTransactionById(id) {
    return apiClient.get(`/transactions/${id}`);
  },

  /** Analyze + persist server-side; the response carries the server verdict. */
  async addTransaction(data) {
    return apiClient.post('/transactions', {
      merchant: data.merchant,
      amount: Number(data.amount),
      date: data.date,
      time: data.time,
      paymentMethod: data.paymentMethod,
      category: data.category,
      location: data.location,
      device: data.device,
    });
  },

  /** Parse the CSV client-side (the user's own file), ingest + score on the server. */
  async processCsvData(csvText) {
    const lines = csvText.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length < 2) {
      throw new Error('CSV file is empty or missing data rows.');
    }

    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
      rows.push({
        rowNumber: i + 1,
        raw: lines[i],
        merchant: cols[0] || '',
        amount: (cols[1] || '').replace(/[₹,\s]/g, ''),
        date: cols[2] || '',
        time: cols[3] || '',
        paymentMethod: cols[4] || 'UPI',
        category: cols[5] || 'Other',
        location: cols[6] || 'Unknown',
      });
    }
    return apiClient.post('/transactions/batch', {
      fileName: 'transactions_batch.csv',
      rows,
    });
  },

  /* Empty-state preview is a UI preference (not data) — scoped per account. */
  setEmptyStateMode(isEmpty) {
    localStorage.setItem(scopedKey(EMPTY_STATE_BASE), isEmpty ? 'true' : 'false');
  },

  getEmptyStateMode() {
    return localStorage.getItem(scopedKey(EMPTY_STATE_BASE)) === 'true';
  },
};
