import React, { useState } from 'react';
import { Navigate, Link, useNavigate } from 'react-router-dom';
import { useAuth, homePathForRole } from '../../contexts/AuthContext';
import { Shield, ShieldCheck, Lock, Mail, User, LogIn, Loader2, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const { login, register, user, loading, homePath } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [name, setName] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Already authenticated → go straight to the correct dashboard for the role.
  if (!loading && user) {
    return <Navigate to={homePath} replace />;
  }

  const isRegister = mode === 'register';

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (isRegister && name.trim().length < 2) {
      setError('Please enter your full name.');
      return;
    }
    if (!identifier.trim() || !password) {
      setError('Please enter both your email and password.');
      return;
    }
    if (isRegister && password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setSubmitting(true);
    try {
      // The role is resolved from the authenticated account, never from the UI.
      const authedUser = isRegister
        ? await register({ name, email: identifier, password })
        : await login({ identifier, password });
      navigate(homePathForRole(authedUser.role), { replace: true });
    } catch (err) {
      setError(err.message || 'Sign in failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle = {
    width: '100%',
    padding: '12px 44px',
    borderRadius: '10px',
    background: 'rgba(255, 255, 255, 0.04)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    color: '#ffffff',
    fontSize: '0.95rem',
    outline: 'none',
    boxSizing: 'border-box',
  };

  const labelStyle = {
    display: 'block',
    textAlign: 'left',
    fontSize: '0.8rem',
    fontWeight: '600',
    color: '#cbd5e1',
    marginBottom: '6px',
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0a0f1d',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '24px',
        color: '#f8fafc',
        fontFamily: 'Inter, sans-serif',
      }}
    >
      <div style={{ position: 'absolute', top: '24px', left: '24px' }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8', textDecoration: 'none', fontSize: '0.9rem' }}>
          <Shield size={18} style={{ color: '#3b82f6' }} />
          <span style={{ fontWeight: '700', color: '#ffffff' }}>FraudGuard AI</span>
        </Link>
      </div>

      <div
        style={{
          width: '100%',
          maxWidth: '440px',
          background: '#111827',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '24px',
          padding: '40px 36px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          textAlign: 'center',
        }}
      >
        <div
          className="landing-brand-badge"
          style={{ width: '56px', height: '56px', borderRadius: '16px', margin: '0 auto 20px' }}
        >
          <Shield size={28} />
        </div>

        <h1
          style={{
            fontSize: '1.75rem',
            fontWeight: '800',
            fontFamily: 'Plus Jakarta Sans, sans-serif',
            color: '#ffffff',
            marginBottom: '8px',
          }}
        >
          FraudGuard AI
        </h1>
        <p style={{ fontSize: '1rem', color: '#94a3b8', marginBottom: '28px' }}>
          {isRegister ? 'Create Your Account' : 'Secure Sign In'}
        </p>

        <form onSubmit={handleSubmit} noValidate>
          {isRegister && (
            <div style={{ marginBottom: '16px', position: 'relative' }}>
              <label htmlFor="name" style={labelStyle}>
                Full Name
              </label>
              <User
                size={17}
                style={{ position: 'absolute', left: '14px', top: '35px', color: '#64748b' }}
              />
              <input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                placeholder="Your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={submitting}
                style={inputStyle}
              />
            </div>
          )}

          <div style={{ marginBottom: '16px', position: 'relative' }}>
            <label htmlFor="identifier" style={labelStyle}>
              {isRegister ? 'Email' : 'Email / Username'}
            </label>
            <Mail
              size={17}
              style={{ position: 'absolute', left: '14px', top: '35px', color: '#64748b' }}
            />
            <input
              id="identifier"
              name="identifier"
              type="text"
              autoComplete="username"
              placeholder="you@example.com"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              disabled={submitting}
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: '20px', position: 'relative' }}>
            <label htmlFor="password" style={labelStyle}>
              Password
            </label>
            <Lock
              size={17}
              style={{ position: 'absolute', left: '14px', top: '35px', color: '#64748b' }}
            />
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={submitting}
              style={inputStyle}
            />
          </div>

          {error && (
            <div
              role="alert"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                textAlign: 'left',
                padding: '10px 12px',
                marginBottom: '16px',
                borderRadius: '10px',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#fca5a5',
                fontSize: '0.82rem',
              }}
            >
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="btn-landing-primary"
            style={{
              width: '100%',
              padding: '13px 18px',
              justifyContent: 'center',
              fontSize: '0.98rem',
              fontWeight: '600',
              opacity: submitting ? 0.75 : 1,
              cursor: submitting ? 'not-allowed' : 'pointer',
            }}
          >
            {submitting ? (
              <>
                <Loader2 size={17} className="spin" />
                <span>Signing in…</span>
              </>
            ) : (
              <>
                <LogIn size={17} />
                <span>Sign In</span>
              </>
            )}
          </button>
        </form>

        <div style={{ marginTop: '16px', fontSize: '0.82rem' }}>
          <span style={{ color: '#64748b' }}>
            {isRegister ? 'Already have an account?' : 'New to FraudGuard AI?'}
          </span>{' '}
          <button
            type="button"
            onClick={() => {
              setMode(isRegister ? 'login' : 'register');
              setError('');
            }}
            style={{
              background: 'none',
              border: 'none',
              color: '#60a5fa',
              cursor: 'pointer',
              fontSize: '0.82rem',
              padding: 0,
              fontWeight: 600,
            }}
          >
            {isRegister ? 'Sign in instead' : 'Create an account'}
          </button>
        </div>

        {/* Prominent Privacy & Security Message */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
            textAlign: 'left',
            marginTop: '24px',
            padding: '12px 14px',
            borderRadius: '10px',
            background: 'rgba(16, 185, 129, 0.08)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
          }}
        >
          <ShieldCheck size={18} style={{ color: '#10b981', flexShrink: 0, marginTop: '2px' }} />
          <div style={{ fontSize: '0.78rem', color: '#cbd5e1', lineHeight: '1.45' }}>
            <strong style={{ color: '#ffffff' }}>Zero-Credential Policy:</strong> FraudGuard AI does not require your banking password, UPI PIN, OTP, or CVV.
          </div>
        </div>

        {!isRegister && (
          <p style={{ marginTop: '18px', marginBottom: 0, fontSize: '0.72rem', color: '#64748b' }}>
            Local demo accounts (development only): anshika.sharma@example.com (customer) and
            vikram@fraudguard.ai (analyst). Credentials are validated by the backend.
          </p>
        )}
      </div>
    </div>
  );
}
