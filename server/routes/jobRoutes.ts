import express from 'express';
import { db } from '../db/database.js';
import { executeScheduledSearch, addAuditLog } from '../services/scheduler.js';
import { evaluateJobTwoStage } from '../services/scoringEngine.js';
import { generateApplicationMaterials } from '../services/aiTailorEngine.js';
import { canonicalizeUrl, isDuplicateJob } from '../services/deduplication.js';
import { allAdapters } from '../adapters/index.js';
import { UserProfile } from '../../src/types.js';

export const jobRouter = express.Router();

function getProfile(): UserProfile {
  const row = db.prepare("SELECT * FROM candidate_profiles WHERE id = 'default_profile'").get() as any;
  return {
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    currentTitle: row.current_title,
    totalExperienceYears: row.total_experience_years,
    primarySkills: JSON.parse(row.primary_skills || '[]'),
    secondarySkills: JSON.parse(row.secondary_skills || '[]'),
    education: JSON.parse(row.education || '{}'),
    preferredTitles: JSON.parse(row.preferred_titles || '[]'),
    preferredIndustries: JSON.parse(row.preferred_industries || '[]'),
    preferredLocations: JSON.parse(row.preferred_locations || '[]'),
    workModePreference: row.work_mode_preference || 'Any',
    minExpectedSalary: row.min_expected_salary,
    currency: row.currency,
    noticePeriodDays: row.notice_period_days,
    currentLocation: row.current_location,
    willingnessToRelocate: row.willingness_to_relocate,
    preferredEmploymentType: row.preferred_employment_type,
    targetCompanies: JSON.parse(row.target_companies || '[]'),
    companiesToAvoid: JSON.parse(row.companies_to_avoid || '[]'),
    jobTypesToAvoid: JSON.parse(row.job_types_to_avoid || '[]'),
    resumeText: row.resume_text,
    profileSummary: row.profile_summary,
    workAuthorization: row.work_authorization,
    hasVisaSponsorship: Boolean(row.has_visa_sponsorship),
    legalDeclarationsVerified: Boolean(row.legal_declarations_verified)
  };
}

// GET /api/jobs
jobRouter.get('/', (req, res) => {
  try {
    const jobs = db.prepare(`
      SELECT 
        j.*,
        e.total_score,
        e.skills_score,
        e.experience_score,
        e.title_score,
        e.location_score,
        e.salary_score,
        e.education_score,
        e.company_score,
        e.confidence_score,
        e.passed_hard_filters,
        e.rejection_reason,
        e.matched_skills,
        e.missing_required_skills,
        e.missing_data_fields,
        e.recommendation_reason
      FROM discovered_jobs j
      LEFT JOIN job_evaluations e ON j.id = e.job_id
      ORDER BY e.total_score DESC, j.discovered_at DESC
    `).all() as any[];

    const formatted = jobs.map(j => ({
      id: j.id,
      company: j.company,
      title: j.title,
      platform: j.source_platform,
      location: j.location,
      workMode: j.work_mode,
      salaryRange: j.salary_min ? { min: j.salary_min, max: j.salary_max || j.salary_min, currency: j.salary_currency } : undefined,
      requiredExperienceYears: { min: j.exp_min, max: j.exp_max },
      requiredSkills: JSON.parse(j.required_skills || '[]'),
      preferredSkills: JSON.parse(j.preferred_skills || '[]'),
      educationRequired: j.education_required,
      industry: j.industry,
      description: j.description,
      jobUrl: j.job_url,
      postedDate: j.posted_date,
      isDuplicate: Boolean(j.is_duplicate),
      duplicateOfId: j.duplicate_of_id,
      isSuspicious: Boolean(j.is_suspicious),
      suspiciousReason: j.suspicious_reason,
      screeningQuestions: JSON.parse(j.screening_questions || '[]'),
      matchBreakdown: j.total_score !== null ? {
        totalScore: j.total_score,
        skillsScore: j.skills_score,
        experienceScore: j.experience_score,
        titleScore: j.title_score,
        locationScore: j.location_score,
        salaryScore: j.salary_score,
        educationScore: j.education_score,
        companyScore: j.company_score,
        passedHardFilters: Boolean(j.passed_hard_filters),
        rejectionReason: j.rejection_reason,
        confidenceScore: j.confidence_score,
        matchedSkills: JSON.parse(j.matched_skills || '[]'),
        missingRequiredSkills: JSON.parse(j.missing_required_skills || '[]'),
        missingDataFields: JSON.parse(j.missing_data_fields || '[]'),
        recommendationReason: j.recommendation_reason
      } : undefined
    }));

    return res.json({ jobs: formatted });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/jobs/search (Trigger live multi-source search)
jobRouter.post('/search', async (_req, res) => {
  try {
    const result = await executeScheduledSearch();
    return res.json({ success: true, ...result });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/jobs/import (Assisted import for LinkedIn, Naukri, Indeed, etc.)
jobRouter.post('/import', (req, res) => {
  try {
    const { title, company, location, workMode, jobUrl, description, platform, requiredSkills, salaryMin, salaryMax } = req.body;

    if (!title || !company || !jobUrl) {
      return res.status(400).json({ error: 'Title, company, and job URL are required for import' });
    }

    const profile = getProfile();
    const now = new Date().toISOString();
    const id = `import-${Date.now()}`;
    const canonical = canonicalizeUrl(jobUrl);

    // Duplicate check
    const existingJobs = db.prepare('SELECT id, canonical_url, external_job_id, company, title, source_platform FROM discovered_jobs').all() as any[];
    const mockJobObj: any = {
      id,
      sourcePlatform: platform || 'Assisted Import',
      canonicalUrl: canonical,
      title,
      company,
      location: location || 'India',
      workMode: workMode || 'Hybrid',
      industry: req.body.industry || 'Technology',
      expMin: 1,
      expMax: 5,
      jobUrl,
      requiredSkills: requiredSkills || [],
      description: description || '',
      sourceVerificationStatus: 'verified',
      applicationMethod: 'external_portal',
      jobStatus: 'active'
    };

    const dedup = isDuplicateJob(mockJobObj, existingJobs);
    if (dedup.isDuplicate) {
      return res.status(409).json({
        error: 'Duplicate job detected',
        reason: dedup.reason || 'This listing has already been recorded in your database.'
      });
    }

    db.prepare(`
      INSERT INTO discovered_jobs (
        id, source_platform, canonical_url, title, company, location, work_mode,
        salary_min, salary_max, salary_currency, exp_min, exp_max, required_skills,
        description, job_url, posted_date, discovered_at, source_verification_status,
        application_method, job_status, is_duplicate, duplicate_of_id, created_at
      ) VALUES (
        @id, @source_platform, @canonical_url, @title, @company, @location, @work_mode,
        @salary_min, @salary_max, 'INR', 1, 5, @required_skills,
        @description, @job_url, @posted_date, @discovered_at, 'verified',
        'external_portal', 'active', @is_duplicate, @duplicate_of_id, @created_at
      )
    `).run({
      id,
      source_platform: platform || 'Assisted Import',
      canonical_url: canonical,
      title,
      company,
      location: location || 'India',
      workMode: workMode || 'Hybrid',
      salary_min: salaryMin || null,
      salary_max: salaryMax || null,
      required_skills: JSON.stringify(requiredSkills || []),
      description: description || '',
      job_url: jobUrl,
      posted_date: now.split('T')[0],
      discovered_at: now,
      is_duplicate: dedup.isDuplicate ? 1 : 0,
      duplicate_of_id: dedup.duplicateOfId || null,
      created_at: now
    });

    // Evaluate
    const evalResult = evaluateJobTwoStage(mockJobObj, profile, 75);

    db.prepare(`
      INSERT INTO job_evaluations (
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
    `).run({
      job_id: id,
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
    });

    // Generate materials and create application record
    const materials = generateApplicationMaterials(profile, mockJobObj);
    const hasSensitiveQuestions = materials.screeningAnswers.some(q => q.requiresApproval);
    const status = hasSensitiveQuestions ? 'Approval Required' : 'Ready to Apply';

    db.prepare(`
      INSERT INTO applications (
        id, job_id, company, job_title, platform, location, work_mode,
        match_score, salary_text, job_url, date_found, date_applied,
        status, notes, cover_letter, tailored_summary, tailored_skills,
        answers_provided, pending_approval_question, created_at, updated_at
      ) VALUES (
        @id, @job_id, @company, @job_title, @platform, @location, @work_mode,
        @match_score, 'Competitive', @job_url, @date_found, NULL,
        @status, @notes, @cover_letter, @tailored_summary, @tailored_skills,
        @answers_provided, @pending_approval_question, @created_at, @updated_at
      )
    `).run({
      id: `app-${id}`,
      job_id: id,
      company,
      job_title: title,
      platform: platform || 'Assisted Import',
      location: location || 'India',
      work_mode: workMode || 'Hybrid',
      match_score: evalResult.totalScore,
      job_url: jobUrl,
      date_found: now.split('T')[0],
      status,
      notes: 'Imported by candidate for verified matching and preparation.',
      cover_letter: materials.coverLetter,
      tailored_summary: materials.tailoredSummary,
      tailored_skills: JSON.stringify(materials.prioritizedSkills),
      answers_provided: JSON.stringify(materials.screeningAnswers),
      pending_approval_question: hasSensitiveQuestions ? JSON.stringify(materials.screeningAnswers[0]) : null,
      created_at: now,
      updated_at: now
    });

    addAuditLog('success', 'Job Imported', `Imported "${title}" at ${company} (${evalResult.totalScore}% match).`);

    return res.json({
      success: true,
      jobId: id,
      matchScore: evalResult.totalScore,
      status,
      materials
    });
  } catch (err: any) {
    if (err.message?.includes('UNIQUE constraint')) {
      return res.status(409).json({ error: 'Duplicate listing: This job URL already exists in your database.' });
    }
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/jobs/import-url (Extract job details automatically from pasted URL)
jobRouter.post('/import-url', async (req, res) => {
  try {
    const { url, platform } = req.body;
    if (!url || !url.startsWith('http')) {
      return res.status(400).json({ error: 'Valid HTTP/HTTPS job URL is required.' });
    }

    let detectedPlatform = platform;
    if (!detectedPlatform) {
      if (url.includes('linkedin.com')) detectedPlatform = 'LinkedIn';
      else if (url.includes('naukri.com')) detectedPlatform = 'Naukri';
      else if (url.includes('databricks.com') || url.includes('stripe.com') || url.includes('figma.com') || url.includes('greenhouse.io')) detectedPlatform = 'Company Careers';
      else detectedPlatform = 'Direct Employer';
    }

    let title = '';
    let company = '';
    let location = 'India / Remote';
    let description = '';

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        },
        signal: AbortSignal.timeout(6000)
      });

      if (response.ok) {
        const html = await response.text();

        // 1. Try to find JSON-LD Schema.org JobPosting
        const jsonLdMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/i);
        if (jsonLdMatch && jsonLdMatch[1]) {
          try {
            const parsed = JSON.parse(jsonLdMatch[1]);
            const jobData = parsed['@type'] === 'JobPosting' ? parsed : (Array.isArray(parsed) ? parsed.find(p => p['@type'] === 'JobPosting') : null);
            if (jobData) {
              title = jobData.title || '';
              company = jobData.hiringOrganization?.name || '';
              location = jobData.jobLocation?.address?.addressLocality || jobData.jobLocation?.address?.addressRegion || location;
              description = (jobData.description || '').replace(/<[^>]*>?/gm, ' ');
            }
          } catch (e) {}
        }

        // 2. OpenGraph Fallback
        if (!title) {
          const ogTitleMatch = html.match(/<meta property="og:title" content="([^"]+)"/i) || html.match(/<title>([^<]+)<\/title>/i);
          if (ogTitleMatch && ogTitleMatch[1]) {
            const rawTitle = ogTitleMatch[1].replace(/&amp;/g, '&');
            // Frequently in format: "Data Engineer at Company | LinkedIn" or "Company hiring Data Engineer"
            const parts = rawTitle.split(/[-–|]| at /);
            title = parts[0]?.trim() || rawTitle;
            if (parts.length > 1 && !company) {
              company = parts[1]?.replace(/LinkedIn|Naukri/gi, '')?.trim() || '';
            }
          }
        }

        if (!description) {
          const ogDescMatch = html.match(/<meta property="og:description" content="([^"]+)"/i) || html.match(/<meta name="description" content="([^"]+)"/i);
          if (ogDescMatch && ogDescMatch[1]) {
            description = ogDescMatch[1].replace(/&amp;/g, '&');
          }
        }
      }
    } catch (fetchErr: any) {
      console.warn('Direct URL fetch metadata extraction failed, will use fallback:', fetchErr.message);
    }

    // Fallbacks if not extractable from page
    if (!title) {
      // Parse from slug
      const urlPath = new URL(url).pathname;
      const slugParts = urlPath.split('/').filter(Boolean);
      const lastSlug = slugParts[slugParts.length - 1] || 'job-position';
      title = lastSlug.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
    if (!company) {
      const hostname = new URL(url).hostname.replace('www.', '');
      company = hostname.split('.')[0].toUpperCase();
    }

    // Forward to import handler
    const profile = getProfile();
    const now = new Date().toISOString();
    const id = `import-url-${Date.now()}`;
    const canonical = canonicalizeUrl(url);

    const existingJobs = db.prepare('SELECT id, canonical_url, external_job_id, company, title, source_platform FROM discovered_jobs').all() as any[];
    const mockJobObj: any = {
      id,
      sourcePlatform: detectedPlatform,
      canonicalUrl: canonical,
      title,
      company,
      location,
      workMode: 'Hybrid',
      industry: 'Technology',
      expMin: 1,
      expMax: 5,
      jobUrl: url,
      requiredSkills: [],
      description: description || `Extracted listing for ${title} at ${company}.`,
      sourceVerificationStatus: 'verified',
      applicationMethod: 'external_portal',
      jobStatus: 'active'
    };

    const dedup = isDuplicateJob(mockJobObj, existingJobs);
    if (dedup.isDuplicate) {
      return res.status(409).json({
        error: 'Duplicate job detected',
        reason: dedup.reason || 'This listing has already been recorded in your database.'
      });
    }

    db.prepare(`
      INSERT INTO discovered_jobs (
        id, source_platform, canonical_url, title, company, location, work_mode,
        salary_currency, exp_min, exp_max, required_skills,
        description, job_url, posted_date, discovered_at, source_verification_status,
        application_method, job_status, is_duplicate, duplicate_of_id, created_at
      ) VALUES (
        @id, @source_platform, @canonical_url, @title, @company, @location, @work_mode,
        'INR', 1, 5, '[]',
        @description, @job_url, @posted_date, @discovered_at, 'verified',
        'external_portal', 'active', @is_duplicate, @duplicate_of_id, @created_at
      )
    `).run({
      id,
      source_platform: detectedPlatform,
      canonical_url: canonical,
      title,
      company,
      location,
      work_mode: 'Hybrid',
      description: description || `Extracted listing for ${title} at ${company}.`,
      job_url: url,
      posted_date: now.split('T')[0],
      discovered_at: now,
      is_duplicate: dedup.isDuplicate ? 1 : 0,
      duplicate_of_id: dedup.duplicateOfId || null,
      created_at: now
    });

    const evalResult = evaluateJobTwoStage(mockJobObj, profile, 75);

    db.prepare(`
      INSERT INTO job_evaluations (
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
    `).run({
      job_id: id,
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
    });

    const materials = generateApplicationMaterials(profile, mockJobObj);
    const hasSensitiveQuestions = materials.screeningAnswers.some(q => q.requiresApproval);
    const status = hasSensitiveQuestions ? 'Approval Required' : 'Ready to Apply';

    db.prepare(`
      INSERT INTO applications (
        id, job_id, company, job_title, platform, location, work_mode,
        match_score, salary_text, job_url, date_found, date_applied,
        status, notes, cover_letter, tailored_summary, tailored_skills,
        answers_provided, pending_approval_question, created_at, updated_at
      ) VALUES (
        @id, @job_id, @company, @job_title, @platform, @location, @work_mode,
        @match_score, 'Competitive', @job_url, @date_found, NULL,
        @status, @notes, @cover_letter, @tailored_summary, @tailored_skills,
        @answers_provided, @pending_approval_question, @created_at, @updated_at
      )
    `).run({
      id: `app-${id}`,
      job_id: id,
      company,
      job_title: title,
      platform: detectedPlatform,
      location,
      work_mode: 'Hybrid',
      match_score: evalResult.totalScore,
      job_url: url,
      date_found: now.split('T')[0],
      status,
      notes: 'Auto-extracted from URL by candidate for verified matching.',
      cover_letter: materials.coverLetter,
      tailored_summary: materials.tailoredSummary,
      tailored_skills: JSON.stringify(materials.prioritizedSkills),
      answers_provided: JSON.stringify(materials.screeningAnswers),
      pending_approval_question: hasSensitiveQuestions ? JSON.stringify(materials.screeningAnswers[0]) : null,
      created_at: now,
      updated_at: now
    });

    addAuditLog('success', 'URL Extracted & Imported', `Extracted "${title}" at ${company} from ${detectedPlatform} (${evalResult.totalScore}% match).`);

    return res.json({
      success: true,
      jobId: id,
      title,
      company,
      location,
      platform: detectedPlatform,
      matchScore: evalResult.totalScore,
      status,
      materials
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/jobs/:id/materials (Get tailored application package for this job)
jobRouter.get('/:id/materials', (req, res) => {
  try {
    const job = db.prepare('SELECT * FROM discovered_jobs WHERE id = ?').get(req.params.id) as any;
    if (!job) return res.status(404).json({ error: 'Job not found' });

    const profile = getProfile();
    const jobObj: any = {
      ...job,
      requiredSkills: JSON.parse(job.required_skills || '[]'),
      screeningQuestions: JSON.parse(job.screening_questions || '[]'),
      jobUrl: job.job_url,
      sourcePlatform: job.source_platform
    };

    const materials = generateApplicationMaterials(profile, jobObj);
    return res.json({ materials });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});
