import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { db } from '../db/database.js';
import { config } from '../config.js';
import { extractTextFromFile, parseResumeText } from '../services/resumeParser.js';
import { addAuditLog } from '../services/scheduler.js';
import { UserProfile } from '../../src/types.js';

export const profileRouter = express.Router();

// Ensure upload directory exists
if (!fs.existsSync(config.resumeStoragePath)) {
  fs.mkdirSync(config.resumeStoragePath, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, config.resumeStoragePath);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const unique = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}${ext}`;
    cb(null, unique);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.pdf' || ext === '.docx' || ext === '.txt') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, DOCX, and TXT files are supported.'));
    }
  }
});

function rowToProfile(row: any): UserProfile {
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
    resumeText: row.resume_text || '',
    profileSummary: row.profile_summary || '',
    workAuthorization: row.work_authorization || '',
    hasVisaSponsorship: Boolean(row.has_visa_sponsorship),
    legalDeclarationsVerified: Boolean(row.legal_declarations_verified)
  };
}

// GET /api/profile
profileRouter.get('/', (_req, res) => {
  try {
    const row = db.prepare("SELECT * FROM candidate_profiles WHERE id = 'default_profile'").get() as any;
    if (!row) {
      return res.status(404).json({ error: 'Candidate profile not found' });
    }
    return res.json({ profile: rowToProfile(row) });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// PUT /api/profile
profileRouter.put('/', (req, res) => {
  try {
    const p: UserProfile = req.body;
    const now = new Date().toISOString();

    db.prepare(`
      UPDATE candidate_profiles SET
        full_name = @full_name,
        email = @email,
        phone = @phone,
        current_title = @current_title,
        total_experience_years = @total_experience_years,
        primary_skills = @primary_skills,
        secondary_skills = @secondary_skills,
        education = @education,
        preferred_titles = @preferred_titles,
        preferred_industries = @preferred_industries,
        preferred_locations = @preferred_locations,
        work_mode_preference = @work_mode_preference,
        min_expected_salary = @min_expected_salary,
        currency = @currency,
        notice_period_days = @notice_period_days,
        current_location = @current_location,
        willingness_to_relocate = @willingness_to_relocate,
        preferred_employment_type = @preferred_employment_type,
        target_companies = @target_companies,
        companies_to_avoid = @companies_to_avoid,
        job_types_to_avoid = @job_types_to_avoid,
        resume_text = @resume_text,
        profile_summary = @profile_summary,
        work_authorization = @work_authorization,
        has_visa_sponsorship = @has_visa_sponsorship,
        legal_declarations_verified = @legal_declarations_verified,
        updated_at = @updated_at
      WHERE id = 'default_profile'
    `).run({
      full_name: p.fullName,
      email: p.email,
      phone: p.phone,
      current_title: p.currentTitle,
      total_experience_years: p.totalExperienceYears,
      primary_skills: JSON.stringify(p.primarySkills || []),
      secondary_skills: JSON.stringify(p.secondarySkills || []),
      education: JSON.stringify(p.education || {}),
      preferred_titles: JSON.stringify(p.preferredTitles || []),
      preferred_industries: JSON.stringify(p.preferredIndustries || []),
      preferred_locations: JSON.stringify(p.preferredLocations || []),
      work_mode_preference: p.workModePreference || 'Any',
      min_expected_salary: p.minExpectedSalary || 0,
      currency: p.currency || 'INR',
      notice_period_days: p.noticePeriodDays || 30,
      current_location: p.currentLocation || '',
      willingness_to_relocate: p.willingnessToRelocate || 'Yes',
      preferred_employment_type: p.preferredEmploymentType || 'Full-time',
      target_companies: JSON.stringify(p.targetCompanies || []),
      companies_to_avoid: JSON.stringify(p.companiesToAvoid || []),
      job_types_to_avoid: JSON.stringify(p.jobTypesToAvoid || []),
      resume_text: p.resumeText || '',
      profile_summary: p.profileSummary || '',
      work_authorization: p.workAuthorization || '',
      has_visa_sponsorship: p.hasVisaSponsorship ? 1 : 0,
      legal_declarations_verified: p.legalDeclarationsVerified ? 1 : 0,
      updated_at: now
    });

    addAuditLog('success', 'Profile Updated', `Updated candidate profile for ${p.fullName}.`);
    return res.json({ success: true, profile: p });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/profile/upload-resume
profileRouter.post('/upload-resume', upload.single('resume'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No resume file provided' });
  }

  try {
    const filePath = req.file.path;
    const extractedText = await extractTextFromFile(filePath, req.file.mimetype, req.file.originalname);

    const existingRow = db.prepare("SELECT * FROM candidate_profiles WHERE id = 'default_profile'").get() as any;
    const existingProfile = existingRow ? rowToProfile(existingRow) : undefined;

    const parsed = parseResumeText(extractedText, existingProfile);
    const now = new Date().toISOString();

    // Auto-align preferred titles to candidate's verified role
    let preferredTitles = existingProfile?.preferredTitles || [];
    if (parsed.currentTitle.includes('Data')) {
      preferredTitles = [
        'Data Engineer',
        'Associate Data Engineer',
        'Azure Data Engineer',
        'PySpark Developer',
        'ETL Developer',
        'Junior Data Engineer'
      ];
    } else if (preferredTitles.length === 0) {
      preferredTitles = [parsed.currentTitle, `Senior ${parsed.currentTitle}`, `Associate ${parsed.currentTitle}`];
    }

    // Update candidate profile with parsed info, preserving existing preferences
    db.prepare(`
      UPDATE candidate_profiles SET
        full_name = @full_name,
        email = @email,
        phone = @phone,
        current_title = @current_title,
        total_experience_years = @total_experience_years,
        primary_skills = @primary_skills,
        secondary_skills = @secondary_skills,
        education = @education,
        preferred_titles = @preferred_titles,
        current_location = @current_location,
        resume_text = @resume_text,
        profile_summary = @profile_summary,
        original_resume_filename = @original_resume_filename,
        resume_file_path = @resume_file_path,
        updated_at = @updated_at
      WHERE id = 'default_profile'
    `).run({
      full_name: parsed.fullName,
      email: parsed.email,
      phone: parsed.phone,
      current_title: parsed.currentTitle,
      total_experience_years: parsed.totalExperienceYears,
      primary_skills: JSON.stringify(parsed.primarySkills),
      secondary_skills: JSON.stringify(parsed.secondarySkills),
      education: JSON.stringify(parsed.education),
      preferred_titles: JSON.stringify(preferredTitles),
      current_location: parsed.currentLocation,
      resume_text: parsed.rawText,
      profile_summary: parsed.summary,
      original_resume_filename: req.file.originalname,
      resume_file_path: filePath,
      updated_at: now
    });

    addAuditLog(
      'success',
      'Resume Upload',
      `Parsed ${req.file.originalname} (${parsed.primarySkills.length} skills found, ${parsed.totalExperienceYears} yrs experience). Applications preserved.`
    );

    const updatedRow = db.prepare("SELECT * FROM candidate_profiles WHERE id = 'default_profile'").get() as any;

    return res.json({
      success: true,
      message: 'Resume parsed and profile updated successfully',
      parsed,
      profile: rowToProfile(updatedRow),
      filename: req.file.originalname
    });
  } catch (err: any) {
    console.error('Resume upload error:', err);
    return res.status(500).json({ error: err.message || 'Failed to parse resume' });
  }
});

// GET /api/profile/resume-download
profileRouter.get('/resume-download', (_req, res) => {
  try {
    const row = db.prepare("SELECT resume_file_path, original_resume_filename, full_name FROM candidate_profiles WHERE id = 'default_profile'").get() as any;
    if (!row || !row.resume_file_path || !fs.existsSync(row.resume_file_path)) {
      return res.status(404).json({ error: 'No uploaded resume file found on server.' });
    }

    const downloadFilename = row.original_resume_filename || `${(row.full_name || 'Candidate').replace(/\s+/g, '_')}_Resume.pdf`;
    res.setHeader('Content-Disposition', `attachment; filename="${downloadFilename}"`);
    return res.sendFile(path.resolve(row.resume_file_path));
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

