export interface UserProfile {
  fullName: string;
  email: string;
  phone: string;
  currentTitle: string;
  totalExperienceYears: number;
  primarySkills: string[];
  secondarySkills: string[];
  education: {
    degree: string;
    field: string;
    institution: string;
    passingYear: number;
  };
  preferredTitles: string[];
  preferredIndustries: string[];
  preferredLocations: string[];
  workModePreference: 'Remote' | 'Hybrid' | 'On-site' | 'Any';
  minExpectedSalary: number; // Annual in INR or local unit
  currency: string;
  noticePeriodDays: number;
  currentLocation: string;
  willingnessToRelocate: 'Yes' | 'No' | 'Conditional';
  preferredEmploymentType: 'Full-time' | 'Contract' | 'Part-time';
  targetCompanies: string[];
  companiesToAvoid: string[];
  jobTypesToAvoid: string[];
  resumeText: string;
  profileSummary: string;
  workAuthorization: string;
  hasVisaSponsorship: boolean;
  legalDeclarationsVerified: boolean;
  maxDailyApplications?: number;
  maxJobAgeDays?: number;
  minMatchScore?: number;
  originalResumeFilename?: string;
}

export interface MatchScoreBreakdown {
  totalScore: number;
  skillsScore: number;       // 30% weight
  experienceScore: number;   // 20% weight
  titleScore: number;        // 20% weight
  locationScore: number;     // 10% weight
  salaryScore: number;       // 10% weight
  educationScore: number;    // 5% weight
  companyScore: number;      // 5% weight
  passedHardFilters: boolean;
  rejectionReason?: string;
  flaggedSuspicious?: boolean;
  confidenceScore?: number;  // 0 - 100% data completeness
  matchedSkills?: string[];
  missingRequiredSkills?: string[];
  missingDataFields?: string[];
  recommendationReason?: string;
}

export interface JobListing {
  id: string;
  company: string;
  title: string;
  platform: 'LinkedIn' | 'Naukri' | 'Indeed' | 'Remotive' | 'Arbeitnow' | 'Jobicy' | 'Adzuna' | 'Wellfound' | 'Foundit' | string;
  location: string;
  workMode: 'Remote' | 'Hybrid' | 'On-site';
  salaryRange?: {
    min: number;
    max: number;
    currency: string;
  };
  requiredExperienceYears: {
    min: number;
    max: number;
  };
  requiredSkills: string[];
  preferredSkills?: string[];
  educationRequired: string;
  industry: string;
  description: string;
  jobUrl: string;
  postedDate: string;
  isDuplicate?: boolean;
  duplicateOfId?: string;
  isSuspicious?: boolean;
  suspiciousReason?: string;
  requiresHumanInput?: boolean;
  humanInputReason?: string;
  screeningQuestions?: {
    id: string;
    question: string;
    type: 'text' | 'choice' | 'boolean' | 'sensitive';
    options?: string[];
    answer?: string;
    isSensitive?: boolean;
  }[];
  matchBreakdown?: MatchScoreBreakdown;
}

export type ApplicationStatus =
  | 'Discovered'
  | 'Evaluated'
  | 'Ready to Apply'
  | 'Approval Required'
  | 'Application In Progress'
  | 'Submitted'
  | 'Interview'
  | 'Offer'
  | 'Rejected'
  | 'Withdrawn'
  | 'Expired'
  | 'Failed'
  | 'Skipped'
  | 'Applied'; // backward compatibility

export interface ApplicationRecord {
  id: string;
  jobId: string;
  company: string;
  jobTitle: string;
  platform: string;
  location: string;
  workMode: 'Remote' | 'Hybrid' | 'On-site';
  matchScore: number;
  salaryText: string;
  jobUrl: string;
  dateFound: string;
  dateApplied: string | null;
  status: ApplicationStatus;
  notes: string;
  coverLetterGenerated?: string;
  tailoredSummary?: string;
  tailoredSkills?: string[];
  answersProvided?: Record<string, any>;
  submissionEvidence?: {
    submittedAt: string;
    receiptId: string;
    confirmationUrl: string;
    verifiedByCandidate?: boolean;
    notes?: string;
  };
  submissionType?: string;
  rejectionOrSkipReason?: string;
  pendingApprovalQuestion?: {
    questionText: string;
    category: 'Salary' | 'Work Authorization' | 'Visa' | 'Relocation' | 'Notice Period' | 'Legal' | 'CAPTCHA/Security' | 'Sensitive';
    candidateMatchSummary: string;
  };
  approvalStatus?: 'none' | 'pending' | 'approved' | 'declined';
  approvedAt?: string;
  failureReason?: string;
}

export interface DailyReportSummary {
  runDate: string;
  jobsFound: number;
  jobsMatching: number;
  applicationsSubmitted: number;
  jobsSkipped: number;
  pendingApprovals: number;
  readyToApplyCount?: number;
  interviewCount?: number;
  offerCount?: number;
}

export interface WorkflowLog {
  id: string;
  timestamp: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'approval';
  step: string;
  message: string;
}

export interface SourceHealthItem {
  sourceId: string;
  sourceName: string;
  category: 'api_direct' | 'feed_open' | 'restricted_portal';
  status: 'connected' | 'unconfigured' | 'fallback_active' | 'error';
  message: string;
  requiresAuth: boolean;
  dailyLimit: number;
  todayCount: number;
  details?: string;
}
