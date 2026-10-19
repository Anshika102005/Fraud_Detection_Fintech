/* ============================================================
   FraudGuard AI — Auth Context
   Owns the authenticated session. The role always comes from the
   authenticated account (see services/api/authApi) — never from the UI.
   There is no auto-login: an unauthenticated visitor has `user === null`.
============================================================ */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../services/api/authApi';

const AuthContext = createContext();

/* Where an authenticated role belongs. Unknown roles land on the customer side. */
export const homePathForRole = (role) =>
  role === 'analyst' ? '/analyst/dashboard' : '/app/dashboard';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const currentUser = await authApi.getCurrentUser();
        if (active) setUser(currentUser);
      } catch (err) {
        console.error('Failed to load user auth:', err);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  /* The API layer fires this when a protected call comes back 401 — the
     session expired or was revoked server-side. Drop it so RouteGuard
     redirects to /login instead of leaving a stale dashboard open. */
  useEffect(() => {
    const handleUnauthorized = () => {
      authApi.logout(); // local clear; server session (if any) is already invalid
      setUser(null);
    };
    window.addEventListener('fraudguard:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('fraudguard:unauthorized', handleUnauthorized);
  }, []);

  const login = async (credentials) => {
    setLoading(true);
    try {
      const res = await authApi.login(credentials);
      setUser(res.user);
      return res.user;
    } finally {
      setLoading(false);
    }
  };

  const register = async (details) => {
    setLoading(true);
    try {
      const res = await authApi.register(details);
      setUser(res.user);
      return res.user;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    await authApi.logout();
    setUser(null);
  };

  const value = {
    user,
    role: user?.role || 'guest',
    isAuthenticated: !!user,
    isCustomer: user?.role === 'customer',
    isAnalyst: user?.role === 'analyst',
    homePath: homePathForRole(user?.role),
    loading,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
