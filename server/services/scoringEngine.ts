import { UserProfile } from '../../src/types.js';
import { DiscoveredJob } from '../adapters/baseAdapter.js';

export interface EvaluationResult {
  totalScore: number;
  skillsScore: number;
  experienceScore: number;
  titleScore: number;
  locationScore: number;
  salaryScore: number;
  educationScore: number;
  companyScore: number;
  confidenceScore: number; // 0 - 100% based on completeness of listing data
  passedHardFilters: boolean;
  rejectionReason?: string;
  matchedSkills: string[];
  missingRequiredSkills: string[];
  missingDataFields: string[];
  recommendationReason: string;
}

export function evaluateJobTwoStage(
  job: DiscoveredJob,
  profile: UserProfile,
  scoreThreshold: number = 75
): EvaluationResult {
  const missingDataFields: string[] = [];

  // ==========================================
  // STAGE A: ELIGIBILITY FILTERS (HARD RULES)
  // ==========================================

  // 1. Blacklisted Companies
  const isAvoidCompany = (profile.companiesToAvoid || []).some(
    avoid => job.company.toLowerCase().includes(avoid.toLowerCase())
  );
  if (isAvoidCompany) {
    return createRejectionResult(0, `Company "${job.company}" is in your avoidance list.`, [], job.requiredSkills || [], ['company_blacklisted']);
  }

  // 2. Blacklisted Job Types / Roles
  const isAvoidJobType = (profile.jobTypesToAvoid || []).some(
    avoid => job.title.toLowerCase().includes(avoid.toLowerCase()) || (job.industry ? job.industry.toLowerCase().includes(avoid.toLowerCase()) : false)
  );
  if (isAvoidJobType) {
    return createRejectionResult(0, `Role "${job.title}" matches your excluded job categories.`, [], job.requiredSkills || [], ['job_type_blacklisted']);
  }

  // 3. Fraud / Suspicious Flag
  if (job.isSuspicious) {
    return createRejectionResult(0, job.suspiciousReason || 'Flagged as potentially suspicious.', [], job.requiredSkills || [], ['suspicious_listing']);
  }

  // 4. Closed / Expired
  if (job.jobStatus === 'expired' || job.jobStatus === 'closed') {
    return createRejectionResult(0, 'Listing has expired or is no longer accepting applications.', [], job.requiredSkills || [], ['expired']);
  }

  // 5. Extreme Experience Gap
  if (job.expMin > profile.totalExperienceYears + 3) {
    return createRejectionResult(
      0,
      `Required minimum experience (${job.expMin} yrs) significantly exceeds your ${profile.totalExperienceYears} yrs.`,
      [],
      job.requiredSkills || [],
      ['experience_gap']
    );
  }

  // 6. Stage A: Explicit Unrelated Category Filter (Requirement 7)
  const nonTechKeywords = [
    'writer', 'writing', 'copywriter', 'content reviewer', 'journalist', 'editor', 'author',
    'inside sales', 'tele-calling', 'door-to-door', 'account executive', 'sales contractor', 'sales engineer',
    'office assistant', 'receptionist', 'clerk', 'administrative assistant',
    'finance manager', 'accounting', 'bookkeeper', 'payroll', 'financial analyst',
    'cad design', 'fpga entwickler', 'fpga', 'flight dynamics', 'flight test',
    'event planner', 'brand & events', 'customer service', 'customer support', 'call center', 'service desk',
    'mechanic', 'praktikum', 'werkstudent', 'semiconductor engineering', 'recruiter', 'talent acquisition',
    'gtm engineer', 'gtm systems', 'product analyst', 'freelance writer', 'freelance copywriter'
  ];
  const jobTitleLower = job.title.toLowerCase();
  if (nonTechKeywords.some(kw => jobTitleLower.includes(kw))) {
    return createRejectionResult(
      0,
      `Role "${job.title}" is in an unrelated category for candidate's engineering profile.`,
      [],
      job.requiredSkills || [],
      ['unrelated_category']
    );
  }

  // ==========================================
  // STAGE B: 7-FACTOR WEIGHTED SCORING (0-100)
  // ==========================================

  // Factor 1: Skills Match (30%)
  const userAllSkills = [...(profile.primarySkills || []), ...(profile.secondarySkills || [])].map(s => s.toLowerCase());
  const required = (job.requiredSkills || []).map(s => s.toLowerCase());
  const matchedSkills: string[] = [];
  const missingRequiredSkills: string[] = [];
  let skillsScore = 0;

  if (required.length > 0) {
    for (const req of job.requiredSkills) {
      const lower = req.toLowerCase();
      // Match exact skill or word boundary in required skill string
      const isMatch = userAllSkills.some(u => {
        if (u === lower) return true;
        const escaped = u.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return new RegExp(`\\b${escaped}\\b`, 'i').test(req);
      });

      if (isMatch) {
        matchedSkills.push(req);
      } else {
        missingRequiredSkills.push(req);
      }
    }
    const skillRatio = Math.min(1, matchedSkills.length / Math.max(1, required.length));
    skillsScore = Math.round(skillRatio * 30 * 10) / 10;
  } else {
    missingDataFields.push('required_skills');
    // If no explicit skills list, scan job description for candidate's skills using word boundaries
    const descLower = (job.description || '').toLowerCase();
    const skillsInDesc = userAllSkills.filter(s => {
      if (s.length < 2) return false;
      const escaped = s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b${escaped}\\b`, 'i');
      return regex.test(descLower) || regex.test(jobTitleLower);
    });

    if (skillsInDesc.length > 0) {
      matchedSkills.push(...skillsInDesc.slice(0, 5));
      skillsScore = Math.min(30, Math.round((skillsInDesc.length / 4) * 20 * 10) / 10);
    } else {
      skillsScore = 0; // 0 skills found anywhere in the posting
    }
  }

  // Factor 2: Experience Match (20%)
  let expPct = 100;
  const userExp = profile.totalExperienceYears;
  if (job.expMin !== undefined && job.expMax !== undefined) {
    if (userExp >= job.expMin && userExp <= job.expMax) {
      expPct = 100;
    } else if (userExp < job.expMin) {
      const diff = job.expMin - userExp;
      expPct = Math.max(20, 100 - diff * 25);
    } else {
      expPct = 90; // Overqualified slightly
    }
  } else {
    missingDataFields.push('experience_range');
  }
  const experienceScore = Math.round((expPct / 100) * 20 * 10) / 10;

  // Factor 3: Job Title & Responsibility Match (20%)
  let titlePct = 0;
  const matchedTitle = (profile.preferredTitles || []).find(pref => {
    const pLower = pref.toLowerCase();
    return jobTitleLower.includes(pLower) || pLower.includes(jobTitleLower);
  });

  if (matchedTitle) {
    titlePct = 100;
  } else if (
    jobTitleLower.includes('data engineer') ||
    jobTitleLower.includes('pyspark') ||
    jobTitleLower.includes('etl') ||
    jobTitleLower.includes('databricks') ||
    jobTitleLower.includes('data platform') ||
    jobTitleLower.includes('analytics engineer')
  ) {
    titlePct = 90;
  } else if (
    jobTitleLower.includes('database') ||
    jobTitleLower.includes('data pipeline') ||
    jobTitleLower.includes('backend') ||
    jobTitleLower.includes('software engineer')
  ) {
    titlePct = 60;
  } else {
    titlePct = 0;
  }
  const titleScore = Math.round((titlePct / 100) * 20 * 10) / 10;

  // Hard filter: If role has completely zero title match AND zero or < 2 skills match, filter as unrelated
  if (titleScore === 0 || (titleScore < 8 && matchedSkills.length === 0)) {
    return createRejectionResult(
      0,
      `Role "${job.title}" has insufficient relevance or skill overlap with candidate's data engineering profile.`,
      matchedSkills,
      job.requiredSkills || [],
      ['unrelated_category']
    );
  }

  // Factor 4: Location & Work Mode Match (10%)
  let locationPct = 50;
  const isPreferredLoc = (profile.preferredLocations || []).some(
    loc => loc.toLowerCase() === 'remote' || (job.location || '').toLowerCase().includes(loc.toLowerCase())
  );
  const matchesMode = profile.workModePreference === 'Any' ||
    (job.workMode || '').toLowerCase() === (profile.workModePreference || '').toLowerCase();

  if (isPreferredLoc && matchesMode) {
    locationPct = 100;
  } else if (isPreferredLoc || matchesMode) {
    locationPct = 80;
  } else if (profile.willingnessToRelocate === 'Yes') {
    locationPct = 70;
  }
  const locationScore = Math.round((locationPct / 100) * 10 * 10) / 10;

  // Factor 5: Salary Match (10%)
  let salaryPct = 80;
  if (job.salaryMin !== undefined || job.salaryMax !== undefined) {
    const maxVal = job.salaryMax || job.salaryMin || 0;
    if (maxVal >= profile.minExpectedSalary) {
      salaryPct = 100;
    } else if (maxVal >= profile.minExpectedSalary * 0.85) {
      salaryPct = 75;
    } else {
      salaryPct = 40;
    }
  } else {
    missingDataFields.push('salary_range');
    salaryPct = 80; // Disclosed as neutral estimate
  }
  const salaryScore = Math.round((salaryPct / 100) * 10 * 10) / 10;

  // Factor 6: Education Match (5%)
  let eduPct = 100;
  if (job.educationRequired && /ph\.?d|master/i.test(job.educationRequired)) {
    if (/bachelor|b\.?tech/i.test(profile.education?.degree || '')) {
      eduPct = 75;
    }
  }
  const educationScore = Math.round((eduPct / 100) * 5 * 10) / 10;

  // Factor 7: Company / Industry Preference (5%)
  let companyPct = 60;
  if ((profile.targetCompanies || []).some(tc => job.company.toLowerCase().includes(tc.toLowerCase()))) {
    companyPct = 100;
  } else if (job.industry && (profile.preferredIndustries || []).some(ind => job.industry.toLowerCase().includes(ind.toLowerCase()))) {
    companyPct = 85;
  }
  const companyScore = Math.round((companyPct / 100) * 5 * 10) / 10;

  // Compute Total Score (0-100)
  const totalScore = Math.round(
    skillsScore + experienceScore + titleScore + locationScore + salaryScore + educationScore + companyScore
  );

  // Confidence / Completeness Metric:
  // 100% minus 15% per major missing field (e.g. salary, explicit skills, experience)
  const confidenceScore = Math.max(40, 100 - missingDataFields.length * 15);

  const passedThreshold = totalScore >= scoreThreshold;
  const recommendationReason = passedThreshold
    ? `Strong match (${totalScore}%). Verified overlap in ${matchedSkills.slice(0, 3).join(', ') || 'core skills'} with ${userExp} yrs experience.`
    : `Score ${totalScore}% is below your required threshold of ${scoreThreshold}%.`;

  return {
    totalScore,
    skillsScore,
    experienceScore,
    titleScore,
    locationScore,
    salaryScore,
    educationScore,
    companyScore,
    confidenceScore,
    passedHardFilters: passedThreshold,
    rejectionReason: passedThreshold ? undefined : recommendationReason,
    matchedSkills,
    missingRequiredSkills,
    missingDataFields,
    recommendationReason
  };
}

function createRejectionResult(
  totalScore: number,
  reason: string,
  matchedSkills: string[],
  missingRequiredSkills: string[],
  missingDataFields: string[]
): EvaluationResult {
  return {
    totalScore,
    skillsScore: 0,
    experienceScore: 0,
    titleScore: 0,
    locationScore: 0,
    salaryScore: 0,
    educationScore: 0,
    companyScore: 0,
    confidenceScore: 100,
    passedHardFilters: false,
    rejectionReason: reason,
    matchedSkills,
    missingRequiredSkills,
    missingDataFields,
    recommendationReason: reason
  };
}
