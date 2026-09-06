import axios from 'axios';
import * as cheerio from 'cheerio';
import { DiscoveryAdapter, DiscoveryJobDraft } from './discovery-adapter.interface';
import { ScrapeConfig, getScraperConfig } from './scraper-config';
import { getServiceLogger } from '../../../utils/createLogger';

const logger = getServiceLogger('http-scrape-adapter');

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

const HEADERS: Record<string, string> = {
  'User-Agent': USER_AGENT,
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-AU,en;q=0.9',
};

// Shared bounds (mirrors adzuna.adapter.ts / page-scrape.adapter.ts).
const MAX_KEYWORDS_PER_FETCH = Math.max(1, Math.min(parseInt(process.env.DISCOVERY_MAX_KEYWORDS || '8', 10), 25));
const MAX_JOBS_TARGET = 150;

export interface HttpScrapeAdapterConfig {
  sourceSlug: string;
  maxPages?: number;
}

/**
 * No-browser scraper for boards that serve results over plain HTTP
 * (notably LinkedIn's public guest API). Cheaper and more reliable than
 * launching Playwright for every source.
 */
export class HttpScrapeAdapter implements DiscoveryAdapter {
  private config: HttpScrapeAdapterConfig;
  private scrapeConfig: ScrapeConfig | null;

  constructor(config: HttpScrapeAdapterConfig) {
    this.config = config;
    this.scrapeConfig = getScraperConfig(config.sourceSlug);
  }

  async qualify(): Promise<{ permitted: boolean; reason: string }> {
    if (!this.scrapeConfig) {
      return { permitted: false, reason: `No scrape config for source "${this.config.sourceSlug}"` };
    }
    if (this.scrapeConfig.cloudflareBlocked) {
      return {
        permitted: false,
        reason: `${this.scrapeConfig.name} blocks datacenter/headless scraping. Requires headed mode + login session or residential proxy.`,
      };
    }
    return { permitted: true, reason: 'Public HTTP results. No browser required.' };
  }

  async fetch(keywords: string[], location: string, _country?: string, signal?: AbortSignal): Promise<DiscoveryJobDraft[]> {
    if (!this.scrapeConfig) return [];
    const cfg = this.scrapeConfig;
    const allJobs: DiscoveryJobDraft[] = [];
    const seen = new Set<string>();
    const maxPages = this.config.maxPages || 1;
    const searchKeywords = keywords.slice(0, MAX_KEYWORDS_PER_FETCH);

    logger.info(`HTTP scraping ${cfg.name}: keywords=${searchKeywords.join(' | ')}, location=${location}`);

    // HTTP scraping is cheap (no browser), so search each client keyword so job
    // titles/preferences actually reach the board. Dedupe across keywords.
    for (const keyword of searchKeywords) {
      if (signal?.aborted) break;
      let start = 0;
      let keywordCount = 0;
      for (let page = 0; page < maxPages; page++) {
        const url = this.buildUrl(cfg, keyword, location, start);
        logger.info(`  GET ${url}`);

        try {
          const res = await axios.get(url, { headers: HEADERS, timeout: 20000, maxRedirects: 5, signal });
          if (res.status !== 200 || !res.data) break;

          const parsed = this.parseHtml(res.data, cfg);
          if (parsed.length === 0) break;

          for (const job of parsed) {
            if (seen.has(job.sourceJobId)) continue;
            seen.add(job.sourceJobId);
            allJobs.push(job);
            keywordCount++;
          }

          logger.info(`  "${keyword}" page ${page + 1}: ${parsed.length} results (keyword total ${keywordCount})`);

          if (!this.hasMore(parsed.length)) break;
          start += 25;
        } catch (err: any) {
          if (err.name === 'AbortError') throw err;
          logger.warn(`  HTTP fetch failed for "${keyword}": ${err.message}`);
          break;
        }
      }

      if (keywordCount >= MAX_JOBS_TARGET) break; // enough coverage for this location
    }

    logger.info(`${cfg.name} HTTP scrape complete: ${allJobs.length} jobs`);
    return allJobs;
  }

  private buildUrl(cfg: ScrapeConfig, keyword: string, location: string, start: number): string {
    const base = cfg.searchUrl(keyword, location);
    // LinkedIn guest API paginates via `start`; other boards may ignore it.
    if (cfg.slug === 'linkedin') {
      return base.replace(/&start=\d+/, `&start=${start}`);
    }
    return base;
  }

  private hasMore(parsedCount: number): boolean {
    return parsedCount >= 25;
  }

  private parseHtml(html: string, cfg: ScrapeConfig): DiscoveryJobDraft[] {
    const $ = cheerio.load(html);
    const jobs: DiscoveryJobDraft[] = [];
    const cardSelectors = cfg.selectors.jobCard.split(',').map((s) => s.trim());

    let cards = $(cardSelectors.join(','));
    if (cards.length === 0) return [];

    cards.each((_i, el) => {
      try {
        const card = $(el);
        const title = this.firstText(card, cfg.selectors.title) || card.text().trim();
        if (!title || title.length < 3) return;

        const company = this.firstText(card, cfg.selectors.company) || 'Unknown';
        const location = this.firstText(card, cfg.selectors.location) || 'Unknown';

        let link = this.firstHref(card, cfg.selectors.jobLink || cfg.selectors.link);
        if (!link) {
          const anchor = card.is('a') ? card : card.closest('a');
          link = anchor.attr('href') || '';
        }
        if (!link) return;
        const fullUrl = link.startsWith('http') ? link : `${cfg.baseUrl.replace(/\/$/, '')}${link.startsWith('/') ? '' : '/'}${link}`;

        const salary = this.firstText(card, cfg.selectors.salary || '') || undefined;
        const description = this.firstText(card, cfg.selectors.description || '') || title;

        jobs.push({
          sourceJobId: this.extractJobId(fullUrl, title),
          title,
          company,
          location,
          remoteFlag: /remote|work from home|wfh/i.test(`${title} ${location} ${description}`),
          description,
          salaryMin: salary ? this.parseSalaryMin(salary) : undefined,
          salaryMax: salary ? this.parseSalaryMax(salary) : undefined,
          applyUrl: fullUrl,
          sourceUrl: fullUrl,
        });
      } catch {
        /* skip malformed card */
      }
    });

    return jobs;
  }

  private firstText(card: any, selectorList: string | undefined): string {
    if (!selectorList) return '';
    for (const sel of selectorList.split(',').map((s) => s.trim())) {
      const el = card.find(sel).first();
      if (el.length) return el.text().trim();
    }
    return '';
  }

  private firstHref(card: any, selectorList: string): string {
    for (const sel of selectorList.split(',').map((s) => s.trim())) {
      const el = card.find(sel).first();
      if (el.length) return el.attr('href') || '';
    }
    return '';
  }

  private extractJobId(url: string, title: string): string {
    if (url) {
      const numMatch = url.match(/\/(\d{5,})(?:[?#/]|$)/);
      if (numMatch) return numMatch[1];
      const { createHash } = require('crypto');
      return createHash('md5').update(url).digest('hex').substring(0, 12);
    }
    const { createHash } = require('crypto');
    return createHash('md5').update(title).digest('hex').substring(0, 12);
  }

  private parseSalaryMin(salary: string): number | undefined {
    const match = salary.match(/\$?\d{2,3}[,.]?\d{0,3}[kK]?/);
    if (!match) return undefined;
    const num = match[0].replace(/[$,]/g, '');
    if (/k/i.test(num)) return parseFloat(num) * 1000;
    const parsed = parseFloat(num);
    return parsed > 1000 ? parsed : parsed * 1000;
  }

  private parseSalaryMax(salary: string): number | undefined {
    const matches = salary.match(/\$?\d{2,3}[,.]?\d{0,3}[kK]?/g);
    if (!matches || matches.length < 2) return this.parseSalaryMin(salary);
    const last = matches[matches.length - 1].replace(/[$,]/g, '');
    if (/k/i.test(last)) return parseFloat(last) * 1000;
    const parsed = parseFloat(last);
    return parsed > 1000 ? parsed : parsed * 1000;
  }

  parse(raw: unknown): DiscoveryJobDraft[] {
    if (!raw || typeof raw !== 'string') return [];
    if (!this.scrapeConfig) return [];
    return this.parseHtml(raw, this.scrapeConfig);
  }

  async health(): Promise<{ ok: boolean; lastRunAt?: Date; error?: string }> {
    if (!this.scrapeConfig) return { ok: false, error: 'No scrape config' };
    try {
      await axios.get(this.scrapeConfig.baseUrl, { headers: HEADERS, timeout: 10000, maxRedirects: 3 });
      return { ok: true, lastRunAt: new Date() };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  }
}
