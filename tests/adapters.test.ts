import { describe, it, expect } from 'vitest';
import { allAdapters } from '../server/adapters/index.js';

describe('Modular Job Source Adapters', () => {
  it('Remotive adapter is configured as direct API source', async () => {
    const adapter = allAdapters.remotive;
    expect(adapter.category).toBe('api_direct');
    expect(adapter.sourceId).toBe('remotive');
  });

  it('LinkedIn and Naukri adapters honestly report fallback status and do not pretend to scrape', async () => {
    const linkedin = allAdapters.linkedin;
    const naukri = allAdapters.naukri;

    const healthLk = await linkedin.checkHealth();
    expect(healthLk.status).toBe('fallback_active');
    expect(healthLk.message).toContain('Terms of Service');

    const healthNk = await naukri.checkHealth();
    expect(healthNk.status).toBe('fallback_active');
  });

  it('generates valid search URLs for restricted platforms', () => {
    const linkedin = allAdapters.linkedin;
    const query = {
      titles: ['Senior Data Engineer'],
      skills: ['PySpark', 'SQL'],
      locations: ['Bengaluru']
    };

    const url = linkedin.generateSearchUrl!(query);
    expect(url).toContain('linkedin.com/jobs/search');
    expect(url).toContain('keywords=Senior%20Data%20Engineer');
    expect(url).toContain('location=Bengaluru');
  });

  it('Company Careers adapter queries official company career portals', async () => {
    const adapter = allAdapters.company_careers;
    expect(adapter).toBeDefined();
    expect(adapter.sourceId).toBe('company_careers');
    expect(adapter.category).toBe('api_direct');
    const searchUrl = adapter.generateSearchUrl!({
      titles: ['Data Engineer'],
      skills: ['PySpark'],
      locations: ['Bengaluru']
    });
    expect(searchUrl).toContain('databricks.com/company/careers');
  });
});
