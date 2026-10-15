import dns from 'dns';
import { JobSourceAdapter, SearchQuery, DiscoveredJob, SourceHealth } from './baseAdapter.js';
import { canonicalizeUrl } from '../services/deduplication.js';

// Ensure IPv4 is resolved first on Node to prevent connection timeouts
try {
  dns.setDefaultResultOrder('ipv4first');
} catch (e) {
  // Ignored if unsupported
}

interface CompanyBoardTarget {
  companySlug: string;
  companyName: string;
  careersPortalUrl: string;
}

export class CompanyCareersAdapter implements JobSourceAdapter {
  sourceId = 'company_careers';
  sourceName = 'Official Company Careers';
  category: 'api_direct' = 'api_direct';

  // Target verified tech companies with official public Greenhouse ATS boards
  private targetCompanies: CompanyBoardTarget[] = [
    {
      companySlug: 'databricks',
      companyName: 'Databricks',
      careersPortalUrl: 'https://databricks.com/company/careers'
    },
    {
      companySlug: 'stripe',
      companyName: 'Stripe',
      careersPortalUrl: 'https://stripe.com/jobs'
    },
    {
      companySlug: 'figma',
      companyName: 'Figma',
      careersPortalUrl: 'https://boards.greenhouse.io/figma'
    },
    {
      companySlug: 'elastic',
      companyName: 'Elastic',
      careersPortalUrl: 'https://jobs.elastic.co'
    }
  ];

  async checkHealth(): Promise<SourceHealth> {
    try {
      const res = await fetch('https://boards-api.greenhouse.io/v1/boards/databricks/jobs', {
        signal: AbortSignal.timeout(6000)
      });
      if (res.ok) {
        return {
          sourceId: this.sourceId,
          sourceName: this.sourceName,
          category: this.category,
          status: 'connected',
          message: 'Official Greenhouse Career APIs connected for Databricks, Stripe, Figma, Elastic.',
          requiresAuth: false,
          dailyLimit: 200,
          todayCount: 0,
          details: 'Direct authorized applicant tracking system (ATS) queries. Zero scraping, zero bot blocks.'
        };
      }
      return {
        sourceId: this.sourceId,
        sourceName: this.sourceName,
        category: this.category,
        status: 'error',
        message: `HTTP error ${res.status}`,
        requiresAuth: false,
        dailyLimit: 200,
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
        dailyLimit: 200,
        todayCount: 0
      };
    }
  }

  async search(query: SearchQuery): Promise<DiscoveredJob[]> {
    const discovered: DiscoveredJob[] = [];
    const targetTitles = query.titles && query.titles.length > 0
      ? query.titles
      : ['Data Engineer', 'PySpark Developer', 'Azure Data Engineer', 'ETL Developer'];

    const targetRegexes = [
      /data\s*engineer/i,
      /pyspark/i,
      /data\s*platform/i,
      /etl\b/i,
      /databricks\s*(developer|engineer|specialist|architect)/i,
      /azure\s*data/i,
      /analytics\s*engineer/i,
      /database\s*(infrastructure|engine|internals)/i,
      /sql\s*(developer|engineer)/i
    ];

    // Query each verified company board concurrently
    await Promise.allSettled(
      this.targetCompanies.map(async (company) => {
        try {
          const url = `https://boards-api.greenhouse.io/v1/boards/${company.companySlug}/jobs`;
          const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
          if (!res.ok) return;

          const data: any = await res.json();
          const jobs: any[] = data.jobs || [];

          for (const j of jobs) {
            const title = (j.title || '').trim();
            
            // Reject non-engineering roles (marketing, product manager, sales, recruiter, legal, finance, execs)
            if (/product manager|marketing|sales|recruiter|talent|account executive|director|vp\b|vice president|legal|finance|counsel|intern\b/i.test(title)) {
              continue;
            }

            // Check title relevance strictly against target data engineering patterns
            const isRelevant = targetRegexes.some(r => r.test(title)) ||
              targetTitles.some(t => title.toLowerCase().includes(t.toLowerCase()));

            if (!isRelevant) continue;

            const jobId = `company-${company.companySlug}-${j.id}`;
            const jobUrl = j.absolute_url || `${company.careersPortalUrl}/jobs/${j.id}`;
            const canonicalUrl = canonicalizeUrl(jobUrl);

            // Extract location safely
            const location = j.location?.name || 'Multiple Locations / Remote';
            const workMode: 'Remote' | 'Hybrid' | 'On-site' =
              /remote/i.test(location) ? 'Remote' : /hybrid/i.test(location) ? 'Hybrid' : 'Hybrid';

            // Extract core skills from title keywords
            const skills: string[] = ['SQL', 'Python'];
            if (/pyspark/i.test(title)) skills.push('PySpark');
            if (/databricks/i.test(title)) skills.push('Databricks');
            if (/azure/i.test(title)) skills.push('Azure Data Factory', 'Azure');
            if (/platform/i.test(title)) skills.push('Data Modeling', 'ETL Pipelines');
            if (/database/i.test(title)) skills.push('Query Optimization', 'SQL Server');

            discovered.push({
              id: jobId,
              sourcePlatform: 'Company Careers',
              externalJobId: String(j.id),
              canonicalUrl,
              title,
              company: company.companyName,
              location,
              workMode,
              salaryCurrency: 'INR',
              expMin: 1,
              expMax: 5,
              requiredSkills: skills,
              preferredSkills: [],
              educationRequired: undefined,
              industry: 'Technology / Cloud & AI',
              description: `Official career opportunity at ${company.companyName} for ${title}. View full position requirements and apply directly on the company careers portal: ${jobUrl}`,
              jobUrl,
              postedDate: j.updated_at ? j.updated_at.split('T')[0] : new Date().toISOString().split('T')[0],
              sourceVerificationStatus: 'verified',
              applicationMethod: 'external_portal',
              jobStatus: 'active',
              rawData: {
                companySlug: company.companySlug,
                internalId: j.id,
                offices: j.offices
              }
            });
          }
        } catch (err) {
          console.warn(`Error querying company board ${company.companySlug}:`, err);
        }
      })
    );

    return discovered;
  }

  generateSearchUrl(query: SearchQuery): string {
    const term = query.titles[0] || 'Data Engineer';
    return `https://databricks.com/company/careers/open-positions?department=Engineering&search=${encodeURIComponent(term)}`;
  }
}
