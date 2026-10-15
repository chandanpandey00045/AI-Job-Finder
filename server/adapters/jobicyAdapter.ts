import { JobSourceAdapter, SearchQuery, DiscoveredJob, SourceHealth } from './baseAdapter.js';
import { canonicalizeUrl } from '../services/deduplication.js';

export class JobicyAdapter implements JobSourceAdapter {
  sourceId = 'jobicy';
  sourceName = 'Jobicy Remote API';
  category: 'api_direct' = 'api_direct';

  async checkHealth(): Promise<SourceHealth> {
    try {
      const res = await fetch('https://jobicy.com/api/v2/remote-jobs?count=1', { signal: AbortSignal.timeout(5000) });
      if (res.ok) {
        return {
          sourceId: this.sourceId,
          sourceName: this.sourceName,
          category: this.category,
          status: 'connected',
          message: 'Jobicy Remote Jobs API active.',
          requiresAuth: false,
          dailyLimit: 100,
          todayCount: 0
        };
      }
      return {
        sourceId: this.sourceId,
        sourceName: this.sourceName,
        category: this.category,
        status: 'error',
        message: `HTTP error ${res.status}`,
        requiresAuth: false,
        dailyLimit: 100,
        todayCount: 0
      };
    } catch (err: any) {
      return {
        sourceId: this.sourceId,
        sourceName: this.sourceName,
        category: this.category,
        status: 'error',
        message: err.message || 'Connection timeout',
        requiresAuth: false,
        dailyLimit: 100,
        todayCount: 0
      };
    }
  }

  async search(query: SearchQuery): Promise<DiscoveredJob[]> {
    try {
      const tag = encodeURIComponent((query.titles[0] || '').toLowerCase().includes('data') ? 'data' : (query.skills[0] || 'data'));
      const url = `https://jobicy.com/api/v2/remote-jobs?count=${query.limit || 15}&tag=${tag}`;

      const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
      if (!res.ok) return [];
      const json: any = await res.json();
      const jobs = json.jobs || [];

      // Filter out non-tech / marketing / brand / GTM roles
      const filtered = jobs.filter((j: any) => {
        const titleLower = (j.jobTitle || '').toLowerCase();
        if (/marketing|brand|events|gtm|sales|writer|analyst -|recruiter|hr/i.test(titleLower)) {
          return false;
        }
        return true;
      });

      return filtered.map((j: any) => {
        const id = `jobicy-${j.id}`;
        const canonicalUrl = canonicalizeUrl(j.url);

        const skills = (j.jobExcerpt || '')
          .split(',')
          .map((s: string) => s.trim())
          .filter((s: string) => s.length > 1 && !/remote collaboration/i.test(s))
          .slice(0, 6);

        return {
          id,
          sourcePlatform: 'Jobicy',
          externalJobId: String(j.id),
          canonicalUrl,
          title: j.jobTitle || 'Data Engineer',
          company: j.companyName || 'Remote Tech Co',
          location: j.jobGeo || 'Anywhere (Remote)',
          workMode: 'Remote',
          salaryMin: j.annualSalaryMin ? parseInt(j.annualSalaryMin, 10) : undefined,
          salaryMax: j.annualSalaryMax ? parseInt(j.annualSalaryMax, 10) : undefined,
          salaryCurrency: j.salaryCurrency || 'USD',
          expMin: 1,
          expMax: 5,
          requiredSkills: skills,
          preferredSkills: [],
          educationRequired: undefined,
          industry: Array.isArray(j.jobIndustry) ? j.jobIndustry.join(', ') : (j.jobIndustry || 'Technology'),
          description: j.jobDescription?.replace(/<[^>]*>?/gm, ' ').slice(0, 3000) || '',
          jobUrl: j.url,
          postedDate: j.pubDate ? j.pubDate.split('T')[0] : new Date().toISOString().split('T')[0],
          sourceVerificationStatus: 'verified',
          applicationMethod: 'external_portal',
          jobStatus: 'active',
          rawData: { jobType: j.jobType, jobLevel: j.jobLevel }
        };
      });
    } catch (err) {
      console.error('Jobicy search error:', err);
      return [];
    }
  }

  generateSearchUrl(query: SearchQuery): string {
    const term = query.skills[0] || 'engineering';
    return `https://jobicy.com/jobs?q=${encodeURIComponent(term)}`;
  }
}
