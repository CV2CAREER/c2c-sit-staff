//~ import axios from 'axios';
//~ import { DiscoveryAdapter, DiscoveryJobDraft } from './discovery-adapter.interface';
//~ import { ADZUNA_API_KEY, ADZUNA_APP_ID } from '../../../config/env';
//~ import { getServiceLogger } from '../../../utils/createLogger';

//~ const logger = getServiceLogger('adzuna-adapter');

//~ const BASE_URL = 'https://api.adzuna.com/v1/api/jobs';
//~ const RATE_LIMIT_MS = 1000; // 1 req/s
//~ const MAX_RESULTS_PER_PAGE = 50;
//~ const USER_AGENT = 'C2CDiscoveryBot/1.0 (discovery@c2c-platform.com)';

//~ // How many distinct client keywords to search per (source, location). A location
//~ // is considered covered once MAX_JOBS_TARGET results are collected.
//~ const MAX_KEYWORDS_PER_FETCH = Math.max(1, Math.min(parseInt(process.env.DISCOVERY_MAX_KEYWORDS || '8', 10), 25));
//~ const MAX_JOBS_TARGET = 150;

//~ let lastRequestTime = 0;

//~ const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

//~ const rateLimit = async (): Promise<void> => {
//~   const now = Date.now();
//~   const elapsed = now - lastRequestTime;
//~   if (elapsed < RATE_LIMIT_MS) {
//~     await sleep(RATE_LIMIT_MS - elapsed);
//~   }
//~   lastRequestTime = Date.now();
//~ };

//~ interface AdzunaJobResponse {
//~   count: number;
//~   results: Array<{
//~     id: string;
//~     title: string;
//~     description: string;
//~     company: { display_name: string };
//~     location: { display_name: string; area: string[] };
//~     latitude?: number;
//~     longitude?: number;
//~     salary_min?: number | null;
//~     salary_max?: number | null;
//~     salary_is_predicted?: number;
//~     contract_type?: string;
//~     contract_time?: string;
//~     category?: { label: string; tag: string };
//~     created: string;
//~     redirect_url: string;
//~   }>;
//~ }

//~ export class AdzunaAdapter implements DiscoveryAdapter {
//~   private appId: string;
//~   private appKey: string;
//~   private country: string;

//~   constructor(country: string = 'au') {
//~     this.appId = ADZUNA_APP_ID;
//~     this.appKey = ADZUNA_API_KEY;
//~     this.country = country;
//~   }

//~   async qualify(): Promise<{ permitted: boolean; reason: string }> {
//~     if (!this.appId || !this.appKey) {
//~       return { permitted: false, reason: 'Adzuna API credentials not configured (ADZUNA_APP_ID / ADZUNA_API_KEY)' };
//~     }
//~     return { permitted: true, reason: 'Developer API with keyed access. Free tier: 25 req/min, 250/day, 2500/month.' };
//~   }

//~   async fetch(keywords: string[], location: string, country?: string, signal?: AbortSignal): Promise<DiscoveryJobDraft[]> {
//~     const targetCountry = country || this.country;
//~     const allJobs: DiscoveryJobDraft[] = [];
//~     const seen = new Set<string>();
//~     const maxPages = 5; // pages per keyword
//~     const searchKeywords = keywords.slice(0, MAX_KEYWORDS_PER_FETCH);

//~     logger.info(`Fetching from Adzuna: keywords=${searchKeywords.join(' | ')}, location=${location}, country=${targetCountry}`);

//~     // Adzuna has no reliable negative/OR operator, so search each keyword as its
//~     // own query (far better precision than dumping all 20 terms into one phrase),
//~     // deduping results across keywords by source job id.
//~     for (const keyword of searchKeywords) {
//~       if (signal?.aborted) break;
//~       let page = 1;
//~       while (page <= maxPages) {
//~         await rateLimit();

//~         try {
//~           const response = await axios.get<AdzunaJobResponse>(
//~             `${BASE_URL}/${targetCountry}/search/${page}`,
//~             {
//~               params: {
//~                 app_id: this.appId,
//~                 app_key: this.appKey,
//~                 what: keyword,
//~                 where: location,
//~                 results_per_page: MAX_RESULTS_PER_PAGE,
//~                 sort_by: 'date',
//~                 max_days_old: 7,
//~               },
//~               headers: { 'User-Agent': USER_AGENT },
//~               timeout: 15000,
//~               signal,
//~             }
//~           );

//~           const data = response.data;
//~           if (!data.results || data.results.length === 0) break;

//~           for (const job of data.results) {
//~             if (seen.has(job.id)) continue;
//~             seen.add(job.id);
//~             allJobs.push(this.mapJob(job));
//~           }

//~           logger.info(`  "${keyword}" page ${page}: ${data.results.length} results (total available: ${data.count})`);

//~           if (data.results.length < MAX_RESULTS_PER_PAGE) break;
//~           page++;
//~         } catch (error: any) {
//~           if (error.name === 'AbortError') throw error;
//~           if (error.response?.status === 403 || error.response?.status === 429) {
//~             logger.warn(`Adzuna rate limit/forbidden searching "${keyword}". Stopping.`);
//~             return allJobs;
//~           }
//~           if (error.response?.status === 401) {
//~             logger.error('Adzuna authentication failed. Check API credentials.');
//~             return allJobs;
//~           }
//~           logger.error(`Adzuna fetch error searching "${keyword}" on page ${page}: ${error.message}`);
//~           break;
//~         }
//~       }

//~       if (allJobs.length >= MAX_JOBS_TARGET) break; // enough for this location
//~     }

//~     logger.info(`Adzuna fetch complete: ${allJobs.length} jobs retrieved`);
//~     return allJobs;
//~   }

//~   parse(raw: unknown): DiscoveryJobDraft[] {
//~     if (!raw || typeof raw !== 'object') return [];
//~     const data = raw as AdzunaJobResponse;
//~     if (!Array.isArray(data.results)) return [];
//~     return data.results.map((job) => this.mapJob(job));
//~   }

//~   async health(): Promise<{ ok: boolean; lastRunAt?: Date; error?: string }> {
//~     try {
//~       await rateLimit();
//~       await axios.get(`${BASE_URL}/${this.country}/search/1`, {
//~         params: {
//~           app_id: this.appId,
//~           app_key: this.appKey,
//~           results_per_page: 1,
//~           content_type: 'application/json',
//~         },
//~         headers: { 'User-Agent': USER_AGENT },
//~         timeout: 10000,
//~       });
//~       return { ok: true, lastRunAt: new Date() };
//~     } catch (error: any) {
//~       return { ok: false, error: error.message };
//~     }
//~   }

//~   private mapJob(job: AdzunaJobResponse['results'][0]): DiscoveryJobDraft {
//~     return {
//~       sourceJobId: job.id,
//~       title: job.title || 'Unknown',
//~       company: job.company?.display_name || 'Unknown',
//~       location: job.location?.display_name || 'Unknown',
//~       remoteFlag: false,
//~       description: job.description || '',
//~       postedDate: job.created ? new Date(job.created) : undefined,
//~       salaryMin: job.salary_min || undefined,
//~       salaryMax: job.salary_max || undefined,
//~       currency: this.country === 'au' ? 'AUD' : this.country === 'gb' ? 'GBP' : 'USD',
//~       employmentType: job.contract_time || job.contract_type || undefined,
//~       applyUrl: job.redirect_url || `https://www.adzuna.com.au/jobs/view/${job.id}`,
//~       sourceUrl: `https://www.adzuna.com.au/jobs/view/${job.id}`,
//~     };
//~   }
//~ }
