import { describe, it, expect } from 'vitest';
import { evaluateJobTwoStage } from '../server/services/scoringEngine.js';
import { defaultProfile } from '../src/data/defaultProfile.js';
import { DiscoveredJob } from '../server/adapters/baseAdapter.js';

describe('Two-Stage Job Evaluation Engine', () => {
  const baseJob: DiscoveredJob = {
    id: 'test-job-1',
    sourcePlatform: 'Remotive',
    canonicalUrl: 'https://example.com/job-1',
    title: 'Senior Data Engineer',
    company: 'Innovatech Inc',
    location: 'Bengaluru',
    workMode: 'Remote',
    salaryMin: 2200000,
    salaryMax: 3000000,
    salaryCurrency: 'INR',
    expMin: 3,
    expMax: 6,
    requiredSkills: ['Python', 'PySpark', 'SQL', 'Airflow'],
    preferredSkills: ['AWS'],
    educationRequired: "Bachelor's Degree",
    industry: 'Information Technology',
    description: 'Looking for a Senior Data Engineer with PySpark and SQL experience.',
    jobUrl: 'https://example.com/job-1',
    postedDate: '2026-10-01',
    sourceVerificationStatus: 'verified',
    applicationMethod: 'external_portal',
    jobStatus: 'active'
  };

  it('awards high match score for well-aligned candidate profile', () => {
    const result = evaluateJobTwoStage(baseJob, defaultProfile, 75);
    expect(result.passedHardFilters).toBe(true);
    expect(result.totalScore).toBeGreaterThanOrEqual(80);
    expect(result.matchedSkills).toContain('Python');
    expect(result.matchedSkills).toContain('PySpark');
    expect(result.matchedSkills).toContain('SQL');
    expect(result.confidenceScore).toBe(100);
  });

  it('Stage A: rejects company in avoidance list with zero score', () => {
    const blacklistedJob: DiscoveredJob = {
      ...baseJob,
      company: 'Scam Technologies Pvt Ltd'
    };
    const result = evaluateJobTwoStage(blacklistedJob, defaultProfile, 75);
    expect(result.passedHardFilters).toBe(false);
    expect(result.totalScore).toBe(0);
    expect(result.rejectionReason).toContain('avoidance list');
  });

  it('Stage A: rejects suspicious or fraudulent listing', () => {
    const suspiciousJob: DiscoveredJob = {
      ...baseJob,
      isSuspicious: true,
      suspiciousReason: 'Unsolicited wire transfer request.'
    };
    const result = evaluateJobTwoStage(suspiciousJob, defaultProfile, 75);
    expect(result.passedHardFilters).toBe(false);
    expect(result.rejectionReason).toContain('wire transfer');
  });

  it('Stage A: rejects role requiring substantially higher experience (> candidate + 3 yrs)', () => {
    const seniorExecJob: DiscoveredJob = {
      ...baseJob,
      expMin: 12, // Candidate has 4 yrs
      expMax: 15
    };
    const result = evaluateJobTwoStage(seniorExecJob, defaultProfile, 75);
    expect(result.passedHardFilters).toBe(false);
    expect(result.rejectionReason).toContain('significantly exceeds');
  });

  it('Stage B: discloses missing fields and reduces confidence score when data is incomplete', () => {
    const sparseJob: DiscoveredJob = {
      ...baseJob,
      salaryMin: undefined,
      salaryMax: undefined,
      requiredSkills: []
    };
    const result = evaluateJobTwoStage(sparseJob, defaultProfile, 75);
    expect(result.missingDataFields).toContain('salary_range');
    expect(result.missingDataFields).toContain('required_skills');
    expect(result.confidenceScore).toBeLessThan(100);
  });
});
