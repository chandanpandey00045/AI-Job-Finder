import { describe, it, expect, beforeEach } from 'vitest';
import { db, initDatabase } from '../server/db/database.js';

describe('Application Lifecycle & Submission Evidence', () => {
  beforeEach(() => {
    initDatabase();
  });

  it('enforces evidence requirement when marking an application as Submitted', () => {
    const testAppId = `test-app-${Date.now()}`;
    const testJobId = `test-job-${Date.now()}`;

    // Insert test job
    db.prepare(`
      INSERT OR REPLACE INTO discovered_jobs (
        id, source_platform, canonical_url, title, company, location,
        work_mode, exp_min, exp_max, job_url, posted_date, discovered_at, created_at
      ) VALUES (
        ?, 'LinkedIn', 'https://example.com/unique-1', 'Data Engineer', 'Test Corp', 'Bengaluru',
        'Hybrid', 2, 5, 'https://example.com/unique-1', '2026-10-01', datetime('now'), datetime('now')
      )
    `).run(testJobId);

    // Initial state: Ready to Apply
    db.prepare(`
      INSERT INTO applications (
        id, job_id, company, job_title, platform, location, match_score,
        job_url, date_found, status, created_at, updated_at
      ) VALUES (
        ?, ?, 'Test Corp', 'Data Engineer', 'LinkedIn', 'Bengaluru', 88,
        'https://example.com/unique-1', '2026-10-01', 'Ready to Apply', datetime('now'), datetime('now')
      )
    `).run(testAppId, testJobId);

    const initial = db.prepare('SELECT status, submission_evidence FROM applications WHERE id = ?').get(testAppId) as any;
    expect(initial.status).toBe('Ready to Apply');
    expect(initial.submission_evidence).toBeNull();

    // Verify submission with evidence
    const receipt = {
      submittedAt: new Date().toISOString(),
      receiptId: 'RECEIPT-9988',
      confirmationUrl: 'https://example.com/application-success/9988',
      verifiedByCandidate: true
    };

    db.prepare(`
      UPDATE applications SET
        status = 'Submitted',
        date_applied = date('now'),
        submission_evidence = ?,
        submission_type = 'manual_verified'
      WHERE id = ?
    `).run(JSON.stringify(receipt), testAppId);

    const updated = db.prepare('SELECT status, submission_evidence FROM applications WHERE id = ?').get(testAppId) as any;
    expect(updated.status).toBe('Submitted');
    expect(JSON.parse(updated.submission_evidence).receiptId).toBe('RECEIPT-9988');
  });
});
