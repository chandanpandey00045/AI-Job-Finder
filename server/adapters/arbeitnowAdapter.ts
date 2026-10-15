import { JobSourceAdapter, SearchQuery, DiscoveredJob, SourceHealth } from './baseAdapter.js';
import { canonicalizeUrl } from '../services/deduplication.js';

export class ArbeitnowAdapter implements JobSourceAdapter {
  sourceId = 'arbeitnow';
  sourceName = 'Arbeitnow Global Jobs API';
  category: 'api_direct' = 'api_direct';

  async checkHealth(): Promise<SourceHealth> {
    try {
      const res = await fetch('https://www.arbeitnow.com/api/job-board-api', { signal: AbortSignal.timeout(5000) });
      if (res.ok) {
        return {
          sourceId: this.sourceId,
          sourceName: this.sourceName,
          category: this.category,
          status: 'connected',
          message: 'Arbeitnow API operational.',
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
        message: err.message || 'Connection failed',
        requiresAuth: false,
        dailyLimit: 100,
        todayCount: 0
      };
    }
  }

  async search(query: SearchQuery): Promise<DiscoveredJob[]> {
    try {
      const res = await fetch('https://www.arbeitnow.com/api/job-board-api', { signal: AbortSignal.timeout(10000) });
      if (!res.ok) return [];
      const json: any = await res.json();
      const list = json.data || [];

      const filtered = list.filter((j: any) => {
        const text = `${j.title} ${j.description} ${(j.tags || []).join(' ')}`.toLowerCase();
        // Check if any target title or primary skill matches
        const hasTitle = (query.titles || []).some(t => {
          const tLower = t.toLowerCase();
          return text.includes(tLower) || (j.title || '').toLowerCase().includes(tLower);
        });
        const hasSkill = (query.skills || []).some(s => {
          if (s.length < 3) return false;
          const escaped = s.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          return new RegExp(`\\b${escaped}\\b`, 'i').test(text);
        });
        return hasTitle || hasSkill;
      }).slice(0, query.limit || 15);

      // Never return random irrelevant fallbacks
      return filtered.map((j: any) => {
        const id = `arbeitnow-${j.slug || Math.random().toString(36).substring(2, 9)}`;
        const canonicalUrl = canonicalizeUrl(j.url);

        return {
          id,
          sourcePlatform: 'Arbeitnow',
          externalJobId: j.slug,
          canonicalUrl,
          title: j.title || 'Engineering Role',
          company: j.company_name || 'Tech Enterprise',
          location: j.location || 'Remote',
          workMode: j.remote ? 'Remote' : 'Hybrid',
          salaryMin: undefined,
          salaryMax: undefined,
          salaryCurrency: 'EUR',
          expMin: 1,
          expMax: 5,
          requiredSkills: (j.tags || []).slice(0, 6),
          preferredSkills: [],
          educationRequired: undefined,
          industry: 'Technology',
          description: j.description?.replace(/<[^>]*>?/gm, ' ').slice(0, 3000) || '',
          jobUrl: j.url,
          postedDate: new Date(j.created_at * 1000).toISOString().split('T')[0],
          sourceVerificationStatus: 'verified',
          applicationMethod: 'external_portal',
          jobStatus: 'active',
          rawData: { slug: j.slug, job_types: j.job_types }
        };
      });
    } catch (err) {
      console.error('Arbeitnow search error:', err);
      return [];
    }
  }

  generateSearchUrl(query: SearchQuery): string {
    const term = query.titles[0] || 'developer';
    return `https://www.arbeitnow.com/jobs?q=${encodeURIComponent(term)}`;
  }
}
