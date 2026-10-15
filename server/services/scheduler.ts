import { db } from '../db/database.js';
import { runMultiSourceJobDiscovery } from '../adapters/index.js';
import { evaluateJobTwoStage } from './scoringEngine.js';
import { isDuplicateJob, canonicalizeUrl } from './deduplication.js';
import { generateApplicationMaterials } from './aiTailorEngine.js';
import { UserProfile } from '../../src/types.js';

let schedulerInterval: NodeJS.Timeout | null = null;
let isJobRunning = false;

export function addAuditLog(type: 'info' | 'success' | 'warning' | 'error' | 'approval', step: string, message: string) {
  const id = `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const timestamp = new Date().toLocaleTimeString();
  try {
    db.prepare('INSERT INTO audit_logs (id, timestamp, type, step, message) VALUES (?, ?, ?, ?, ?)').run(
      id, timestamp, type, step, message
    );
  } catch (err) {
    console.error('Audit log error:', err);
  }
}

export async function executeScheduledSearch(): Promise<{ jobsFound: number; jobsAdded: number }> {
  if (isJobRunning) {
    addAuditLog('warning', 'Scheduler', 'Previous search job is still executing; skipping run.');
    return { jobsFound: 0, jobsAdded: 0 };
  }

  isJobRunning = true;
  addAuditLog('info', 'Discovery Triggered', 'Starting scheduled multi-source discovery across Remotive, Arbeitnow, Jobicy...');

  try {
    // 1. Fetch Candidate Profile
    const profileRow = db.prepare("SELECT * FROM candidate_profiles WHERE id = 'default_profile'").get() as any;
    if (!profileRow) {
      addAuditLog('error', 'Scheduler', 'No candidate profile found to evaluate against.');
      isJobRunning = false;
      return { jobsFound: 0, jobsAdded: 0 };
    }

    const profile: UserProfile = {
      fullName: profileRow.full_name,
      email: profileRow.email,
      phone: profileRow.phone,
      currentTitle: profileRow.current_title,
      totalExperienceYears: profileRow.total_experience_years,
      primarySkills: JSON.parse(profileRow.primary_skills || '[]'),
      secondarySkills: JSON.parse(profileRow.secondary_skills || '[]'),
      education: JSON.parse(profileRow.education || '{}'),
      preferredTitles: JSON.parse(profileRow.preferred_titles || '[]'),
      preferredIndustries: JSON.parse(profileRow.preferred_industries || '[]'),
      preferredLocations: JSON.parse(profileRow.preferred_locations || '[]'),
      workModePreference: profileRow.workMode_preference || 'Any',
      minExpectedSalary: profileRow.min_expected_salary,
      currency: profileRow.currency,
      noticePeriodDays: profileRow.notice_period_days,
      currentLocation: profileRow.current_location,
      willingnessToRelocate: profileRow.willingness_to_relocate,
      preferredEmploymentType: profileRow.preferred_employment_type,
      targetCompanies: JSON.parse(profileRow.target_companies || '[]'),
      companiesToAvoid: JSON.parse(profileRow.companies_to_avoid || '[]'),
      jobTypesToAvoid: JSON.parse(profileRow.job_types_to_avoid || '[]'),
      resumeText: profileRow.resume_text,
      profileSummary: profileRow.profile_summary,
      workAuthorization: profileRow.work_authorization,
      hasVisaSponsorship: Boolean(profileRow.has_visa_sponsorship),
      legalDeclarationsVerified: Boolean(profileRow.legal_declarations_verified)
    };

    // 2. Query Authorized Adapters
    const discovery = await runMultiSourceJobDiscovery({
      titles: profile.preferredTitles,
      skills: profile.primarySkills,
      locations: profile.preferredLocations,
      limit: 15
    });

    addAuditLog('info', 'Discovery Complete', `Fetched ${discovery.jobs.length} raw jobs from ${discovery.sourcesQueried.join(', ')}.`);

    // 3. Process & Deduplicate against existing jobs
    const existingJobs = db.prepare('SELECT id, canonical_url, external_job_id, company, title, source_platform FROM discovered_jobs').all() as any[];

    let jobsAdded = 0;
    const now = new Date().toISOString();

    const insertJob = db.prepare(`
      INSERT OR REPLACE INTO discovered_jobs (
        id, source_platform, external_job_id, canonical_url, title, company,
        location, work_mode, salary_min, salary_max, salary_currency,
        exp_min, exp_max, required_skills, preferred_skills, education_required,
        industry, description, job_url, posted_date, discovered_at,
        source_verification_status, application_method, job_status, is_duplicate,
        duplicate_of_id, is_suspicious, suspicious_reason, screening_questions,
        raw_data, created_at
      ) VALUES (
        @id, @source_platform, @external_job_id, @canonical_url, @title, @company,
        @location, @work_mode, @salary_min, @salary_max, @salary_currency,
        @exp_min, @exp_max, @required_skills, @preferred_skills, @education_required,
        @industry, @description, @job_url, @posted_date, @discovered_at,
        @source_verification_status, @application_method, @job_status, @is_duplicate,
        @duplicate_of_id, @is_suspicious, @suspicious_reason, @screening_questions,
        @raw_data, @created_at
      )
    `);

    const insertEvaluation = db.prepare(`
      INSERT OR REPLACE INTO job_evaluations (
        job_id, total_score, skills_score, experience_score, title_score,
        location_score, salary_score, education_score, company_score,
        confidence_score, passed_hard_filters, rejection_reason,
        matched_skills, missing_required_skills, missing_data_fields,
        recommendation_reason, evaluated_at
      ) VALUES (
        @job_id, @total_score, @skills_score, @experience_score, @title_score,
        @location_score, @salary_score, @education_score, @company_score,
        @confidence_score, @passed_hard_filters, @rejection_reason,
        @matched_skills, @missing_required_skills, @missing_data_fields,
        @recommendation_reason, @evaluated_at
      )
    `);

function cleanParams(obj: Record<string, any>): Record<string, any> {
  const clean: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) {
      clean[k] = null;
    } else if (Array.isArray(v)) {
      clean[k] = JSON.stringify(v);
    } else if (typeof v === 'object' && v !== null) {
      clean[k] = JSON.stringify(v);
    } else {
      clean[k] = v;
    }
  }
  return clean;
}

    for (const job of discovery.jobs) {
      const dedupCheck = isDuplicateJob(job, existingJobs);
      const isDup = dedupCheck.isDuplicate ? 1 : 0;
      const dupOfId = dedupCheck.duplicateOfId || null;

      insertJob.run(cleanParams({
        id: job.id,
        source_platform: job.sourcePlatform,
        external_job_id: job.externalJobId || null,
        canonical_url: job.canonicalUrl,
        title: job.title,
        company: job.company,
        location: job.location || 'Remote',
        work_mode: job.workMode || 'Remote',
        salary_min: job.salaryMin || null,
        salary_max: job.salaryMax || null,
        salary_currency: job.salaryCurrency || 'USD',
        exp_min: job.expMin ?? 0,
        exp_max: job.expMax ?? 5,
        required_skills: JSON.stringify(job.requiredSkills || []),
        preferred_skills: JSON.stringify(job.preferredSkills || []),
        education_required: job.educationRequired || '',
        industry: job.industry || '',
        description: job.description || '',
        job_url: job.jobUrl,
        posted_date: job.postedDate || null,
        discovered_at: now,
        source_verification_status: job.sourceVerificationStatus || 'verified',
        application_method: job.applicationMethod || 'external_portal',
        job_status: job.jobStatus || 'active',
        is_duplicate: isDup,
        duplicate_of_id: dupOfId,
        is_suspicious: job.isSuspicious ? 1 : 0,
        suspicious_reason: job.suspiciousReason || null,
        screening_questions: JSON.stringify(job.screeningQuestions || []),
        raw_data: JSON.stringify(job.rawData || {}),
        created_at: now
      }));

      // 4. Two-Stage Evaluation
      const evalResult = evaluateJobTwoStage(job, profile, profileRow.min_match_score || 75);

      insertEvaluation.run(cleanParams({
        job_id: job.id,
        total_score: evalResult.totalScore,
        skills_score: evalResult.skillsScore,
        experience_score: evalResult.experienceScore,
        title_score: evalResult.titleScore,
        location_score: evalResult.locationScore,
        salary_score: evalResult.salaryScore,
        education_score: evalResult.educationScore,
        company_score: evalResult.companyScore,
        confidence_score: evalResult.confidenceScore,
        passed_hard_filters: evalResult.passedHardFilters ? 1 : 0,
        rejection_reason: evalResult.rejectionReason || null,
        matched_skills: JSON.stringify(evalResult.matchedSkills),
        missing_required_skills: JSON.stringify(evalResult.missingRequiredSkills),
        missing_data_fields: JSON.stringify(evalResult.missingDataFields),
        recommendation_reason: evalResult.recommendationReason,
        evaluated_at: now
      }));

      // 5. Lifecycle Application Preparation (Distinct States: Ready to Apply or Approval Required)
      if (!isDup && evalResult.passedHardFilters) {
        const materials = generateApplicationMaterials(profile, job);
        const hasSensitiveQuestions = materials.screeningAnswers.some(q => q.requiresApproval);
        const status = hasSensitiveQuestions ? 'Approval Required' : 'Ready to Apply';

        const pendingQ = hasSensitiveQuestions
          ? materials.screeningAnswers.find(q => q.requiresApproval)
          : null;

        const insertApp = db.prepare(`
          INSERT OR IGNORE INTO applications (
            id, job_id, company, job_title, platform, location, work_mode,
            match_score, salary_text, job_url, date_found, date_applied,
            status, notes, cover_letter, tailored_summary, tailored_skills,
            answers_provided, pending_approval_question, created_at, updated_at
          ) VALUES (
            @id, @job_id, @company, @job_title, @platform, @location, @work_mode,
            @match_score, @salary_text, @job_url, @date_found, NULL,
            @status, @notes, @cover_letter, @tailored_summary, @tailored_skills,
            @answers_provided, @pending_approval_question, @created_at, @updated_at
          )
        `);

        insertApp.run(cleanParams({
          id: `app-${job.id}`,
          job_id: job.id,
          company: job.company,
          job_title: job.title,
          platform: job.sourcePlatform,
          location: job.location || 'Remote',
          work_mode: job.workMode || 'Remote',
          match_score: evalResult.totalScore,
          salary_text: job.salaryMin ? `${job.salaryMin} - ${job.salaryMax} ${job.salaryCurrency}` : 'Competitive',
          job_url: job.jobUrl,
          date_found: job.postedDate || now.split('T')[0],
          status,
          notes: hasSensitiveQuestions ? 'Paused for candidate authorization.' : 'Ready for candidate application.',
          cover_letter: materials.coverLetter,
          tailored_summary: materials.tailoredSummary,
          tailored_skills: JSON.stringify(materials.prioritizedSkills),
          answers_provided: JSON.stringify(materials.screeningAnswers),
          pending_approval_question: pendingQ ? JSON.stringify({
            questionText: pendingQ.questionText,
            category: pendingQ.questionText.toLowerCase().includes('salary') ? 'Salary' : 'Sensitive',
            candidateMatchSummary: materials.matchExplanation
          }) : null,
          created_at: now,
          updated_at: now
        }));
      }

      jobsAdded++;
    }

    // Update schedule record
    db.prepare(`
      UPDATE search_schedules
      SET last_run_at = ?, last_status = 'completed', last_jobs_found = ?
      WHERE id = 'default_schedule'
    `).run(now, jobsAdded);

    addAuditLog('success', 'Search Complete', `Processed and saved ${jobsAdded} evaluated job postings in database.`);
    isJobRunning = false;
    return { jobsFound: discovery.jobs.length, jobsAdded };
  } catch (err: any) {
    console.error('Scheduled search execution error:', err);
    addAuditLog('error', 'Scheduler Error', err.message || 'Error occurred during job search execution.');
    isJobRunning = false;
    return { jobsFound: 0, jobsAdded: 0 };
  }
}

export function startBackgroundScheduler(intervalHours: number = 24) {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
  }
  const ms = intervalHours * 60 * 60 * 1000;
  schedulerInterval = setInterval(() => {
    executeScheduledSearch().catch(console.error);
  }, ms);
  console.log(`[Scheduler] Background job scheduler active. Interval: ${intervalHours}h.`);
}
