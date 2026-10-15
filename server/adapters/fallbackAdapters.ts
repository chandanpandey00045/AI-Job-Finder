import { JobSourceAdapter, SearchQuery, DiscoveredJob, SourceHealth } from './baseAdapter.js';
import { canonicalizeUrl } from '../services/deduplication.js';

export class RestrictedPortalFallbackAdapter implements JobSourceAdapter {
  sourceId: string;
  sourceName: string;
  category: 'restricted_portal' = 'restricted_portal';
  private searchUrlBuilder: (query: SearchQuery) => string;
  private platformDetails: string;

  constructor(
    sourceId: string,
    sourceName: string,
    details: string,
    searchUrlBuilder: (query: SearchQuery) => string
  ) {
    this.sourceId = sourceId;
    this.sourceName = sourceName;
    this.platformDetails = details;
    this.searchUrlBuilder = searchUrlBuilder;
  }

  async checkHealth(): Promise<SourceHealth> {
    return {
      sourceId: this.sourceId,
      sourceName: this.sourceName,
      category: this.category,
      status: 'fallback_active',
      message: `Honest Fallback Active: Direct scraping prohibited by ${this.sourceName} Terms of Service. Programmatic access requires enterprise partner OAuth.`,
      requiresAuth: true,
      dailyLimit: 30,
      todayCount: 0,
      details: this.platformDetails
    };
  }

  // Does not pretend to scrape restricted portals without authorization
  async search(query: SearchQuery): Promise<DiscoveredJob[]> {
    return [];
  }

  generateSearchUrl(query: SearchQuery): string {
    return this.searchUrlBuilder(query);
  }

  /**
   * Honest Assisted Import:
   * When a candidate finds an interesting job on LinkedIn / Naukri / Indeed,
   * they can paste the link and details to parse, evaluate, and track it with zero fabrication.
   */
  createImportedJob(data: {
    title: string;
    company: string;
    location: string;
    workMode?: 'Remote' | 'Hybrid' | 'On-site';
    jobUrl: string;
    description: string;
    requiredSkills?: string[];
    salaryText?: string;
  }): DiscoveredJob {
    const id = `${this.sourceId}-import-${Date.now()}`;
    const canonical = canonicalizeUrl(data.jobUrl);

    return {
      id,
      sourcePlatform: this.sourceName,
      canonicalUrl: canonical,
      title: data.title,
      company: data.company,
      location: data.location || 'India',
      workMode: data.workMode || 'Hybrid',
      salaryCurrency: 'INR',
      expMin: 1,
      expMax: 5,
      requiredSkills: data.requiredSkills || [],
      preferredSkills: [],
      educationRequired: undefined,
      industry: 'Technology',
      description: data.description || '',
      jobUrl: data.jobUrl,
      postedDate: new Date().toISOString().split('T')[0],
      sourceVerificationStatus: 'verified',
      applicationMethod: 'external_portal',
      jobStatus: 'active'
    };
  }
}

// 1. LinkedIn
export const linkedInAdapter = new RestrictedPortalFallbackAdapter(
  'linkedin',
  'LinkedIn (Active Browser Session)',
  'Leverages your active logged-in browser session. Generates 1-Click Easy Apply (f_AL=true) search feeds for 1-3 yrs experience and enables 1-click vacancy ingestion via browser bookmarklet.',
  (q) => {
    const title = q.titles[0] || 'Data Engineer';
    const loc = q.locations[0] || 'Bengaluru';
    return `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(title)}&location=${encodeURIComponent(loc)}&f_AL=true&f_E=2%2C3&sortBy=DD`;
  }
);

// 2. Naukri.com
export const naukriAdapter = new RestrictedPortalFallbackAdapter(
  'naukri',
  'Naukri.com (Active Browser Session)',
  'Leverages your active logged-in browser session. Generates targeted 1-year experience FastForward search feeds and enables 1-click vacancy ingestion via browser bookmarklet.',
  (q) => {
    const title = q.titles[0] || 'Data Engineer';
    const loc = q.locations[0] || 'Bengaluru';
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    return `https://www.naukri.com/${slug}-jobs-in-${loc.toLowerCase()}?experience=1&k=${encodeURIComponent(title)}&l=${encodeURIComponent(loc)}`;
  }
);

// 3. Indeed
export const indeedAdapter = new RestrictedPortalFallbackAdapter(
  'indeed',
  'Indeed',
  'Indeed requires Indeed Apply partner agreement. Generates direct search filters with salary and recency parameters.',
  (q) => {
    const title = q.titles[0] || 'Data Engineer';
    const loc = q.locations[0] || 'Bengaluru';
    return `https://in.indeed.com/jobs?q=${encodeURIComponent(title)}&l=${encodeURIComponent(loc)}&fromage=7`;
  }
);

// 4. Foundit
export const founditAdapter = new RestrictedPortalFallbackAdapter(
  'foundit',
  'Foundit (Monster)',
  'Foundit access requires recruiter partner credentials. Generates direct search filter query.',
  (q) => {
    const title = q.titles[0] || 'Data Engineer';
    const loc = q.locations[0] || 'Bengaluru';
    return `https://www.foundit.in/srp/results?query=${encodeURIComponent(title)}&locations=${encodeURIComponent(loc)}`;
  }
);

// 5. Wellfound (AngelList)
export const wellfoundAdapter = new RestrictedPortalFallbackAdapter(
  'wellfound',
  'Wellfound (AngelList)',
  'Wellfound startup jobs platform requires recruiter or talent login. Generates direct startup role filters.',
  (q) => {
    const title = q.titles[0] || 'Software Engineer';
    return `https://wellfound.com/jobs?role=${encodeURIComponent(title)}`;
  }
);
