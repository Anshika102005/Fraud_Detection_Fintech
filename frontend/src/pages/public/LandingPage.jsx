import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import LandingNavbar from '../../components/layout/LandingNavbar';
import LandingFooter from '../../components/layout/LandingFooter';
import {
  Shield,
  ShieldAlert,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Zap,
  Activity,
  Smartphone,
  QrCode,
  Lock,
  SearchCode,
  FileText,
  BarChart3,
  TrendingUp,
  BrainCircuit,
  AlertTriangle,
  HelpCircle,
  ChevronRight,
  ArrowDown,
  UserCheck,
  Eye,
  Sliders,
  ShieldCheck,
  Compass,
  Layers,
  Database,
  Briefcase,
  ExternalLink
} from 'lucide-react';

export default function LandingPage() {
  const navigate = useNavigate();

  // No role selection or auto-login from the marketing page — users must
  // authenticate on the sign-in page, where the role is resolved.
  const goToSignIn = () => navigate('/login');

  const indiaFraudCategories = [
    { title: 'UPI Fraud', tag: 'High Volume', desc: 'Fraudulent collect requests, VPA impersonation, and fraudulent payment links.', cases: '46% of cases' },
    { title: 'QR Code Scams', tag: 'Visual Deception', desc: 'Fake static merchant QR codes or tricking users to scan QR to "receive" funds.', cases: '24% of cases' },
    { title: 'Phishing', tag: 'Credential Theft', desc: 'Deceptive SMS/WhatsApp messages with malicious bank clone websites.', cases: '18% of cases' },
    { title: 'Fake Customer Care', tag: 'Impersonation', desc: 'Spoofed helpline numbers on search engines tricking users into transfers.', cases: '12% of cases' },
    { title: 'Fake Payment Screenshots', tag: 'P2P Scam', desc: 'Altered payment confirmation images claiming money has been sent.', cases: '10% of cases' },
    { title: 'Investment Scams', tag: 'Task & Crypto', desc: 'Ponzi and bogus crypto schemes promising guaranteed daily high returns.', cases: '14% of cases' },
    { title: 'Fake Job Scams', tag: 'Work From Home', desc: 'Paid rating tasks or fake international employment requiring deposit fees.', cases: '8% of cases' },
    { title: 'Remote Access Scams', tag: 'Device Takeover', desc: 'Tricking users into installing AnyDesk, TeamViewer, or screen sharing tools.', cases: '9% of cases' },
    { title: 'Impersonation', tag: 'Social Pressure', desc: 'Digital arrest threats pretending to be police, CBI, or telecom authorities.', cases: '11% of cases' },
  ];

  const howFraudHappens = [
    { step: '01', title: 'Phishing', desc: 'Fake links and websites attempt to steal personal and payment information.', icon: Lock },
    { step: '02', title: 'UPI Scams', desc: 'Fraudsters manipulate users into approving suspicious payment requests.', icon: Smartphone },
    { step: '03', title: 'QR Scams', desc: 'Users may be tricked into scanning malicious or unexpected QR codes.', icon: QrCode },
    { step: '04', title: 'Fake Customer Care', desc: 'Fraudsters impersonate legitimate bank or e-commerce support representatives.', icon: HelpCircle },
    { step: '05', title: 'Fake Payment Screenshots', desc: 'Fraudsters provide fake proof of payment to manipulate sellers into releasing goods.', icon: FileText },
    { step: '06', title: 'Remote Access', desc: 'Users may be tricked into installing remote-access applications like screen mirror tools.', icon: Eye },
    { step: '07', title: 'Fake Jobs', desc: 'Scammers request money or personal information through fake work-from-home opportunities.', icon: Briefcase },
    { step: '08', title: 'Investment Scams', desc: 'Fraudulent schemes promise unrealistic returns through high-yield bogus platforms.', icon: TrendingUp },
  ];

  const featureList = [
    { icon: BrainCircuit, title: 'AI Fraud Detection', desc: 'Machine learning algorithms continuously inspect transaction velocity, amount variance, and unusual timestamps.' },
    { icon: ShieldAlert, title: 'Risk Analysis', desc: 'Multi-dimensional risk scoring evaluating transaction frequency, anomaly severity, and merchant behavior.' },
    { icon: AlertTriangle, title: 'Fraud Alerts', desc: 'Instant high-priority alerts with clear, plain-language explanations of why a transaction was flagged.' },
    { icon: Activity, title: 'Transaction Monitoring', desc: 'Continuous surveillance of incoming and manual payments to detect suspicious spikes in real time.' },
    { icon: BrainCircuit, title: 'Behavior Analysis', desc: 'Builds a personalized baseline of your daily spending habits and flags irregular deviations before charges settle.' },
    { icon: Sparkles, title: 'Explainable AI', desc: 'No black-box decisions. Receive clear, human-readable bullet points explaining the exact risk factors for every flag.' },
    { icon: Shield, title: 'Personal Safety Score', desc: 'A dynamic 0–100 index reflecting your payment hygiene, suspicious flag history, and security profile.' },
    { icon: SearchCode, title: 'Scam Checker', desc: 'Natural language scanner to verify suspicious SMS messages, job offers, or electricity bill cutoff threats.' },
    { icon: TrendingUp, title: 'Spending Insights', desc: 'Smart financial telemetry detailing your top UPI categories, daily habits, and safe payment channels.' },
    { icon: FileText, title: 'Monthly Security Report', desc: 'Comprehensive monthly statements summarizing your total payment volume, deflected scams, and risk hygiene.' },
  ];

  return (
    <div className="landing-wrapper">
      <LandingNavbar />

      {/* ================= 1. HERO SECTION ================= */}
      <section id="home" className="hero-section" style={{ padding: '80px 24px 60px', maxWidth: '1240px', margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '48px', alignItems: 'center' }}>
          <div>
            <div className="hero-tag" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 14px', borderRadius: '9999px', background: 'rgba(59, 130, 246, 0.12)', border: '1px solid rgba(59, 130, 246, 0.3)', color: '#60a5fa', fontSize: '0.85rem', fontWeight: '600', marginBottom: '20px' }}>
              <Sparkles size={15} />
              <span>AI-Powered Personal Fraud Intelligence</span>
            </div>

            <h1 className="hero-title" style={{ fontSize: '2.8rem', fontWeight: '800', color: '#ffffff', lineHeight: '1.18', marginBottom: '20px', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
              Stay One Step Ahead of <span style={{ background: 'linear-gradient(135deg, #60a5fa, #38bdf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Digital Fraud</span>
            </h1>

            <p className="hero-subheading" style={{ fontSize: '1.08rem', color: '#94a3b8', lineHeight: '1.65', marginBottom: '32px' }}>
              FraudGuard AI uses intelligent transaction analysis to help you identify suspicious activity, understand your risk, and stay safer while using digital payments.
            </p>

            <div className="hero-cta-group" style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', marginBottom: '36px' }}>
              <Link to="/login" className="btn-landing-primary" style={{ padding: '13px 30px', fontSize: '1rem', fontWeight: '600' }}>
                <span>Get Started</span>
                <ArrowRight size={18} />
              </Link>
              <a href="#how-it-works" className="btn-landing-secondary" style={{ padding: '13px 26px', fontSize: '0.98rem' }}>
                <span>See How It Works</span>
              </a>
            </div>

            <div className="hero-trust-bar" style={{ display: 'flex', flexWrap: 'wrap', gap: '18px', paddingTop: '16px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#cbd5e1' }}>
                <CheckCircle2 size={16} style={{ color: '#10b981' }} />
                <span>Zero Bank Credentials Required</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#cbd5e1' }}>
                <CheckCircle2 size={16} style={{ color: '#10b981' }} />
                <span>Explainable AI Risk Engine</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#cbd5e1' }}>
                <CheckCircle2 size={16} style={{ color: '#10b981' }} />
                <span>Privacy-First Architecture</span>
              </div>
            </div>
          </div>

          {/* Sophisticated AI Fraud-Monitoring Visualization (Pipeline: Transaction -> AI Analysis -> Risk Detection -> Fraud Alert) */}
          <div className="hero-visual">
            <div style={{ background: '#0f172a', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '20px', padding: '24px', boxShadow: '0 20px 45px rgba(0, 0, 0, 0.6)', position: 'relative' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', paddingBottom: '14px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Shield size={20} style={{ color: '#3b82f6' }} />
                  <span style={{ fontWeight: '700', fontSize: '0.92rem', color: '#ffffff' }}>AI Fraud Detection Pipeline</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#10b981', fontWeight: '600', background: 'rgba(16, 185, 129, 0.12)', padding: '4px 10px', borderRadius: '9999px' }}>
                  <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                  Monitoring Active
                </div>
              </div>

              {/* Step 1: Transaction */}
              <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px', padding: '12px 14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: '700', color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '0.04em' }}>1. Payment Event Ingested</span>
                  <span style={{ fontSize: '0.9rem', fontWeight: '800', color: '#ffffff' }}>₹14,500</span>
                </div>
                <div style={{ fontSize: '0.85rem', fontWeight: '600', color: '#f1f5f9' }}>Unknown P2P UPI Collect Request</div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Merchant: paytm-support-agent@okaxis • Device: Android</div>
              </div>

              {/* Down Arrow */}
              <div style={{ textAlign: 'center', padding: '8px 0', color: '#60a5fa' }}>
                <ArrowDown size={18} style={{ margin: '0 auto', display: 'block' }} />
              </div>

              {/* Step 2: AI Analysis */}
              <div style={{ background: 'rgba(59, 130, 246, 0.06)', border: '1px solid rgba(59, 130, 246, 0.25)', borderRadius: '12px', padding: '12px 14px' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: '700', color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '4px' }}>2. AI Behavioral Inspection</div>
                <div style={{ fontSize: '0.78rem', color: '#cbd5e1', lineHeight: '1.4' }}>
                  • Amount is 8.4× higher than customer’s typical median (₹420)<br />
                  • Late-night timestamp (02:41 AM) deviates from daytime activity<br />
                  • Receiver VPA newly registered in different state (Jaipur)
                </div>
              </div>

              {/* Down Arrow */}
              <div style={{ textAlign: 'center', padding: '8px 0', color: '#ef4444' }}>
                <ArrowDown size={18} style={{ margin: '0 auto', display: 'block' }} />
              </div>

              {/* Step 3: Risk Detection */}
              <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '12px', padding: '12px 14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: '700', color: '#f87171', textTransform: 'uppercase', letterSpacing: '0.04em' }}>3. Risk Score Evaluated</span>
                  <span style={{ fontSize: '0.85rem', fontWeight: '800', color: '#ef4444' }}>Risk Level: CRITICAL (94/100)</span>
                </div>
                <div style={{ fontSize: '0.78rem', color: '#cbd5e1' }}>
                  High probability of social engineering UPI collect exploit.
                </div>
              </div>

              {/* Down Arrow */}
              <div style={{ textAlign: 'center', padding: '8px 0', color: '#ef4444' }}>
                <ArrowDown size={18} style={{ margin: '0 auto', display: 'block' }} />
              </div>

              {/* Step 4: Fraud Alert */}
              <div style={{ background: '#7f1d1d', border: '1px solid #ef4444', borderRadius: '12px', padding: '12px 14px', color: '#ffffff' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', marginBottom: '4px' }}>
                  <AlertTriangle size={15} />
                  <span>4. Instant Fraud Alert Dispatched</span>
                </div>
                <div style={{ fontSize: '0.8rem', fontWeight: '600' }}>
                  Action Advised: Do NOT approve request or enter UPI PIN.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= 2. WHAT IS FRAUDGUARD AI? ================= */}
      <section style={{ padding: '70px 24px', background: '#0d1527', borderTop: '1px solid rgba(255, 255, 255, 0.06)', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
        <div style={{ maxWidth: '1240px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', maxWidth: '780px', margin: '0 auto 48px' }}>
            <div style={{ display: 'inline-block', fontSize: '0.78rem', fontWeight: '700', color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>
              About the Platform
            </div>
            <h2 style={{ fontSize: '2.2rem', fontWeight: '800', color: '#ffffff', fontFamily: 'Plus Jakarta Sans', marginBottom: '16px' }}>
              What is FraudGuard AI?
            </h2>
            <p style={{ fontSize: '1.05rem', color: '#cbd5e1', lineHeight: '1.65' }}>
              FraudGuard AI is an AI-powered personal fraud protection and transaction intelligence platform designed to help users understand suspicious transaction behavior and improve digital payment safety.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
            <div style={{ background: '#111827', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '16px', padding: '32px 24px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#60a5fa', marginBottom: '20px' }}>
                <BrainCircuit size={24} />
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#ffffff', marginBottom: '12px', fontFamily: 'Plus Jakarta Sans' }}>
                AI Transaction Analysis
              </h3>
              <p style={{ fontSize: '0.92rem', color: '#94a3b8', lineHeight: '1.6' }}>
                Continuous inspection of payment velocity, amount deviations, time-of-day habits, and unverified merchant VPAs using machine learning models without ever requiring bank credentials.
              </p>
            </div>

            <div style={{ background: '#111827', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '16px', padding: '32px 24px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f59e0b', marginBottom: '20px' }}>
                <Activity size={24} />
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#ffffff', marginBottom: '12px', fontFamily: 'Plus Jakarta Sans' }}>
                Behavioral Risk Detection
              </h3>
              <p style={{ fontSize: '0.92rem', color: '#94a3b8', lineHeight: '1.6' }}>
                Learns baseline spending habits and flags irregular spikes or abnormal payment channels before funds are compromised, protecting users from social engineering manipulation.
              </p>
            </div>

            <div style={{ background: '#111827', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '16px', padding: '32px 24px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981', marginBottom: '20px' }}>
                <ShieldCheck size={24} />
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#ffffff', marginBottom: '12px', fontFamily: 'Plus Jakarta Sans' }}>
                Fraud Awareness
              </h3>
              <p style={{ fontSize: '0.92rem', color: '#94a3b8', lineHeight: '1.6' }}>
                Actionable scam checker tool, dynamic Personal Safety Scores, and educational guidance explaining how modern payment scams operate and how to avoid them.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ================= 3. INDIA FRAUD PROBLEM SECTION ================= */}
      <section style={{ padding: '70px 24px', maxWidth: '1240px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', maxWidth: '800px', margin: '0 auto 48px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', borderRadius: '9999px', background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.25)', color: '#f87171', fontSize: '0.78rem', fontWeight: '700', marginBottom: '12px' }}>
            <AlertTriangle size={14} />
            <span>Digital Payment Threat Landscape</span>
          </div>
          <h2 style={{ fontSize: '2.2rem', fontWeight: '800', color: '#ffffff', fontFamily: 'Plus Jakarta Sans', marginBottom: '14px' }}>
            Digital Fraud Is Growing. Awareness Should Too.
          </h2>
          <div style={{ fontSize: '1.1rem', fontWeight: '600', color: '#60a5fa', marginBottom: '8px' }}>
            Cases Related to Fraud Transactions in India
          </div>
          <p style={{ fontSize: '0.92rem', color: '#94a3b8' }}>
            As UPI and contactless payments become ubiquitous across India, deceptive social engineering attacks increasingly target users directly.
          </p>
          <div style={{ marginTop: '10px', display: 'inline-block', fontSize: '0.75rem', color: '#e2e8f0', background: 'rgba(255,255,255,0.06)', padding: '3px 10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)' }}>
            Illustrative / Demo Data
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '20px' }}>
          {indiaFraudCategories.map((item, i) => (
            <div key={i} style={{ background: '#111827', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '14px', padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: '700', color: '#f59e0b', background: 'rgba(245, 158, 11, 0.12)', padding: '3px 8px', borderRadius: '4px' }}>
                    {item.tag}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: '600' }}>
                    {item.cases}
                  </span>
                </div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#ffffff', marginBottom: '8px' }}>
                  {item.title}
                </h3>
                <p style={{ fontSize: '0.85rem', color: '#94a3b8', lineHeight: '1.5', margin: 0 }}>
                  {item.desc}
                </p>
              </div>
              <div style={{ marginTop: '14px', paddingTop: '10px', borderTop: '1px solid rgba(255, 255, 255, 0.05)', fontSize: '0.72rem', color: '#64748b' }}>
                Pattern tracked by FraudGuard AI Engine
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ================= 4. HOW FRAUD HAPPENS (01-08 GRID) ================= */}
      <section id="how-it-works" style={{ padding: '70px 24px', background: '#0d1527', borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
        <div style={{ maxWidth: '1240px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', maxWidth: '780px', margin: '0 auto 48px' }}>
            <div style={{ display: 'inline-block', fontSize: '0.78rem', fontWeight: '700', color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>
              Educational Walkthrough
            </div>
            <h2 style={{ fontSize: '2.2rem', fontWeight: '800', color: '#ffffff', fontFamily: 'Plus Jakarta Sans', marginBottom: '14px' }}>
              How Does Digital Payment Fraud Happen?
            </h2>
            <p style={{ fontSize: '0.98rem', color: '#94a3b8', lineHeight: '1.6' }}>
              Modern fraud rarely compromises core banking security. Instead, fraudsters deceive users through urgency, false trust, or technical disguise.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '22px', marginBottom: '40px' }}>
            {howFraudHappens.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.step} style={{ background: '#111827', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '14px', padding: '22px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <span style={{ fontSize: '1.25rem', fontWeight: '800', color: '#3b82f6', fontFamily: 'Plus Jakarta Sans' }}>
                      {item.step}
                    </span>
                    <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#60a5fa' }}>
                      <Icon size={18} />
                    </div>
                  </div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: '#ffffff', marginBottom: '8px' }}>
                    {item.title}
                  </h3>
                  <p style={{ fontSize: '0.85rem', color: '#94a3b8', lineHeight: '1.5', margin: 0 }}>
                    {item.desc}
                  </p>
                </div>
              );
            })}
          </div>

          <div style={{ textAlign: 'center' }}>
            <Link to="/app/safety-center" className="btn-landing-primary" style={{ padding: '12px 28px' }}>
              <span>Learn How To Stay Safe</span>
              <ChevronRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      {/* ================= 5. WHAT CAN FRAUDGUARD AI DO? (10 FEATURES) ================= */}
      <section id="features" style={{ padding: '70px 24px', maxWidth: '1240px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', maxWidth: '780px', margin: '0 auto 48px' }}>
          <div style={{ display: 'inline-block', fontSize: '0.78rem', fontWeight: '700', color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>
            Intelligent Protection Matrix
          </div>
          <h2 style={{ fontSize: '2.2rem', fontWeight: '800', color: '#ffffff', fontFamily: 'Plus Jakarta Sans', marginBottom: '14px' }}>
            How FraudGuard AI Protects You
          </h2>
          <p style={{ fontSize: '0.98rem', color: '#94a3b8' }}>
            Ten integrated layers of transaction intelligence tailored for modern digital payment hygiene.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '22px' }}>
          {featureList.map((feat, i) => {
            const Icon = feat.icon;
            return (
              <div key={i} style={{ background: '#111827', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '14px', padding: '22px', transition: 'transform 0.2s ease, border-color 0.2s ease' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#60a5fa', marginBottom: '16px' }}>
                  <Icon size={20} />
                </div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: '#ffffff', marginBottom: '8px' }}>
                  {feat.title}
                </h3>
                <p style={{ fontSize: '0.85rem', color: '#94a3b8', lineHeight: '1.55', margin: 0 }}>
                  {feat.desc}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ================= 6. CUSTOMER + ANALYST EXPLANATION (TWO ROLES ONLY) ================= */}
      <section style={{ padding: '70px 24px', background: '#0b1120', borderTop: '1px solid rgba(255, 255, 255, 0.08)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
        <div style={{ maxWidth: '1240px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', maxWidth: '780px', margin: '0 auto 48px' }}>
            <div style={{ display: 'inline-block', fontSize: '0.78rem', fontWeight: '700', color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>
              Dual Experience
            </div>
            <h2 style={{ fontSize: '2.2rem', fontWeight: '800', color: '#ffffff', fontFamily: 'Plus Jakarta Sans', marginBottom: '14px' }}>
              One Platform. Two Perspectives.
            </h2>
            <p style={{ fontSize: '1rem', color: '#94a3b8' }}>
              FraudGuard AI serves both end-users managing their day-to-day payments and risk analysts investigating fraud patterns across the network.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '32px' }}>
            {/* Customer Card */}
            <div style={{ background: '#111827', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '20px', padding: '36px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxShadow: '0 10px 30px rgba(0,0,0,0.4)' }}>
              <div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', borderRadius: '9999px', background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', marginBottom: '16px' }}>
                  <UserCheck size={14} />
                  <span>Customer Workspace</span>
                </div>
                <h3 style={{ fontSize: '1.6rem', fontWeight: '800', color: '#ffffff', marginBottom: '8px', fontFamily: 'Plus Jakarta Sans' }}>
                  CUSTOMER
                </h3>
                <p style={{ fontSize: '1rem', color: '#38bdf8', fontWeight: '600', marginBottom: '20px' }}>
                  "Protect your personal digital payments."
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '32px' }}>
                  {[
                    'Personal dashboard',
                    'Transactions',
                    'Add transaction',
                    'CSV upload',
                    'Fraud alerts',
                    'Risk analysis',
                    'Analytics',
                    'Scam checker',
                    'Safety center',
                    'Safety score',
                    'Monthly report',
                  ].map((feat, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.88rem', color: '#cbd5e1' }}>
                      <CheckCircle2 size={16} style={{ color: '#10b981', flexShrink: 0 }} />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={goToSignIn}
                className="btn-landing-primary"
                style={{ width: '100%', padding: '14px 20px', justifyContent: 'center', fontSize: '1rem' }}
              >
                <span>Explore Customer Experience</span>
                <ArrowRight size={18} />
              </button>
            </div>

            {/* Analyst Card */}
            <div style={{ background: '#111827', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '20px', padding: '36px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxShadow: '0 10px 30px rgba(0,0,0,0.4)' }}>
              <div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', borderRadius: '9999px', background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', marginBottom: '16px' }}>
                  <ShieldAlert size={14} />
                  <span>Analyst Workspace</span>
                </div>
                <h3 style={{ fontSize: '1.6rem', fontWeight: '800', color: '#ffffff', marginBottom: '8px', fontFamily: 'Plus Jakarta Sans' }}>
                  ANALYST
                </h3>
                <p style={{ fontSize: '1rem', color: '#f87171', fontWeight: '600', marginBottom: '20px' }}>
                  "Monitor fraud patterns and investigate suspicious activity."
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '32px' }}>
                  {[
                    'Fraud intelligence dashboard',
                    'Transaction monitoring',
                    'Fraud incidents',
                    'Risk analysis',
                    'Users & accounts',
                    'Macro analytics',
                    'Model performance',
                    'Security settings',
                  ].map((feat, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.88rem', color: '#cbd5e1' }}>
                      <CheckCircle2 size={16} style={{ color: '#ef4444', flexShrink: 0 }} />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={goToSignIn}
                style={{
                  width: '100%',
                  padding: '14px 20px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #b91c1c, #ef4444)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#ffffff',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 14px rgba(239, 68, 68, 0.3)',
                  transition: 'all 0.2s ease',
                }}
              >
                <span>Explore Analyst Experience</span>
                <ArrowRight size={18} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ================= 7. ABOUT & TRUST SECTION ================= */}
      <section id="about" style={{ padding: '70px 24px', maxWidth: '1240px', margin: '0 auto' }}>
        <div style={{ background: '#111827', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '20px', padding: '40px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '36px', alignItems: 'center' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', fontWeight: '700', color: '#10b981', textTransform: 'uppercase', marginBottom: '12px' }}>
              <ShieldCheck size={16} />
              <span>Zero Credential Risk</span>
            </div>
            <h3 style={{ fontSize: '1.8rem', fontWeight: '800', color: '#ffffff', fontFamily: 'Plus Jakarta Sans', marginBottom: '14px' }}>
              Security Without Compromise
            </h3>
            <p style={{ fontSize: '0.95rem', color: '#cbd5e1', lineHeight: '1.65', marginBottom: '20px' }}>
              FraudGuard AI strictly inspects transaction patterns, timestamps, amount variance, and merchant reputations. We never ask for your banking passwords, UPI PINs, OTPs, or debit card CVVs.
            </p>
            <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
              <Link to="/login" className="btn-landing-primary">
                <span>Start Free Protection</span>
                <ArrowRight size={16} />
              </Link>
              <Link to="/app/safety-center" className="btn-landing-secondary">
                <span>Safety Center</span>
              </Link>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '16px' }}>
              <div style={{ fontSize: '0.9rem', fontWeight: '700', color: '#ffffff', marginBottom: '4px' }}>
                Non-Custodial Telemetry
              </div>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                Your payment data stays private. You decide whether to add entries manually, upload batch CSV files, or inspect risk heuristics.
              </div>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '16px' }}>
              <div style={{ fontSize: '0.9rem', fontWeight: '700', color: '#ffffff', marginBottom: '4px' }}>
                Dedicated to Indian Payment Realities
              </div>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                Fine-tuned to recognize the distinct anatomy of Indian digital attacks: UPI collect exploits, QR scams, and phishing SMS messages.
              </div>
            </div>
          </div>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}

