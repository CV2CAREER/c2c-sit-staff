//~ // Central scraper configuration for the AI Discovery Agent.
//~ // Ported from the proven standalone bot's `src/config/defaults.ts`, with each
//~ // source assigned an explicit ingestion `strategy`:
//~ //   - 'http'    → plain axios + cheerio (no browser). LinkedIn's guest API works headless.
//~ //   - 'browser' → Playwright + stealth (JS-heavy / Cloudflare-lite boards).
//~ // Adzuna is handled separately by AdzunaAdapter ('api' route).

//~ export type ScrapeStrategy = 'http' | 'browser';

//~ export interface ScrapeSelectors {
//~   jobCard: string;
//~   title: string;
//~   company: string;
//~   location: string;
//~   link: string;
//~   jobLink?: string;
//~   description?: string;
//~   salary?: string;
//~   nextPage?: string;
//~ }

//~ export interface ScrapeConfig {
//~   slug: string;
//~   name: string;
//~   baseUrl: string;
//~   strategy: ScrapeStrategy;
//~   /** 'global' boards (LinkedIn) accept any country; otherwise an ISO-2 country
//~    *  code that the board serves. Locations are filtered to match. Defaults 'au'. */
//~   region?: string;
//~   searchUrl: (keyword: string, location: string) => string;
//~   cloudflareBlocked?: boolean;
//~   requiresAuth?: boolean;
//~   /** Minimum delay (ms) between requests to this host, per its robots.txt Crawl-delay. */
//~   crawlDelayMs?: number;
//~   /**
//~    * Set when job cards have no real <a href> (JS click-handler navigation,
//~    * e.g. Adecco). Forces the adapter to click each card, read the resulting
//~    * URL, then go back — one page load per job, so slower and capped.
//~    */
//~   clickToNavigate?: boolean;
//~   selectors: ScrapeSelectors;
//~ }

//~ const q = encodeURIComponent;

//~ export const SCRAPER_CONFIGS: Record<string, ScrapeConfig> = {
//~   linkedin: {
//~     slug: 'linkedin',
//~     name: 'LinkedIn',
//~     baseUrl: 'https://www.linkedin.com',
//~     strategy: 'http',
//~     region: 'global',
//~     searchUrl: (kw, loc) =>
//~       `https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords=${q(kw)}&location=${q(loc)}&f_TPR=r86400&start=0&count=25`,
//~     selectors: {
//~       jobCard: '.base-search-card, .base-card',
//~       title: '.base-search-card__title, .job-search-card__title',
//~       company: '.base-search-card__subtitle, .job-search-card__subtitle',
//~       location: '.job-search-card__location, .base-search-card__metadata',
//~       link: '.base-search-card__title, .job-search-card__title',
//~       jobLink: '.base-card__full-link, a.base-card__full-link',
//~       nextPage: '',
//~     },
//~   },
//~   jora: {
//~     slug: 'jora',
//~     name: 'Jora',
//~     baseUrl: 'https://au.jora.com',
//~     strategy: 'http',
//~     searchUrl: (kw, loc) =>
//~       `https://au.jora.com/${q(kw)}-jobs-in-${q(loc.toLowerCase())}?sort=date`,
//~     selectors: {
//~       jobCard: 'a[href*="/job/"]',
//~       title: 'a[href*="/job/"]',
//~       company: '',
//~       location: '',
//~       link: 'a[href*="/job/"]',
//~     },
//~   },
//~   indeed: {
//~     slug: 'indeed',
//~     name: 'Indeed',
//~     baseUrl: 'https://au.indeed.com',
//~     strategy: 'browser',
//~     cloudflareBlocked: true,
//~     searchUrl: (kw, loc) =>
//~       `https://au.indeed.com/jobs?q=${q(kw)}&l=${q(loc)}&sort=date`,
//~     selectors: {
//~       jobCard: '#mosaic-provider-jobcards a[data-jk], .jobTitle a, h2.jobTitle a, .jobsearch-ResultsList > li',
//~       title: 'h2.jobTitle a, a[data-jk], .jobTitle',
//~       company: '[data-testid="company-name"], .companyName, .company',
//~       location: '[data-testid="text-location"], .companyLocation',
//~       link: 'h2.jobTitle a, a[data-jk]',
//~     },
//~   },
//~   careerone: {
//~     slug: 'careerone',
//~     name: 'CareerOne',
//~     baseUrl: 'https://www.careerone.com.au',
//~     strategy: 'browser',
//~     searchUrl: (kw, loc) =>
//~       `https://www.careerone.com.au/jobs/${q(kw)}?location=${q(loc)}`,
//~     // Verified against live markup (2026-09-08).
//~     selectors: {
//~       jobCard: 'div.job-card-detailed',
//~       title: 'a[href*="/jobview/"]',
//~       company: 'a.text-title-3.link-hover-default',
//~       location: 'a.cursor-default.link-hover-default',
//~       link: 'a[href*="/jobview/"]',
//~       salary: 'span.text-title-4.text-black',
//~     },
//~   },
//~   monster: {
//~     slug: 'monster',
//~     name: 'Monster',
//~     baseUrl: 'https://www.monster.com.au',
//~     strategy: 'browser',
//~     searchUrl: (kw, loc) =>
//~       `https://www.monster.com.au/jobs/search?q=${q(kw)}&where=${q(loc)}&sort=date`,
//~     selectors: {
//~       jobCard: '.job-card, .job-result, article, .card',
//~       title: 'h2 a, .job-title a, .title a',
//~       company: '.company, .employer-name',
//~       location: '.location, .job-location',
//~       link: 'h2 a, .job-title a',
//~     },
//~   },
//~   reed: {
//~     slug: 'reed',
//~     name: 'Reed',
//~     baseUrl: 'https://www.reed.co.uk',
//~     strategy: 'browser',
//~     region: 'gb',
//~     searchUrl: (kw, loc) =>
//~       `https://www.reed.co.uk/jobs/${q(kw)}-jobs?location=${q(loc)}&sortby=DatePosted`,
//~     // Verified against live markup (2026-09-08): Reed uses stable data-qa
//~     // attributes rather than plain classnames, so prefer those over the
//~     // hashed CSS-module classes (e.g. index-module_jobCard__DaYuk) which are
//~     // build-hash-based and will change on Reed's next deploy.
//~     selectors: {
//~       jobCard: 'article[data-qa="job-card"]',
//~       title: 'a[data-qa="job-card-title"]',
//~       company: 'a[data-page-component="job_card"][data-element="recruiter"]',
//~       location: 'li[data-qa="job-metadata-location"]',
//~       link: 'a[data-qa="job-card-title"]',
//~       salary: 'li[data-qa="job-metadata-salary"]',
//~     },
//~   },
//~   nhsjobs: {
//~     slug: 'nhsjobs',
//~     name: 'NHSJobs',
//~     baseUrl: 'https://www.jobs.nhs.uk',
//~     strategy: 'browser',
//~     region: 'gb',
//~     searchUrl: (kw, loc) =>
//~       `https://www.jobs.nhs.uk/candidate/search/results?keyword=${q(kw)}&location=${q(loc)}`,
//~     // Verified against live markup (2026-09-08) — stable data-test attributes.
//~     selectors: {
//~       jobCard: 'li[data-test="search-result"]',
//~       title: 'a[data-test="search-result-job-title"]',
//~       company: 'div[data-test="search-result-location"] h3',
//~       location: 'div.location-font-size',
//~       link: 'a[data-test="search-result-job-title"]',
//~       salary: 'li[data-test="search-result-salary"] strong',
//~     },
//~   },
//~   cvlibrary: {
//~     slug: 'cvlibrary',
//~     name: 'CVLibrary',
//~     baseUrl: 'https://www.cv-library.co.uk',
//~     strategy: 'browser',
//~     region: 'gb',
//~     searchUrl: (kw, loc) =>
//~       `https://www.cv-library.co.uk/jobs?keyword=${q(kw)}&location=${q(loc)}&sortBy=DatePosted`,
//~     selectors: {
//~       jobCard: '.job-result, .job-card, article, .result-item',
//~       title: 'h2 a, .job-title a',
//~       company: '.company, .employer',
//~       location: '.location, .job-location',
//~       link: 'h2 a, .job-title a',
//~     },
//~   },
//~   jobserve: {
//~     slug: 'jobserve',
//~     name: 'Jobserve',
//~     baseUrl: 'https://www.jobserve.com',
//~     strategy: 'browser',
//~     region: 'gb',
//~     searchUrl: (kw, loc) =>
//~       `https://www.jobserve.com/en/jobs?q=${q(kw)}&l=${q(loc)}`,
//~     selectors: {
//~       jobCard: '.job-card, .job-result, article, .result-item',
//~       title: 'h2 a, .job-title a, .title a',
//~       company: '.company, .employer',
//~       location: '.location, .job-location',
//~       link: 'h2 a, .job-title a',
//~     },
//~   },
//~   adecco: {
//~     slug: 'adecco',
//~     name: 'Adecco',
//~     // adecco.com.au has been consolidated into the global site under /en-au —
//~     // the old .com.au domain 301s straight to the homepage, dropping any path.
//~     baseUrl: 'https://www.adecco.com',
//~     strategy: 'browser',
//~     searchUrl: (kw, _loc) =>
//~       `https://www.adecco.com/en-au/jobs?keyword=${q(kw)}`,
//~     // Verified against live markup (2026-09-08): job cards are
//~     // `div[role="button"]` with a client-side click handler and no real
//~     // <a href>, so clickToNavigate makes the adapter click each card, read
//~     // the resulting URL, then go back — see page-scrape.adapter.ts.
//~     clickToNavigate: true,
//~     selectors: {
//~       jobCard: 'div.card.mb2',
//~       title: 'p.large.text-01',
//~       company: '',
//~       // No real location on the list card — p.subtitle.text-01 matches
//~       // category/department/employment-type lines instead ("Transport /
//~       // Logistics", "Permanent"), not a city. Left blank rather than
//~       // mislabeling category data as location; falls back to "Unknown".
//~       location: '',
//~       link: '', // unused: clickToNavigate gets the URL by clicking, not from an href
//~     },
//~   },
//~   jobbank: {
//~     slug: 'jobbank',
//~     name: 'JobBank',
//~     baseUrl: 'https://www.jobbank.gc.ca',
//~     strategy: 'browser',
//~     region: 'ca',
//~     // robots.txt: User-agent: * / Crawl-delay: 5 — must wait 5s between requests.
//~     crawlDelayMs: 5000,
//~     searchUrl: (kw, loc) =>
//~       `https://www.jobbank.gc.ca/jobsearch/jobsearch?searchstring=${q(kw)}&locationstring=${q(loc)}`,
//~     // Verified against live markup (2026-09-08).
//~     selectors: {
//~       jobCard: 'article[id^="article-"]',
//~       title: 'h3.title span.noctitle',
//~       company: 'li.business',
//~       location: 'li.location',
//~       link: 'a.resultJobItem',
//~       salary: 'li.salary',
//~     },
//~   },
//~ };

//~ export function getScraperConfig(slug: string): ScrapeConfig | null {
//~   return SCRAPER_CONFIGS[slug.toLowerCase()] || null;
//~ }

//~ export function getRegion(cfg: ScrapeConfig): string {
//~   return cfg.region || 'au';
//~ }
