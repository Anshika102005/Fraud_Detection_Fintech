/* ============================================================
   FraudGuard AI — User-scoped storage keys
   Local UI preferences (e.g. the empty-state preview toggle) are
   namespaced by the authenticated account id so one account's
   preferences can never surface in another account's session.
   No user data is stored here — records live in the backend DB.
============================================================ */

import { getStoredUserSync } from './authApi';

export function scopedKey(base) {
  const user = getStoredUserSync();
  return `${base}::${user?.id || 'anon'}`;
}
