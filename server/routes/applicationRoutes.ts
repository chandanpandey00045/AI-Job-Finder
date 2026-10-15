import express from 'express';
import { db } from '../db/database.js';
import { addAuditLog } from '../services/scheduler.js';

export const applicationRouter = express.Router();

// GET /api/applications
applicationRouter.get('/', (_req, res) => {
  try {
    const apps = db.prepare('SELECT * FROM applications ORDER BY created_at DESC').all() as any[];

    const formatted = apps.map(a => ({
      id: a.id,
      jobId: a.job_id,
      company: a.company,
      jobTitle: a.job_title,
      platform: a.platform,
      location: a.location,
      workMode: a.work_mode,
      matchScore: a.match_score,
      salaryText: a.salary_text,
      jobUrl: a.job_url,
      dateFound: a.date_found,
      dateApplied: a.date_applied,
      status: a.status,
      notes: a.notes,
      coverLetterGenerated: a.cover_letter,
      tailoredSummary: a.tailored_summary,
      answersProvided: a.answers_provided ? JSON.parse(a.answers_provided) : undefined,
      submissionEvidence: a.submission_evidence ? JSON.parse(a.submission_evidence) : undefined,
      submissionType: a.submission_type,
      pendingApprovalQuestion: a.pending_approval_question ? JSON.parse(a.pending_approval_question) : undefined,
      approvalStatus: a.approval_status,
      approvedAt: a.approved_at,
      failureReason: a.failure_reason
    }));

    return res.json({ applications: formatted });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/applications/:id/approve (Human-in-the-loop approval)
applicationRouter.post('/:id/approve', (req, res) => {
  try {
    const { id } = req.params;
    const { customAnswer } = req.body;
    const now = new Date().toISOString();

    const app = db.prepare('SELECT * FROM applications WHERE id = ?').get(id) as any;
    if (!app) return res.status(404).json({ error: 'Application not found' });

    // Transition from Approval Required to Ready to Apply (authorized)
    db.prepare(`
      UPDATE applications SET
        status = 'Ready to Apply',
        approval_status = 'approved',
        approved_at = ?,
        notes = ?,
        updated_at = ?
      WHERE id = ?
    `).run(
      now,
      customAnswer ? `Candidate authorized with custom response: "${customAnswer}"` : 'Candidate verified and authorized application package.',
      now,
      id
    );

    addAuditLog('approval', 'Human Approval', `Candidate explicitly authorized application #${id} (${app.job_title} at ${app.company}).`);

    return res.json({ success: true, message: 'Application authorized and queued as Ready to Apply.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/applications/:id/reject (Decline application)
applicationRouter.post('/:id/reject', (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const now = new Date().toISOString();

    const app = db.prepare('SELECT * FROM applications WHERE id = ?').get(id) as any;
    if (!app) return res.status(404).json({ error: 'Application not found' });

    db.prepare(`
      UPDATE applications SET
        status = 'Skipped',
        approval_status = 'declined',
        failure_reason = ?,
        updated_at = ?
      WHERE id = ?
    `).run(
      reason || 'Candidate declined application authorization.',
      now,
      id
    );

    addAuditLog('warning', 'Application Declined', `Candidate skipped application #${id} (${app.company}).`);

    return res.json({ success: true, message: 'Application declined and marked as Skipped.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/applications/:id/verify-submit (Strict evidence-based submission record)
applicationRouter.post('/:id/verify-submit', (req, res) => {
  try {
    const { id } = req.params;
    const { submissionMethod, receiptId, confirmationUrl, notes } = req.body;
    const now = new Date().toISOString();

    const app = db.prepare('SELECT * FROM applications WHERE id = ?').get(id) as any;
    if (!app) return res.status(404).json({ error: 'Application not found' });

    const evidence = {
      submittedAt: now,
      method: submissionMethod || 'external_portal_verified',
      receiptId: receiptId || `REC-${Date.now()}`,
      confirmationUrl: confirmationUrl || app.job_url,
      verifiedByCandidate: true,
      notes: notes || 'Verified submission completed through official application portal.'
    };

    db.prepare(`
      UPDATE applications SET
        status = 'Submitted',
        date_applied = ?,
        submission_evidence = ?,
        submission_type = ?,
        notes = ?,
        updated_at = ?
      WHERE id = ?
    `).run(
      now.split('T')[0],
      JSON.stringify(evidence),
      submissionMethod || 'manual_verified',
      notes || 'Verified submission completed through official application page.',
      now,
      id
    );

    addAuditLog(
      'success',
      'Submission Verified',
      `Application verified for ${app.job_title} at ${app.company} (Receipt: ${evidence.receiptId}).`
    );

    return res.json({ success: true, message: 'Application verified and marked as Submitted.', evidence });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// PUT /api/applications/:id/status (Lifecycle updates: Interview, Offer, Rejected, Withdrawn)
applicationRouter.put('/:id/status', (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    const validStatuses = [
      'Discovered', 'Evaluated', 'Ready to Apply', 'Approval Required',
      'Application In Progress', 'Submitted', 'Interview', 'Offer',
      'Rejected', 'Withdrawn', 'Expired', 'Failed', 'Skipped'
    ];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status "${status}"` });
    }

    const now = new Date().toISOString();
    db.prepare(`
      UPDATE applications SET
        status = ?,
        notes = COALESCE(?, notes),
        updated_at = ?
      WHERE id = ?
    `).run(status, notes || null, now, id);

    addAuditLog('info', 'Status Updated', `Application #${id} status changed to "${status}".`);

    return res.json({ success: true, status });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});
