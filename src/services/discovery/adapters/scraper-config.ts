// Central scraper configuration for the AI Discovery Agent.
// Ported from the proven standalone bot's `src/config/defaults.ts`, with each
// source assigned an explicit ingestion `strategy`:
//   - 'http'    → plain axios + cheerio (no browser). LinkedIn's guest API works headless.
//   - 'browser' → Playwright + stealth (JS-heavy / Cloudflare-lite boards).
// Adzuna is handled separately by AdzunaAdapter ('api' route).

export type ScrapeStrategy = 'http' | 'browser';

export interface ScrapeSelectors {
  jobCard: string;
  title: string;
  company: string;
  location: string;
  link: string;
  jobLink?: string;
  description?: string;
  salary?: string;
  nextPage?: string;
}

export interface ScrapeConfig {
  slug: string;
  name: string;
  baseUrl: string;
  strategy: ScrapeStrategy;
  /** 'global' boards (LinkedIn) accept any country; otherwise an ISO-2 country
   *  code that the board serves. Locations are filtered to match. Defaults 'au'. */
  region?: string;
  searchUrl: (keyword: string, location: string) => string;
  cloudflareBlocked?: boolean;
  requiresAuth?: boolean;
  selectors: ScrapeSelectors;
}

const q = encodeURIComponent;

export const SCRAPER_CONFIGS: Record<string, ScrapeConfig> = {
  linkedin: {
    slug: 'linkedin',
    name: 'LinkedIn',
    baseUrl: 'https://www.linkedin.com',
    strategy: 'http',
    region: 'global',
    searchUrl: (kw, loc) =>
      `https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords=${q(kw)}&location=${q(loc)}&f_TPR=r86400&start=0&count=25`,
    selectors: {
      jobCard: '.base-search-card, .base-card',
      title: '.base-search-card__title, .job-search-card__title',
      company: '.base-search-card__subtitle, .job-search-card__subtitle',
      location: '.job-search-card__location, .base-search-card__metadata',
      link: '.base-search-card__title, .job-search-card__title',
      jobLink: '.base-card__full-link, a.base-card__full-link',
      nextPage: '',
    },
  },
  jora: {
    slug: 'jora',
    name: 'Jora',
    baseUrl: 'https://au.jora.com',
    strategy: 'browser',
    searchUrl: (kw, loc) =>
      `https://au.jora.com/${q(kw)}-jobs-in-${q(loc.toLowerCase())}?sort=date`,
    selectors: {
      jobCard: 'a[href*="/job/"]',
      title: 'a[href*="/job/"]',
      company: '',
      location: '',
      link: 'a[href*="/job/"]',
    },
  },
  seek: {
    slug: 'seek',
    name: 'SEEK',
    baseUrl: 'https://www.seek.com.au',
    strategy: 'browser',
    cloudflareBlocked: true,
    requiresAuth: true,
    searchUrl: (kw, loc) =>
      `https://www.seek.com.au/${q(kw)}-jobs/in-${q(loc)}`,
    selectors: {
      jobCard: 'article[data-automation="normalJob"], a[data-automation="jobTitle"]',
      title: 'a[data-automation="jobTitle"]',
      company: '[data-automation="jobCompany"]',
      location: '[data-automation="jobLocation"]',
      link: 'a[data-automation="jobTitle"]',
      salary: '[data-automation="jobSalary"]',
      nextPage: 'a[data-automation="page-next"]',
    },
  },
  glassdoor: {
    slug: 'glassdoor',
    name: 'Glassdoor',
    baseUrl: 'https://www.glassdoor.com',
    strategy: 'browser',
    region: 'global',
    cloudflareBlocked: true,
    requiresAuth: true,
    searchUrl: (kw, _loc) =>
      `https://www.glassdoor.com/Job/${q(kw.toLowerCase())}-jobs-SRCH_KO0,${kw.length}.htm?sortBy=date_desc`,
    selectors: {
      jobCard: '[data-test="job-card"], a[data-test="job-link"], div[class*="JobCard"]',
      title: '[data-test="job-link"], a[href*="/partner/jobListing"]',
      company: '',
      location: '',
      link: '[data-test="job-link"], a[href*="/partner/jobListing"]',
    },
  },
  indeed: {
    slug: 'indeed',
    name: 'Indeed',
    baseUrl: 'https://au.indeed.com',
    strategy: 'browser',
    searchUrl: (kw, loc) =>
      `https://au.indeed.com/jobs?q=${q(kw)}&l=${q(loc)}&sort=date`,
    selectors: {
      jobCard: '#mosaic-provider-jobcards a[data-jk], .jobTitle a, h2.jobTitle a, .jobsearch-ResultsList > li',
      title: 'h2.jobTitle a, a[data-jk], .jobTitle',
      company: '[data-testid="company-name"], .companyName, .company',
      location: '[data-testid="text-location"], .companyLocation',
      link: 'h2.jobTitle a, a[data-jk]',
    },
  },
  careerone: {
    slug: 'careerone',
    name: 'CareerOne',
    baseUrl: 'https://www.careerone.com.au',
    strategy: 'browser',
    searchUrl: (kw, loc) =>
      `https://www.careerone.com.au/jobs/${q(kw)}?location=${q(loc)}`,
    selectors: {
      jobCard: '.job-card, .job-listing, article, .search-result-item',
      title: 'h2 a, .job-title a, .title a',
      company: '.company-name, .employer',
      location: '.location, .job-location',
      link: 'h2 a, .job-title a',
    },
  },
  monster: {
    slug: 'monster',
    name: 'Monster',
    baseUrl: 'https://www.monster.com.au',
    strategy: 'browser',
    searchUrl: (kw, loc) =>
      `https://www.monster.com.au/jobs/search?q=${q(kw)}&where=${q(loc)}&sort=date`,
    selectors: {
      jobCard: '.job-card, .job-result, article, .card',
      title: 'h2 a, .job-title a, .title a',
      company: '.company, .employer-name',
      location: '.location, .job-location',
      link: 'h2 a, .job-title a',
    },
  },
  reed: {
    slug: 'reed',
    name: 'Reed',
    baseUrl: 'https://www.reed.co.uk',
    strategy: 'browser',
    region: 'gb',
    searchUrl: (kw, loc) =>
      `https://www.reed.co.uk/jobs/${q(kw)}-jobs?location=${q(loc)}&sortby=DatePosted`,
    selectors: {
      jobCard: '.job-card, .search-result, article, .result-item',
      title: 'h3 a, .job-title a, .title a',
      company: '.company, .employer',
      location: '.location, .job-location',
      link: 'h3 a, .job-title a',
    },
  },
  nhsjobs: {
    slug: 'nhsjobs',
    name: 'NHSJobs',
    baseUrl: 'https://www.jobs.nhs.uk',
    strategy: 'browser',
    region: 'gb',
    searchUrl: (kw, loc) =>
      `https://www.jobs.nhs.uk/candidate/search/results?keyword=${q(kw)}&location=${q(loc)}`,
    selectors: {
      jobCard: '.result, .job-card, article, .list-item',
      title: 'h2 a, .job-title a, .title a',
      company: '.employer, .organisation, .nhs-organisation',
      location: '.location, .job-location',
      link: 'h2 a, .job-title a',
    },
  },
  cvlibrary: {
    slug: 'cvlibrary',
    name: 'CVLibrary',
    baseUrl: 'https://www.cv-library.co.uk',
    strategy: 'browser',
    region: 'gb',
    searchUrl: (kw, loc) =>
      `https://www.cv-library.co.uk/jobs?keyword=${q(kw)}&location=${q(loc)}&sortBy=DatePosted`,
    selectors: {
      jobCard: '.job-result, .job-card, article, .result-item',
      title: 'h2 a, .job-title a',
      company: '.company, .employer',
      location: '.location, .job-location',
      link: 'h2 a, .job-title a',
    },
  },
  jobserve: {
    slug: 'jobserve',
    name: 'Jobserve',
    baseUrl: 'https://www.jobserve.com',
    strategy: 'browser',
    region: 'gb',
    searchUrl: (kw, loc) =>
      `https://www.jobserve.com/en/jobs?q=${q(kw)}&l=${q(loc)}`,
    selectors: {
      jobCard: '.job-card, .job-result, article, .result-item',
      title: 'h2 a, .job-title a, .title a',
      company: '.company, .employer',
      location: '.location, .job-location',
      link: 'h2 a, .job-title a',
    },
  },
  adecco: {
    slug: 'adecco',
    name: 'Adecco',
    baseUrl: 'https://www.adecco.com.au',
    strategy: 'browser',
    searchUrl: (kw, loc) =>
      `https://www.adecco.com.au/search-results?keyword=${q(kw)}&location=${q(loc)}`,
    selectors: {
      jobCard: '.job-card, .job-result, article, .result-item',
      title: 'h2 a, .job-title a, .title a',
      company: '.company, .employer',
      location: '.location, .job-location',
      link: 'h2 a, .job-title a',
    },
  },
  workforceaustralia: {
    slug: 'workforceaustralia',
    name: 'WorkforceAustralia',
    baseUrl: 'https://www.workforceaustralia.gov.au',
    strategy: 'browser',
    searchUrl: (kw, loc) =>
      `https://www.workforceaustralia.gov.au/job-search?keyword=${q(kw)}&location=${q(loc)}`,
    selectors: {
      jobCard: '[data-testid="job-card"], .job-card, article, .search-result-item',
      title: 'h2, h3, .job-title, [data-testid="job-title"]',
      company: '.employer-name, .company-name, [data-testid="employer"]',
      location: '.job-location, .location, [data-testid="location"]',
      link: 'a[href*="/job"], a[href*="detail"]',
    },
  },
  escapecity: {
    slug: 'escapecity',
    name: 'EscapeCity',
    baseUrl: 'https://www.escapecity.com',
    strategy: 'browser',
    region: 'global',
    searchUrl: (kw, _loc) =>
      `https://www.escapecity.com/jobs?q=${q(kw)}`,
    selectors: {
      jobCard: '.job-card, .listing, article',
      title: 'h2 a, .job-title a',
      company: '.company, .employer',
      location: '.location',
      link: 'h2 a, .job-title a',
    },
  },
  jobbank: {
    slug: 'jobbank',
    name: 'JobBank',
    baseUrl: 'https://www.jobbank.gc.ca',
    strategy: 'browser',
    region: 'ca',
    searchUrl: (kw, loc) =>
      `https://www.jobbank.gc.ca/jobsearch/jobsearch?searchstring=${q(kw)}&locationstring=${q(loc)}`,
    selectors: {
      jobCard: '.resultItem, .job-result, article.resultItem',
      title: 'h2 a, .job-title a, .resultTitle a',
      company: '.employer, .company, span.employer',
      location: '.location, .job-location, span.location',
      link: 'h2 a, .job-title a',
    },
  },
  michaelpage: {
    slug: 'michaelpage',
    name: 'MichaelPage',
    baseUrl: 'https://www.michaelpage.com.au',
    strategy: 'browser',
    searchUrl: (kw, loc) =>
      `https://www.michaelpage.com.au/jobs/${q(kw)}?location=${q(loc)}`,
    selectors: {
      jobCard: '.job-item, .job-listing, article.job-card',
      title: 'h2 a, .job-title a, .title a',
      company: '.company-name, .employer',
      location: '.location, .job-location',
      link: 'h2 a, .job-title a',
    },
  },
  randstad: {
    slug: 'randstad',
    name: 'Randstad',
    baseUrl: 'https://www.randstad.com.au',
    strategy: 'browser',
    searchUrl: (kw, loc) =>
      `https://www.randstad.com.au/jobs/?q=${q(kw)}&l=${q(loc)}`,
    selectors: {
      jobCard: '.job-item, .search-result, article',
      title: 'h2 a, .job-title a, a.job-link',
      company: '.company, .employer-name',
      location: '.location, .job-location',
      link: 'h2 a, a.job-link',
    },
  },
};

export function getScraperConfig(slug: string): ScrapeConfig | null {
  return SCRAPER_CONFIGS[slug.toLowerCase()] || null;
}

export function getRegion(cfg: ScrapeConfig): string {
  return cfg.region || 'au';
}
