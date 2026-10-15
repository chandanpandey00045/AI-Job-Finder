import { UserProfile, JobListing, MatchScoreBreakdown } from '../types';

export function evaluateJobMatch(
  job: JobListing,
  profile: UserProfile,
  existingJobs: JobListing[] = [],
  scoreThreshold: number = 75
): MatchScoreBreakdown {
  // 1. HARD FILTERS CHECK FIRST

  // Duplicate Check
  if (job.isDuplicate) {
    return {
      totalScore: 0,
      skillsScore: 0,
      experienceScore: 0,
      titleScore: 0,
      locationScore: 0,
      salaryScore: 0,
      educationScore: 0,
      companyScore: 0,
      passedHardFilters: false,
      rejectionReason: `Duplicate listing (Duplicate of ${job.duplicateOfId || 'existing job'}).`
    };
  }

  // Company / Industry Blacklist Check
  const isCompanyAvoided = profile.companiesToAvoid.some(
    avoid => job.company.toLowerCase().includes(avoid.toLowerCase())
  );
  const isJobTypeAvoided = profile.jobTypesToAvoid.some(
    avoid => job.title.toLowerCase().includes(avoid.toLowerCase()) || job.industry.toLowerCase().includes(avoid.toLowerCase())
  );

  if (isCompanyAvoided) {
    return {
      totalScore: 0,
      skillsScore: 0,
      experienceScore: 0,
      titleScore: 0,
      locationScore: 0,
      salaryScore: 0,
      educationScore: 0,
      companyScore: 0,
      passedHardFilters: false,
      rejectionReason: `Company "${job.company}" is in your avoidance list.`
    };
  }

  if (isJobTypeAvoided) {
    return {
      totalScore: 0,
      skillsScore: 0,
      experienceScore: 0,
      titleScore: 0,
      locationScore: 0,
      salaryScore: 0,
      educationScore: 0,
      companyScore: 0,
      passedHardFilters: false,
      rejectionReason: `Role/Industry "${job.title}" matches your job type avoidance rules.`
    };
  }

  // Suspicious / Fraudulent Check
  if (job.isSuspicious) {
    return {
      totalScore: 0,
      skillsScore: 0,
      experienceScore: 0,
      titleScore: 0,
      locationScore: 0,
      salaryScore: 0,
      educationScore: 0,
      companyScore: 0,
      passedHardFilters: false,
      flaggedSuspicious: true,
      rejectionReason: job.suspiciousReason || "Job flagged as potentially fraudulent or suspicious."
    };
  }

  // Experience Substantially Higher Check (e.g. required min exp > candidate exp + 3 years)
  if (job.requiredExperienceYears.min > profile.totalExperienceYears + 3) {
    return {
      totalScore: 0,
      skillsScore: 0,
      experienceScore: 0,
      titleScore: 0,
      locationScore: 0,
      salaryScore: 0,
      educationScore: 0,
      companyScore: 0,
      passedHardFilters: false,
      rejectionReason: `Required experience (${job.requiredExperienceYears.min}-${job.requiredExperienceYears.max} yrs) is substantially higher than your ${profile.totalExperienceYears} yrs.`
    };
  }

  // 2. WEIGHTED SCORING CALCULATION (0 - 100 TOTAL)

  // A. Skills Match (30%)
  const userSkills = [...profile.primarySkills, ...profile.secondarySkills].map(s => s.toLowerCase());
  const requiredSkills = job.requiredSkills.map(s => s.toLowerCase());
  
  let matchedSkillsCount = 0;
  if (requiredSkills.length > 0) {
    requiredSkills.forEach(reqSkill => {
      if (userSkills.some(uSkill => uSkill.includes(reqSkill) || reqSkill.includes(uSkill))) {
        matchedSkillsCount++;
      }
    });
    // Calculate raw skills percentage
    const rawSkillsPct = Math.min(100, (matchedSkillsCount / requiredSkills.length) * 100);
    var skillsScore = (rawSkillsPct / 100) * 30; // 30 points max
  } else {
    var skillsScore = 25; // Default benefit if not specified
  }

  // B. Experience Match (20%)
  let expPct = 100;
  const candidateExp = profile.totalExperienceYears;
  const minReq = job.requiredExperienceYears.min;
  const maxReq = job.requiredExperienceYears.max;

  if (candidateExp >= minReq && candidateExp <= maxReq) {
    expPct = 100;
  } else if (candidateExp < minReq) {
    const diff = minReq - candidateExp;
    expPct = Math.max(20, 100 - (diff * 25));
  } else {
    // Overqualified slightly
    expPct = 90;
  }
  const experienceScore = (expPct / 100) * 20; // 20 points max

  // C. Job Title / Responsibility Match (20%)
  const jobTitleLower = job.title.toLowerCase();
  let titlePct = 40; // baseline

  const matchedTitle = profile.preferredTitles.find(title => {
    const tLower = title.toLowerCase();
    return jobTitleLower.includes(tLower) || tLower.includes(jobTitleLower);
  });

  if (matchedTitle) {
    titlePct = 100;
  } else if (
    jobTitleLower.includes("data") || 
    jobTitleLower.includes("engineer") || 
    jobTitleLower.includes("developer") ||
    jobTitleLower.includes("full stack")
  ) {
    titlePct = 75; // Related title match
  }
  const titleScore = (titlePct / 100) * 20; // 20 points max

  // D. Location & Work-Mode Match (10%)
  let locationPct = 50;
  const isPreferredLocation = profile.preferredLocations.some(loc => 
    loc.toLowerCase() === 'remote' || job.location.toLowerCase().includes(loc.toLowerCase())
  );
  
  const matchesWorkMode = profile.workModePreference === 'Any' || 
    job.workMode.toLowerCase() === profile.workModePreference.toLowerCase();

  if (isPreferredLocation && matchesWorkMode) {
    locationPct = 100;
  } else if (isPreferredLocation || matchesWorkMode) {
    locationPct = 75;
  } else if (profile.willingnessToRelocate === 'Yes') {
    locationPct = 70;
  }
  const locationScore = (locationPct / 100) * 10; // 10 points max

  // E. Salary Match (10%)
  let salaryPct = 80;
  if (job.salaryRange) {
    if (job.salaryRange.max >= profile.minExpectedSalary) {
      salaryPct = 100;
    } else if (job.salaryRange.min >= profile.minExpectedSalary * 0.85) {
      salaryPct = 75;
    } else {
      salaryPct = 40;
    }
  }
  const salaryScore = (salaryPct / 100) * 10; // 10 points max

  // F. Education / Qualification Match (5%)
  let eduPct = 100;
  if (job.educationRequired.toLowerCase().includes("ph.d") || job.educationRequired.toLowerCase().includes("master")) {
    if (profile.education.degree.toLowerCase().includes("b.tech") || profile.education.degree.toLowerCase().includes("bachelor")) {
      eduPct = 70;
    }
  }
  const educationScore = (eduPct / 100) * 5; // 5 points max

  // G. Industry / Company Preference (5%)
  let companyPct = 60;
  if (profile.targetCompanies.some(tc => job.company.toLowerCase().includes(tc.toLowerCase()))) {
    companyPct = 100;
  } else if (profile.preferredIndustries.some(ind => job.industry.toLowerCase().includes(ind.toLowerCase()))) {
    companyPct = 85;
  }
  const companyScore = (companyPct / 100) * 5; // 5 points max

  // Total Score (0 - 100)
  const totalScore = Math.round(
    skillsScore + experienceScore + titleScore + locationScore + salaryScore + educationScore + companyScore
  );

  const passedThreshold = totalScore >= scoreThreshold;

  return {
    totalScore,
    skillsScore: Math.round(skillsScore * 10) / 10,
    experienceScore: Math.round(experienceScore * 10) / 10,
    titleScore: Math.round(titleScore * 10) / 10,
    locationScore: Math.round(locationScore * 10) / 10,
    salaryScore: Math.round(salaryScore * 10) / 10,
    educationScore: Math.round(educationScore * 10) / 10,
    companyScore: Math.round(companyScore * 10) / 10,
    passedHardFilters: passedThreshold,
    rejectionReason: passedThreshold 
      ? undefined 
      : `Match score ${totalScore}% is below minimum required threshold of ${scoreThreshold}%.`
  };
}
