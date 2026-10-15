import { JobSourceAdapter, SearchQuery, DiscoveredJob, SourceHealth } from './baseAdapter.js';
import { canonicalizeUrl } from '../services/deduplication.js';
import { config } from '../config.js';

export class AdzunaAdapter implements JobSourceAdapter {
  sourceId = 'adzuna';
  sourceName = 'Adzuna Job Search API';
  category: 'api_direct' = 'api_direct';

  async checkHealth(): Promise<SourceHealth> {
    if (!config.adzunaAppId || !config.adzunaAppKey) {
      return {
        sourceId: this.sourceId,
        sourceName: this.sourceName,
        category: this.category,
        status: 'unconfigured',
        message: 'Adzuna API credentials not configured in .env.',
        requiresAuth: true,
        dailyLimit: 250,
        todayCount: 0,
        details: 'Register free API credentials at https://developer.adzuna.com and add ADZUNA_APP_ID & ADZUNA_APP_KEY in .env.'
      };
    }

    try {
      const url = `https://api.adzuna.com/v1/api/jobs/${config.adzunaCountry}/search/1?app_id=${config.adzunaAppId}&app_key=${config.adzunaAppKey}&results_per_page=1&what=developer`;
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (res.ok) {
        return {
          sourceId: this.sourceId,
          sourceName: this.sourceName,
          category: this.category,
          status: 'connected',
          message: 'Adzuna API authorized and operational.',
          requiresAuth: true,
          dailyLimit: 250,
          todayCount: 0
        };
      }
      return {
        sourceId: this.sourceId,
        sourceName: this.sourceName,
        category: this.category,
        status: 'error',
        message: `HTTP ${res.status}: Invalid Adzuna credentials or country code.`,
        requiresAuth: true,
        dailyLimit: 250,
        todayCount: 0
      };
    } catch (err: any) {
      return {
        sourceId: this.sourceId,
        sourceName: this.sourceName,
        category: this.category,
        status: 'error',
        message: err.message,
        requiresAuth: true,
        dailyLimit: 250,
        todayCount: 0
      };
    }
  }

  async search(query: SearchQuery): Promise<DiscoveredJob[]> {
    if (!config.adzunaAppId || !config.adzunaAppKey) {
      return [];
    }

    const what = encodeURIComponent(query.titles[0] || query.skills[0] || 'developer');
    const where = encodeURIComponent(query.locations[0] || '');
    const url = `https://api.adzuna.com/v1/api/jobs/${config.adzunaCountry}/search/1?app_id=${config.adzunaAppId}&app_key=${config.adzunaAppKey}&results_per_page=${query.limit || 15}&what=${what}&where=${where}`;

    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
      if (!res.ok) return [];
      const json: any = await res.json();
      const results = json.results || [];

      return results.map((j: any) => {
        const id = `adzuna-${j.id}`;
        const canonicalUrl = canonicalizeUrl(j.redirect_url);

        return {
          id,
          sourcePlatform: 'Adzuna',
          externalJobId: String(j.id),
          canonicalUrl,
          title: j.title ? j.title.replace(/<[^>]*>?/gm, '') : 'Engineer',
          company: j.company?.display_name || 'Employer',
          location: j.location?.display_name || 'India',
          workMode: 'Hybrid',
          salaryMin: j.salary_min,
          salaryMax: j.salary_max,
          salaryCurrency: config.adzunaCountry === 'in' ? 'INR' : 'USD',
          expMin: 2,
          expMax: 6,
          requiredSkills: query.skills.slice(0, 5),
          preferredSkills: ['Problem Solving'],
          educationRequired: "Bachelor's Degree",
          industry: j.category?.label || 'Technology',
          description: j.description?.replace(/<[^>]*>?/gm, ' ').slice(0, 3000) || '',
          jobUrl: j.redirect_url,
          postedDate: j.created ? j.created.split('T')[0] : new Date().toISOString().split('T')[0],
          sourceVerificationStatus: 'verified',
          applicationMethod: 'external_portal',
          jobStatus: 'active',
          rawData: { adzunaCategory: j.category?.tag }
        };
      });
    } catch (err) {
      console.error('Adzuna search error:', err);
      return [];
    }
  }

  generateSearchUrl(query: SearchQuery): string {
    const what = query.titles[0] || 'developer';
    const where = query.locations[0] || '';
    return `https://www.adzuna.in/search?q=${encodeURIComponent(what)}&w=${encodeURIComponent(where)}`;
  }
}
