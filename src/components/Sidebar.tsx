import React from 'react';
import { 
  LayoutDashboard, 
  UserCheck, 
  Briefcase, 
  AlertCircle, 
  Search, 
  Terminal, 
  ShieldCheck,
  Bot,
  Globe,
  Clock,
  Sparkles
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
  pendingCount: number;
  totalApplicationsCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  pendingCount,
  totalApplicationsCount
}) => {
  const navItems = [
    { id: 'dashboard', label: 'Overview & Metrics', icon: LayoutDashboard },
    { id: 'profile', label: 'Candidate Profile & Intake', icon: UserCheck },
    { id: 'discovery', label: 'Job Search & Explorer', icon: Search },
    { id: 'approvals', label: 'Pending Approvals (HITL)', icon: AlertCircle, badge: pendingCount, badgeColor: '#fbbf24' },
    { id: 'tracker', label: 'Application Tracker', icon: Briefcase, badge: totalApplicationsCount },
    { id: 'sources', label: 'Connected Job Sources', icon: Globe },
    { id: 'schedule', label: 'Search Scheduling', icon: Clock },
    { id: 'logs', label: 'Audit Logs & Rules', icon: Terminal }
  ];

  return (
    <aside className="sidebar">
      {/* Brand Header */}
      <div style={{ padding: '0.5rem 0.5rem 1.5rem 0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', borderBottom: '1px solid var(--border)', marginBottom: '1.25rem' }}>
        <div style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)'
        }}>
          <Sparkles size={18} />
        </div>
        <div>
          <h2 style={{ fontSize: '1rem', fontWeight: 800, color: '#f8fafc', lineHeight: 1.2, letterSpacing: '-0.02em' }}>
            JobFinder AI
          </h2>
          <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600 }}>
            Production Suite v2.0
          </span>
        </div>
      </div>

      {/* Navigation List */}
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
        <div style={{ fontSize: '0.675rem', fontWeight: 700, color: 'var(--foreground-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.6rem', paddingLeft: '0.6rem' }}>
          Platform Navigation
        </div>
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <div
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon size={17} style={{ color: isActive ? '#a5b4fc' : undefined }} />
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.badge !== undefined && item.badge > 0 && (
                <span style={{
                  padding: '0.15rem 0.55rem',
                  borderRadius: '9999px',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  background: item.badgeColor ? 'rgba(245, 158, 11, 0.2)' : 'var(--surface-hover)',
                  color: item.badgeColor || '#e2e8f0',
                  border: `1px solid ${item.badgeColor ? 'rgba(245, 158, 11, 0.4)' : 'var(--border)'}`
                }}>
                  {item.badge}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Safety & Compliance Card */}
      <div style={{
        marginTop: 'auto',
        background: 'linear-gradient(180deg, var(--surface-raised) 0%, #090a0f 100%)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        padding: '0.85rem',
        fontSize: '0.75rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: '#34d399', fontWeight: 700, marginBottom: '0.3rem' }}>
          <ShieldCheck size={16} /> Zero Fabrication Guard
        </div>
        <p style={{ color: 'var(--foreground-muted)', lineHeight: 1.4, fontSize: '0.725rem' }}>
          Compliant with platform rate limits. Only verified candidate profile data is submitted.
        </p>
      </div>
    </aside>
  );
};
