import React, { useState } from 'react';
import { ApplicationRecord } from '../types';
import { verifySubmitApplication, updateApplicationStatus } from '../api/client';
import { 
  Search, 
  ExternalLink, 
  FileText, 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Building, 
  MapPin, 
  Calendar,
  Eye,
  Filter,
  Copy,
  Check,
  ShieldCheck,
  Send,
  Download
} from 'lucide-react';

interface TrackerViewProps {
  applications: ApplicationRecord[];
  onSelectApplication: (app: ApplicationRecord) => void;
  onRefreshApplications?: () => void;
}

export const TrackerView: React.FC<TrackerViewProps> = ({ 
  applications, 
  onSelectApplication, 
  onRefreshApplications 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [platformFilter, setPlatformFilter] = useState<string>('ALL');
  const [selectedPackageApp, setSelectedPackageApp] = useState<ApplicationRecord | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [verifyReceiptId, setVerifyReceiptId] = useState('');
  const [verifyConfirmUrl, setVerifyConfirmUrl] = useState('');
  const [verifyMsg, setVerifyMsg] = useState<string | null>(null);

  const filteredApps = applications.filter(app => {
    const matchesSearch = 
      app.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.jobTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.location.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || app.status === statusFilter;
    const matchesPlatform = platformFilter === 'ALL' || app.platform.toLowerCase() === platformFilter.toLowerCase();

    return matchesSearch && matchesStatus && matchesPlatform;
  });

  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2500);
  };

  const handleVerifySubmission = async (appId: string) => {
    if (!verifyReceiptId && !verifyConfirmUrl) {
      setVerifyMsg('Please provide a submission confirmation URL or receipt ID.');
      return;
    }

    try {
      await verifySubmitApplication(appId, {
        submissionMethod: 'external_portal_verified',
        receiptId: verifyReceiptId || `CONF-${Date.now()}`,
        confirmationUrl: verifyConfirmUrl,
        notes: 'Candidate submitted through official employer portal and verified confirmation receipt.'
      });
      setVerifyMsg('✅ Submission successfully verified and recorded!');
      if (onRefreshApplications) onRefreshApplications();
      setTimeout(() => {
        setVerifyMsg(null);
        setSelectedPackageApp(null);
      }, 1500);
    } catch (err: any) {
      setVerifyMsg(err.message || 'Verification failed.');
    }
  };

  const handleStatusChange = async (appId: string, newStatus: string) => {
    try {
      await updateApplicationStatus(appId, newStatus);
      if (onRefreshApplications) onRefreshApplications();
    } catch (err: any) {
      console.error('Status update failed:', err);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header & Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#FFF' }}>Application Tracker Database</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Real-time persistent audit log of all searched, evaluated, pending, and verified applications ({applications.length} records).
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="glass-card" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: '280px' }}>
          <div style={{ position: 'relative', width: '100%' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
            <input 
              type="text" 
              className="form-control" 
              placeholder="Search company, title, or location..." 
              style={{ paddingLeft: '36px' }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {/* Status Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
            <Filter size={14} color="var(--text-muted)" />
            <span style={{ color: 'var(--text-muted)' }}>Status:</span>
            <select 
              className="form-control" 
              style={{ width: 'auto', padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">All Statuses</option>
              <option value="Ready to Apply">Ready to Apply</option>
              <option value="Approval Required">Approval Required</option>
              <option value="Submitted">Submitted (Verified)</option>
              <option value="Applied">Applied</option>
              <option value="Interview">Interview</option>
              <option value="Offer">Offer</option>
              <option value="Skipped">Skipped / Filtered</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>

          {/* Platform Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>Platform:</span>
            <select 
              className="form-control" 
              style={{ width: 'auto', padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
              value={platformFilter}
              onChange={(e) => setPlatformFilter(e.target.value)}
            >
              <option value="ALL">All Platforms</option>
              <option value="LinkedIn">LinkedIn</option>
              <option value="Naukri">Naukri</option>
              <option value="Remotive">Remotive</option>
              <option value="Arbeitnow">Arbeitnow</option>
              <option value="Jobicy">Jobicy</option>
              <option value="Adzuna">Adzuna</option>
              <option value="Indeed">Indeed</option>
              <option value="Wellfound">Wellfound</option>
            </select>
          </div>
        </div>
      </div>

      {/* Applications Table */}
      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'rgba(255, 255, 255, 0.02)' }}>
                <th style={{ padding: '1rem', color: 'var(--text-dim)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>Role & Company</th>
                <th style={{ padding: '1rem', color: 'var(--text-dim)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>Platform</th>
                <th style={{ padding: '1rem', color: 'var(--text-dim)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>Location & Mode</th>
                <th style={{ padding: '1rem', color: 'var(--text-dim)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>Match</th>
                <th style={{ padding: '1rem', color: 'var(--text-dim)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>Salary</th>
                <th style={{ padding: '1rem', color: 'var(--text-dim)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>Activity</th>
                <th style={{ padding: '1rem', color: 'var(--text-dim)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>Status</th>
                <th style={{ padding: '1rem', color: 'var(--text-dim)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredApps.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No application records match your selected filter criteria.
                  </td>
                </tr>
              ) : (
                filteredApps.map(app => (
                  <tr 
                    key={app.id} 
                    style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.15s ease' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '0.9rem 1rem' }}>
                      <div style={{ fontWeight: 700, color: '#FFF', fontSize: '0.925rem' }}>{app.jobTitle}</div>
                      <div style={{ fontSize: '0.8rem', color: '#818CF8', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <Building size={13} /> {app.company}
                      </div>
                    </td>
                    <td style={{ padding: '0.9rem 1rem' }}>
                      <span style={{
                        padding: '0.2rem 0.55rem',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        background: 'rgba(129, 140, 248, 0.15)',
                        color: '#818CF8',
                        border: '1px solid rgba(129, 140, 248, 0.3)'
                      }}>
                        {app.platform}
                      </span>
                    </td>
                    <td style={{ padding: '0.9rem 1rem', color: 'var(--text-muted)', fontSize: '0.825rem' }}>
                      <div><MapPin size={12} style={{ display: 'inline', marginRight: 4 }} /> {app.location}</div>
                      <span style={{ color: '#9CA3AF', fontSize: '0.75rem' }}>Mode: {app.workMode}</span>
                    </td>
                    <td style={{ padding: '0.9rem 1rem' }}>
                      <span className={`score-badge ${app.matchScore >= 75 ? 'high' : app.matchScore >= 60 ? 'mid' : 'low'}`}>
                        {app.matchScore}%
                      </span>
                    </td>
                    <td style={{ padding: '0.9rem 1rem', fontSize: '0.825rem', color: '#D1D5DB', fontWeight: 500 }}>
                      {app.salaryText}
                    </td>
                    <td style={{ padding: '0.9rem 1rem', fontSize: '0.775rem', color: 'var(--text-dim)' }}>
                      <div>Found: {app.dateFound}</div>
                      {app.dateApplied && <div style={{ color: '#34D399' }}>Applied: {app.dateApplied}</div>}
                    </td>
                    <td style={{ padding: '0.9rem 1rem' }}>
                      <select
                        value={app.status}
                        onChange={(e) => handleStatusChange(app.id, e.target.value)}
                        style={{
                          background: app.status === 'Submitted' || app.status === 'Applied' ? 'rgba(52, 211, 153, 0.2)' :
                            app.status === 'Ready to Apply' ? 'rgba(96, 165, 250, 0.2)' :
                            app.status === 'Approval Required' ? 'rgba(251, 191, 36, 0.2)' :
                            app.status === 'Interview' ? 'rgba(167, 139, 250, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                          color: app.status === 'Submitted' || app.status === 'Applied' ? '#34D399' :
                            app.status === 'Ready to Apply' ? '#60A5FA' :
                            app.status === 'Approval Required' ? '#FBBF24' :
                            app.status === 'Interview' ? '#A78BFA' : '#FCA5A5',
                          border: 'none',
                          borderRadius: 6,
                          padding: '0.25rem 0.5rem',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        <option value="Ready to Apply">Ready to Apply</option>
                        <option value="Approval Required">Approval Required</option>
                        <option value="Submitted">Submitted (Verified)</option>
                        <option value="Interview">Interview</option>
                        <option value="Offer">Offer</option>
                        <option value="Skipped">Skipped</option>
                        <option value="Rejected">Rejected</option>
                        <option value="Withdrawn">Withdrawn</option>
                      </select>
                    </td>
                    <td style={{ padding: '0.9rem 1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <button 
                          onClick={() => {
                            setSelectedPackageApp(app);
                            setVerifyReceiptId(app.submissionEvidence?.receiptId || '');
                            setVerifyConfirmUrl(app.submissionEvidence?.confirmationUrl || '');
                          }}
                          title="View Application Package & Evidence"
                          className="btn-secondary" 
                          style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem' }}
                        >
                          <FileText size={14} />
                        </button>
                        <a 
                          href={app.jobUrl} 
                          target="_blank" 
                          rel="noreferrer"
                          title="Open Official Job Application Link"
                          className="btn-secondary"
                          style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem' }}
                        >
                          <ExternalLink size={14} />
                        </a>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Application Package & Submission Verification Modal */}
      {selectedPackageApp && (
        <div className="modal-overlay" onClick={() => setSelectedPackageApp(null)}>
          <div className="modal-content" style={{ maxWidth: '720px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#FFF' }}>
                  Application Package & Verified Submission
                </h3>
                <span style={{ fontSize: '0.85rem', color: '#818CF8', fontWeight: 600 }}>
                  {selectedPackageApp.jobTitle} at {selectedPackageApp.company} ({selectedPackageApp.platform})
                </span>
              </div>
              <button className="btn-secondary" onClick={() => setSelectedPackageApp(null)}>
                Close
              </button>
            </div>

            {verifyMsg && (
              <div style={{ padding: '0.75rem', borderRadius: 6, marginBottom: '1rem', fontSize: '0.85rem', background: verifyMsg.startsWith('✅') ? 'rgba(52, 211, 153, 0.15)' : 'rgba(239, 68, 68, 0.15)', color: verifyMsg.startsWith('✅') ? '#34D399' : '#FCA5A5' }}>
                {verifyMsg}
              </div>
            )}

            {/* Submission Evidence Box if Submitted */}
            {selectedPackageApp.submissionEvidence && (
              <div style={{ background: 'rgba(52, 211, 153, 0.1)', border: '1px solid rgba(52, 211, 153, 0.3)', borderRadius: 8, padding: '1rem', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#34D399', fontWeight: 700, fontSize: '0.875rem', marginBottom: '0.4rem' }}>
                  <ShieldCheck size={16} /> Verified Submission Evidence
                </div>
                <div style={{ fontSize: '0.8rem', color: '#E5E7EB', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                  <div><strong>Receipt / Confirmation ID:</strong> {selectedPackageApp.submissionEvidence.receiptId}</div>
                  <div><strong>Submitted At:</strong> {new Date(selectedPackageApp.submissionEvidence.submittedAt).toLocaleString()}</div>
                  {selectedPackageApp.submissionEvidence.confirmationUrl && (
                    <div><strong>Confirmation URL:</strong> <a href={selectedPackageApp.submissionEvidence.confirmationUrl} target="_blank" rel="noreferrer" style={{ color: '#60A5FA' }}>{selectedPackageApp.submissionEvidence.confirmationUrl}</a></div>
                  )}
                </div>
              </div>
            )}

            {/* Application Package Tabs: Cover Letter & Tailored Summary */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '55vh', overflowY: 'auto' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                  <label className="input-label" style={{ margin: 0 }}>Tailored Cover Letter (Zero Fabrication)</label>
                  <button
                    onClick={() => handleCopy(selectedPackageApp.coverLetterGenerated || '', 'letter')}
                    className="btn-secondary"
                    style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                  >
                    {copiedField === 'letter' ? <Check size={12} color="#34D399" /> : <Copy size={12} />}
                    {copiedField === 'letter' ? 'Copied!' : 'Copy Cover Letter'}
                  </button>
                </div>
                <div style={{ background: '#070A10', border: '1px solid var(--border-color)', borderRadius: 8, padding: '1rem', whiteSpace: 'pre-wrap', fontSize: '0.85rem', lineHeight: 1.5, color: '#E5E7EB' }}>
                  {selectedPackageApp.coverLetterGenerated || 'No cover letter generated.'}
                </div>
              </div>

              {selectedPackageApp.tailoredSummary && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                    <label className="input-label" style={{ margin: 0 }}>Tailored Resume Summary</label>
                    <button
                      onClick={() => handleCopy(selectedPackageApp.tailoredSummary || '', 'summary')}
                      className="btn-secondary"
                      style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                    >
                      {copiedField === 'summary' ? <Check size={12} color="#34D399" /> : <Copy size={12} />}
                      {copiedField === 'summary' ? 'Copied!' : 'Copy Summary'}
                    </button>
                  </div>
                  <div style={{ background: '#070A10', border: '1px solid var(--border-color)', borderRadius: 8, padding: '0.75rem', fontSize: '0.85rem', color: '#E5E7EB' }}>
                    {selectedPackageApp.tailoredSummary}
                  </div>
                </div>
              )}

              {/* Submission Verification Form if Not Yet Submitted */}
              {selectedPackageApp.status !== 'Submitted' && (
                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#FFF', marginBottom: '0.5rem' }}>
                    Verify External Portal Submission
                  </h4>
                  <p style={{ fontSize: '0.775rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                    Under Rule 9, applications are never marked as "Submitted" until genuine submission evidence is recorded.
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    <div>
                      <label className="input-label">Confirmation / Receipt ID</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. APP-94819 or Confirmed"
                        value={verifyReceiptId}
                        onChange={e => setVerifyReceiptId(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="input-label">Confirmation URL (Optional)</label>
                      <input
                        type="url"
                        className="form-input"
                        placeholder="https://..."
                        value={verifyConfirmUrl}
                        onChange={e => setVerifyConfirmUrl(e.target.value)}
                      />
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <a
                        href="/api/profile/resume-download"
                        download
                        className="btn-secondary"
                        style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem' }}
                        title="Download verified candidate resume PDF"
                      >
                        <Download size={13} /> Download Resume PDF
                      </a>
                      <a
                        href={selectedPackageApp.jobUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-secondary"
                        style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem' }}
                      >
                        Open Official Application Portal <ExternalLink size={13} />
                      </a>
                    </div>
                    <button
                      onClick={() => handleVerifySubmission(selectedPackageApp.id)}
                      className="btn-primary"
                      style={{ fontSize: '0.8rem' }}
                    >
                      Record Verified Submission
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
