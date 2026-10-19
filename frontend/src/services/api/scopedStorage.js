/* ============================================================
   FraudGuard AI — User-scoped storage keys
   Demo/derived data in localStorage is namespaced by the
   authenticated account id so one customer's records can never
   surface in another customer's session on the same browser.
============================================================ */

import { getStoredUserSync } from './authApi';

export function scopedKey(base) {
  const user = getStoredUserSync();
  return `${base}::${user?.id || 'anon'}`;
}

/** The demo customer account whose seeded dataset belongs to Anshika only. */
export const DEMO_CUSTOMER_ID = 'USR-8801';
