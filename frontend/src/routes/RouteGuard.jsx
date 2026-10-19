import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, homePathForRole } from '../contexts/AuthContext';

export default function RouteGuard({ children, requiredRole }) {
  const { user, role, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#0a0f1d',
          color: '#94a3b8',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        Verifying security session...
      </div>
    );
  }

  // Unauthenticated visitors cannot open any dashboard — send them to sign in.
  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  // Role comes from the authenticated account. A signed-in user only ever
  // reaches their own workspace (a customer cannot switch into the analyst area).
  if (requiredRole && role !== requiredRole) {
    return <Navigate to={homePathForRole(role)} replace />;
  }

  return children;
}
