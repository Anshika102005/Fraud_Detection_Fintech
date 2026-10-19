import React, { useState } from 'react';
import { SAFETY_TOPICS } from '../../data/indianData';
import {
  LifeBuoy,
  Shield,
  Smartphone,
  QrCode,
  MailWarning,
  PhoneCall,
  FileCheck,
  Monitor,
  Briefcase,
  TrendingUp,
  ShieldAlert,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

export default function SafetyCenter() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [expandedId, setExpandedId] = useState(SAFETY_TOPICS[0].id);

  const categories = ['ALL', 'UPI & Mobile', 'QR & In-Store', 'Web & Messaging', 'Call & Social', 'Device Security', 'Jobs & Investment'];

  const filteredTopics = SAFETY_TOPICS.filter((t) => {
    const matchesSearch =
      t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.tagline.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.whatIsIt.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = selectedCategory === 'ALL' || t.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getTopicIcon = (id) => {
    switch (id) {
      case 'upi-scams': return <Smartphone size={20} />;
      case 'qr-code-scams': return <QrCode size={20} />;
      case 'phishing': return <MailWarning size={20} />;
      case 'fake-customer-care': return <PhoneCall size={20} />;
      case 'fake-payment-screenshots': return <FileCheck size={20} />;
      case 'remote-access-scams': return <Monitor size={20} />;
      case 'fake-jobs': return <Briefcase size={20} />;
      case 'investment-scams': return <TrendingUp size={20} />;
      case 'digital-impersonation': return <ShieldAlert size={20} />;
      default: return <Shield size={20} />;
    }
  };

  return (
    <div className="page-container" style={{ padding: '24px' }}>
      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: '800', color: '#ffffff', fontFamily: 'Plus Jakarta Sans', margin: '0 0 6px 0' }}>
          FraudGuard Safety Center
        </h1>
        <p style={{ margin: 0, fontSize: '0.9rem', color: '#94a3b8' }}>
          Educational encyclopedia detailing common social engineering attacks targeting Indian digital payment users.
        </p>
      </div>

      {/* Search & Category Pills */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#111827', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '10px 16px', maxWidth: '480px' }}>
          <Search size={18} style={{ color: '#64748b' }} />
          <input
            type="text"
            placeholder="Search scams, UPI collect, APKs, fake calls..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '0.9rem', width: '100%', outline: 'none' }}
          />
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              style={{
                background: selectedCategory === cat ? '#2563eb' : 'rgba(255,255,255,0.04)',
                border: '1px solid ' + (selectedCategory === cat ? '#3b82f6' : 'rgba(255,255,255,0.08)'),
                color: selectedCategory === cat ? '#fff' : '#94a3b8',
                borderRadius: '8px',
                padding: '6px 14px',
                fontSize: '0.8rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Topics Accordion List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {filteredTopics.map((topic) => {
          const isExpanded = expandedId === topic.id;

          return (
            <div
              key={topic.id}
              style={{
                background: '#111827',
                border: isExpanded ? '1px solid rgba(59, 130, 246, 0.4)' : '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '16px',
                overflow: 'hidden',
                transition: 'all 0.2s ease',
              }}
            >
              {/* Header Bar */}
              <div
                onClick={() => setExpandedId(isExpanded ? null : topic.id)}
                style={{
                  padding: '20px 24px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer',
                  background: isExpanded ? 'rgba(59, 130, 246, 0.05)' : 'transparent',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '10px',
                      background: 'rgba(59, 130, 246, 0.12)',
                      color: '#60a5fa',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {getTopicIcon(topic.id)}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.72rem', color: '#f59e0b', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.04em' }}>
                      {topic.category}
                    </div>
                    <div style={{ fontSize: '1.15rem', fontWeight: '700', color: '#ffffff' }}>
                      {topic.title}
                    </div>
                    <div style={{ fontSize: '0.825rem', color: '#94a3b8' }}>
                      {topic.tagline}
                    </div>
                  </div>
                </div>

                <div style={{ color: '#94a3b8' }}>
                  {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </div>
              </div>

              {/* Expanded Content */}
              {isExpanded && (
                <div style={{ padding: '0 24px 24px 24px', borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px' }}>
                    {/* What is it? */}
                    <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#60a5fa', textTransform: 'uppercase', marginBottom: '6px' }}>
                        What is it?
                      </div>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: '#cbd5e1', lineHeight: '1.55' }}>
                        {topic.whatIsIt}
                      </p>
                    </div>

                    {/* How it works */}
                    <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#60a5fa', textTransform: 'uppercase', marginBottom: '6px' }}>
                        How it works
                      </div>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: '#cbd5e1', lineHeight: '1.55' }}>
                        {topic.howItWorks}
                      </p>
                    </div>
                  </div>

                  {/* Warning Signs */}
                  <div style={{ marginTop: '20px', background: 'rgba(245, 158, 11, 0.05)', border: '1px solid rgba(245, 158, 11, 0.2)', padding: '16px', borderRadius: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', fontWeight: '700', color: '#f59e0b', textTransform: 'uppercase', marginBottom: '8px' }}>
                      <AlertTriangle size={15} />
                      <span>Warning Signs</span>
                    </div>
                    <ul style={{ margin: 0, paddingLeft: '20px', color: '#cbd5e1', fontSize: '0.85rem', lineHeight: '1.6' }}>
                      {topic.warningSigns.map((w, i) => (
                        <li key={i}>{w}</li>
                      ))}
                    </ul>
                  </div>

                  {/* What to do & What NOT to do */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px' }}>
                    {/* What to do */}
                    <div style={{ background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '16px', borderRadius: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', fontWeight: '700', color: '#10b981', textTransform: 'uppercase', marginBottom: '8px' }}>
                        <CheckCircle2 size={15} />
                        <span>What You Should Do</span>
                      </div>
                      <ul style={{ margin: 0, paddingLeft: '20px', color: '#cbd5e1', fontSize: '0.85rem', lineHeight: '1.6' }}>
                        {topic.whatToDo.map((todo, i) => (
                          <li key={i}>{todo}</li>
                        ))}
                      </ul>
                    </div>

                    {/* What NOT to do */}
                    <div style={{ background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '16px', borderRadius: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', fontWeight: '700', color: '#ef4444', textTransform: 'uppercase', marginBottom: '8px' }}>
                        <XCircle size={15} />
                        <span>What You Should NOT Do</span>
                      </div>
                      <ul style={{ margin: 0, paddingLeft: '20px', color: '#cbd5e1', fontSize: '0.85rem', lineHeight: '1.6' }}>
                        {topic.whatNotToDo.map((notDo, i) => (
                          <li key={i}>{notDo}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
