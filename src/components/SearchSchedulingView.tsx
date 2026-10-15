import React, { useState, useEffect } from 'react';
import { fetchSchedule, updateSchedule, triggerJobSearch } from '../api/client';
import { Clock, Play, CheckCircle2, ShieldCheck, AlertCircle, RefreshCw, Zap } from 'lucide-react';

interface SearchSchedulingViewProps {
  onSearchCompleted: () => void;
}

export const SearchSchedulingView: React.FC<SearchSchedulingViewProps> = ({ onSearchCompleted }) => {
  const [schedule, setSchedule] = useState<any>(null);
  const [intervalHours, setIntervalHours] = useState<number>(24);
  const [isActive, setIsActive] = useState<boolean>(true);
  const [running, setRunning] = useState<boolean>(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadSchedule = async () => {
    try {
      const data = await fetchSchedule();
      setSchedule(data);
      if (data) {
        setIntervalHours(data.interval_hours || 24);
        setIsActive(Boolean(data.is_active));
      }
    } catch (err) {
      console.error('Failed to load schedule:', err);
    }
  };

  useEffect(() => {
    loadSchedule();
  }, []);

  const handleSave = async () => {
    try {
      const updated = await updateSchedule(intervalHours, isActive);
      setSchedule(updated.schedule);
      setMsg({ type: 'success', text: 'Search schedule configuration updated successfully.' });
      setTimeout(() => setMsg(null), 3000);
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Failed to update schedule.' });
    }
  };

  const handleRunNow = async () => {
    setRunning(true);
    setMsg(null);
    try {
      const res = await triggerJobSearch();
      setMsg({
        type: 'success',
        text: `Discovery executed successfully! Found ${res.jobsFound} jobs, added & evaluated ${res.jobsAdded} postings.`
      });
      loadSchedule();
      onSearchCompleted();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Discovery run failed.' });
    } finally {
      setRunning(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#FFF' }}>
            Automated Search Scheduling & Background Queue
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Configure recurring autonomous discovery across connected sources without keeping browser tabs open.
          </p>
        </div>

        <button
          onClick={handleRunNow}
          disabled={running}
          className="btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          {running ? <RefreshCw size={16} className="spin" /> : <Play size={16} />}
          {running ? 'Running Discovery...' : 'Run Discovery Now'}
        </button>
      </div>

      {msg && (
        <div style={{
          padding: '0.85rem',
          borderRadius: '6px',
          fontSize: '0.875rem',
          background: msg.type === 'success' ? 'rgba(52, 211, 153, 0.15)' : 'rgba(239, 68, 68, 0.15)',
          color: msg.type === 'success' ? '#34D399' : '#F87171'
        }}>
          {msg.text}
        </div>
      )}

      {/* Configuration Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1.5rem' }}>
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#FFF', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Clock size={18} color="#818CF8" /> Recurrence Settings
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label className="input-label">Discovery Interval</label>
              <select
                className="form-input"
                value={intervalHours}
                onChange={e => setIntervalHours(parseInt(e.target.value, 10))}
              >
                <option value={6}>Every 6 Hours</option>
                <option value={12}>Every 12 Hours</option>
                <option value={24}>Every 24 Hours (Daily)</option>
                <option value={48}>Every 48 Hours</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', paddingTop: '0.5rem' }}>
              <input
                type="checkbox"
                id="sched-active"
                checked={isActive}
                onChange={e => setIsActive(e.target.checked)}
                style={{ width: 18, height: 18, accentColor: '#818CF8' }}
              />
              <label htmlFor="sched-active" style={{ fontSize: '0.9rem', color: '#FFF', fontWeight: 600, cursor: 'pointer' }}>
                Enable Background Scheduled Discovery Worker
              </label>
            </div>

            <div style={{ paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={handleSave} className="btn-primary" style={{ fontSize: '0.875rem' }}>
                Save Schedule Settings
              </button>
            </div>
          </div>
        </div>

        {/* Status Overview Card */}
        <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#FFF', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Zap size={18} color="#34D399" /> Scheduler Status
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Status:</span>
                <span style={{ color: isActive ? '#34D399' : '#FBBF24', fontWeight: 600 }}>
                  {isActive ? 'Active (Background Worker)' : 'Paused'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Last Run:</span>
                <span style={{ color: '#FFF' }}>
                  {schedule?.last_run_at ? new Date(schedule.last_run_at).toLocaleString() : 'Not executed yet'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Last Status:</span>
                <span style={{ color: '#818CF8', fontWeight: 600 }}>
                  {schedule?.last_status || 'Ready'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Last Jobs Added:</span>
                <span style={{ color: '#FFF', fontWeight: 600 }}>
                  {schedule?.last_jobs_found || 0}
                </span>
              </div>
            </div>
          </div>

          <div style={{ marginTop: '1.5rem', padding: '0.75rem', background: 'rgba(0,0,0,0.25)', borderRadius: '6px', fontSize: '0.75rem', color: '#9CA3AF' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#F3F4F6', fontWeight: 600, marginBottom: '0.25rem' }}>
              <ShieldCheck size={14} color="#34D399" /> Platform Safe Bounds
            </div>
            Scheduled discovery runs obey rate limits (e.g. LinkedIn max 25, Naukri max 30) and introduce delays between requests.
          </div>
        </div>
      </div>
    </div>
  );
};
