import React, { useState } from 'react';
import { ApplicationRecord, UserProfile } from '../types';
import { 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Sparkles, 
  Building, 
  MapPin, 
  ShieldAlert,
  Send,
  HelpCircle,
  Check,
  ArrowRight
} from 'lucide-react';

interface PendingApprovalsViewProps {
  applications: ApplicationRecord[];
  onApproveApplication: (appId: string, customAnswer?: string) => void;
  onRejectApplication: (appId: string, reason?: string) => void;
  profile: UserProfile;
}

export const PendingApprovalsView: React.FC<PendingApprovalsViewProps> = ({
  applications,
  onApproveApplication,
  onRejectApplication,
  profile
}) => {
  const pendingApps = applications.filter(app => app.status === 'Approval Required');
  const [activeApp, setActiveApp] = useState<ApplicationRecord | null>(pendingApps[0] || null);
  const [customInputValue, setCustomInputValue] = useState<string>('');
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const selectedApp = activeApp || pendingApps[0] || null;

  const handleApprove = (appId: string) => {
    onApproveApplication(appId, customInputValue.trim() || undefined);
    setActionNotice('✅ Application authorized and moved to Ready to Apply!');
    setTimeout(() => {
      setActionNotice(null);
      setCustomInputValue('');
      const remaining = pendingApps.filter(a => a.id !== appId);
      setActiveApp(remaining[0] || null);
    }, 1200);
  };

  const handleDecline = (appId: string) => {
    onRejectApplication(appId, 'Candidate declined authorization.');
    setActionNotice('⚠️ Application declined and marked as Skipped.');
    setTimeout(() => {
      setActionNotice(null);
      setCustomInputValue('');
      const remaining = pendingApps.filter(a => a.id !== appId);
      setActiveApp(remaining[0] || null);
    }, 1200);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Top Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.02em' }}>
            Human-in-the-Loop (HITL) Approval Queue
          </h2>
          <p style={{ color: 'var(--foreground-muted)', fontSize: '0.9rem' }}>
            Under Platform Safety Rule 10, applications requiring sensitive declarations, salary CTC expectations, or relocation commitments pause for your explicit consent.
          </p>
        </div>
      </div>

      {actionNotice && (
        <div style={{
          padding: '0.85rem 1.25rem',
          borderRadius: 8,
          fontSize: '0.875rem',
          fontWeight: 600,
          background: actionNotice.startsWith('✅') ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
          color: actionNotice.startsWith('✅') ? '#34d399' : '#fbbf24',
          border: `1px solid ${actionNotice.startsWith('✅') ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`
        }}>
          {actionNotice}
        </div>
      )}

      {pendingApps.length === 0 ? (
        <div className="glass-card" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
          <div style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.35)',
            color: '#34d399',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.25rem auto'
          }}>
            <CheckCircle2 size={36} />
          </div>
          <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#f8fafc', marginBottom: '0.5rem' }}>
            All Approvals Cleared!
          </h3>
          <p style={{ color: 'var(--foreground-muted)', fontSize: '0.925rem', maxWidth: '480px', margin: '0 auto' }}>
            There are currently no applications waiting for human authorization. All qualified roles have been prepared or verified.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1.3fr', gap: '1.5rem' }}>
          {/* Left Column: List of Roles Paused */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--foreground-dim)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Pending Roles ({pendingApps.length})
            </div>

            {pendingApps.map(app => {
              const isSelected = selectedApp?.id === app.id;
              return (
                <div
                  key={app.id}
                  onClick={() => {
                    setActiveApp(app);
                    setCustomInputValue('');
                  }}
                  className={`glass-card ${isSelected ? 'glass-card-glow' : ''}`}
                  style={{
                    cursor: 'pointer',
                    padding: '1.1rem 1.25rem',
                    borderColor: isSelected ? 'rgba(245, 158, 11, 0.6)' : undefined,
                    background: isSelected ? 'rgba(245, 158, 11, 0.05)' : undefined
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.4rem' }}>
                    <div>
                      <h4 style={{ fontWeight: 800, fontSize: '0.95rem', color: '#f8fafc' }}>{app.jobTitle}</h4>
                      <span style={{ fontSize: '0.825rem', color: '#818cf8', fontWeight: 600 }}>{app.company}</span>
                    </div>
                    <span className="score-badge high">{app.matchScore}% Fit</span>
                  </div>

                  <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.775rem', color: 'var(--foreground-muted)', marginTop: '0.4rem' }}>
                    <span><MapPin size={11} style={{ display: 'inline', marginRight: 3 }} /> {app.location}</span>
                    <span>•</span>
                    <span style={{ color: '#fbbf24', fontWeight: 600 }}>
                      Requires {app.pendingApprovalQuestion?.category || 'Authorization'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Column: Active Inspector */}
          {selectedApp && (
            <div className="glass-card" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', border: '1px solid var(--border-glow)' }}>
              <div>
                {/* Header */}
                <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <span className="tag-pill primary">{selectedApp.platform}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--foreground-dim)' }}>ID: {selectedApp.id}</span>
                  </div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc' }}>{selectedApp.jobTitle}</h3>
                  <div style={{ fontSize: '0.9rem', color: '#818cf8', fontWeight: 600 }}>{selectedApp.company}</div>
                </div>

                {/* Sensitive Trigger Box */}
                <div style={{
                  background: 'rgba(245, 158, 11, 0.08)',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  borderRadius: 'var(--radius)',
                  padding: '1.15rem',
                  marginBottom: '1.25rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#fbbf24', fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                    <AlertTriangle size={16} /> Sensitive Declaration Required: {selectedApp.pendingApprovalQuestion?.category || 'Salary'}
                  </div>

                  <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#f8fafc', marginBottom: '0.5rem' }}>
                    "{selectedApp.pendingApprovalQuestion?.questionText || 'Confirm target CTC and work authorization.'}"
                  </div>

                  <div style={{ fontSize: '0.8rem', color: 'var(--foreground-muted)', lineHeight: 1.4 }}>
                    Suggested Answer from Profile: <strong style={{ color: '#34d399' }}>₹{(profile.minExpectedSalary / 100000).toFixed(1)} LPA (Expected Minimum)</strong> • Notice Period: <strong style={{ color: '#fff' }}>{profile.noticePeriodDays} Days</strong>
                  </div>
                </div>

                {/* Custom Answer Input */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <label className="input-label">Custom Answer or Instructions (Optional)</label>
                  <input
                    type="text"
                    className="form-input"
                    value={customInputValue}
                    onChange={e => setCustomInputValue(e.target.value)}
                    placeholder={`e.g. Confirm ₹${(profile.minExpectedSalary / 100000).toFixed(1)} LPA or leave blank to use verified answer`}
                  />
                  <span style={{ fontSize: '0.725rem', color: 'var(--foreground-dim)', marginTop: '0.25rem', display: 'block' }}>
                    If left blank, the system submits the verified candidate profile data.
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button
                  onClick={() => handleDecline(selectedApp.id)}
                  className="btn-secondary"
                  style={{ color: '#fda4af' }}
                >
                  <XCircle size={15} /> Decline & Skip Role
                </button>

                <button
                  onClick={() => handleApprove(selectedApp.id)}
                  className="btn-primary"
                  style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}
                >
                  <Check size={16} /> Authorize & Prepare Application
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
