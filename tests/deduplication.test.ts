import { describe, it, expect } from 'vitest';
import { canonicalizeUrl, generateJobFingerprint, isDuplicateJob } from '../server/services/deduplication.js';
import { DiscoveredJob } from '../server/adapters/baseAdapter.js';

describe('Deduplication Engine', () => {
  it('strips tracking query parameters and normalizes URLs', () => {
    const rawUrl = 'https://in.linkedin.com/jobs/view/123456?utm_source=feed&ref=dashboard&trackingId=xyz#desc';
    const canonical = canonicalizeUrl(rawUrl);
    expect(canonical).toBe('https://in.linkedin.com/jobs/view/123456');
  });

  it('detects duplicate job when canonical URL matches', () => {
    const newJob: any = {
      id: 'job-new',
      jobUrl: 'https://example.com/jobs/data-eng?utm_source=google',
      company: 'Tech Corp',
      title: 'Data Engineer'
    };

    const existingList: any[] = [
      {
        id: 'job-existing-1',
        canonical_url: 'https://example.com/jobs/data-eng',
        company: 'Tech Corp',
        title: 'Data Engineer'
      }
    ];

    const result = isDuplicateJob(newJob, existingList);
    expect(result.isDuplicate).toBe(true);
    expect(result.duplicateOfId).toBe('job-existing-1');
  });

  it('detects duplicate job when external ID and platform match', () => {
    const newJob: any = {
      id: 'job-new-2',
      jobUrl: 'https://remotive.com/jobs/111',
      sourcePlatform: 'Remotive',
      externalJobId: '111',
      company: 'Acme',
      title: 'Senior Engineer'
    };

    const existingList: any[] = [
      {
        id: 'job-old-2',
        source_platform: 'Remotive',
        external_job_id: '111',
        company: 'Acme',
        title: 'Senior Engineer'
      }
    ];

    const result = isDuplicateJob(newJob, existingList);
    expect(result.isDuplicate).toBe(true);
    expect(result.duplicateOfId).toBe('job-old-2');
  });

  it('allows distinct requisitions at the same company', () => {
    const newJob: any = {
      id: 'job-req-2',
      jobUrl: 'https://example.com/careers/lead-architect',
      company: 'Tech Corp',
      title: 'Lead Architect'
    };

    const existingList: any[] = [
      {
        id: 'job-req-1',
        canonical_url: 'https://example.com/careers/data-engineer',
        company: 'Tech Corp',
        title: 'Data Engineer'
      }
    ];

    const result = isDuplicateJob(newJob, existingList);
    expect(result.isDuplicate).toBe(false);
  });
});
