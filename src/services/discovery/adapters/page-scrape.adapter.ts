import { chromium } from 'playwright-extra';
import type { Browser, Page } from 'playwright';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';
import { DiscoveryAdapter, DiscoveryJobDraft } from './discovery-adapter.interface';
import { ScrapeConfig, getScraperConfig } from './scraper-config';
import { getNextProxy, proxyPoolEnabled } from './proxy-pool';
import { getServiceLogger } from '../../../utils/createLogger';

chromium.use(StealthPlugin());

const logger = getServiceLogger('playwright-scrape-adapter');

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

// Randomized delay to look human (mirrors the standalone bot's 2–8s range).
const randomDelay = (): number => Math.floor(Math.random() * 6000 + 2000);

const HEADED_MODE = process.env.DISCOVERY_SCRAPE_HEADED === 'true';

const checkAborted = (signal?: AbortSignal) => {
  if (signal?.aborted) {
    const err = new Error('Run aborted');
    err.name = 'AbortError';
    throw err;
  }
};

// Search client keywords per (source, location) so job titles/preferences reach
// the board, stopping a location once a generous coverage target is reached.
const MAX_KEYWORDS_PER_FETCH = Math.max(1, Math.min(parseInt(process.env.DISCOVERY_MAX_KEYWORDS || '8', 10), 25));
const MAX_JOBS_TARGET = 150;

interface ExtractedCard {
  title: string;
  company: string;
  location: string;
  link: string;
  description: string;
  salary: string;
}

export interface PageScrapeAdapterConfig {
  sourceSlug: string;
  maxPages?: number;
}

export class PageScrapeAdapter implements DiscoveryAdapter {
  private config: PageScrapeAdapterConfig;
  private scrapeConfig: ScrapeConfig | null;
  private browser: Browser | null = null;

  constructor(config: PageScrapeAdapterConfig) {
    this.config = config;
    this.scrapeConfig = getScraperConfig(config.sourceSlug);
  }

  async qualify(): Promise<{ permitted: boolean; reason: string }> {
    if (!this.scrapeConfig) {
      return { permitted: false, reason: `No scrape config for source "${this.config.sourceSlug}"` };
    }
    if (this.scrapeConfig.cloudflareBlocked && !proxyPoolEnabled()) {
      return {
        permitted: false,
        reason: `${this.scrapeConfig.name} blocks datacenter/headless scraping. Requires DISCOVERY_PROXY_LIST (residential proxy) to attempt${this.scrapeConfig.requiresAuth ? ', plus a saved login session' : ''}.`,
      };
    }
    return { permitted: true, reason: 'Playwright with stealth enabled.' };
  }

  async fetch(keywords: string[], location: string, _country?: string, signal?: AbortSignal): Promise<DiscoveryJobDraft[]> {
    if (!this.scrapeConfig) {
      logger.warn(`No scrape config for ${this.config.sourceSlug}`);
      return [];
    }

    const allJobs: DiscoveryJobDraft[] = [];
    const cfg = this.scrapeConfig;
    const searchKeywords = (keywords.length > 0 ? keywords : ['engineer']).slice(0, MAX_KEYWORDS_PER_FETCH);

    logger.info(`Scraping ${cfg.name} with Playwright stealth: keywords=${searchKeywords.join(' | ')}, location=${location}`);

    try {
      const proxy = getNextProxy();
      if (proxy) logger.info(`${cfg.name}: routing through proxy ${proxy.server}`);

      this.browser = await chromium.launch({
        headless: !HEADED_MODE,
        proxy: proxy || undefined,
        args: [
          '--disable-blink-features=AutomationControlled',
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-infobars',
          '--disable-dev-shm-usage',
          '--disable-gpu',
        ],
      });

      // Load saved login session for boards that require auth (SEEK/Indeed/etc.)
      let storageState: any;
      if (cfg.requiresAuth) {
        const sessionPath = path.resolve(process.cwd(), 'data', 'sessions', `${cfg.slug}.json`);
        if (fs.existsSync(sessionPath)) {
          try {
            storageState = JSON.parse(fs.readFileSync(sessionPath, 'utf-8'));
            logger.info(`${cfg.name}: loaded saved session`);
          } catch { /* ignore corrupt session */ }
        } else {
          logger.warn(`${cfg.name}: requiresAuth but no saved session found at ${sessionPath} — likely blocked without login`);
        }
      }

      const context = await this.browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        viewport: { width: 1920, height: 1080 },
        locale: 'en-AU',
        timezoneId: 'Australia/Sydney',
        storageState: storageState || undefined,
        extraHTTPHeaders: {
          'Accept-Language': 'en-AU,en;q=0.9',
        },
      });

      await context.addInitScript(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => false });
        const originalQuery = window.navigator.permissions.query;
        window.navigator.permissions.query = (parameters: any) =>
          parameters.name === 'notifications'
            ? Promise.resolve({ state: Notification.permission } as PermissionStatus)
            : originalQuery(parameters);
        Object.defineProperty(navigator, 'plugins', {
          get: () => [1, 2, 3, 4, 5],
        });
        Object.defineProperty(navigator, 'languages', {
          get: () => ['en-AU', 'en'],
        });
      });
      const page = await context.newPage();

      // Search each client keyword so job titles/preferences actually reach the
      // board. Stop once enough jobs are collected for this location/source.
      for (const keyword of searchKeywords) {
        checkAborted(signal);
        if (allJobs.length >= MAX_JOBS_TARGET) break;
        try {
          const url = cfg.searchUrl(keyword, location);
          logger.info(`  [${keyword}] ${url}`);

          await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

          checkAborted(signal);
          await sleep(3000);
          await this.dismissCookieConsent(page);
          try {
            for (let i = 0; i < 8; i++) {
              checkAborted(signal);
              const title = await page.title();
              if (!title.includes('Just a moment') && !title.includes('Attention Required') && !title.includes('Checking')) break;
              logger.info(`  Cloudflare challenge detected (attempt ${i + 1}), waiting...`);
              await sleep(5000);
            }
          } catch (e: any) { if (e.name === 'AbortError') throw e; /* continue */ }

          checkAborted(signal);
          for (const sel of cfg.selectors.jobCard.split(',').map((s) => s.trim())) {
            try {
              await page.waitForSelector(sel, { timeout: 15000 });
              logger.info(`  Found jobs with selector: ${sel}`);
              break;
            } catch { /* try next */ }
          }

          checkAborted(signal);
          await sleep(3000);

          let foundOnPage = cfg.clickToNavigate
            ? await this.extractPageJobsWithClick(page, cfg, signal)
            : await this.extractPageJobs(page, cfg);
          let added = 0;
          for (const item of foundOnPage) {
            if (!item.title || allJobs.some((j) => j.title === item.title && j.company === item.company)) continue;
            allJobs.push(this.toDraft(item));
            added++;
          }
          logger.info(`  [${keyword}] page 1: found ${foundOnPage.length} jobs (${added} new)`);

          // Attempt one next-page click per keyword where the board exposes it.
          if (added > 0 && cfg.selectors.nextPage) {
            try {
              checkAborted(signal);
              const nextBtn = page.locator(cfg.selectors.nextPage);
              if ((await nextBtn.count()) > 0 && (await nextBtn.isVisible())) {
                await nextBtn.first().click();
                await sleep(randomDelay());
                checkAborted(signal);
                foundOnPage = await this.extractPageJobs(page, cfg);
                let added2 = 0;
                for (const item of foundOnPage) {
                  if (!item.title || allJobs.some((j) => j.title === item.title && j.company === item.company)) continue;
                  allJobs.push(this.toDraft(item));
                  added2++;
                }
                logger.info(`  [${keyword}] page 2: found ${foundOnPage.length} jobs (${added2} new)`);
              }
            } catch { /* ignore */ }
          }

          checkAborted(signal);
          await sleep(Math.max(randomDelay(), cfg.crawlDelayMs || 0));
        } catch (error: any) {
          if (error.name === 'AbortError') throw error;
          logger.warn(`  Scrape error for "${keyword}": ${error.message}`);
        }
      }

      await context.close();
    } catch (error: any) {
      logger.error(`Playwright scrape failed for ${cfg.name}: ${error.message}`);
    } finally {
      if (this.browser) {
        await this.browser.close().catch(() => {});
        this.browser = null;
      }
    }

    logger.info(`${cfg.name} scrape complete: ${allJobs.length} jobs total`);
    return allJobs;
  }

  private async pickText(root: any, selectorList: string | undefined): Promise<string> {
    if (!selectorList) return '';
    for (const sel of selectorList.split(',').map((s) => s.trim())) {
      try {
        const el = root.locator(sel).first();
        if ((await el.count()) > 0) {
          const txt = ((await el.textContent()) || '').trim();
          if (txt) return txt;
        }
      } catch { /* skip */ }
    }
    return '';
  }

  private async pickHref(root: any, selectorList: string | undefined): Promise<string> {
    if (!selectorList) return '';
    for (const sel of selectorList.split(',').map((s) => s.trim())) {
      try {
        const el = root.locator(sel).first();
        if ((await el.count()) > 0) {
          const h = await el.getAttribute('href');
          if (h) return h;
        }
      } catch { /* skip */ }
    }
    return '';
  }

  // Cookie-consent overlays (OneTrust and similar) sit on top of the page
  // and intercept clicks even though waitForSelector/goto succeed — this
  // silently breaks clickToNavigate (and any nextPage click) until dismissed.
  private static readonly CONSENT_SELECTORS = [
    '#onetrust-accept-btn-handler',
    'button:has-text("Accept all")',
    'button:has-text("Accept All")',
    'button:has-text("Accept cookies")',
    '#accept-cookies',
    '.cookie-consent-accept',
  ];

  private async dismissCookieConsent(page: Page): Promise<void> {
    for (const sel of PageScrapeAdapter.CONSENT_SELECTORS) {
      try {
        const btn = page.locator(sel).first();
        if ((await btn.count()) > 0 && (await btn.isVisible())) {
          await btn.click({ timeout: 3000 });
          logger.info(`  Dismissed cookie consent via ${sel}`);
          await sleep(500);
          return;
        }
      } catch { /* try next */ }
    }
  }

  private async findCards(page: Page, cfg: ScrapeConfig): Promise<any> {
    for (const sel of cfg.selectors.jobCard.split(',').map((s) => s.trim())) {
      try {
        const loc = page.locator(sel);
        if ((await loc.count()) > 0) return loc;
      } catch { /* skip */ }
    }
    return null;
  }

  // Extract job cards using Playwright locators (Node-side). This avoids
  // page.evaluate entirely, which is immune to the esbuild/tsx keepNames
  // `__name` transform that corrupts serialized evaluate functions.
  private async extractPageJobs(page: Page, cfg: ScrapeConfig): Promise<ExtractedCard[]> {
    const results: ExtractedCard[] = [];

    const cards = await this.findCards(page, cfg);
    if (!cards) return results;

    const count = await cards.count();
    for (let i = 0; i < count; i++) {
      try {
        const card = cards.nth(i);
        let title = await this.pickText(card, cfg.selectors.title);
        if (!title) title = ((await card.textContent()) || '').trim();
        if (!title || title.length < 3) continue;

        const company = (await this.pickText(card, cfg.selectors.company)) || 'Unknown';
        const location = (await this.pickText(card, cfg.selectors.location)) || 'Unknown';

        let link = await this.pickHref(card, cfg.selectors.jobLink || cfg.selectors.link);
        if (!link) {
          try { link = (await card.getAttribute('href')) || ''; } catch { /* skip */ }
        }
        if (!link) {
          try {
            const anchor = card.locator('a').first();
            if ((await anchor.count()) > 0) link = (await anchor.getAttribute('href')) || '';
          } catch { /* skip */ }
        }
        if (!link) continue;
        if (!link.startsWith('http')) link = cfg.baseUrl.replace(/\/$/, '') + link;

        const salary = await this.pickText(card, cfg.selectors.salary || '');
        const description = (await this.pickText(card, cfg.selectors.description || '')) || title;

        results.push({ title, company, location, link, description, salary });
      } catch { /* skip malformed card */ }
    }
    return results;
  }

  // For boards whose cards are JS click-handlers with no real <a href> (e.g.
  // Adecco): click each card, read the URL it navigates to, then go back.
  // One page load per job, so capped and used only where clickToNavigate is set.
  private readonly MAX_CLICK_CARDS = 20;

  private async extractPageJobsWithClick(page: Page, cfg: ScrapeConfig, signal?: AbortSignal): Promise<ExtractedCard[]> {
    const results: ExtractedCard[] = [];
    const listUrl = page.url();

    const initialCards = await this.findCards(page, cfg);
    if (!initialCards) return results;
    const count = Math.min(await initialCards.count(), this.MAX_CLICK_CARDS);

    for (let i = 0; i < count; i++) {
      checkAborted(signal);
      try {
        // Re-locate fresh each iteration — navigating away and back can
        // detach the previous locator's underlying DOM handles.
        const cards = await this.findCards(page, cfg);
        if (!cards || (await cards.count()) <= i) break;
        const card = cards.nth(i);

        let title = await this.pickText(card, cfg.selectors.title);
        if (!title) title = ((await card.textContent()) || '').trim();
        if (!title || title.length < 3) continue;

        const company = (await this.pickText(card, cfg.selectors.company)) || 'Unknown';
        const location = (await this.pickText(card, cfg.selectors.location)) || 'Unknown';
        const salary = await this.pickText(card, cfg.selectors.salary || '');
        const description = (await this.pickText(card, cfg.selectors.description || '')) || title;

        await card.scrollIntoViewIfNeeded().catch(() => {});
        await card.click({ timeout: 5000 });
        await page.waitForURL((url) => url.toString() !== listUrl, { timeout: 8000 }).catch(() => {});
        await sleep(1500);

        const link = page.url();
        if (link && link !== listUrl) {
          results.push({ title, company, location, link, description, salary });
        }

        await page.goBack({ waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {});
        await sleep(1500);
      } catch (error: any) {
        if (error.name === 'AbortError') throw error;
        // If the click/back cycle left the page in a bad state, bail out of
        // this keyword's click loop rather than risk an infinite bad loop.
        logger.warn(`  click-to-navigate: card ${i} failed: ${error.message}`);
        if (page.url() !== listUrl) {
          await page.goto(listUrl, { waitUntil: 'domcontentloaded' }).catch(() => {});
        }
      }
    }
    return results;
  }

  private toDraft(item: ExtractedCard): DiscoveryJobDraft {
    return {
      sourceJobId: this.extractJobId(item.link, item.title),
      title: item.title,
      company: item.company,
      location: item.location,
      remoteFlag: /remote|work from home|wfh/i.test(`${item.title} ${item.location} ${item.description}`),
      description: item.description || item.title,
      salaryMin: item.salary ? this.parseSalaryMin(item.salary) : undefined,
      salaryMax: item.salary ? this.parseSalaryMax(item.salary) : undefined,
      applyUrl: item.link,
      sourceUrl: item.link,
    };
  }

  async fetchDeepScrape(url: string): Promise<{ html: string; text: string } | null> {
    if (!url) return null;

    let context = null;
    try {
      if (!this.browser) {
        this.browser = await chromium.launch({
          headless: !HEADED_MODE,
          proxy: getNextProxy() || undefined,
          args: [
            '--disable-blink-features=AutomationControlled',
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-infobars',
            '--window-size=1920,1080',
            '--disable-extensions',
          ],
        });
      }
      context = await this.browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        viewport: { width: 1920, height: 1080 },
      });
      const page = await context.newPage();

      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });
      await sleep(2000);

      const html = await page.content();
      const $ = cheerio.load(html);
      $('script, style, nav, header, footer, aside, noscript, iframe, svg').remove();
      const text = $('body').text().replace(/\s+/g, ' ').trim();

      await page.close();

      return { html, text: text.substring(0, 8000) };
    } catch (error: any) {
      logger.warn(`Deep scrape failed for ${url}: ${error.message}`);
      return null;
    } finally {
      if (context) {
        await context.close().catch(() => {});
      }
    }
  }

  parse(raw: unknown): DiscoveryJobDraft[] {
    if (!raw || typeof raw !== 'object') return [];
    return [];
  }

  async health(): Promise<{ ok: boolean; lastRunAt?: Date; error?: string }> {
    if (!this.scrapeConfig) return { ok: false, error: 'No scrape config' };
    try {
      const browser = await chromium.launch({ headless: !HEADED_MODE, proxy: getNextProxy() || undefined });
      const page = await browser.newPage();
      await page.goto(this.scrapeConfig.baseUrl, { timeout: 15000 });
      await browser.close();
      return { ok: true, lastRunAt: new Date() };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close().catch(() => {});
      this.browser = null;
    }
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
}
