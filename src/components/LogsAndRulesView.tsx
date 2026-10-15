import React, { useState } from 'react';
import { WorkflowLog } from '../types';
import { 
  Terminal, 
  ShieldCheck, 
  Lock, 
  Activity, 
  CheckCircle2, 
  AlertOctagon, 
  Info, 
  AlertTriangle,
  Download,
  Trash2,
  Search,
  Copy,
  Check,
  Filter,
  Shield,
  Gauge
} from 'lucide-react';

interface LogsAndRulesViewProps {
  logs: WorkflowLog[];
  onClearLogs: () => void;
}

export const LogsAndRulesView: React.FC<LogsAndRulesViewProps> = ({ logs, onClearLogs }) => {
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  // Filter logs by type and search query
  const filteredLogs = logs.filter(log => {
    const matchesType = 
      filterType === 'all' || 
      (filterType === 'info' && (log.type === 'info' || !log.type)) ||
      (filterType === 'success' && log.type === 'success') ||
      (filterType === 'approval' && (log.type === 'approval' || log.type === 'warning')) ||
      (filterType === 'error' && log.type === 'error');

    const matchesSearch = 
      !searchQuery.trim() || 
      log.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.step.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesType && matchesSearch;
  });

  const handleCopyLogs = () => {
    const text = logs.map(l => `[${l.timestamp}] [${l.step}] [${l.type || 'info'}]: ${l.message}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadLogs = () => {
    const jsonStr = JSON.stringify(logs, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `job-finder-audit-logs-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.02em' }}>
              Agent Audit Logs & Security Controls
            </h2>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.2rem 0.6rem',
              borderRadius: '9999px',
              fontSize: '0.725rem',
              fontWeight: 600,
              background: 'rgba(16, 185, 129, 0.12)',
              color: '#34d399',
              border: '1px solid rgba(16, 185, 129, 0.3)'
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#34d399' }} className="pulse-active" />
              Live Telemetry Active
            </span>
          </div>
          <p style={{ color: 'var(--foreground-muted)', fontSize: '0.875rem', marginTop: '0.2rem' }}>
            Auditable step-by-step logs, platform rate limit enforcement, and zero-fabrication safety compliance.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'center' }}>
          <button 
            onClick={handleCopyLogs} 
            className="btn-secondary" 
            style={{ fontSize: '0.8rem', padding: '0.5rem 0.95rem' }}
            title="Copy all logs to clipboard"
          >
            {copied ? <Check size={14} color="#34d399" /> : <Copy size={14} />}
            {copied ? 'Copied!' : 'Copy Logs'}
          </button>

          <button 
            onClick={handleDownloadLogs} 
            className="btn-secondary" 
            style={{ fontSize: '0.8rem', padding: '0.5rem 0.95rem' }}
            title="Export JSON audit logs"
          >
            <Download size={14} /> Export JSON
          </button>

          <button 
            onClick={onClearLogs} 
            className="btn-secondary" 
            style={{ fontSize: '0.8rem', padding: '0.5rem 0.95rem', color: '#fda4af' }}
            title="Clear current log view"
          >
            <Trash2 size={14} /> Clear Logs
          </button>
        </div>
      </div>

      {/* Grid of Security & Compliance Controls */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
        {/* Card 1: Zero Fabrication Policy */}
        <div className="glass-card" style={{ borderLeft: '3px solid #10b981' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#34d399', fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.45rem' }}>
            <ShieldCheck size={18} /> Zero Fabrication Policy
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--foreground-muted)', lineHeight: 1.5 }}>
            The AI engine never invents experience, certifications, titles, or achievements. All generated application materials cite candidate-verified data exclusively.
          </p>
          <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.75rem' }}>
            <span className="tag-pill primary">100% Truthful</span>
            <span className="tag-pill">Deterministic Scoring</span>
          </div>
        </div>

        {/* Card 2: Platform Safeguards & Rate Limits */}
        <div className="glass-card" style={{ borderLeft: '3px solid #6366f1' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#a5b4fc', fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.45rem' }}>
            <Gauge size={18} /> Platform Rate Limits & Quotas
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--foreground-muted)', lineHeight: 1.5 }}>
            Strict daily quotas prevent account flags: LinkedIn capped at 25/day, Naukri capped at 30/day. Jittered 4-12s delays enforced between automated operations.
          </p>
          <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.75rem' }}>
            <span className="tag-pill">LinkedIn: ≤25/day</span>
            <span className="tag-pill">Naukri: ≤30/day</span>
          </div>
        </div>

        {/* Card 3: Human-in-the-Loop Triggers */}
        <div className="glass-card" style={{ borderLeft: '3px solid #f59e0b' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#fbbf24', fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.45rem' }}>
            <AlertOctagon size={18} /> HITL Sensitive Safety Net
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--foreground-muted)', lineHeight: 1.5 }}>
            Applications automatically pause into "Approval Required" state for compensation declarations, visa sponsorship, legal commitments, or CAPTCHA encounters.
          </p>
          <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.75rem' }}>
            <span className="tag-pill" style={{ color: '#fbbf24' }}>Human Approval Required</span>
          </div>
        </div>
      </div>

      {/* Terminal View with Search & Filter Tabs */}
      <div className="glass-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Terminal Controls Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          {/* Filter Pills */}
          <div className="tab-nav">
            <button 
              onClick={() => setFilterType('all')} 
              className={`tab-nav-btn ${filterType === 'all' ? 'active' : ''}`}
            >
              All ({logs.length})
            </button>
            <button 
              onClick={() => setFilterType('info')} 
              className={`tab-nav-btn ${filterType === 'info' ? 'active' : ''}`}
            >
              <Info size={13} color="#818cf8" /> Info
            </button>
            <button 
              onClick={() => setFilterType('success')} 
              className={`tab-nav-btn ${filterType === 'success' ? 'active' : ''}`}
            >
              <CheckCircle2 size={13} color="#34d399" /> Success
            </button>
            <button 
              onClick={() => setFilterType('approval')} 
              className={`tab-nav-btn ${filterType === 'approval' ? 'active' : ''}`}
            >
              <AlertTriangle size={13} color="#fbbf24" /> Warnings & Approvals
            </button>
            <button 
              onClick={() => setFilterType('error')} 
              className={`tab-nav-btn ${filterType === 'error' ? 'active' : ''}`}
            >
              <AlertOctagon size={13} color="#f87171" /> Errors
            </button>
          </div>

          {/* Search Box */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 260 }}>
            <div style={{ position: 'relative', width: '100%' }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--foreground-dim)' }} />
              <input 
                type="text" 
                className="form-control" 
                placeholder="Search audit events..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ paddingLeft: '2rem', paddingRight: '0.75rem', height: 34, fontSize: '0.8rem' }}
              />
            </div>
          </div>
        </div>

        {/* Real-time Monospace Terminal */}
        <div className="terminal-box" style={{ minHeight: 380, maxHeight: 520 }}>
          {filteredLogs.length === 0 ? (
            <div style={{ color: 'var(--foreground-dim)', fontStyle: 'italic', padding: '2rem 1rem', textAlign: 'center' }}>
              {logs.length === 0 
                ? 'No execution logs recorded yet. Click "Start Scanning All Sources" in the header or Dashboard to trigger autonomous job discovery.'
                : 'No logs match the selected filter query.'}
            </div>
          ) : (
            filteredLogs.map(log => {
              const isSuccess = log.type === 'success';
              const isWarning = log.type === 'warning' || log.type === 'approval';
              const isError = log.type === 'error';
              
              const color = isSuccess ? '#34d399' : isWarning ? '#fbbf24' : isError ? '#f87171' : '#c7d2fe';
              const stepColor = isSuccess ? 'rgba(16, 185, 129, 0.2)' : isWarning ? 'rgba(245, 158, 11, 0.2)' : isError ? 'rgba(244, 63, 94, 0.2)' : 'rgba(99, 102, 241, 0.15)';
              const icon = isSuccess ? '✓' : isWarning ? '⚠️' : isError ? '❌' : 'ℹ';

              return (
                <div key={log.id} className="log-line">
                  <span className="log-time">[{log.timestamp}]</span>
                  <span style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    padding: '0.1rem 0.45rem',
                    borderRadius: 4,
                    background: stepColor,
                    color: color,
                    border: `1px solid ${color}40`,
                    minWidth: 84,
                    textAlign: 'center'
                  }}>
                    {log.step}
                  </span>
                  <span style={{ color, flex: 1, wordBreak: 'break-word' }}>
                    <span style={{ marginRight: '0.4rem' }}>{icon}</span>
                    {log.message}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
