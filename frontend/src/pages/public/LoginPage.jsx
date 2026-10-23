/* ============================================================
   FraudGuard AI — Secure Login Portal
   1. /login            → role selection (Customer / Analyst)
   2. /login/customer   → customer login form
   3. /login/analyst    → analyst login form
   Credentials are always validated by the FastAPI backend; the
   role comes from the authenticated account — never from the UI.
============================================================ */

import React, { useState } from 'react';
import { Navigate, Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth, homePathForRole } from '../../contexts/AuthContext';
import {
  Shield,
  ShieldCheck,
  Lock,
  Mail,
  User,
  LogIn,
  Loader2,
  AlertCircle,
  Activity,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';

/* Single source of truth for the two login portals. */
const LOGIN_ROLES = {
  customer: {
    role: 'customer',
    cardTitle: 'Customer Login',
    formTitle: 'Customer Login',
    formSubtitle: 'Personal Fraud Protection',
    description:
      'Access your personal dashboard, view your transaction history, and check transaction risk results.',
    Icon: User,
    accent: '#3b82f6',
    accentSoft: 'rgba(59, 130, 246, 0.14)',
    identifierLabel: 'Email',
    mismatchMessage:
      'These credentials belong to a fraud analyst account. Please go back and choose Analyst Login.',
  },
  analyst: {
    role: 'analyst',
    cardTitle: 'Analyst Login',
    formTitle: 'Analyst Login',
    formSubtitle: 'Fraud Intelligence & Investigation',
    description:
      'Access the analyst dashboard, monitor suspicious transactions, investigate fraud alerts, and review fraud detection results.',
    Icon: Activity,
    accent: '#8b5cf6',
    accentSoft: 'rgba(139, 92, 246, 0.14)',
    identifierLabel: 'Analyst Email',
    mismatchMessage:
      'These credentials belong to a customer account. Please go back and choose Customer Login.',
  },
};

const pageStyle = {
  minHeight: '100vh',
  background: '#0a0f1d',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
  padding: '24px',
  color: '#f8fafc',
  fontFamily: 'Inter, sans-serif',
};

const cardStyle = {
  width: '100%',
  maxWidth: '480px',
  background: '#111827',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: '24px',
  padding: '40px 36px',
  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
  textAlign: 'center',
  boxSizing: 'border-box',
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

function BrandLink() {
  return (
    <div style={{ position: 'absolute', top: '24px', left: '24px' }}>
      <Link
        to="/"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          color: '#94a3b8',
          textDecoration: 'none',
          fontSize: '0.9rem',
        }}
      >
        <Shield size={18} style={{ color: '#3b82f6' }} />
        <span style={{ fontWeight: '700', color: '#ffffff' }}>FraudGuard AI</span>
      </Link>
    </div>
  );
}

function PrivacyNote() {
  return (
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
        <strong style={{ color: '#ffffff' }}>Zero-Credential Policy:</strong> FraudGuard AI does
        not require your banking password, UPI PIN, OTP, or CVV.
      </div>
    </div>
  );
}

/* ---------- Screen 1: role selection ---------- */
function RoleSelectionScreen() {
  const { user, loading } = useAuth();

  /* Already authenticated → straight to the workspace for their role. */
  if (!loading && user) {
    return <Navigate to={homePathForRole(user.role)} replace />;
  }

  return (
    <div style={{ ...pageStyle, position: 'relative' }}>
      <BrandLink />

      <div style={{ ...cardStyle, maxWidth: '620px' }}>
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
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            color: '#ffffff',
            marginBottom: '6px',
          }}
        >
          FraudGuard AI
        </h1>
        <h2 style={{ fontSize: '1.1rem', fontWeight: '600', color: '#60a5fa', margin: '0 0 10px' }}>
          Secure Login Portal
        </h2>
        <p style={{ fontSize: '0.9rem', color: '#94a3b8', margin: '0 0 28px', lineHeight: '1.55' }}>
          Choose how you would like to sign in. Access is limited to the workspace that matches
          your account role.
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
            gap: '16px',
          }}
        >
          {Object.values(LOGIN_ROLES).map(({ role, cardTitle, description, Icon, accent, accentSoft }) => (
            <Link
              key={role}
              to={`/login/${role}`}
              className="login-role-card"
              style={{ '--role-accent': accent, '--role-accent-soft': accentSoft }}
              aria-label={`${cardTitle} — sign in to your ${role} workspace`}
            >
              <span className="login-role-icon">
                <Icon size={22} />
              </span>
              <h3 className="login-role-title">{cardTitle}</h3>
              <p className="login-role-desc">{description}</p>
              <span className="login-role-cta">
                <span>{cardTitle}</span>
                <ChevronRight size={15} />
              </span>
            </Link>
          ))}
        </div>

        <PrivacyNote />
      </div>
    </div>
  );
}

/* ---------- Screens 2 & 3: role-specific login forms ---------- */
function LoginFormScreen({ roleConfig }) {
  const { login, register, user, loading, logout } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState('login'); // 'login' | 'register' (register is customer-only)
  const [name, setName] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isRegister = mode === 'register';
  const { role, formTitle, formSubtitle, identifierLabel, Icon, accent, accentSoft, mismatchMessage } = roleConfig;

  /* Already authenticated → the workspace for their REAL role (role comes
     from the account, so a signed-in analyst on /login/customer is sent to
     the analyst dashboard — never the other way around). */
  if (!loading && user && !submitting) {
    return <Navigate to={homePathForRole(user.role)} replace />;
  }

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
      const authedUser = isRegister
        ? await register({ name, email: identifier, password })
        : await login({ identifier, password });

      /* Backend role check: the account's role must match this portal.
         A customer cannot enter through the analyst door, and vice versa. */
      if (authedUser.role !== role) {
        await logout(); // never leave a session for the wrong portal
        setError(mismatchMessage);
        return;
      }
      navigate(homePathForRole(authedUser.role), { replace: true });
    } catch (err) {
      setError(err.message || 'Sign in failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ ...pageStyle, position: 'relative' }}>
      <BrandLink />

      <div style={cardStyle}>
        <Link to="/login" className="login-back-btn" style={{ marginBottom: '22px' }}>
          <ChevronLeft size={15} />
          <span>Back to Login Options</span>
        </Link>

        <div
          className="landing-brand-badge"
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '16px',
            margin: '0 auto 18px',
            background: `linear-gradient(135deg, ${accent}, ${accent})`,
            boxShadow: `0 4px 14px ${accentSoft}`,
          }}
        >
          <Icon size={26} />
        </div>

        <h1
          style={{
            fontSize: '1.5rem',
            fontWeight: '800',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            color: '#ffffff',
            marginBottom: '6px',
          }}
        >
          {formTitle}
        </h1>
        <p style={{ fontSize: '0.9rem', color: '#94a3b8', marginBottom: '26px' }}>
          {isRegister ? 'Create Your Customer Account' : formSubtitle}
        </p>

        <form onSubmit={handleSubmit} noValidate>
          {isRegister && (
            <div style={{ marginBottom: '16px', position: 'relative' }}>
              <label htmlFor="name" style={labelStyle}>
                Full Name
              </label>
              <User size={17} style={{ position: 'absolute', left: '14px', top: '35px', color: '#64748b' }} />
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
              {isRegister ? 'Email' : identifierLabel}
            </label>
            <Mail size={17} style={{ position: 'absolute', left: '14px', top: '35px', color: '#64748b' }} />
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
            <Lock size={17} style={{ position: 'absolute', left: '14px', top: '35px', color: '#64748b' }} />
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
                <span>Login</span>
              </>
            )}
          </button>
        </form>

        {/* Self-service signup only exists for customers (backend forces the
            customer role on registration; analysts are provisioned internally). */}
        {role === 'customer' && (
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
        )}

        <PrivacyNote />
      </div>
    </div>
  );
}

export default function LoginPage() {
  const { role } = useParams();

  if (role === undefined) return <RoleSelectionScreen />;
  if (!LOGIN_ROLES[role]) return <Navigate to="/login" replace />;
  return <LoginFormScreen roleConfig={LOGIN_ROLES[role]} />;
}
