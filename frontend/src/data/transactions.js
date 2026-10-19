/* Mock Data: Transactions — deterministic seeded generator so the
   dataset is stable across reloads. */

const CUSTOMERS = [
  { id: 'c001', name: 'Alice Johnson', accountAge: 142, avgAmount: 245.3, baseFraud: 0.03 },
  { id: 'c002', name: 'Bob Smith', accountAge: 89, avgAmount: 128.75, baseFraud: 0.22 },
  { id: 'c003', name: 'Carol Lee', accountAge: 312, avgAmount: 567.8, baseFraud: 0.02 },
  { id: 'c004', name: 'David Wang', accountAge: 45, avgAmount: 89.5, baseFraud: 0.3 },
  { id: 'c005', name: 'Elena Rodriguez', accountAge: 201, avgAmount: 345.2, baseFraud: 0.05 },
  { id: 'c006', name: 'Frank Miller', accountAge: 67, avgAmount: 198.75, baseFraud: 0.08 },
  { id: 'c007', name: 'Grace Kim', accountAge: 380, avgAmount: 782.4, baseFraud: 0.015 },
  { id: 'c008', name: 'Henry Brown', accountAge: 23, avgAmount: 67.3, baseFraud: 0.18 },
];

const MERCHANTS = [
  { name: 'Amazon', category: 'Online Shopping' },
  { name: 'AirlinePlus', category: 'Travel' },
  { name: 'Starbucks', category: 'Food & Dining' },
  { name: 'Best Buy', category: 'Electronics' },
  { name: 'Whole Foods', category: 'Grocery' },
  { name: 'Netflix', category: 'Entertainment' },
  { name: 'Walmart', category: 'Grocery' },
  { name: 'Delta Airlines', category: 'Travel' },
  { name: 'Apple Store', category: 'Electronics' },
  { name: 'Target', category: 'Online Shopping' },
  { name: 'Uber', category: 'Travel' },
  { name: 'McDonald\'s', category: 'Food & Dining' },
];

const LOCATIONS = [
  { city: 'San Francisco', country: 'US', lat: 37.77, lon: -122.42 },
  { city: 'New York', country: 'US', lat: 40.71, lon: -74.01 },
  { city: 'Austin', country: 'US', lat: 30.27, lon: -97.73 },
  { city: 'Seattle', country: 'US', lat: 47.61, lon: -122.33 },
  { city: 'Miami', country: 'US', lat: 25.76, lon: -80.2 },
  { city: 'Chicago', country: 'US', lat: 41.88, lon: -87.63 },
  { city: 'London', country: 'GB', lat: 51.51, lon: -0.13 },
  { city: 'Paris', country: 'FR', lat: 48.86, lon: 2.35 },
  { city: 'Berlin', country: 'DE', lat: 52.52, lon: 13.41 },
  { city: 'Toronto', country: 'CA', lat: 43.65, lon: -79.38 },
];

const DEVICES = [
  { type: 'Mobile iOS', os: 'iOS 17', browser: 'Safari' },
  { type: 'Mobile Android', os: 'Android 14', browser: 'Chrome' },
  { type: 'Desktop Windows', os: 'Windows 11', browser: 'Edge' },
  { type: 'Desktop Mac', os: 'macOS 14', browser: 'Chrome' },
  { type: 'Tablet', os: 'iOS 17', browser: 'Safari' },
];

function makeRng(seed) {
  let state = seed % 2147483647;
  if (state <= 0) state += 2147483646;
  return () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
}

const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const haversineKm = (a, b) => {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
};

export function generateTransactions(count = 500, seed = 42) {
  const rng = makeRng(seed);
  const now = Date.now();
  const txns = [];

  for (let i = 0; i < count; i++) {
    const customer = pick(rng, CUSTOMERS);
    const merchant = pick(rng, MERCHANTS);
    const location = pick(rng, LOCATIONS);
    const device = pick(rng, DEVICES);
    const isNewDevice = rng() < 0.12;

    const home = pick(rng, LOCATIONS);
    const city = rng() < 0.7 ? home : location;
    const amountRatio = 0.3 + rng() * (isNewDevice ? 4 : 2.5);
    const amount = Math.max(1.5, Math.round(customer.avgAmount * amountRatio * 100) / 100);
    const txnsLast10m = Math.floor(rng() * 5) + (amountRatio > 2.5 ? 2 : 0);
    const distanceKm = Math.round(haversineKm(home, city));

    let p = customer.baseFraud;
    p += amountRatio > 2.2 ? 0.22 : 0;
    p += isNewDevice ? 0.15 : 0;
    p += distanceKm > 500 ? 0.18 : 0;
    p += txnsLast10m >= 4 ? 0.14 : 0;
    p += Math.floor(rng() * 24) <= 5 ? 0.08 : 0;
    p = clamp(p, 0.005, 0.985);

    const riskScore = Math.round(clamp(p * 105 - 3, 1, 99));
    const status = p >= 0.78 ? (rng() < 0.45 ? 'blocked' : 'fraudulent') : p >= 0.5 ? 'suspicious' : 'legitimate';

    txns.push({
      transaction_id: `TXN-${String(104200 + i * 7).padStart(8, '0')}`,
      txn_ts: new Date(now - (count - i) * 3240 * 1000 * (rng() * 2 + 0.4)).toISOString(),
      amount,
      currency: 'USD',
      merchant_name: merchant.name,
      merchant_category: merchant.category,
      customer_id: customer.id,
      customer_name: customer.name,
      device_id: `DEV-${pick(rng, ['A1B2', 'C3D4', 'E5F6', 'G7H8', 'I9J0', 'K1L2', 'M3N4'])}-${Math.floor(rng() * 900 + 100)}`,
      device_type: device.type,
      os: device.os,
      browser: device.browser,
      ip_address: `192.168.${Math.floor(rng() * 255)}.${Math.floor(rng() * 255)}`,
      city: city.city,
      country: city.country,
      prev_city: home.city,
      prev_country: home.country,
      distance_from_prev_km: distanceKm,
      avg_amount: Math.round(customer.avgAmount * 100) / 100,
      avg_distance_km: 120,
      txns_last_10m: txnsLast10m,
      account_age_days: customer.accountAge,
      prev_txn_count: Math.max(1, Math.round((customer.accountAge / 30) * (2 + rng() * 3))),
      is_new_device: isNewDevice,
      risk_score: riskScore,
      fraud_probability: Math.round(p * 1000) / 10,
      status,
    });
  }

  txns.sort((a, b) => new Date(b.txn_ts) - new Date(a.txn_ts));
  return txns;
}

export const TRANSACTIONS_MOCK = generateTransactions(500);
export const CUSTOMERS_MOCK = CUSTOMERS;
export const MERCHANTS_MOCK = MERCHANTS;

export const getTransactionsMock = (params = {}) => {
  let data = [...TRANSACTIONS_MOCK];

  if (params.status) data = data.filter((t) => t.status === params.status);
  if (params.risk_level === 'high') data = data.filter((t) => t.risk_score >= 71);
  if (params.risk_level === 'medium') data = data.filter((t) => t.risk_score >= 31 && t.risk_score < 71);
  if (params.risk_level === 'low') data = data.filter((t) => t.risk_score < 31);
  if (params.min_amount) data = data.filter((t) => t.amount >= parseFloat(params.min_amount));
  if (params.max_amount) data = data.filter((t) => t.amount <= parseFloat(params.max_amount));
  if (params.merchant_category) data = data.filter((t) => t.merchant_category === params.merchant_category);
  if (params.date_from) data = data.filter((t) => t.txn_ts >= new Date(params.date_from).toISOString());
  if (params.date_to) {
    const end = new Date(params.date_to);
    end.setHours(23, 59, 59, 999);
    data = data.filter((t) => t.txn_ts <= end.toISOString());
  }
  if (params.search) {
    const q = params.search.toLowerCase();
    data = data.filter(
      (t) =>
        t.transaction_id.toLowerCase().includes(q) ||
        t.customer_id.toLowerCase().includes(q) ||
        t.customer_name.toLowerCase().includes(q) ||
        t.merchant_name.toLowerCase().includes(q) ||
        t.city.toLowerCase().includes(q) ||
        t.country.toLowerCase().includes(q),
    );
  }

  const limit = parseInt(params.limit) || 20;
  const page = parseInt(params.page) || 1;
  const total = data.length;
  const start = (page - 1) * limit;
  const paged = data.slice(start, start + limit);

  return { data: paged, total, page, limit, total_pages: Math.max(1, Math.ceil(total / limit)) };
};

export const getTransactionByIdMock = (id) => {
  const txn = TRANSACTIONS_MOCK.find((t) => t.transaction_id === id);
  return txn ? { data: txn } : { data: null };
};