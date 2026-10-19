/* ============================================================
   FraudGuard AI — Transactions API Service
   Supports listing, searching, single transaction analysis,
   CSV upload processing, and empty/demo state toggling.
============================================================ */

import { apiClient } from './client';
import { INITIAL_CUSTOMER_TRANSACTIONS } from '../../data/indianData';
import { scopedKey, DEMO_CUSTOMER_ID } from './scopedStorage';
import { getStoredUserSync } from './authApi';

const STORAGE_BASE = 'fraudguard_transactions_v2';
const EMPTY_STATE_BASE = 'fraudguard_force_empty_state';
/* Pre-scoping key from older builds. It always held Anshika's demo dataset
   (the old app auto-logged-in as her), so it is migrated into her scoped
   namespace only — never into another account's. */
const LEGACY_STORAGE_KEY = 'fraudguard_transactions_v2';

const currentUserId = () => getStoredUserSync()?.id || 'anon';

function getStoredTransactions() {
  const forceEmpty = localStorage.getItem(scopedKey(EMPTY_STATE_BASE)) === 'true';
  if (forceEmpty) return [];

  const key = scopedKey(STORAGE_BASE);
  const stored = localStorage.getItem(key);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return seedForCurrentUser();
    }
  }

  /* One-time migration: the legacy unscoped dataset belongs to Anshika. */
  if (currentUserId() === DEMO_CUSTOMER_ID) {
    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacy) {
      localStorage.setItem(key, legacy);
      localStorage.removeItem(LEGACY_STORAGE_KEY);
      try {
        return JSON.parse(legacy);
      } catch {
        /* fall through to seed */
      }
    }
  }
  return seedForCurrentUser();
}

/* Seeded demo data is Anshika's alone. Every other account starts empty so
   a newly registered user is never shown someone else's transactions. */
function seedForCurrentUser() {
  return currentUserId() === DEMO_CUSTOMER_ID ? [...INITIAL_CUSTOMER_TRANSACTIONS] : [];
}

function saveTransactions(list) {
  localStorage.setItem(scopedKey(STORAGE_BASE), JSON.stringify(list));
}

export const transactionsApi = {
  async getTransactions(params = {}) {
    try {
      return await apiClient.get('/transactions', params);
    } catch {
      let data = getStoredTransactions();

      // Search filter
      if (params.search) {
        const q = params.search.toLowerCase();
        data = data.filter(
          (t) =>
            t.merchant.toLowerCase().includes(q) ||
            t.id.toLowerCase().includes(q) ||
            (t.location && t.location.toLowerCase().includes(q)) ||
            (t.category && t.category.toLowerCase().includes(q))
        );
      }

      // Risk filter
      if (params.risk && params.risk !== 'ALL') {
        data = data.filter((t) => t.riskLevel.toUpperCase() === params.risk.toUpperCase());
      }

      // Status filter
      if (params.status && params.status !== 'ALL') {
        data = data.filter((t) => t.status.toLowerCase() === params.status.toLowerCase());
      }

      // Payment method filter
      if (params.paymentMethod && params.paymentMethod !== 'ALL') {
        data = data.filter((t) => t.paymentMethod.toLowerCase().includes(params.paymentMethod.toLowerCase()));
      }

      // Category filter
      if (params.category && params.category !== 'ALL') {
        data = data.filter((t) => t.category.toLowerCase() === params.category.toLowerCase());
      }

      // Sort
      const sortBy = params.sortBy || 'date';
      const sortOrder = params.sortOrder || 'desc';
      data.sort((a, b) => {
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

      // Pagination
      const page = parseInt(params.page || 1, 10);
      const limit = parseInt(params.limit || 8, 10);
      const total = data.length;
      const startIndex = (page - 1) * limit;
      const paginated = data.slice(startIndex, startIndex + limit);

      return {
        transactions: paginated,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      };
    }
  },

  async getTransactionById(id) {
    try {
      return await apiClient.get(`/transactions/${id}`);
    } catch {
      const all = getStoredTransactions();
      const found = all.find((t) => t.id === id);
      if (!found) throw new Error(`Transaction ${id} not found`);
      return found;
    }
  },

  /* Client-side AI risk evaluator when external backend is offline */
  evaluateTransactionRisk(data) {
    const amount = Number(data.amount) || 0;
    const time = data.time || '12:00';
    const hour = parseInt(time.split(':')[0], 10);
    const merchant = (data.merchant || '').toLowerCase();
    const paymentMethod = (data.paymentMethod || '').toLowerCase();
    const location = (data.location || '').toLowerCase();

    let score = 10;
    const reasons = [];

    // Amount deviations
    if (amount > 20000) {
      score += 45;
      reasons.push(`High transaction amount (₹${amount.toLocaleString('en-IN')}) significantly above peer average`);
    } else if (amount > 8000) {
      score += 25;
      reasons.push(`Amount ₹${amount.toLocaleString('en-IN')} exceeds normal daily micro-spending baseline`);
    }

    // Unusual late night hours
    if (hour >= 23 || hour < 5) {
      score += 30;
      reasons.push(`Unusual late-night transaction time (${time}) outside standard 8:00 AM – 10:00 PM window`);
    }

    // Suspicious keywords
    if (
      merchant.includes('telegram') ||
      merchant.includes('task') ||
      merchant.includes('fake') ||
      merchant.includes('lottery') ||
      merchant.includes('unknown') ||
      merchant.includes('collect')
    ) {
      score += 45;
      reasons.push('Merchant or receiver name matches reported scam keyword taxonomy');
    }

    // Payment method risk
    if (paymentMethod.includes('collect') || paymentMethod.includes('p2p')) {
      score += 20;
      reasons.push('Unsolicited UPI collect mechanism used');
    }

    // Location risk
    if (location.includes('vpn') || location.includes('unknown')) {
      score += 25;
      reasons.push('Originating device using unknown proxy / VPN endpoint');
    }

    // Clamp score
    const finalScore = Math.min(Math.max(score, 4), 98);
    const fraudProb = Math.round(finalScore * 0.95);

    let riskLevel = 'LOW';
    let prediction = 'Legitimate';
    let status = 'legitimate';

    if (finalScore >= 85) {
      riskLevel = 'CRITICAL';
      prediction = 'Fraudulent';
      status = 'fraudulent';
    } else if (finalScore >= 65) {
      riskLevel = 'HIGH';
      prediction = 'Suspicious';
      status = 'suspicious';
    } else if (finalScore >= 35) {
      riskLevel = 'MEDIUM';
      prediction = 'Suspicious';
      status = 'suspicious';
    } else {
      riskLevel = 'LOW';
      prediction = 'Legitimate';
      status = 'legitimate';
      if (reasons.length === 0) {
        reasons.push('Normal transaction parameters matching established personal baseline');
      }
    }

    return {
      riskScore: finalScore,
      fraudProbability: fraudProb,
      riskLevel,
      prediction,
      status,
      flaggedReasons: reasons,
      recommendation:
        riskLevel === 'CRITICAL' || riskLevel === 'HIGH'
          ? 'Decline payment authorization immediately. Never enter UPI PIN or OTP for this counterparty.'
          : 'Transaction parameters appear normal. No immediate threat identified.',
    };
  },

  async addTransaction(data) {
    try {
      return await apiClient.post('/transactions', data);
    } catch {
      const evaluation = this.evaluateTransactionRisk(data);
      const newTxn = {
        id: `TXN-${Math.floor(10000 + Math.random() * 90000)}`,
        date: data.date || new Date().toISOString().split('T')[0],
        time: data.time || '12:00',
        merchant: data.merchant,
        category: data.category || 'Other',
        amount: Number(data.amount),
        paymentMethod: data.paymentMethod || 'UPI - PhonePe',
        location: data.location || 'Bengaluru, Karnataka',
        device: data.device || 'iPhone 15 Pro (iOS 17)',
        ...evaluation,
      };

      const current = getStoredTransactions();
      const updated = [newTxn, ...current];
      saveTransactions(updated);

      // Disable force empty state if a transaction is added
      localStorage.setItem(scopedKey(EMPTY_STATE_BASE), 'false');

      return {
        success: true,
        transaction: newTxn,
        prediction: evaluation.prediction,
        fraudProbability: evaluation.fraudProbability,
        riskScore: evaluation.riskScore,
        riskLevel: evaluation.riskLevel,
        flaggedReasons: evaluation.flaggedReasons,
      };
    }
  },

  async processCsvData(csvText) {
    const lines = csvText.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length < 2) {
      throw new Error('CSV file is empty or missing data rows.');
    }

    const header = lines[0].toLowerCase().split(',').map((h) => h.trim());
    const valid = [];
    const invalid = [];
    const duplicates = [];
    const existing = getStoredTransactions();
    const seenIds = new Set(existing.map((t) => t.id));

    for (let i = 1; i < lines.length; i++) {
      const row = lines[i].split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
      if (row.length < 3) {
        invalid.push({ rowNumber: i + 1, raw: lines[i], reason: 'Insufficient columns' });
        continue;
      }

      const merchant = row[0] || 'Unknown Merchant';
      const amount = parseFloat(row[1]);
      const date = row[2] || new Date().toISOString().split('T')[0];
      const time = row[3] || '12:00';
      const paymentMethod = row[4] || 'UPI';
      const category = row[5] || 'Online Shopping';
      const location = row[6] || 'Bengaluru, India';

      if (isNaN(amount) || amount <= 0) {
        invalid.push({ rowNumber: i + 1, raw: lines[i], reason: 'Invalid or missing amount' });
        continue;
      }

      const generatedId = `TXN-CSV-${90000 + i}`;
      if (seenIds.has(generatedId)) {
        duplicates.push({ rowNumber: i + 1, id: generatedId });
        continue;
      }

      const evalResult = this.evaluateTransactionRisk({
        amount,
        time,
        merchant,
        paymentMethod,
        location,
      });

      valid.push({
        id: generatedId,
        date,
        time,
        merchant,
        category,
        amount,
        paymentMethod,
        location,
        device: 'Uploaded Device Profile',
        ...evalResult,
      });
      seenIds.add(generatedId);
    }

    const current = getStoredTransactions();
    const merged = [...valid, ...current];
    saveTransactions(merged);
    localStorage.setItem(scopedKey(EMPTY_STATE_BASE), 'false');

    const fraudCount = valid.filter((v) => v.status === 'fraudulent').length;
    const suspiciousCount = valid.filter((v) => v.status === 'suspicious').length;
    const legitimateCount = valid.filter((v) => v.status === 'legitimate').length;

    return {
      fileName: 'transactions_batch.csv',
      totalRows: lines.length - 1,
      validTransactions: valid.length,
      invalidRows: invalid.length,
      duplicates: duplicates.length,
      breakdown: {
        total: valid.length,
        fraud: fraudCount,
        suspicious: suspiciousCount,
        legitimate: legitimateCount,
        errors: invalid.length,
      },
      errors: invalid,
    };
  },

  setEmptyStateMode(isEmpty) {
    localStorage.setItem(scopedKey(EMPTY_STATE_BASE), isEmpty ? 'true' : 'false');
  },

  getEmptyStateMode() {
    return localStorage.getItem(scopedKey(EMPTY_STATE_BASE)) === 'true';
  },

  resetDemoDataset() {
    localStorage.setItem(scopedKey(EMPTY_STATE_BASE), 'false');
    localStorage.setItem(scopedKey(STORAGE_BASE), JSON.stringify(seedForCurrentUser()));
  }
};
