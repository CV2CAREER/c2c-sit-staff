import axios from 'axios';
import { DiscoveryAdapter, DiscoveryJobDraft } from './discovery-adapter.interface';
import { JOOBLE_API_KEY } from '../../../config/env';
import { getServiceLogger } from '../../../utils/createLogger';

const logger = getServiceLogger('jooble-adapter');

const API_URL = 'https://jooble.org/api/';
const RATE_LIMIT_MS = 500;

const MAX_KEYWORDS_PER_FETCH = Math.max(1, Math.min(parseInt(process.env.DISCOVERY_MAX_KEYWORDS || '8', 10), 25));
const MAX_JOBS_TARGET = 150;

interface JoobleJob {
  id?: string;
  title?: string;
  location?: string;
  snippet?: string;
  salary?: string;
  source?: string;
  type?: string;
  link?: string;
  company?: string;
  updated?: string;
}

interface JoobleResponse {
  totalCount?: number;
  jobs?: JoobleJob[];
}

let lastRequestTime = 0;

const sleep = (ms: number): Promise<void> => (new Promise((resolve) => setTimeout(resolve, ms)));

const rateLimit = async (): Promise<void> => {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < RATE_LIMIT_MS) {
    await sleep(RATE_LIMIT_MS - elapsed);
  }
  lastRequestTime = Date.now();
};

export class JoobleAdapter implements DiscoveryAdapter {
  private appKey: string;

  constructor() {
    this.appKey = JOOBLE_API_KEY;
  }

  async qualify(): Promise<{ permitted: boolean; reason: string }> {
    if (!this.appKey) {
      return { permitted: false, reason: 'Jooble API key not configured (JOOBLE_API_KEY)' };
    }
    return { permitted: true, reason: 'Jooble partner API with keyed access.' };
  }

  async fetch(keywords: string[], location: string, _country?: string, signal?: AbortSignal): Promise<DiscoveryJobDraft[]> {
    if (!this.appKey) {
      logger.warn('No Jooble API key configured — skipping');
      return [];
    }

    const allJobs: DiscoveryJobDraft[] = [];
    const seen = new Set<string>();
    const searchKeywords = keywords.slice(0, MAX_KEYWORDS_PER_FETCH);

    logger.info(`Fetching from Jooble: keywords=${searchKeywords.join(' | ')}, location=${location}`);

    for (const keyword of searchKeywords) {
      if (signal?.aborted) break;
      await rateLimit();
      try {
        const response = await axios.post<JoobleResponse>(
          `${API_URL}${this.appKey}`,
          { keywords: keyword, location },
          { headers: { 'Content-Type': 'application/json' }, timeout: 20000, signal }
        );

        const jobs = response.data?.jobs || [];
        if (jobs.length === 0) continue;

        let addedForKeyword = 0;
        for (const job of jobs) {
          const link = job.link || '';
          const key = link || `${job.title}|${job.company}|${job.location}`;
          if (seen.has(key)) continue;
          seen.add(key);
          allJobs.push(this.mapJob(job));
          addedForKeyword++;
        }

        logger.info(`  "${keyword}": ${jobs.length} results (${addedForKeyword} new, total ${allJobs.length})`);
      } catch (error: any) {
        if (error.name === 'AbortError') throw error;
        logger.warn(`Jooble fetch failed for "${keyword}": ${error.message}`);
        continue;
      }

      if (allJobs.length >= MAX_JOBS_TARGET) break;
    }

    logger.info(`Jooble fetch complete: ${allJobs.length} jobs retrieved`);
    return allJobs;
  }

  private mapJob(job: JoobleJob): DiscoveryJobDraft {
    const title = job.title || 'Unknown';
    const company = job.company || job.source || 'Unknown';
    const location = job.location || 'Unknown';
    const link = job.link || '';
    const description = job.snippet || title;

    return {
      sourceJobId: this.extractJobId(link, title),
      title,
      company,
      location,
      remoteFlag: /remote|work from home|wfh/i.test(`${title} ${location} ${description}`),
      description,
      salaryMin: job.salary ? this.parseSalaryMin(job.salary) : undefined,
      salaryMax: job.salary ? this.parseSalaryMax(job.salary) : undefined,
      employmentType: job.type || undefined,
      applyUrl: link,
      sourceUrl: link,
    };
  }

  parse(raw: unknown): DiscoveryJobDraft[] {
    if (!raw || typeof raw !== 'object') return [];
    const data = raw as JoobleResponse;
    if (!Array.isArray(data.jobs)) return [];
    return data.jobs.map((job) => this.mapJob(job));
  }

  async health(): Promise<{ ok: boolean; lastRunAt?: Date; error?: string }> {
    if (!this.appKey) return { ok: false, error: 'Jooble API key not configured' };
    try {
      await rateLimit();
      await axios.post(`${API_URL}${this.appKey}`, { keywords: 'engineer', location: 'Australia' }, { timeout: 15000 });
      return { ok: true, lastRunAt: new Date() };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  }

  private extractJobId(url: string, title: string): string {
    if (url) {
      const { createHash } = require('crypto');
      return createHash('md5').update(url).digest('hex').substring(0, 16);
    }
    const { createHash } = require('crypto');
    return createHash('md5').update(title).digest('hex').substring(0, 16);
  }

  private parseSalaryMin(salary: string): number | undefined {
    const matches = salary.match(/\$?\d[\d,.]*(?:k|K)?/g);
    if (!matches || matches.length === 0) return undefined;
    const num = this.toNumber(matches[0]);
    return num;
  }

  private parseSalaryMax(salary: string): number | undefined {
    const matches = salary.match(/\$?\d[\d,.]*(?:k|K)?/g);
    if (!matches || matches.length < 2) return undefined;
    return this.toNumber(matches[matches.length - 1]);
  }

  private toNumber(raw: string): number {
    const cleaned = raw.replace(/[$,]/g, '');
    if (/k/i.test(cleaned)) return parseFloat(cleaned) * 1000;
    const parsed = parseFloat(cleaned);
    return parsed > 1000 ? parsed : parsed * 1000;
  }
}
