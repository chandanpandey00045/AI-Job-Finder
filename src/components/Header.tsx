import React from 'react';
import { Play, CheckCircle2, AlertTriangle, Bot, Database, Sparkles, RefreshCw } from 'lucide-react';

interface HeaderProps {
  onStartJobSearch: () => void;
  isSearching: boolean;
  pendingApprovalsCount: number;
  scoreThreshold: number;
  onScoreThresholdChange: (val: number) => void;
}

export const Header: React.FC<HeaderProps> = ({
  onStartJobSearch,
  isSearching,
  pendingApprovalsCount,
  scoreThreshold,
  onScoreThresholdChange
}) => {
  return (
    <header className="top-header">
      {/* Brand & Connection Status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div style={{
            width: 34,
            height: 34,
            borderRadius: 10,
            background: 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            boxShadow: '0 4px 12px rgba(99, 102, 241, 0.35)'
          }}>
            <Bot size={20} />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1rem', letterSpacing: '-0.02em', color: '#fff', lineHeight: 1.2 }}>
              JobFinder AI
            </div>
            <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 500 }}>
              Autonomous Application Agent
            </div>
          </div>
        </div>

        {/* Database & Active Feeds Health Pill */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.25rem 0.75rem',
          borderRadius: '9999px',
          background: 'rgba(16, 185, 129, 0.1)',
          border: '1px solid rgba(16, 185, 129, 0.25)',
          fontSize: '0.75rem',
          color: '#34d399',
          fontWeight: 600
        }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#34d399', boxShadow: '0 0 8px #34d399' }} className="pulse-active" />
          <Database size={13} /> SQLite WAL • 4 Active Feeds
        </div>
      </div>

      {/* Action Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        {/* Score Threshold Selector */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.3rem 0.65rem',
          borderRadius: 8,
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          fontSize: '0.8rem'
        }}>
          <span style={{ color: 'var(--foreground-dim)', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.7rem' }}>
            Min Match:
          </span>
          <select 
            value={scoreThreshold} 
            onChange={(e) => onScoreThresholdChange(Number(e.target.value))}
            style={{
              background: 'transparent',
              color: '#f8fafc',
              border: 'none',
              fontSize: '0.825rem',
              fontWeight: 700,
              cursor: 'pointer',
              outline: 'none'
            }}
          >
            <option value={70} style={{ background: '#0f111a' }}>70% (Flexible)</option>
            <option value={75} style={{ background: '#0f111a' }}>75% (Recommended)</option>
            <option value={80} style={{ background: '#0f111a' }}>80% (Strict)</option>
            <option value={85} style={{ background: '#0f111a' }}>85% (Elite)</option>
          </select>
        </div>

        {/* Pending Approvals Alert Badge */}
        {pendingApprovalsCount > 0 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            padding: '0.35rem 0.75rem',
            borderRadius: 8,
            background: 'rgba(245, 158, 11, 0.12)',
            border: '1px solid rgba(245, 158, 11, 0.35)',
            color: '#fbbf24',
            fontSize: '0.8rem',
            fontWeight: 700,
            animation: 'pulseGlow 2s infinite'
          }}>
            <AlertTriangle size={15} />
            {pendingApprovalsCount} Approval{pendingApprovalsCount > 1 ? 's' : ''} Paused
          </div>
        )}

        {/* Start Job Search Execution Trigger */}
        <button 
          onClick={onStartJobSearch} 
          disabled={isSearching}
          className="btn-primary"
          style={{
            opacity: isSearching ? 0.75 : 1,
            cursor: isSearching ? 'not-allowed' : 'pointer',
            padding: '0.55rem 1.25rem',
            fontSize: '0.85rem'
          }}
        >
          {isSearching ? (
            <>
              <RefreshCw size={15} className="spin" />
              <span>Scanning All Sources...</span>
            </>
          ) : (
            <>
              <Play size={15} />
              <span>Start Job Search</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
};
