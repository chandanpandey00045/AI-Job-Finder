import React, { useState, useEffect } from 'react';
import { SourceHealthItem } from '../types';
import { fetchSources, fetchSearchUrls, importAssistedJob } from '../api/client';
import { Globe, ExternalLink, ShieldCheck, CheckCircle2, AlertCircle, AlertTriangle, RefreshCw, Plus, FileText, ArrowRight } from 'lucide-react';

interface ConnectedSourcesViewProps {
  onJobImported: () => void;
}

export const ConnectedSourcesView: React.FC<ConnectedSourcesViewProps> = ({ onJobImported }) => {
  const [sources, setSources] = useState<SourceHealthItem[]>([]);
  const [searchUrls, setSearchUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importForm, setImportForm] = useState({
    title: '',
    company: '',
    location: '',
    workMode: 'Hybrid',
    jobUrl: '',
    description: '',
    platform: 'LinkedIn'
  });
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [srcs, urls] = await Promise.all([fetchSources(), fetchSearchUrls()]);
      setSources(srcs);
      setSearchUrls(urls);
    } catch (err: any) {
      console.error('Failed to load sources:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importForm.title || !importForm.company || !importForm.jobUrl) {
      setImportMsg({ type: 'error', text: 'Title, company, and job URL are required.' });
      return;
    }

    setImporting(true);
    setImportMsg(null);
    try {
      const res = await importAssistedJob(importForm);
      setImportMsg({
        type: 'success',
        text: `Successfully imported "${importForm.title}"! Match score: ${res.matchScore}%. Status: ${res.status}.`
      });
      setImportForm({
        title: '',
        company: '',
        location: '',
        workMode: 'Hybrid',
        jobUrl: '',
        description: '',
        platform: 'LinkedIn'
      });
      onJobImported();
      setTimeout(() => setShowImportModal(false), 2000);
    } catch (err: any) {
      setImportMsg({ type: 'error', text: err.message || 'Import failed.' });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#FFF' }}>
            Connected Job Sources & Platform Adapters
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Multi-source integration layer. Shows live API connections, platform terms-of-service bounds, and honest assisted fallbacks.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={() => setShowImportModal(true)} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Plus size={16} /> Import Job Manually
          </button>
          <button onClick={loadData} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <RefreshCw size={16} /> Refresh Health
          </button>
        </div>
      </div>

      {/* Sources Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.25rem' }}>
        {sources.map(src => {
          const isConnected = src.status === 'connected';
          const isFallback = src.status === 'fallback_active';
          const isUnconfigured = src.status === 'unconfigured';

          const badgeColor = isConnected ? '#34D399' : isFallback ? '#60A5FA' : isUnconfigured ? '#FBBF24' : '#F87171';
          const badgeBg = isConnected ? 'rgba(52, 211, 153, 0.15)' : isFallback ? 'rgba(96, 165, 250, 0.15)' : 'rgba(251, 191, 36, 0.15)';
          const searchUrl = searchUrls[src.sourceId];

          return (
            <div key={src.sourceId} className="glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Globe size={18} color="#818CF8" />
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#FFF' }}>{src.sourceName}</h3>
                  </div>
                  <span style={{
                    padding: '0.2rem 0.55rem',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: badgeColor,
                    background: badgeBg
                  }}>
                    {isConnected ? 'Direct API Connected' : isFallback ? 'Honest Fallback Active' : isUnconfigured ? 'Requires Config' : 'Error'}
                  </span>
                </div>

                <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', lineHeight: 1.45, marginBottom: '0.75rem' }}>
                  {src.message}
                </p>

                {src.details && (
                  <div style={{ background: 'rgba(0,0,0,0.25)', padding: '0.6rem 0.75rem', borderRadius: '6px', fontSize: '0.75rem', color: '#D1D5DB', marginBottom: '0.75rem' }}>
                    {src.details}
                  </div>
                )}
              </div>

              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                  Daily Limit: {src.dailyLimit} requests
                </span>

                {searchUrl && (
                  <a
                    href={searchUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-secondary"
                    style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                  >
                    Open Deep Search <ExternalLink size={12} />
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Manual Import Modal */}
      {showImportModal && (
        <div className="modal-overlay" onClick={() => setShowImportModal(false)}>
          <div className="modal-content" style={{ maxWidth: '620px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#FFF' }}>Assisted Job Importer</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Paste a real vacancy from LinkedIn, Naukri, or Indeed for verified 2-stage matching and zero-fabrication preparation.
                </p>
              </div>
              <button onClick={() => setShowImportModal(false)} className="btn-secondary">✕</button>
            </div>

            {importMsg && (
              <div style={{
                padding: '0.75rem',
                borderRadius: '6px',
                marginBottom: '1rem',
                fontSize: '0.85rem',
                background: importMsg.type === 'success' ? 'rgba(52, 211, 153, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                color: importMsg.type === 'success' ? '#34D399' : '#F87171'
              }}>
                {importMsg.text}
              </div>
            )}

            <form onSubmit={handleImportSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label className="input-label">Job Title *</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    value={importForm.title}
                    onChange={e => setImportForm({ ...importForm, title: e.target.value })}
                    placeholder="e.g. Senior Data Engineer"
                  />
                </div>
                <div>
                  <label className="input-label">Company Name *</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    value={importForm.company}
                    onChange={e => setImportForm({ ...importForm, company: e.target.value })}
                    placeholder="e.g. Microsoft"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                <div>
                  <label className="input-label">Platform</label>
                  <select
                    className="form-input"
                    value={importForm.platform}
                    onChange={e => setImportForm({ ...importForm, platform: e.target.value })}
                  >
                    <option value="LinkedIn">LinkedIn</option>
                    <option value="Naukri">Naukri.com</option>
                    <option value="Indeed">Indeed</option>
                    <option value="Wellfound">Wellfound</option>
                    <option value="Foundit">Foundit</option>
                    <option value="Career Page">Career Page</option>
                  </select>
                </div>
                <div>
                  <label className="input-label">Location</label>
                  <input
                    type="text"
                    className="form-input"
                    value={importForm.location}
                    onChange={e => setImportForm({ ...importForm, location: e.target.value })}
                    placeholder="e.g. Bengaluru"
                  />
                </div>
                <div>
                  <label className="input-label">Work Mode</label>
                  <select
                    className="form-input"
                    value={importForm.workMode}
                    onChange={e => setImportForm({ ...importForm, workMode: e.target.value })}
                  >
                    <option value="Remote">Remote</option>
                    <option value="Hybrid">Hybrid</option>
                    <option value="On-site">On-site</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="input-label">Official Job URL *</label>
                <input
                  type="url"
                  required
                  className="form-input"
                  value={importForm.jobUrl}
                  onChange={e => setImportForm({ ...importForm, jobUrl: e.target.value })}
                  placeholder="https://in.linkedin.com/jobs/view/..."
                />
              </div>

              <div>
                <label className="input-label">Job Description / Requirements</label>
                <textarea
                  rows={4}
                  className="form-input"
                  value={importForm.description}
                  onChange={e => setImportForm({ ...importForm, description: e.target.value })}
                  placeholder="Paste description or key skills required..."
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setShowImportModal(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={importing} className="btn-primary">
                  {importing ? 'Importing & Scoring...' : 'Import & Evaluate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
