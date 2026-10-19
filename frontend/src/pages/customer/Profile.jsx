import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { avatarFor } from '../../utils/helpers';
import {
  User,
  ShieldCheck,
  Mail,
  MapPin,
  Calendar,
  Clock,
  Smartphone,
  Lock,
  CheckCircle2
} from 'lucide-react';

export default function Profile() {
  const { user } = useAuth();

  return (
    <div className="page-container" style={{ padding: '24px', maxWidth: '780px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: '800', color: '#ffffff', fontFamily: 'Plus Jakarta Sans', margin: 0 }}>
          User Profile
        </h1>
        <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#94a3b8' }}>
          Personal security posture and connected authentication.
        </p>
      </div>

      {/* Main Profile Card */}
      <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '30px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '28px', flexWrap: 'wrap' }}>
          <img
            src={user?.avatar || avatarFor(user)}
            alt="Avatar"
            style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: '3px solid #3b82f6' }}
          />
          <div>
            <h2 style={{ margin: 0, fontSize: '1.4rem', color: '#ffffff', fontWeight: '800' }}>
              {user?.name || 'User'}
            </h2>
            <div style={{ fontSize: '0.85rem', color: '#60a5fa', fontWeight: '600' }}>
              {user?.title || 'Gen-Z Digital Payment User'}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '4px' }}>
              Member ID: {user?.id || '—'}
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', color: '#cbd5e1' }}>
            <Mail size={16} style={{ color: '#60a5fa' }} />
            <span>{user?.email || '—'}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', color: '#cbd5e1' }}>
            <MapPin size={16} style={{ color: '#60a5fa' }} />
            <span>{user?.city || '—'}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', color: '#cbd5e1' }}>
            <Calendar size={16} style={{ color: '#60a5fa' }} />
            <span>Account Created: {user?.createdAt || '—'}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', color: '#cbd5e1' }}>
            <Clock size={16} style={{ color: '#60a5fa' }} />
            <span>Last Login: {user?.lastLogin || '—'}</span>
          </div>
        </div>
      </div>

      {/* Security & Authentication Section */}
      <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '30px' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '1.15rem', color: '#ffffff', fontWeight: '700' }}>
          Account Security & Credentials
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px' }}>
            <div>
              <div style={{ fontWeight: '600', color: '#ffffff', fontSize: '0.9rem' }}>Google Authentication</div>
              <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Linked to {user?.email || 'your account email'}</div>
            </div>
            <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <CheckCircle2 size={14} /> Active & Secured
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px' }}>
            <div>
              <div style={{ fontWeight: '600', color: '#ffffff', fontSize: '0.9rem' }}>Two-Factor Phone Binding</div>
              <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>SMS Push Verification {user?.phoneMasked ? `(${user.phoneMasked})` : 'not configured'}</div>
            </div>
            <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: '700' }}>
              Verified
            </span>
          </div>

          <div style={{ padding: '14px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)', fontSize: '0.8rem', color: '#cbd5e1' }}>
            <strong style={{ color: '#10b981' }}>FraudGuard AI Zero-Knowledge Standard:</strong> No banking passwords, full card numbers, CVVs, or UPI PINs are ever stored or requested in this interface.
          </div>
        </div>
      </div>
    </div>
  );
}
