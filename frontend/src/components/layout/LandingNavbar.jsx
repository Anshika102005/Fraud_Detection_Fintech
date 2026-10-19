import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, ArrowRight, Lock } from 'lucide-react';

export default function LandingNavbar() {
  return (
    <header className="landing-header">
      <div className="landing-nav-container">
        <Link to="/" className="landing-brand">
          <div className="landing-brand-badge">
            <Shield size={22} />
          </div>
          <div>
            <div style={{ fontSize: '1.2rem', fontWeight: '800', color: '#ffffff', lineHeight: '1.1' }}>
              FraudGuard AI
            </div>
            <div style={{ fontSize: '0.62rem', fontWeight: '700', color: '#60a5fa', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              AI-POWERED FRAUD PROTECTION
            </div>
          </div>
        </Link>

        <nav className="landing-nav-links">
          <a href="#home" className="landing-nav-link">Home</a>
          <a href="#how-it-works" className="landing-nav-link">How It Works</a>
          <a href="#features" className="landing-nav-link">Fraud Protection</a>
          <a href="#safety-center" className="landing-nav-link">Safety Center</a>
          <a href="#about" className="landing-nav-link">About</a>
        </nav>

        <div className="landing-nav-actions">
          <Link to="/login" className="btn-landing-secondary">
            <Lock size={15} />
            <span>Login</span>
          </Link>
          <Link to="/login" className="btn-landing-primary">
            <span>Get Started</span>
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </header>
  );
}
