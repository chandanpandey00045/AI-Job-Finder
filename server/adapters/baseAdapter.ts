export interface SearchQuery {
  titles: string[];
  skills: string[];
  locations: string[];
  workMode?: 'Remote' | 'Hybrid' | 'On-site' | 'Any';
  maxAgeDays?: number;
  limit?: number;
}

export interface DiscoveredJob {
  id: string;
  sourcePlatform: string;
  externalJobId?: string;
  canonicalUrl: string;
  title: string;
  company: string;
  location: string;
  workMode: 'Remote' | 'Hybrid' | 'On-site';
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency: string;
  expMin: number;
  expMax: number;
  requiredSkills: string[];
  preferredSkills: string[];
  educationRequired: string;
  industry: string;
  description: string;
  jobUrl: string;
  postedDate: string;
  sourceVerificationStatus: 'verified' | 'unverified' | 'stale';
  applicationMethod: 'direct_api' | 'external_portal' | 'email';
  jobStatus: 'active' | 'expired' | 'closed';
  isSuspicious?: boolean;
  suspiciousReason?: string;
  screeningQuestions?: Array<{
    id: string;
    question: string;
    type: 'text' | 'choice' | 'boolean' | 'sensitive';
    options?: string[];
    isSensitive?: boolean;
  }>;
  rawData?: any;
}

export interface SourceHealth {
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

export interface JobSourceAdapter {
  sourceId: string;
  sourceName: string;
  category: 'api_direct' | 'feed_open' | 'restricted_portal';
  search(query: SearchQuery): Promise<DiscoveredJob[]>;
  checkHealth(): Promise<SourceHealth>;
  generateSearchUrl?(query: SearchQuery): string;
}
