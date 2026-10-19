/* ============================================================
   API Service Layer - Part 1: Client & Dashboard/Transaction APIs
   Structured for easy replacement with a real backend.
============================================================ */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

/* Simple artificial latency helper kept local to this module */
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms || 250));

class ApiClient {
  constructor(baseURL) {
    this.baseURL = baseURL;
  }
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = { headers: { 'Content-Type': 'application/json', ...options.headers }, ...options };
    try {
      const response = await fetch(url, config);
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || `HTTP ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`API Error [${endpoint}]:`, error);
      throw error;
    }
  }
  async get(endpoint, params = {}) {
    const query = new URLSearchParams(params).toString();
    const path = query ? `${endpoint}?${query}` : endpoint;
    return this.request(path, { method: 'GET' });
  }
  async post(endpoint, data = {}) {
    return this.request(endpoint, { method: 'POST', body: JSON.stringify(data) });
  }
  async put(endpoint, data = {}) {
    return this.request(endpoint, { method: 'PUT', body: JSON.stringify(data) });
  }
  async delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }
}

const apiClient = new ApiClient(API_BASE_URL);

// Dashboard API
export const getDashboardStats = async () => {
  try { return await apiClient.get('/dashboard'); }
  catch { const { getDashboardStatsMock } = await import('../data/dashboardData'); return getDashboardStatsMock(); }
};

// Transactions API
export const getTransactions = async (params = {}) => {
  try { return await apiClient.get('/transactions', params); }
  catch { const { getTransactionsMock } = await import('../data/transactions'); return getTransactionsMock(params); }
};

export const getTransactionById = async (id) => {
  try { return await apiClient.get(`/transactions/${id}`); }
  catch { const { getTransactionByIdMock } = await import('../data/transactions'); return getTransactionByIdMock(id); }
};

// Fraud Alerts API
export const getFraudAlerts = async (params = {}) => {
  try { return await apiClient.get('/fraud-alerts', params); }
  catch { const { getFraudAlertsMock } = await import('../data/fraudAlerts'); return getFraudAlertsMock(params); }
};

export const getFraudAlertById = async (id) => {
  try { return await apiClient.get(`/fraud-alerts/${id}`); }
  catch { const { getFraudAlertByIdMock } = await import('../data/fraudAlerts'); return getFraudAlertByIdMock(id); }
};



// Analytics API
export const getAnalytics = async (params = {}) => {
  try { return await apiClient.get('/analytics', params); }
  catch { const { getAnalyticsMock } = await import('../data/analyticsData'); return getAnalyticsMock(params); }
};

export const getFraudDistribution = async (params = {}) => {
  try { return await apiClient.get('/analytics/fraud-distribution', params); }
  catch { const { getFraudDistributionMock } = await import('../data/analyticsData'); return getFraudDistributionMock(); }
};

export const getRiskDistribution = async () => {
  try { return await apiClient.get('/analytics/risk-distribution'); }
  catch { const { getRiskDistributionMock } = await import('../data/analyticsData'); return getRiskDistributionMock(); }
};

// Analytics breakdowns
export const getFraudByMerchantCategory = async () => {
  try { return await apiClient.get('/analytics/fraud-by-merchant-category'); }
  catch { const { getFraudByMerchantCategoryMock } = await import('../data/analyticsData'); return getFraudByMerchantCategoryMock(); }
};

export const getFraudByLocation = async () => {
  try { return await apiClient.get('/analytics/fraud-by-location'); }
  catch { const { getFraudByLocationMock } = await import('../data/analyticsData'); return getFraudByLocationMock(); }
};

export const getFraudByDevice = async () => {
  try { return await apiClient.get('/analytics/fraud-by-device'); }
  catch { const { getFraudByDeviceMock } = await import('../data/analyticsData'); return getFraudByDeviceMock(); }
};

export const getFraudByHour = async () => {
  try { return await apiClient.get('/analytics/fraud-by-hour'); }
  catch { const { getFraudByHourMock } = await import('../data/analyticsData'); return getFraudByHourMock(); }
};

export const getAmountDistribution = async () => {
  try { return await apiClient.get('/analytics/amount-distribution'); }
  catch { const { getAmountDistributionMock } = await import('../data/analyticsData'); return getAmountDistributionMock(); }
};

// Risk Analysis API
export const getRiskAnalysis = async (params = {}) => {
  try { return await apiClient.get('/risk-analysis', params); }
  catch { const { getRiskAnalysisMock } = await import('../data/analyticsData'); return getRiskAnalysisMock(); }
};

// Model Performance API
export const getModelPerformance = async () => {
  try { return await apiClient.get('/model-performance'); }
  catch { const { getModelPerformanceMock } = await import('../data/analyticsData'); return getModelPerformanceMock(); }
};

export const getModelComparison = async () => {
  try { return await apiClient.get('/model-performance/comparison'); }
  catch { const { getModelComparisonMock } = await import('../data/analyticsData'); return getModelComparisonMock(); }
};

// Fraud Prediction API
export const predictFraud = async (transactionData) => {
  try {
    return await apiClient.post('/predict', transactionData);
  } catch {
    const { predictFraudMock } = await import('../data/prediction');
    return predictFraudMock(transactionData);
  }
};

export const blockTransaction = async (id, reason) => {
  try {
    return await apiClient.post(`/transactions/${id}/block`, { reason });
  } catch {
    return { success: true, transaction_id: id, action: 'blocked' };
  }
};

export const approveTransaction = async (id) => {
  try {
    return await apiClient.post(`/transactions/${id}/approve`);
  } catch {
    return { success: true, transaction_id: id, action: 'approved' };
  }
};

export default apiClient;
