import { JobSourceAdapter, SearchQuery, DiscoveredJob, SourceHealth } from './baseAdapter.js';
import { canonicalizeUrl } from '../services/deduplication.js';

export class RemotiveAdapter implements JobSourceAdapter {
  sourceId = 'remotive';
  sourceName = 'Remotive Live Tech API';
  category: 'api_direct' = 'api_direct';

  async checkHealth(): Promise<SourceHealth> {
    try {
      const res = await fetch('https://remotive.com/api/remote-jobs?limit=1', { signal: AbortSignal.timeout(5000) });
      if (res.ok) {
        return {
          sourceId: this.sourceId,
          sourceName: this.sourceName,
          category: this.category,
          status: 'connected',
          message: 'Remotive API connected and responsive.',
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
    const searchTerm = query.titles[0] || query.skills[0] || 'data engineer';
    // Query Remotive data & software categories
    const url = `https://remotive.com/api/remote-jobs?category=data&search=${encodeURIComponent(searchTerm)}&limit=${query.limit || 15}`;

    try {
      let res = await fetch(url, { signal: AbortSignal.timeout(10000) });
      let json: any = res.ok ? await res.json() : { jobs: [] };
      let jobs = json.jobs || [];

      // If data category had few results, try software-dev category with specific title
      if (jobs.length < 5) {
        const devUrl = `https://remotive.com/api/remote-jobs?category=software-dev&search=${encodeURIComponent(searchTerm)}&limit=10`;
        const devRes = await fetch(devUrl, { signal: AbortSignal.timeout(10000) });
        if (devRes.ok) {
          const devJson: any = await devRes.json();
          jobs = [...jobs, ...(devJson.jobs || [])];
        }
      }

      // Filter out non-tech / writing / sales roles
      const filtered = jobs.filter((j: any) => {
        const titleLower = (j.title || '').toLowerCase();
        if (/writer|writing|sales|copywriter|content|marketing|account executive|receptionist/i.test(titleLower)) {
          return false;
        }
        return true;
      });

      return filtered.map((j: any) => {
        const id = `remotive-${j.id}`;
        const canonicalUrl = canonicalizeUrl(j.url);
        
        // Extract salary if available in salary field
        let salaryMin: number | undefined;
        let salaryMax: number | undefined;
        let salaryCurrency = 'USD';
        if (j.salary) {
          const match = j.salary.match(/\$?(\d{2,3})[,\s]?(\d{3})/g);
          if (match && match.length >= 1) {
            salaryMin = parseInt(match[0].replace(/[$,\s]/g, ''), 10);
            if (match[1]) salaryMax = parseInt(match[1].replace(/[$,\s]/g, ''), 10);
          }
        }

        // Skills from tags
        const requiredSkills = [...(j.tags || [])].slice(0, 8);
        if (query.skills) {
          for (const s of query.skills) {
            const escaped = s.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            if (new RegExp(`\\b${escaped}\\b`, 'i').test(j.description || '') && !requiredSkills.includes(s)) {
              requiredSkills.push(s);
            }
          }
        }

        return {
          id,
          sourcePlatform: 'Remotive',
          externalJobId: String(j.id),
          canonicalUrl,
          title: j.title || 'Data Engineer',
          company: j.company_name || 'Tech Company',
          location: j.candidate_required_location || 'Worldwide (Remote)',
          workMode: 'Remote',
          salaryMin,
          salaryMax,
          salaryCurrency,
          expMin: 1,
          expMax: 5,
          requiredSkills: requiredSkills,
          preferredSkills: [],
          educationRequired: undefined,
          industry: 'Software / Technology',
          description: j.description?.replace(/<[^>]*>?/gm, ' ').slice(0, 3000) || '',
          jobUrl: j.url,
          postedDate: j.publication_date ? j.publication_date.split('T')[0] : new Date().toISOString().split('T')[0],
          sourceVerificationStatus: 'verified',
          applicationMethod: 'external_portal',
          jobStatus: 'active',
          rawData: { remotiveId: j.id, job_type: j.job_type }
        };
      });
    } catch (err) {
      console.error('Remotive search error:', err);
      return [];
    }
  }

  generateSearchUrl(query: SearchQuery): string {
    const term = query.skills[0] || query.titles[0] || 'software';
    return `https://remotive.com/remote-jobs/software-dev?search=${encodeURIComponent(term)}`;
  }
}
