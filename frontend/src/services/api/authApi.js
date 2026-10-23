/* ============================================================
   FraudGuard AI — Auth API Service
   All credentials are validated SERVER-SIDE against the FastAPI
   backend (/api/v1/auth). This module holds no accounts and no
   passwords — a session only exists after the backend issues one.

   Strictly TWO roles:
   1. Customer — Personal Fraud Protection
   2. Analyst — Fraud Intelligence & Investigation
   No Admin role exists anywhere.
============================================================ */

import { apiClient } from './client';

const SESSION_KEY = 'fraudguard_session_v2';
const TOKEN_KEY = 'fraudguard_token';

/* Sessions written by pre-fix builds (which auto-authenticated a demo user)
   under assorted legacy keys. Purged on load so no stale identity can ever
   survive into the fixed app. */
const LEGACY_SESSION_KEYS = [
  'fraudguard_user',
  'fraudguard_session',
  'fraudguard_session_v1',
  'fraudguard_auth_user',
  'fraudguardCurrentUser',
];

function purgeLegacySessions() {
  try {
    LEGACY_SESSION_KEYS.forEach((k) => localStorage.removeItem(k));
  } catch {
    /* storage unavailable — nothing to purge */
  }
}

function readSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeSession(user, token) {
  localStorage.setItem(SESSION_KEY, JSON.stringify({ user, token, issuedAt: Date.now() }));
  localStorage.setItem(TOKEN_KEY, token);
  return token;
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(TOKEN_KEY);
  purgeLegacySessions();
}

/* Strip secrets before anything reaches the UI or storage. */
function toPublicUser(raw) {
  if (!raw) return null;
  const { password, password_hash, passwordHash, ...safe } = raw;
  return safe;
}

export const authApi = {
  /**
   * Authenticate with the backend. No role parameter is accepted: the role
   * always comes from the matched account on the server. Throws on invalid
   * credentials or when the auth service is unreachable.
   */
  async login({ identifier, password } = {}) {
    try {
      const res = await apiClient.post('/auth/login', {
        identifier: String(identifier || '').trim(),
        password: String(password || ''),
      });
      const user = toPublicUser(res.user);
      writeSession(user, res.token);
      return { success: true, user };
    } catch (err) {
      const error = new Error(
        err.status === 401 || err.status === 403
          ? 'Invalid email or password.'
          : err.message || 'Could not reach the authentication service.',
      );
      error.status = err.status;
      throw error;
    }
  },

  /** Create a new customer account and start its session. */
  async register({ name, email, password } = {}) {
    try {
      const res = await apiClient.post('/auth/register', {
        name: String(name || '').trim(),
        email: String(email || '').trim().toLowerCase(),
        password: String(password || ''),
      });
      const user = toPublicUser(res.user);
      writeSession(user, res.token);
      return { success: true, user };
    } catch (err) {
      const error = new Error(
        err.status === 409
          ? 'An account with this email already exists.'
          : err.message || 'Could not reach the authentication service.',
      );
      error.status = err.status;
      throw error;
    }
  },

  /**
   * Restore the persisted session. The token is re-validated against the
   * backend on every app load, so a forged or expired session (including any
   * stale auto-login record from an old build) is rejected and cleared.
   * A network outage keeps the cached identity — real API calls still fail
   * closed on the server.
   */
  async getCurrentUser() {
    purgeLegacySessions();
    const session = readSession();
    if (!session?.token) {
      clearSession();
      return null;
    }
    try {
      const res = await apiClient.get('/auth/me');
      const user = toPublicUser(res.user);
      writeSession(user, session.token); // refresh cached profile (e.g. lastLogin)
      return user;
    } catch (err) {
      if (err.status === 401 || err.status === 403) {
        clearSession(); // expired, revoked, or forged token
        return null;
      }
      return toPublicUser(session.user); // backend unreachable — keep cached identity
    }
  },

  /** Revoke the server-side session and clear local state. Never throws. */
  async logout() {
    try {
      await apiClient.post('/auth/logout');
    } catch {
      /* server unreachable or already revoked — local clear still proceeds */
    }
    clearSession();
    return { success: true };
  },
};

/** Synchronous access to the cached user (no validation) for data scoping. */
export function getStoredUserSync() {
  return toPublicUser(readSession()?.user);
}
