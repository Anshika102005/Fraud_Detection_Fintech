import React from 'react';
import { Link } from 'react-router-dom';
import { Shield } from 'lucide-react';

export default function LandingFooter() {
  return (
    <footer className="landing-footer">
      <div className="footer-container">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div className="landing-brand-badge" style={{ width: '30px', height: '30px' }}>
            <Shield size={16} />
          </div>
          <div>
            <div style={{ fontWeight: '700', color: '#ffffff', fontSize: '1rem' }}>FraudGuard AI</div>
            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>AI-powered transaction intelligence for safer digital payments.</div>
          </div>
        </div>

        <div className="footer-links">
          <Link to="/app/safety-center" className="footer-link">Safety Center</Link>
          <a href="#privacy" onClick={(e) => { e.preventDefault(); alert('FraudGuard AI Privacy Guarantee: We never store or access banking passwords, UPI PINs, OTPs, or CVVs.'); }} className="footer-link">Privacy</a>
          <a href="#security" onClick={(e) => { e.preventDefault(); alert('Security: All data models run on zero-knowledge client telemetry & secure encrypted REST pipelines.'); }} className="footer-link">Security</a>
          <a href="#terms" onClick={(e) => { e.preventDefault(); alert('Terms of Service: FraudGuard AI provides educational heuristics and behavioral risk analysis for personal payment protection.'); }} className="footer-link">Terms</a>
          <a href="mailto:support@fraudguard.ai" className="footer-link">Contact</a>
        </div>
      </div>
      <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '0.75rem', color: '#475569' }}>
        © {new Date().getFullYear()} FraudGuard AI. Designed for Indian Digital Payments & Gen-Z Financial Safety.
      </div>
    </footer>
  );
}
