import React, { useState } from 'react';
import { JobListing, UserProfile } from '../types';
import { 
  Search, Filter, Sparkles, Building, MapPin, ExternalLink, ShieldAlert, 
  CheckCircle2, Eye, DollarSign, Calendar, Check, Globe, Bookmark, 
  Send, Link as LinkIcon, Copy, AlertCircle, ArrowUpRight, Zap
} from 'lucide-react';
import { importJobByUrl } from '../api/client';

interface JobDiscoveryViewProps {
  jobs: JobListing[];
  profile: UserProfile;
  scoreThreshold: number;
  onInspectJob: (job: JobListing) => void;
  onJobImported?: () => void;
}

export const JobDiscoveryView: React.FC<JobDiscoveryViewProps> = ({
  jobs,
  profile,
  scoreThreshold,
  onInspectJob,
  onJobImported
}) => {
  const [platformFilter, setPlatformFilter] = useState<string>('ALL');
  const [minScoreFilter, setMinScoreFilter] = useState<number>(0);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Instant URL Import State
  const [pastedUrl, setPastedUrl] = useState('');
  const [importingUrl, setImportingUrl] = useState(false);
  const [importUrlFeedback, setImportUrlFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  
  // Bookmarklet modal
  const [showBookmarkletModal, setShowBookmarkletModal] = useState(false);
  const [copiedBookmarklet, setCopiedBookmarklet] = useState(false);

  // Active Multi-Combination Search Generators
  const generatedQueries = [
    `Role: "${profile.preferredTitles[0] || profile.currentTitle}" + Skills: (${profile.primarySkills.slice(0, 3).join(' OR ')})`,
    `Location: "${profile.preferredLocations[0] || 'Remote'}" + Mode: ${profile.workModePreference}`,
    `Skills: (${profile.primarySkills.slice(0, 4).join(' AND ')}) + Recency: <= 7 Days`
  ];

  const platforms = ['ALL', 'Company Careers', 'LinkedIn', 'Naukri', 'Remotive', 'Arbeitnow', 'Jobicy', 'Indeed', 'Wellfound'];

  const filteredJobs = jobs.filter(job => {
    const matchesSearch = 
      job.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (job.location && job.location.toLowerCase().includes(searchTerm.toLowerCase())) ||
      job.requiredSkills.some(s => s.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesPlatform = platformFilter === 'ALL' || job.platform.toLowerCase() === platformFilter.toLowerCase();
    const score = job.matchBreakdown?.totalScore || 0;
    const matchesScore = score >= minScoreFilter;

    return matchesSearch && matchesPlatform && matchesScore;
  });

  const getPlatformColor = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'company careers': return { bg: 'rgba(6, 182, 212, 0.15)', text: '#22d3ee', border: 'rgba(6, 182, 212, 0.3)' };
      case 'linkedin': return { bg: 'rgba(10, 102, 194, 0.15)', text: '#60a5fa', border: 'rgba(10, 102, 194, 0.3)' };
      case 'naukri': return { bg: 'rgba(255, 117, 24, 0.15)', text: '#fb923c', border: 'rgba(255, 117, 24, 0.3)' };
      case 'remotive': return { bg: 'rgba(16, 185, 129, 0.15)', text: '#34d399', border: 'rgba(16, 185, 129, 0.3)' };
      case 'arbeitnow': return { bg: 'rgba(168, 85, 247, 0.15)', text: '#c084fc', border: 'rgba(168, 85, 247, 0.3)' };
      case 'jobicy': return { bg: 'rgba(56, 189, 248, 0.15)', text: '#38bdf8', border: 'rgba(56, 189, 248, 0.3)' };
      default: return { bg: 'rgba(99, 102, 241, 0.15)', text: '#a5b4fc', border: 'rgba(99, 102, 241, 0.3)' };
    }
  };

  // 1-Click Bookmarklet JavaScript Code
  const bookmarkletCode = `javascript:(function(){try{var t=(document.querySelector('.job-details-jobs-unified-top-card__job-title,.jobs-unified-top-card__job-title,.topcard__title,.jd-header-title,h1.title,h1'))?.innerText?.trim()||document.title;var c=(document.querySelector('.job-details-jobs-unified-top-card__company-name a,.jobs-unified-top-card__company-name a,.topcard__org-name-link,.jd-header-comp-name a,.companyName'))?.innerText?.trim()||'Direct Employer';var l=(document.querySelector('.job-details-jobs-unified-top-card__bullet,.jobs-unified-top-card__bullet,.location,.loc-wrap span'))?.innerText?.trim()||'India';var dElem=document.querySelector('#job-details,.jobs-description__content,.jobs-box__html-content,.dang-inner-html,.job-desc-wrap,article');var d=dElem?dElem.innerText.trim():document.body.innerText.slice(0,4000);var p=window.location.hostname.includes('linkedin')?'LinkedIn':window.location.hostname.includes('naukri')?'Naukri':'Company Careers';var toast=document.createElement('div');toast.style.cssText='position:fixed;top:20px;right:20px;z-index:999999;background:#1e1b4b;color:#e0e7ff;padding:14px 20px;border-radius:10px;font-family:sans-serif;font-size:14px;box-shadow:0 10px 25px rgba(0,0,0,0.5);border:1px solid #6366f1;transition:all 0.3s ease;';toast.innerText='⏳ Importing to JobFinder...';document.body.appendChild(toast);fetch('http://localhost:3001/api/jobs/import',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:t,company:c,location:l,jobUrl:window.location.href,description:d,platform:p})}).then(function(r){return r.json();}).then(function(res){if(res.error){toast.style.background='#7f1d1d';toast.innerText='⚠️ '+res.error;}else{toast.style.background='#064e3b';toast.innerText='✅ Imported to JobFinder! Score: '+res.matchScore+'% ('+res.status+')';}setTimeout(function(){toast.remove();},4000);}).catch(function(){toast.style.background='#7f1d1d';toast.innerText='❌ Ensure JobFinder backend is running on localhost:3001';setTimeout(function(){toast.remove();},4000);});}catch(e){alert('JobFinder Error: '+e.message);}})();`;

  const handleCopyBookmarklet = () => {
    navigator.clipboard.writeText(bookmarkletCode);
    setCopiedBookmarklet(true);
    setTimeout(() => setCopiedBookmarklet(false), 2500);
  };

  const handleImportPastedUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pastedUrl.trim()) return;

    setImportingUrl(true);
    setImportUrlFeedback(null);
    try {
      const res = await importJobByUrl(pastedUrl.trim());
      setImportUrlFeedback({
        type: 'success',
        message: `Imported "${res.title}" at ${res.company}! Match score: ${res.matchScore}%. Application materials prepared.`
      });
      setPastedUrl('');
      if (onJobImported) onJobImported();
    } catch (err: any) {
      setImportUrlFeedback({
        type: 'error',
        message: err.message || 'Failed to extract and import job from URL.'
      });
    } finally {
      setImportingUrl(false);
    }
  };

  // Direct active session search links
  const targetTitle = profile.preferredTitles[0] || 'Data Engineer';
  const targetLoc = profile.preferredLocations[0] || 'Bengaluru';
  const linkedInEasyApplyUrl = `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(targetTitle)}&location=${encodeURIComponent(targetLoc)}&f_AL=true&f_E=2%2C3&sortBy=DD`;
  const naukriSessionUrl = `https://www.naukri.com/data-engineer-jobs?experience=1&k=${encodeURIComponent(targetTitle)}`;
  const databricksCareersUrl = `https://databricks.com/company/careers/open-positions?department=Engineering&search=${encodeURIComponent(targetTitle)}`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.02em' }}>
            Job Search & Matching Explorer
          </h2>
          <p style={{ color: 'var(--foreground-muted)', fontSize: '0.9rem' }}>
            Multi-source discovery engine querying Company Careers, live APIs, and your logged-in browser session. Showing {filteredJobs.length} of {jobs.length} postings.
          </p>
        </div>
      </div>

      {/* Active Logged-In Browser Session & Official Company Careers Card */}
      <div className="glass-card" style={{
        padding: '1.25rem 1.5rem',
        background: 'linear-gradient(135deg, rgba(30, 27, 75, 0.7) 0%, rgba(15, 23, 42, 0.9) 100%)',
        border: '1px solid rgba(99, 102, 241, 0.35)',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 10px #22c55e' }} />
            <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.01em' }}>
              Active Browser Session Integration (LinkedIn & Naukri in this Browser)
            </span>
            <span style={{ fontSize: '0.725rem', background: 'rgba(34, 197, 94, 0.15)', color: '#4ade80', border: '1px solid rgba(34, 197, 94, 0.3)', padding: '0.15rem 0.5rem', borderRadius: 6, fontWeight: 700 }}>
              Live & Authenticated
            </span>
          </div>

          <button 
            onClick={() => setShowBookmarkletModal(true)}
            className="btn-secondary"
            style={{ fontSize: '0.8rem', padding: '0.4rem 0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem', border: '1px solid rgba(99, 102, 241, 0.4)' }}
          >
            <Bookmark size={14} color="#818cf8" /> ⭐ 1-Click Browser Bookmarklet
          </button>
        </div>

        {/* 1-Click Launchers using user's active cookies */}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <a 
            href={linkedInEasyApplyUrl}
            target="_blank"
            rel="noreferrer"
            style={{
              flex: '1 1 240px',
              padding: '0.75rem 1rem',
              borderRadius: 8,
              background: 'rgba(10, 102, 194, 0.15)',
              border: '1px solid rgba(10, 102, 194, 0.35)',
              color: '#93c5fd',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              transition: 'all 0.2s ease'
            }}
          >
            <div>
              <div style={{ fontSize: '0.825rem', fontWeight: 700, color: '#bfdbfe' }}>LinkedIn Easy Apply Feed</div>
              <div style={{ fontSize: '0.725rem', color: '#60a5fa' }}>Pre-filtered: 1-3 Yrs Exp & Data Eng</div>
            </div>
            <ArrowUpRight size={16} />
          </a>

          <a 
            href={naukriSessionUrl}
            target="_blank"
            rel="noreferrer"
            style={{
              flex: '1 1 240px',
              padding: '0.75rem 1rem',
              borderRadius: 8,
              background: 'rgba(255, 117, 24, 0.15)',
              border: '1px solid rgba(255, 117, 24, 0.35)',
              color: '#fdba74',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              transition: 'all 0.2s ease'
            }}
          >
            <div>
              <div style={{ fontSize: '0.825rem', fontWeight: 700, color: '#fed7aa' }}>Naukri FastForward Feed</div>
              <div style={{ fontSize: '0.725rem', color: '#fb923c' }}>1-Yr Exp Data Engineering Jobs</div>
            </div>
            <ArrowUpRight size={16} />
          </a>

          <a 
            href={databricksCareersUrl}
            target="_blank"
            rel="noreferrer"
            style={{
              flex: '1 1 240px',
              padding: '0.75rem 1rem',
              borderRadius: 8,
              background: 'rgba(6, 182, 212, 0.15)',
              border: '1px solid rgba(6, 182, 212, 0.35)',
              color: '#67e8f9',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              transition: 'all 0.2s ease'
            }}
          >
            <div>
              <div style={{ fontSize: '0.825rem', fontWeight: 700, color: '#a5f3fc' }}>Official Company Careers</div>
              <div style={{ fontSize: '0.725rem', color: '#22d3ee' }}>Databricks, Stripe, Figma ATS</div>
            </div>
            <ArrowUpRight size={16} />
          </a>
        </div>

        {/* Quick URL Ingestion Bar */}
        <form onSubmit={handleImportPastedUrl} style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <LinkIcon size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--foreground-dim)' }} />
            <input 
              type="url" 
              className="form-control" 
              placeholder="Paste any LinkedIn, Naukri, or Company Career link to extract, score & generate materials..." 
              style={{ paddingLeft: '38px', fontSize: '0.85rem' }}
              value={pastedUrl}
              onChange={(e) => setPastedUrl(e.target.value)}
              disabled={importingUrl}
            />
          </div>
          <button 
            type="submit" 
            className="btn-primary" 
            style={{ whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.825rem' }}
            disabled={importingUrl || !pastedUrl.trim()}
          >
            {importingUrl ? <span className="spinner" /> : <Zap size={14} />} 
            {importingUrl ? 'Extracting...' : 'Import & Tailor'}
          </button>
        </form>

        {importUrlFeedback && (
          <div style={{
            fontSize: '0.825rem',
            padding: '0.6rem 0.85rem',
            borderRadius: 6,
            background: importUrlFeedback.type === 'success' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            border: `1px solid ${importUrlFeedback.type === 'success' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
            color: importUrlFeedback.type === 'success' ? '#4ade80' : '#f87171'
          }}>
            {importUrlFeedback.message}
          </div>
        )}
      </div>

      {/* Generated Query Combinations */}
      <div className="glass-card" style={{ padding: '1rem 1.25rem', background: 'var(--surface-raised)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#a5b4fc', fontSize: '0.775rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.5rem' }}>
          <Sparkles size={14} /> Active Search Query Generators
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {generatedQueries.map((q, idx) => (
            <span key={idx} style={{
              background: 'rgba(99, 102, 241, 0.1)',
              border: '1px solid rgba(99, 102, 241, 0.25)',
              color: '#c7d2fe',
              borderRadius: 6,
              padding: '0.3rem 0.65rem',
              fontSize: '0.775rem',
              fontFamily: 'var(--font-mono)'
            }}>
              Query #{idx + 1}: {q}
            </span>
          ))}
        </div>
      </div>

      {/* Search and Filters */}
      <div className="glass-card" style={{ padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '260px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--foreground-dim)' }} />
            <input 
              type="text" 
              className="form-control" 
              placeholder="Search by role, company, location, or skill..." 
              style={{ paddingLeft: '38px' }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.825rem' }}>
            <span style={{ color: 'var(--foreground-muted)', fontWeight: 600 }}>Min Score:</span>
            <select
              className="form-control"
              style={{ width: 'auto', padding: '0.5rem 0.75rem', fontSize: '0.825rem' }}
              value={minScoreFilter}
              onChange={e => setMinScoreFilter(parseInt(e.target.value, 10))}
            >
              <option value={0}>All Scores (0%+)</option>
              <option value={60}>Moderate (60%+)</option>
              <option value={75}>Eligible ({scoreThreshold}%+)</option>
              <option value={85}>High Match (85%+)</option>
            </select>
          </div>
        </div>

        {/* Platform Filter Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--foreground-dim)', fontWeight: 600, marginRight: '0.25rem' }}>
            SOURCE:
          </span>
          {platforms.map(p => {
            const isSelected = platformFilter.toLowerCase() === p.toLowerCase();
            return (
              <button
                key={p}
                onClick={() => setPlatformFilter(p)}
                style={{
                  background: isSelected ? 'var(--primary)' : 'var(--surface-raised)',
                  color: isSelected ? '#ffffff' : 'var(--foreground-muted)',
                  border: isSelected ? '1px solid var(--primary)' : '1px solid var(--border)',
                  borderRadius: '9999px',
                  padding: '0.25rem 0.65rem',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {p}
              </button>
            );
          })}
        </div>
      </div>

      {/* Discovered Jobs Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(390px, 1fr))', gap: '1.25rem' }}>
        {filteredJobs.length === 0 ? (
          <div className="glass-card" style={{ gridColumn: '1 / -1', padding: '3.5rem', textAlign: 'center', color: 'var(--foreground-muted)' }}>
            <Building size={36} color="var(--foreground-dim)" style={{ margin: '0 auto 1rem auto' }} />
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#f8fafc', marginBottom: '0.5rem' }}>
              No Job Listings Match Filter
            </h3>
            <p style={{ fontSize: '0.85rem', maxWidth: '420px', margin: '0 auto' }}>
              Try adjusting your search terms, clearing platform filters, or lowering the minimum match score threshold.
            </p>
          </div>
        ) : (
          filteredJobs.map(job => {
            const score = job.matchBreakdown?.totalScore || 0;
            const pColor = getPlatformColor(job.platform);
            const userSkills = [...profile.primarySkills, ...profile.secondarySkills].map(s => s.toLowerCase());

            return (
              <div 
                key={job.id} 
                className="glass-card glass-card-interactive"
                style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '1rem' }}
              >
                <div>
                  {/* Top Header: Platform Tag + Match Badge */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                    <span style={{
                      padding: '0.2rem 0.6rem',
                      borderRadius: 6,
                      fontSize: '0.725rem',
                      fontWeight: 700,
                      background: pColor.bg,
                      color: pColor.text,
                      border: `1px solid ${pColor.border}`
                    }}>
                      {job.platform}
                    </span>

                    <span className={`score-badge ${score >= 75 ? 'high' : score >= 60 ? 'mid' : 'low'}`}>
                      {score}% Fit
                    </span>
                  </div>

                  {/* Title & Company */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    <div style={{
                      width: 38,
                      height: 38,
                      borderRadius: 8,
                      background: 'var(--surface-raised)',
                      border: '1px solid var(--border)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#a5b4fc',
                      fontWeight: 800,
                      fontSize: '0.95rem',
                      flexShrink: 0
                    }}>
                      {job.company.charAt(0)}
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#f8fafc', lineHeight: 1.3 }}>
                        {job.title}
                      </h3>
                      <div style={{ fontSize: '0.825rem', color: '#818cf8', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.2rem' }}>
                        <Building size={13} /> {job.company}
                      </div>
                    </div>
                  </div>

                  {/* Location, Work Mode & Salary Pills */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', fontSize: '0.775rem', color: 'var(--foreground-muted)', marginBottom: '0.85rem' }}>
                    <span className="tag-pill">
                      <MapPin size={11} color="#60a5fa" /> {job.location || 'Remote'}
                    </span>
                    <span className="tag-pill">
                      Mode: {job.workMode}
                    </span>
                    {job.salaryRange && (
                      <span className="tag-pill" style={{ color: '#34d399' }}>
                        ₹{(job.salaryRange.min / 100000).toFixed(1)} - {(job.salaryRange.max / 100000).toFixed(1)} LPA
                      </span>
                    )}
                  </div>

                  {/* Skills Matching Preview */}
                  <div style={{ marginBottom: '0.5rem' }}>
                    <div style={{ fontSize: '0.725rem', color: 'var(--foreground-dim)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                      Skill Alignment:
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                      {job.requiredSkills.slice(0, 6).map(skill => {
                        const isMatched = userSkills.some(u => u === skill.toLowerCase() || u.includes(skill.toLowerCase()) || skill.toLowerCase().includes(u));
                        return (
                          <span 
                            key={skill} 
                            style={{
                              padding: '0.15rem 0.5rem',
                              borderRadius: 4,
                              fontSize: '0.725rem',
                              fontWeight: 500,
                              background: isMatched ? 'rgba(16, 185, 129, 0.12)' : 'var(--surface-raised)',
                              color: isMatched ? '#34d399' : 'var(--foreground-dim)',
                              border: `1px solid ${isMatched ? 'rgba(16, 185, 129, 0.28)' : 'var(--border)'}`,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem'
                            }}
                          >
                            {isMatched && <Check size={11} />} {skill}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <button 
                    onClick={() => onInspectJob(job)}
                    className="btn-secondary"
                    style={{ fontSize: '0.775rem', padding: '0.35rem 0.75rem' }}
                  >
                    <Eye size={13} /> View 7-Factor Fit
                  </button>

                  <a 
                    href={job.jobUrl} 
                    target="_blank" 
                    rel="noreferrer"
                    className="btn-secondary"
                    style={{ fontSize: '0.775rem', padding: '0.35rem 0.75rem' }}
                  >
                    Listing <ExternalLink size={12} />
                  </a>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Bookmarklet Modal */}
      {showBookmarkletModal && (
        <div className="modal-backdrop" onClick={() => setShowBookmarkletModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '640px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Bookmark size={20} color="#818cf8" />
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#f8fafc' }}>
                  1-Click JobFinder Browser Bookmarklet
                </h3>
              </div>
              <button onClick={() => setShowBookmarkletModal(false)} className="btn-secondary" style={{ padding: '0.25rem 0.6rem' }}>
                ✕
              </button>
            </div>

            <p style={{ color: 'var(--foreground-muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>
              Since you are logged into <strong>LinkedIn</strong> and <strong>Naukri</strong> in this browser (Brave / Chrome), this bookmarklet allows you to instantly import ANY job posting into JobFinder with 1 click while preserving your active session!
            </p>

            <div style={{ background: 'var(--surface-raised)', padding: '1rem', borderRadius: 8, border: '1px solid var(--border)', marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f8fafc', marginBottom: '0.5rem' }}>
                How to Install in 10 Seconds:
              </div>
              <ol style={{ fontSize: '0.825rem', color: 'var(--foreground-muted)', paddingLeft: '1.2rem', lineHeight: 1.6 }}>
                <li>Press <kbd style={{ background: '#334155', padding: '2px 6px', borderRadius: 4, color: '#fff' }}>Ctrl+Shift+B</kbd> to show your browser bookmarks bar.</li>
                <li>Drag this button directly to your bookmarks bar:
                  <div style={{ margin: '0.6rem 0' }}>
                    <a 
                      href={bookmarkletCode}
                      onClick={e => e.preventDefault()}
                      style={{
                        display: 'inline-block',
                        padding: '0.5rem 1rem',
                        background: '#6366f1',
                        color: '#fff',
                        borderRadius: 6,
                        fontWeight: 700,
                        fontSize: '0.825rem',
                        textDecoration: 'none',
                        cursor: 'grab',
                        boxShadow: '0 4px 12px rgba(99, 102, 241, 0.4)'
                      }}
                    >
                      ⭐ Import to JobFinder
                    </a>
                  </div>
                </li>
                <li>Or copy the bookmarklet code below, right click your bookmarks bar &rarr; <em>Add Page</em> &rarr; paste into the URL field.</li>
              </ol>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button 
                onClick={handleCopyBookmarklet}
                className="btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
              >
                {copiedBookmarklet ? <Check size={14} /> : <Copy size={14} />}
                {copiedBookmarklet ? 'Copied to Clipboard!' : 'Copy Bookmarklet Code'}
              </button>
              <button 
                onClick={() => setShowBookmarkletModal(false)}
                className="btn-secondary"
                style={{ fontSize: '0.85rem' }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
