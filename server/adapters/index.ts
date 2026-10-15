import { JobSourceAdapter, SearchQuery, DiscoveredJob, SourceHealth } from './baseAdapter.js';
import { RemotiveAdapter } from './remotiveAdapter.js';
import { ArbeitnowAdapter } from './arbeitnowAdapter.js';
import { JobicyAdapter } from './jobicyAdapter.js';
import { AdzunaAdapter } from './adzunaAdapter.js';
import { CompanyCareersAdapter } from './companyCareersAdapter.js';
import {
  linkedInAdapter,
  naukriAdapter,
  indeedAdapter,
  founditAdapter,
  wellfoundAdapter
} from './fallbackAdapters.js';

export const allAdapters: Record<string, JobSourceAdapter> = {
  company_careers: new CompanyCareersAdapter(),
  remotive: new RemotiveAdapter(),
  arbeitnow: new ArbeitnowAdapter(),
  jobicy: new JobicyAdapter(),
  adzuna: new AdzunaAdapter(),
  linkedin: linkedInAdapter,
  naukri: naukriAdapter,
  indeed: indeedAdapter,
  foundit: founditAdapter,
  wellfound: wellfoundAdapter
};

export async function runMultiSourceJobDiscovery(query: SearchQuery): Promise<{
  jobs: DiscoveredJob[];
  sourcesQueried: string[];
  errors: Array<{ sourceId: string; error: string }>;
}> {
  const jobs: DiscoveredJob[] = [];
  const sourcesQueried: string[] = [];
  const errors: Array<{ sourceId: string; error: string }> = [];

  // Query all active programmatic adapters concurrently including Official Company Careers
  const programmaticSources = [
    allAdapters.company_careers,
    allAdapters.remotive,
    allAdapters.arbeitnow,
    allAdapters.jobicy,
    allAdapters.adzuna
  ];

  const results = await Promise.allSettled(
    programmaticSources.map(async (adapter) => {
      sourcesQueried.push(adapter.sourceId);
      return adapter.search(query);
    })
  );

  results.forEach((res, index) => {
    const adapter = programmaticSources[index];
    if (res.status === 'fulfilled') {
      jobs.push(...res.value);
    } else {
      errors.push({ sourceId: adapter.sourceId, error: res.reason?.message || 'Search failed' });
    }
  });

  return { jobs, sourcesQueried, errors };
}

export async function getAllSourcesHealth(): Promise<SourceHealth[]> {
  const list = Object.values(allAdapters);
  return Promise.all(list.map((a) => a.checkHealth()));
}
