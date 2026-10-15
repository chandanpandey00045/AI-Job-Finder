import { describe, it, expect } from 'vitest';
import { generateApplicationMaterials } from '../server/services/aiTailorEngine.js';
import { defaultProfile } from '../src/data/defaultProfile.js';
import { DiscoveredJob } from '../server/adapters/baseAdapter.js';

describe('AI Application Materials & Zero Fabrication Engine', () => {
  const sampleJob: DiscoveredJob = {
    id: 'test-job-pyspark',
    sourcePlatform: 'LinkedIn',
    canonicalUrl: 'https://example.com/pyspark-role',
    title: 'Senior Data Engineer - PySpark',
    company: 'Equal Experts',
    location: 'Bengaluru',
    workMode: 'Hybrid',
    salaryCurrency: 'INR',
    expMin: 3,
    expMax: 6,
    requiredSkills: ['PySpark', 'SQL', 'Python'],
    preferredSkills: ['Docker'],
    educationRequired: 'B.Tech',
    industry: 'IT Services',
    description: 'PySpark pipeline engineer needed.',
    jobUrl: 'https://example.com/pyspark-role',
    postedDate: '2026-10-01',
    sourceVerificationStatus: 'verified',
    applicationMethod: 'external_portal',
    jobStatus: 'active',
    screeningQuestions: [
      { id: 'q1', question: 'What is your current notice period?', type: 'text' },
      { id: 'q2', question: 'What is your expected CTC in INR?', type: 'sensitive', isSensitive: true },
      { id: 'q3', question: 'Are you authorized to work in India without sponsorship?', type: 'sensitive', isSensitive: true }
    ]
  };

  it('generates a truthful cover letter using only verified profile data', () => {
    const materials = generateApplicationMaterials(defaultProfile, sampleJob);
    expect(materials.coverLetter).toContain('Equal Experts');
    expect(materials.coverLetter).toContain('Chandan Kumar');
    expect(materials.coverLetter).toContain('PySpark');
    expect(materials.coverLetter).toContain('30 days'); // Notice period
    // Must NOT invent fake skills
    expect(materials.coverLetter).not.toContain('Solidity');
    expect(materials.coverLetter).not.toContain('Rust');
  });

  it('flags sensitive screening questions for human approval', () => {
    const materials = generateApplicationMaterials(defaultProfile, sampleJob);
    const salaryQ = materials.screeningAnswers.find(q => q.questionId === 'q2');
    expect(salaryQ).toBeDefined();
    expect(salaryQ?.requiresApproval).toBe(true);
    expect(salaryQ?.isSensitive).toBe(true);
    expect(salaryQ?.reason).toContain('Salary');
  });

  it('safely auto-answers standard factual questions from profile', () => {
    const materials = generateApplicationMaterials(defaultProfile, sampleJob);
    const noticeQ = materials.screeningAnswers.find(q => q.questionId === 'q1');
    expect(noticeQ).toBeDefined();
    expect(noticeQ?.requiresApproval).toBe(false);
    expect(noticeQ?.suggestedAnswer).toBe('30 Days');
  });
});
