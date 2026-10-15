import crypto from 'crypto';
import { DiscoveredJob } from '../adapters/baseAdapter.js';

export function canonicalizeUrl(rawUrl: string): string {
  try {
    const urlObj = new URL(rawUrl);
    // Remove tracking query parameters
    const trackingParams = [
      'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
      'ref', 'refId', 'trackingId', 'trk', 'midToken', 'trkEmail', 'src',
      'fbclid', 'gclid', 'msclkid', 'source', 'f', 'from', 'spJobId'
    ];
    for (const p of trackingParams) {
      urlObj.searchParams.delete(p);
    }
    // Remove trailing slash
    let pathname = urlObj.pathname.replace(/\/+$/, '');
    return `${urlObj.protocol}//${urlObj.hostname.toLowerCase()}${pathname}${urlObj.search ? urlObj.search : ''}`;
  } catch (err) {
    return rawUrl.trim().toLowerCase().split('?')[0].replace(/\/+$/, '');
  }
}

export function generateJobFingerprint(job: { company: string; title: string; location?: string }): string {
  const normCompany = job.company.toLowerCase().replace(/[^a-z0-9]/g, '');
  const normTitle = job.title.toLowerCase().replace(/[^a-z0-9]/g, '');
  const normLoc = (job.location || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 15);
  return crypto.createHash('sha256').update(`${normCompany}:${normTitle}:${normLoc}`).digest('hex');
}

export function isDuplicateJob(
  job: DiscoveredJob,
  existingJobs: Array<{ canonicalUrl?: string; company: string; title: string; externalJobId?: string }>
): { isDuplicate: boolean; duplicateOfId?: string; reason?: string } {
  const targetCanonical = canonicalizeUrl(job.jobUrl);

  for (const existing of existingJobs as any[]) {
    // 1. Direct Canonical URL match
    if (existing.canonical_url && canonicalizeUrl(existing.canonical_url) === targetCanonical) {
      return {
        isDuplicate: true,
        duplicateOfId: existing.id,
        reason: 'Canonical job URL already exists in database.'
      };
    }

    // 2. Same external job ID on same platform
    if (
      job.externalJobId &&
      existing.external_job_id &&
      job.sourcePlatform === existing.source_platform &&
      job.externalJobId === existing.external_job_id
    ) {
      return {
        isDuplicate: true,
        duplicateOfId: existing.id,
        reason: `Matching external job ID ${job.externalJobId} on ${job.sourcePlatform}.`
      };
    }

    // 3. Exact Company + Normalized Title match
    const existingFingerprint = generateJobFingerprint(existing);
    const targetFingerprint = generateJobFingerprint(job);
    if (existingFingerprint === targetFingerprint) {
      return {
        isDuplicate: true,
        duplicateOfId: existing.id,
        reason: `Identical role at ${job.company} ("${job.title}").`
      };
    }
  }

  return { isDuplicate: false };
}
