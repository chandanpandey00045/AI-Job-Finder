import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { config } from '../config.js';
import { defaultProfile } from '../../src/data/defaultProfile.js';

// Ensure data directory exists
const dbDir = path.dirname(config.databasePath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

export const db = new Database(config.databasePath);

// Enable WAL mode and foreign keys for high performance and integrity
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS candidate_profiles (
      id TEXT PRIMARY KEY,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT,
      current_title TEXT,
      total_experience_years REAL DEFAULT 0,
      primary_skills TEXT DEFAULT '[]',
      secondary_skills TEXT DEFAULT '[]',
      education TEXT DEFAULT '{}',
      preferred_titles TEXT DEFAULT '[]',
      preferred_industries TEXT DEFAULT '[]',
      preferred_locations TEXT DEFAULT '[]',
      work_mode_preference TEXT DEFAULT 'Any',
      min_expected_salary REAL DEFAULT 0,
      currency TEXT DEFAULT 'INR',
      notice_period_days INTEGER DEFAULT 30,
      current_location TEXT,
      willingness_to_relocate TEXT DEFAULT 'Yes',
      preferred_employment_type TEXT DEFAULT 'Full-time',
      target_companies TEXT DEFAULT '[]',
      companies_to_avoid TEXT DEFAULT '[]',
      job_types_to_avoid TEXT DEFAULT '[]',
      resume_text TEXT DEFAULT '',
      profile_summary TEXT DEFAULT '',
      work_authorization TEXT DEFAULT '',
      has_visa_sponsorship INTEGER DEFAULT 0,
      legal_declarations_verified INTEGER DEFAULT 1,
      max_daily_applications INTEGER DEFAULT 25,
      max_job_age_days INTEGER DEFAULT 14,
      min_match_score INTEGER DEFAULT 75,
      original_resume_filename TEXT,
      resume_file_path TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS discovered_jobs (
      id TEXT PRIMARY KEY,
      source_platform TEXT NOT NULL,
      external_job_id TEXT,
      canonical_url TEXT,
      title TEXT NOT NULL,
      company TEXT NOT NULL,
      location TEXT,
      work_mode TEXT DEFAULT 'On-site',
      salary_min REAL,
      salary_max REAL,
      salary_currency TEXT DEFAULT 'INR',
      exp_min REAL DEFAULT 0,
      exp_max REAL DEFAULT 10,
      required_skills TEXT DEFAULT '[]',
      preferred_skills TEXT DEFAULT '[]',
      education_required TEXT DEFAULT '',
      industry TEXT DEFAULT '',
      description TEXT DEFAULT '',
      job_url TEXT NOT NULL,
      posted_date TEXT,
      discovered_at TEXT NOT NULL,
      last_verified_at TEXT,
      source_verification_status TEXT DEFAULT 'verified',
      application_method TEXT DEFAULT 'external_portal',
      job_status TEXT DEFAULT 'active',
      is_duplicate INTEGER DEFAULT 0,
      duplicate_of_id TEXT,
      is_suspicious INTEGER DEFAULT 0,
      suspicious_reason TEXT,
      screening_questions TEXT DEFAULT '[]',
      raw_data TEXT DEFAULT '{}',
      created_at TEXT NOT NULL
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_discovered_jobs_canonical ON discovered_jobs(canonical_url);
    CREATE INDEX IF NOT EXISTS idx_discovered_jobs_company_title ON discovered_jobs(company, title);

    CREATE TABLE IF NOT EXISTS job_evaluations (
      job_id TEXT PRIMARY KEY,
      total_score INTEGER NOT NULL,
      skills_score REAL NOT NULL,
      experience_score REAL NOT NULL,
      title_score REAL NOT NULL,
      location_score REAL NOT NULL,
      salary_score REAL NOT NULL,
      education_score REAL NOT NULL,
      company_score REAL NOT NULL,
      confidence_score INTEGER NOT NULL DEFAULT 100,
      passed_hard_filters INTEGER NOT NULL,
      rejection_reason TEXT,
      matched_skills TEXT DEFAULT '[]',
      missing_required_skills TEXT DEFAULT '[]',
      missing_data_fields TEXT DEFAULT '[]',
      recommendation_reason TEXT,
      evaluated_at TEXT NOT NULL,
      FOREIGN KEY (job_id) REFERENCES discovered_jobs(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS applications (
      id TEXT PRIMARY KEY,
      job_id TEXT UNIQUE NOT NULL,
      company TEXT NOT NULL,
      job_title TEXT NOT NULL,
      platform TEXT NOT NULL,
      location TEXT,
      work_mode TEXT DEFAULT 'On-site',
      match_score INTEGER NOT NULL,
      salary_text TEXT DEFAULT 'Competitive',
      job_url TEXT NOT NULL,
      date_found TEXT NOT NULL,
      date_applied TEXT,
      status TEXT NOT NULL,
      notes TEXT,
      cover_letter TEXT,
      tailored_summary TEXT,
      tailored_skills TEXT DEFAULT '[]',
      answers_provided TEXT DEFAULT '{}',
      submission_evidence TEXT,
      submission_type TEXT DEFAULT 'manual_assisted',
      pending_approval_question TEXT,
      approval_status TEXT DEFAULT 'none',
      approved_at TEXT,
      failure_reason TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (job_id) REFERENCES discovered_jobs(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);

    CREATE TABLE IF NOT EXISTS search_schedules (
      id TEXT PRIMARY KEY,
      interval_hours INTEGER DEFAULT 24,
      roles TEXT DEFAULT '[]',
      locations TEXT DEFAULT '[]',
      is_active INTEGER DEFAULT 1,
      last_run_at TEXT,
      next_run_at TEXT,
      last_status TEXT,
      last_jobs_found INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      timestamp TEXT NOT NULL,
      type TEXT NOT NULL,
      step TEXT NOT NULL,
      message TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS job_sources_config (
      source_id TEXT PRIMARY KEY,
      source_name TEXT NOT NULL,
      category TEXT NOT NULL,
      status TEXT NOT NULL,
      requires_auth INTEGER DEFAULT 0,
      daily_limit INTEGER DEFAULT 50,
      today_requests_count INTEGER DEFAULT 0,
      last_request_at TEXT,
      fallback_strategy TEXT,
      details TEXT
    );
  `);

  // Seed default candidate profile if not present
  const profileCount = db.prepare('SELECT count(*) as count FROM candidate_profiles').get() as { count: number };
  if (profileCount.count === 0) {
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO candidate_profiles (
        id, full_name, email, phone, current_title, total_experience_years,
        primary_skills, secondary_skills, education, preferred_titles,
        preferred_industries, preferred_locations, work_mode_preference,
        min_expected_salary, currency, notice_period_days, current_location,
        willingness_to_relocate, preferred_employment_type, target_companies,
        companies_to_avoid, job_types_to_avoid, resume_text, profile_summary,
        work_authorization, has_visa_sponsorship, legal_declarations_verified,
        max_daily_applications, max_job_age_days, min_match_score, created_at, updated_at
      ) VALUES (
        @id, @full_name, @email, @phone, @current_title, @total_experience_years,
        @primary_skills, @secondary_skills, @education, @preferred_titles,
        @preferred_industries, @preferred_locations, @work_mode_preference,
        @min_expected_salary, @currency, @notice_period_days, @current_location,
        @willingness_to_relocate, @preferred_employment_type, @target_companies,
        @companies_to_avoid, @job_types_to_avoid, @resume_text, @profile_summary,
        @work_authorization, @has_visa_sponsorship, @legal_declarations_verified,
        @max_daily_applications, @max_job_age_days, @min_match_score, @created_at, @updated_at
      )
    `).run({
      id: 'default_profile',
      full_name: defaultProfile.fullName,
      email: defaultProfile.email,
      phone: defaultProfile.phone,
      current_title: defaultProfile.currentTitle,
      total_experience_years: defaultProfile.totalExperienceYears,
      primary_skills: JSON.stringify(defaultProfile.primarySkills),
      secondary_skills: JSON.stringify(defaultProfile.secondarySkills),
      education: JSON.stringify(defaultProfile.education),
      preferred_titles: JSON.stringify(defaultProfile.preferredTitles),
      preferred_industries: JSON.stringify(defaultProfile.preferredIndustries),
      preferred_locations: JSON.stringify(defaultProfile.preferredLocations),
      work_mode_preference: defaultProfile.workModePreference,
      min_expected_salary: defaultProfile.minExpectedSalary,
      currency: defaultProfile.currency,
      notice_period_days: defaultProfile.noticePeriodDays,
      current_location: defaultProfile.currentLocation,
      willingness_to_relocate: defaultProfile.willingnessToRelocate,
      preferred_employment_type: defaultProfile.preferredEmploymentType,
      target_companies: JSON.stringify(defaultProfile.targetCompanies),
      companies_to_avoid: JSON.stringify(defaultProfile.companiesToAvoid),
      job_types_to_avoid: JSON.stringify(defaultProfile.jobTypesToAvoid),
      resume_text: defaultProfile.resumeText,
      profile_summary: defaultProfile.profileSummary,
      work_authorization: defaultProfile.workAuthorization,
      has_visa_sponsorship: defaultProfile.hasVisaSponsorship ? 1 : 0,
      legal_declarations_verified: defaultProfile.legalDeclarationsVerified ? 1 : 0,
      max_daily_applications: 25,
      max_job_age_days: 14,
      min_match_score: 75,
      created_at: now,
      updated_at: now
    });
  }

  // Seed sources configuration if empty
  const sourcesCount = db.prepare('SELECT count(*) as count FROM job_sources_config').get() as { count: number };
  if (sourcesCount.count === 0) {
    const sources = [
      {
        source_id: 'remotive',
        source_name: 'Remotive Live Tech API',
        category: 'api_direct',
        status: 'connected',
        requires_auth: 0,
        daily_limit: 100,
        fallback_strategy: 'None (Direct authorized JSON API)',
        details: 'Official public API for remote software & data engineering positions. Verified live postings.'
      },
      {
        source_id: 'arbeitnow',
        source_name: 'Arbeitnow Global Jobs API',
        category: 'api_direct',
        status: 'connected',
        requires_auth: 0,
        daily_limit: 100,
        fallback_strategy: 'None (Direct authorized JSON API)',
        details: 'Official global tech & engineering jobs feed with verified direct application links.'
      },
      {
        source_id: 'jobicy',
        source_name: 'Jobicy Remote API',
        category: 'api_direct',
        status: 'connected',
        requires_auth: 0,
        daily_limit: 100,
        fallback_strategy: 'None (Direct authorized JSON API)',
        details: 'Public authorized API feed for remote engineering and product jobs.'
      },
      {
        source_id: 'adzuna',
        source_name: 'Adzuna Job Search API',
        category: 'api_direct',
        status: config.adzunaAppId && config.adzunaAppKey ? 'connected' : 'unconfigured',
        requires_auth: 1,
        daily_limit: 250,
        fallback_strategy: 'Register free developer API key in .env',
        details: 'Official job search API covering India, US, UK, and 16 other countries. Requires free app_id & app_key.'
      },
      {
        source_id: 'linkedin',
        source_name: 'LinkedIn Jobs',
        category: 'restricted_portal',
        status: 'fallback_active',
        requires_auth: 1,
        daily_limit: 25,
        fallback_strategy: 'Deep Search Link Generator & Assisted Job Importer',
        details: 'Programmatic automated scraping is prohibited by LinkedIn Terms of Service. Program generates targeted search queries, parses user-provided postings, and pre-fills verified application packages.'
      },
      {
        source_id: 'naukri',
        source_name: 'Naukri.com',
        category: 'restricted_portal',
        status: 'fallback_active',
        requires_auth: 1,
        daily_limit: 30,
        fallback_strategy: 'Direct Search URL Builder & Assisted Importer',
        details: 'Naukri requires enterprise recruiter partner API or human browser authentication. Provides direct boolean search filters and manual application preparation package.'
      },
      {
        source_id: 'indeed',
        source_name: 'Indeed',
        category: 'restricted_portal',
        status: 'fallback_active',
        requires_auth: 1,
        daily_limit: 30,
        fallback_strategy: 'Search URL Builder & Assisted Importer',
        details: 'Indeed API requires partner agreement. Uses deep search builders and package export.'
      },
      {
        source_id: 'wellfound',
        source_name: 'Wellfound (AngelList)',
        category: 'restricted_portal',
        status: 'fallback_active',
        requires_auth: 1,
        daily_limit: 20,
        fallback_strategy: 'Search URL Builder & Assisted Importer',
        details: 'Startup roles direct search and pre-filled candidate profile export.'
      },
      {
        source_id: 'foundit',
        source_name: 'Foundit (Monster)',
        category: 'restricted_portal',
        status: 'fallback_active',
        requires_auth: 1,
        daily_limit: 30,
        fallback_strategy: 'Search URL Builder & Assisted Importer',
        details: 'Direct job query redirection and import package.'
      }
    ];

    const insertSource = db.prepare(`
      INSERT INTO job_sources_config (
        source_id, source_name, category, status, requires_auth,
        daily_limit, fallback_strategy, details
      ) VALUES (
        @source_id, @source_name, @category, @status, @requires_auth,
        @daily_limit, @fallback_strategy, @details
      )
    `);

    for (const src of sources) {
      insertSource.run(src);
    }
  }

  // Seed default search schedule if empty
  const scheduleCount = db.prepare('SELECT count(*) as count FROM search_schedules').get() as { count: number };
  if (scheduleCount.count === 0) {
    db.prepare(`
      INSERT INTO search_schedules (
        id, interval_hours, roles, locations, is_active, last_status
      ) VALUES (
        'default_schedule', 24, ?, ?, 1, 'ready'
      )
    `).run(
      JSON.stringify(defaultProfile.preferredTitles),
      JSON.stringify(defaultProfile.preferredLocations)
    );
  }
}
