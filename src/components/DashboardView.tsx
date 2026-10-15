import React from 'react';
import { 
  Play, 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Briefcase, 
  FileText, 
  ChevronRight, 
  Sparkles, 
  TrendingUp,
  Building,
  MapPin,
  Clock,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Globe,
  Upload
} from 'lucide-react';
import { ApplicationRecord, DailyReportSummary, UserProfile } from '../types';

interface DashboardViewProps {
  report: DailyReportSummary;
  applications: ApplicationRecord[];
  onStartJobSearch: () => void;
  isSearching: boolean;
  onNavigateTab: (tab: string) => void;
  onSelectApplication: (app: ApplicationRecord) => void;
  userProfile: UserProfile;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  report,
  applications,
  onStartJobSearch,
  isSearching,
  onNavigateTab,
  onSelectApplication,
  userProfile
}) => {
  const pendingApps = applications.filter(a => a.status === 'Approval Required');
  const highMatchApps = applications.filter(a => a.matchScore >= 75).slice(0, 4);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Hero Banner */}
      <div className="glass-card" style={{
        padding: '1.75rem 2rem',
        background: 'linear-gradient(135deg, rgba(30, 35, 55, 0.7) 0%, rgba(15, 17, 26, 0.9) 100%)',
        border: '1px solid rgba(99, 102, 241, 0.25)',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.35)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1.5rem' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.2rem 0.6rem', borderRadius: 9999, background: 'rgba(99, 102, 241, 0.15)', color: '#a5b4fc', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.6rem' }}>
              <Sparkles size={13} /> Production Agent Active
            </div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f8fafc', marginBottom: '0.4rem', letterSpacing: '-0.02em' }}>
              Welcome back, {userProfile.fullName}
            </h1>
            <p style={{ color: 'var(--foreground-muted)', fontSize: '0.9rem', maxWidth: '680px', lineHeight: 1.5 }}>
              Active Profile: <strong style={{ color: '#fff' }}>{userProfile.currentTitle}</strong> ({userProfile.totalExperienceYears} yrs experience) • Targeting <strong style={{ color: '#fff' }}>{userProfile.preferredTitles.slice(0, 2).join(', ')}</strong> across 9 supported job sources.
            </p>

            {/* Target Titles & Locations Pills */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.85rem' }}>
              {userProfile.preferredLocations.slice(0, 3).map(loc => (
                <span key={loc} className="tag-pill">
                  <MapPin size={11} color="#60a5fa" /> {loc}
                </span>
              ))}
              <span className="tag-pill primary">
                Notice: {userProfile.noticePeriodDays} Days
              </span>
              <span className="tag-pill">
                Min CTC: ₹{(userProfile.minExpectedSalary / 100000).toFixed(1)} LPA
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', minWidth: '220px' }}>
            <button 
              onClick={onStartJobSearch}
              disabled={isSearching}
              className="btn-primary"
              style={{ width: '100%', padding: '0.75rem 1.25rem', fontSize: '0.925rem' }}
            >
              <Play size={16} />
              <span>{isSearching ? 'Scanning Sources...' : 'Start Real Job Search'}</span>
            </button>

            <button 
              onClick={() => onNavigateTab('profile')}
              className="btn-secondary"
              style={{ width: '100%', padding: '0.6rem 1.25rem', fontSize: '0.85rem' }}
            >
              <Upload size={14} /> Update Resume File
            </button>
          </div>
        </div>
      </div>

      {/* 6 Key Performance Metric Cards */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <TrendingUp size={18} color="#6366f1" /> Real-time System Metrics
          </h3>
          <span style={{ fontSize: '0.75rem', color: 'var(--foreground-dim)' }}>
            Updated: {new Date().toLocaleTimeString()} • SQLite Database
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          {/* Card 1: Discovered Jobs */}
          <div className="stat-card" style={{ '--stat-color': '#6366f1' } as any}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--foreground-muted)', fontWeight: 600 }}>JOBS DISCOVERED</span>
              <Briefcase size={16} color="#6366f1" />
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#f8fafc' }}>{report.jobsFound}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--foreground-dim)', marginTop: '0.25rem' }}>
              Live multi-source feeds
            </div>
          </div>

          {/* Card 2: High Match */}
          <div className="stat-card" style={{ '--stat-color': '#10b981' } as any}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--foreground-muted)', fontWeight: 600 }}>HIGH MATCH (&ge; 75%)</span>
              <Sparkles size={16} color="#10b981" />
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#34d399' }}>{report.jobsMatching}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--foreground-dim)', marginTop: '0.25rem' }}>
              Qualified candidates
            </div>
          </div>

          {/* Card 3: Ready to Apply */}
          <div className="stat-card" style={{ '--stat-color': '#3b82f6' } as any}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--foreground-muted)', fontWeight: 600 }}>READY TO APPLY</span>
              <CheckCircle size={16} color="#3b82f6" />
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#60a5fa' }}>{report.readyToApplyCount || 0}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--foreground-dim)', marginTop: '0.25rem' }}>
              Packages generated
            </div>
          </div>

          {/* Card 4: Pending Approvals */}
          <div 
            className="stat-card" 
            onClick={() => onNavigateTab('approvals')}
            style={{ '--stat-color': '#f59e0b', cursor: 'pointer' } as any}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--foreground-muted)', fontWeight: 600 }}>APPROVALS PAUSED</span>
              <AlertTriangle size={16} color="#f59e0b" />
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#fbbf24' }}>{report.pendingApprovals}</div>
            <div style={{ fontSize: '0.75rem', color: '#f59e0b', marginTop: '0.25rem', fontWeight: 600 }}>
              Action Required &rarr;
            </div>
          </div>

          {/* Card 5: Verified Submitted */}
          <div className="stat-card" style={{ '--stat-color': '#10b981' } as any}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--foreground-muted)', fontWeight: 600 }}>VERIFIED SUBMITTED</span>
              <ShieldCheck size={16} color="#10b981" />
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#34d399' }}>{report.applicationsSubmitted}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--foreground-dim)', marginTop: '0.25rem' }}>
              With confirmed receipt
            </div>
          </div>

          {/* Card 6: Interviews / Offers */}
          <div className="stat-card" style={{ '--stat-color': '#a855f7' } as any}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--foreground-muted)', fontWeight: 600 }}>INTERVIEWS & OFFERS</span>
              <TrendingUp size={16} color="#a855f7" />
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#c084fc' }}>
              {(report.interviewCount || 0) + (report.offerCount || 0)}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--foreground-dim)', marginTop: '0.25rem' }}>
              In active conversation
            </div>
          </div>
        </div>
      </div>

      {/* Two-Column Layout: High Match Showcase & Source Health */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '1.5rem' }}>
        {/* Left: Top Matched Opportunities */}
        <div className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc' }}>
                Top Match Recommendations
              </h3>
              <p style={{ fontSize: '0.775rem', color: 'var(--foreground-dim)' }}>
                Evaluated with 7-factor weighted scoring based on verified candidate profile.
              </p>
            </div>
            <button 
              onClick={() => onNavigateTab('discovery')}
              className="btn-secondary"
              style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
            >
              View All ({report.jobsFound}) &rarr;
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {highMatchApps.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--foreground-muted)', fontSize: '0.875rem' }}>
                No jobs scored yet. Click "Start Real Job Search" above to scan live feeds.
              </div>
            ) : (
              highMatchApps.map(app => (
                <div 
                  key={app.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.9rem 1rem',
                    borderRadius: 'var(--radius)',
                    background: 'var(--surface-raised)',
                    border: '1px solid var(--border)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                    <div style={{
                      width: 40,
                      height: 40,
                      borderRadius: 8,
                      background: 'rgba(99, 102, 241, 0.15)',
                      color: '#a5b4fc',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '1rem'
                    }}>
                      {app.company.charAt(0)}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.925rem', color: '#f8fafc' }}>
                        {app.jobTitle}
                      </div>
                      <div style={{ fontSize: '0.775rem', color: 'var(--foreground-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.15rem' }}>
                        <span style={{ color: '#818cf8', fontWeight: 600 }}>{app.company}</span>
                        <span>•</span>
                        <span>{app.location}</span>
                        <span>•</span>
                        <span style={{ color: '#34d399' }}>{app.platform}</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                    <span className="score-badge high">
                      {app.matchScore}% Fit
                    </span>
                    <button
                      onClick={() => onNavigateTab('tracker')}
                      className="btn-secondary"
                      style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}
                    >
                      Inspect
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: Connected Source Channels & Policy */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="glass-card">
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <Globe size={16} color="#60a5fa" /> Connected Source Channels
            </h3>
            <p style={{ fontSize: '0.775rem', color: 'var(--foreground-dim)', marginBottom: '1rem' }}>
              Direct API feeds and honest platform fallbacks.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem', fontSize: '0.8rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.4rem 0.6rem', background: 'var(--surface-raised)', borderRadius: 6 }}>
                <span>Remotive Tech API</span>
                <span style={{ color: '#34d399', fontWeight: 600 }}>● Direct API</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.4rem 0.6rem', background: 'var(--surface-raised)', borderRadius: 6 }}>
                <span>Arbeitnow Global Feed</span>
                <span style={{ color: '#34d399', fontWeight: 600 }}>● Direct API</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.4rem 0.6rem', background: 'var(--surface-raised)', borderRadius: 6 }}>
                <span>Jobicy Remote API</span>
                <span style={{ color: '#34d399', fontWeight: 600 }}>● Direct API</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.4rem 0.6rem', background: 'var(--surface-raised)', borderRadius: 6 }}>
                <span>LinkedIn / Naukri</span>
                <span style={{ color: '#60a5fa', fontWeight: 600 }}>● Assisted Import</span>
              </div>
            </div>

            <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border)', paddingTop: '0.75rem', textAlign: 'center' }}>
              <button 
                onClick={() => onNavigateTab('sources')}
                className="btn-secondary"
                style={{ width: '100%', fontSize: '0.775rem', padding: '0.4rem 0.75rem' }}
              >
                Configure Sources & Fallbacks &rarr;
              </button>
            </div>
          </div>

          {/* Quick Approvals Card */}
          {pendingApps.length > 0 && (
            <div className="glass-card" style={{ border: '1px solid rgba(245, 158, 11, 0.35)', background: 'rgba(245, 158, 11, 0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#fbbf24', fontWeight: 700, fontSize: '0.875rem', marginBottom: '0.35rem' }}>
                <AlertTriangle size={15} /> {pendingApps.length} Application{pendingApps.length > 1 ? 's' : ''} Require Approval
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--foreground-muted)', lineHeight: 1.4, marginBottom: '0.75rem' }}>
                Sensitive questions regarding salary or relocation have paused automated submission.
              </p>
              <button 
                onClick={() => onNavigateTab('approvals')}
                className="btn-primary"
                style={{ width: '100%', fontSize: '0.775rem', padding: '0.45rem', background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }}
              >
                Review Approval Queue &rarr;
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
