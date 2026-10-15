import React, { useState } from 'react';
import { JobListing, UserProfile } from '../types';
import { generateCoverLetter, generateTailoredSummary } from '../utils/aiTailorEngine';
import { X, Sparkles, Building, MapPin, ExternalLink, CheckCircle2, ShieldAlert, Copy, Check, FileText, CheckCircle, Download, FileCheck } from 'lucide-react';

interface JobDetailModalProps {
  job: JobListing | null;
  profile: UserProfile;
  scoreThreshold: number;
  onClose: () => void;
}

export const JobDetailModal: React.FC<JobDetailModalProps> = ({
  job,
  profile,
  scoreThreshold,
  onClose
}) => {
  if (!job) return null;

  const [activeTab, setActiveTab] = useState<'breakdown' | 'coverLetter' | 'resume' | 'screening'>('breakdown');
  const [copied, setCopied] = useState<string | null>(null);

  const breakdown = job.matchBreakdown;
  const coverLetter = generateCoverLetter(profile, job);
  const tailoredSummary = generateTailoredSummary(profile, job);

  const factorBars = breakdown ? [
    { label: 'Skills Match', score: breakdown.skillsScore, max: 30, color: '#6366f1' },
    { label: 'Experience Match', score: breakdown.experienceScore, max: 20, color: '#10b981' },
    { label: 'Job Title / Role Match', score: breakdown.titleScore, max: 20, color: '#3b82f6' },
    { label: 'Location & Work-Mode', score: breakdown.locationScore, max: 10, color: '#f59e0b' },
    { label: 'Salary Match', score: breakdown.salaryScore, max: 10, color: '#ec4899' },
    { label: 'Education / Qualification', score: breakdown.educationScore, max: 5, color: '#a855f7' },
    { label: 'Company / Industry Preference', score: breakdown.companyScore, max: 5, color: '#06b6d4' }
  ] : [];

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2500);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '820px' }} onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border)', paddingBottom: '1.25rem', marginBottom: '1.25rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.35rem' }}>
              <span className="tag-pill primary">
                {job.platform}
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--foreground-dim)' }}>Posted: {job.postedDate || 'Recent'}</span>
              {breakdown?.confidenceScore && (
                <span className="tag-pill" style={{ color: '#34d399' }}>
                  {breakdown.confidenceScore}% Data Completeness
                </span>
              )}
            </div>
            <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#f8fafc', lineHeight: 1.25 }}>{job.title}</h2>
            <div style={{ fontSize: '0.95rem', color: '#818cf8', fontWeight: 700, marginTop: '0.2rem' }}>{job.company}</div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span className={`score-badge ${breakdown && breakdown.totalScore >= 75 ? 'high' : 'mid'}`} style={{ fontSize: '1rem', padding: '0.4rem 0.8rem' }}>
              {breakdown?.totalScore || 0}% Fit
            </span>
            <button 
              onClick={onClose} 
              className="btn-secondary" 
              style={{ padding: '0.4rem 0.6rem', borderRadius: '50%' }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.85rem', marginBottom: '1.5rem', overflowX: 'auto' }}>
          <button
            onClick={() => setActiveTab('breakdown')}
            style={{
              padding: '0.45rem 0.95rem',
              borderRadius: 6,
              background: activeTab === 'breakdown' ? 'var(--primary)' : 'transparent',
              color: activeTab === 'breakdown' ? '#fff' : 'var(--foreground-muted)',
              border: 'none',
              fontSize: '0.825rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            7-Factor Score Fit
          </button>
          <button
            onClick={() => setActiveTab('coverLetter')}
            style={{
              padding: '0.45rem 0.95rem',
              borderRadius: 6,
              background: activeTab === 'coverLetter' ? 'var(--primary)' : 'transparent',
              color: activeTab === 'coverLetter' ? '#fff' : 'var(--foreground-muted)',
              border: 'none',
              fontSize: '0.825rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            Tailored Cover Letter
          </button>
          <button
            onClick={() => setActiveTab('resume')}
            style={{
              padding: '0.45rem 0.95rem',
              borderRadius: 6,
              background: activeTab === 'resume' ? 'var(--primary)' : 'transparent',
              color: activeTab === 'resume' ? '#fff' : 'var(--foreground-muted)',
              border: 'none',
              fontSize: '0.825rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            Resume Summary & Bullets
          </button>
        </div>

        {/* Tab Content 1: 7-Factor Fit Breakdown */}
        {activeTab === 'breakdown' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ background: 'var(--surface-raised)', borderRadius: 'var(--radius)', padding: '1rem', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '0.825rem', color: 'var(--foreground-muted)', lineHeight: 1.45 }}>
                {breakdown?.recommendationReason || 'Detailed factor breakdown calculated by two-stage engine.'}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {factorBars.map(f => {
                const pct = Math.min(100, (f.score / f.max) * 100);
                return (
                  <div key={f.label} style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 600 }}>
                      <span style={{ color: '#f8fafc' }}>{f.label} ({f.max}%)</span>
                      <span style={{ color: f.color, fontFamily: 'var(--font-mono)' }}>{f.score} / {f.max} pts</span>
                    </div>
                    <div style={{ width: '100%', height: 7, borderRadius: 9999, background: 'var(--surface-raised)', overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: f.color, borderRadius: 9999, transition: 'width 0.4s ease' }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Matched vs Missing Skills */}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <div style={{ fontSize: '0.775rem', fontWeight: 700, color: '#34d399', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                  ✓ Matched Skills
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                  {job.requiredSkills.filter(s => profile.primarySkills.concat(profile.secondarySkills).some(u => u.toLowerCase().includes(s.toLowerCase()))).map(s => (
                    <span key={s} className="tag-pill" style={{ color: '#34d399', borderColor: 'rgba(16, 185, 129, 0.3)' }}>
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.775rem', fontWeight: 700, color: 'var(--foreground-dim)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                  Additional Skills in Role
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                  {job.requiredSkills.filter(s => !profile.primarySkills.concat(profile.secondarySkills).some(u => u.toLowerCase().includes(s.toLowerCase()))).map(s => (
                    <span key={s} className="tag-pill">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab Content 2: Tailored Cover Letter */}
        {activeTab === 'coverLetter' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--foreground-muted)' }}>
                Generated using verified candidate profile data only. Zero fabrication.
              </span>
              <button
                onClick={() => handleCopy(coverLetter, 'letter')}
                className="btn-secondary"
                style={{ fontSize: '0.775rem', padding: '0.35rem 0.65rem' }}
              >
                {copied === 'letter' ? <Check size={13} color="#34d399" /> : <Copy size={13} />}
                {copied === 'letter' ? 'Copied!' : 'Copy to Clipboard'}
              </button>
            </div>

            <div style={{
              background: '#070a10',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              padding: '1.25rem',
              whiteSpace: 'pre-wrap',
              fontSize: '0.85rem',
              lineHeight: 1.6,
              color: '#f8fafc',
              maxHeight: '400px',
              overflowY: 'auto'
            }}>
              {coverLetter}
            </div>
          </div>
        )}

        {/* Tab Content 3: Tailored Resume Summary */}
        {activeTab === 'resume' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <label className="input-label" style={{ margin: 0 }}>Targeted Header Summary</label>
                <button
                  onClick={() => handleCopy(tailoredSummary, 'summary')}
                  className="btn-secondary"
                  style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                >
                  {copied === 'summary' ? <Check size={12} color="#34d399" /> : <Copy size={12} />}
                  {copied === 'summary' ? 'Copied' : 'Copy'}
                </button>
              </div>
              <div style={{ background: '#070a10', border: '1px solid var(--border)', borderRadius: 8, padding: '1rem', fontSize: '0.85rem', color: '#f8fafc' }}>
                {tailoredSummary}
              </div>
            </div>

            <div>
              <label className="input-label">Recommended Resume Experience Highlights</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ padding: '0.75rem', background: 'var(--surface-raised)', borderRadius: 6, fontSize: '0.825rem', border: '1px solid var(--border)' }}>
                  • Architected high-throughput data processing workflows and ETL pipelines utilizing {profile.primarySkills.slice(0, 3).join(', ')}.
                </div>
                <div style={{ padding: '0.75rem', background: 'var(--surface-raised)', borderRadius: 6, fontSize: '0.825rem', border: '1px solid var(--border)' }}>
                  • Engineered robust database schemas, query optimizations, and automated pipelines ensuring high resilience.
                </div>
                <div style={{ padding: '0.75rem', background: 'var(--surface-raised)', borderRadius: 6, fontSize: '0.825rem', border: '1px solid var(--border)' }}>
                  • Collaborated in Agile engineering sprints, maintaining rigorous testing and documentation standards.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* How to Apply Guidance Banner */}
        <div style={{
          background: 'rgba(99, 102, 241, 0.08)',
          border: '1px solid rgba(99, 102, 241, 0.25)',
          borderRadius: 8,
          padding: '0.85rem 1rem',
          marginTop: '1.25rem',
          fontSize: '0.8rem',
          color: 'var(--foreground-muted)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.35rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#a5b4fc', fontWeight: 700 }}>
            <FileCheck size={14} /> How to Apply with Your Resume PDF:
          </div>
          <div>
            1. Click <strong>"Download Resume PDF"</strong> to save your verified resume file on your device.
          </div>
          <div>
            2. Click <strong>"Open Official Job Application"</strong> to navigate directly to the {job.platform} vacancy page.
          </div>
          <div>
            3. Attach your downloaded PDF and paste the tailored cover letter into the job application form.
          </div>
        </div>

        {/* Footer Actions */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.25rem', marginTop: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <span style={{ fontSize: '0.775rem', color: 'var(--foreground-dim)' }}>
            Threshold configured: {scoreThreshold}% • Match: {breakdown?.totalScore || 0}%
          </span>

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <a
              href="/api/profile/resume-download"
              download
              className="btn-secondary"
              style={{ fontSize: '0.825rem', display: 'flex', alignItems: 'center', gap: '0.45rem' }}
              title="Download your verified candidate resume PDF"
            >
              <Download size={14} /> Download Resume PDF
            </a>

            <a
              href={job.jobUrl}
              target="_blank"
              rel="noreferrer"
              className="btn-primary"
              style={{ fontSize: '0.825rem', display: 'flex', alignItems: 'center', gap: '0.45rem' }}
            >
              Open Official Job Application <ExternalLink size={13} />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

