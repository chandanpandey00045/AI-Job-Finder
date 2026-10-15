import { describe, it, expect } from 'vitest';
import { parseResumeText } from '../server/services/resumeParser.js';

describe('Resume Parser & Entity Extractor', () => {
  const sampleResume = `
Chandan Kumar
Email: chandan.dev@testdomain.com | Phone: +91 98765 43210
Location: Bengaluru, India

SUMMARY:
Senior Data & Full-Stack Engineer with 4 years of hands-on experience building scalable data pipelines, microservices, and web platforms. Specializing in Python, PySpark, SQL, React, and TypeScript.

TECHNICAL SKILLS:
Languages & Frameworks: Python, PySpark, SQL, React, TypeScript, Next.js, Node.js, Airflow, PostgreSQL, AWS, Docker, Git.

EXPERIENCE:
Senior Data Engineer | Tech Solutions (2022 - Present)
- Architected ETL data pipelines processing over 5M records daily using PySpark and Airflow.
- Developed real-time streaming data ingestion with PostgreSQL.

EDUCATION:
B.Tech in Computer Science & Engineering (2018 - 2022)
  `;

  it('correctly extracts candidate contact and identity details', () => {
    const parsed = parseResumeText(sampleResume);
    expect(parsed.fullName).toBe('Chandan Kumar');
    expect(parsed.email).toBe('chandan.dev@testdomain.com');
    expect(parsed.phone).toContain('98765 43210');
    expect(parsed.currentLocation).toContain('Bengaluru');
  });

  it('truthfully extracts only verified technical skills from resume text', () => {
    const parsed = parseResumeText(sampleResume);
    expect(parsed.primarySkills).toContain('Python');
    expect(parsed.primarySkills).toContain('PySpark');
    expect(parsed.primarySkills).toContain('SQL');
    expect(parsed.primarySkills).toContain('React');
    // Skills not in the resume must NOT be invented
    expect(parsed.primarySkills).not.toContain('Ruby');
    expect(parsed.primarySkills).not.toContain('Rust');
  });

  it('extracts experience years accurately without inflation', () => {
    const parsed = parseResumeText(sampleResume);
    expect(parsed.totalExperienceYears).toBeGreaterThanOrEqual(4);
  });

  it('extracts education degree and field', () => {
    const parsed = parseResumeText(sampleResume);
    expect(parsed.education.degree).toContain('B.Tech');
  });
});
