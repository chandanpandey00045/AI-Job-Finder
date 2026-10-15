import express from 'express';
import { db } from '../db/database.js';
import { executeScheduledSearch } from '../services/scheduler.js';

export const scheduleRouter = express.Router();

// GET /api/schedule
scheduleRouter.get('/', (_req, res) => {
  try {
    const schedule = db.prepare('SELECT * FROM search_schedules WHERE id = "default_schedule"').get();
    return res.json({ schedule });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// PUT /api/schedule
scheduleRouter.put('/', (req, res) => {
  try {
    const { intervalHours, isActive } = req.body;
    db.prepare(`
      UPDATE search_schedules SET
        interval_hours = COALESCE(?, interval_hours),
        is_active = COALESCE(?, is_active)
      WHERE id = 'default_schedule'
    `).run(intervalHours ?? null, isActive !== undefined ? (isActive ? 1 : 0) : null);

    const updated = db.prepare('SELECT * FROM search_schedules WHERE id = "default_schedule"').get();
    return res.json({ success: true, schedule: updated });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/schedule/run-now
scheduleRouter.post('/run-now', async (_req, res) => {
  try {
    const result = await executeScheduledSearch();
    return res.json({ success: true, ...result });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/logs
scheduleRouter.get('/logs', (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string || '100', 10);
    const logs = db.prepare('SELECT * FROM audit_logs ORDER BY rowid DESC LIMIT ?').all(limit);
    return res.json({ logs });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// DELETE /api/logs
scheduleRouter.delete('/logs', (_req, res) => {
  try {
    db.prepare('DELETE FROM audit_logs').run();
    return res.json({ success: true, message: 'Audit logs cleared' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/dashboard/stats (Strictly computed from persistent database records)
scheduleRouter.get('/dashboard/stats', (_req, res) => {
  try {
    const totalDiscovered = (db.prepare('SELECT count(*) as count FROM discovered_jobs').get() as any).count;
    const uniqueJobs = (db.prepare('SELECT count(*) as count FROM discovered_jobs WHERE is_duplicate = 0').get() as any).count;
    const highMatch = (db.prepare('SELECT count(*) as count FROM job_evaluations WHERE total_score >= 75 AND passed_hard_filters = 1').get() as any).count;
    
    const apps = db.prepare('SELECT status, platform, match_score FROM applications').all() as any[];
    
    const readyToApply = apps.filter(a => a.status === 'Ready to Apply').length;
    const pendingApprovals = apps.filter(a => a.status === 'Approval Required').length;
    const submitted = apps.filter(a => a.status === 'Submitted').length;
    const interview = apps.filter(a => a.status === 'Interview').length;
    const offer = apps.filter(a => a.status === 'Offer').length;
    const skipped = apps.filter(a => a.status === 'Skipped' || a.status === 'Rejected').length;

    // Platform distribution
    const sourceBreakdown: Record<string, number> = {};
    for (const a of apps) {
      sourceBreakdown[a.platform] = (sourceBreakdown[a.platform] || 0) + 1;
    }

    return res.json({
      stats: {
        totalDiscovered,
        uniqueJobs,
        highMatch,
        readyToApply,
        pendingApprovals,
        submitted,
        interview,
        offer,
        skipped,
        sourceBreakdown
      }
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});
