import { Request, Response } from 'express';
import catchAsyncError from '../../utils/catchAsyncError';
import ErrorHandler from '../../utils/errorHandler';
import * as discoveryService from '../../services/discovery/discovery-source-register.service';
import { appendLogEntry } from '../../services/discovery/discovery-source-register.service';
import { AdzunaAdapter } from '../../services/discovery/adapters/adzuna.adapter';
import { JoobleAdapter } from '../../services/discovery/adapters/jooble.adapter';
import { PageScrapeAdapter } from '../../services/discovery/adapters/page-scrape.adapter';
import { HttpScrapeAdapter } from '../../services/discovery/adapters/http-scrape.adapter';
import { getScraperConfig, getRegion } from '../../services/discovery/adapters/scraper-config';
import { normaliseJob, validateDraft } from '../../services/discovery/discovery-normalise.service';
import { loadActiveClientProfiles, getCombinedSearchParams, matchJobToClients, createClientApplications } from '../../services/discovery/discovery-client-matcher';
import { extractJobFieldsFromText } from '../../services/discovery/discovery-ai-extract.service';
import { reclassifyUnscoredDiscovery } from '../../services/discovery/discovery-ai-vetting.service';
import { DiscoveryJob } from '../../models/v1/discovery-job.model';
import { DiscoveryMatch } from '../../models/v1/discovery-match.model';
import { DiscoverySourceRegister } from '../../models/v1/discovery-source-register.model';
import { DiscoveryRun } from '../../models/v1/discovery-run.model';
import { Credentials } from '../../models/v1/credentials.model';
import { ManualApplication } from '../../models/v1/manual-application.model';
import { Op } from 'sequelize';
import { getServiceLogger } from '../../utils/createLogger';
import { registerClient, removeClient } from '../../services/discovery/discovery-sse';

const logger = getServiceLogger('admin-discovery-controller');

const FETCH_TIMEOUT_MS = 300_000; // 5 min per API source fetch

// Global run timeout, in minutes. Default 0 = NO auto-kill — a run keeps going
// until every enabled source+location+keyword is exhausted, or an admin clicks
// Kill. Set DISCOVERY_RUN_TIMEOUT_MINUTES to impose a cap.
const RUN_GLOBAL_TIMEOUT_MS = (() => {
  const mins = parseInt(process.env.DISCOVERY_RUN_TIMEOUT_MINUTES || '0', 10);
  return Number.isFinite(mins) && mins > 0 ? mins * 60 * 1000 : 0;
})();

// Arm the global timeout only if one is configured. Returns a handle (0 = none).
function armRunTimeout(controller: AbortController, runId: string, label: string): NodeJS.Timeout | null {
  if (!RUN_GLOBAL_TIMEOUT_MS) return null;
  return setTimeout(() => {
    if (!controller.signal.aborted) {
      logger.info(`${label} ${runId} hit ${RUN_GLOBAL_TIMEOUT_MS / 60000}-min timeout — aborting`);
      controller.abort();
    }
  }, RUN_GLOBAL_TIMEOUT_MS);
}

// Generate a unique run_id — full timestamp + random suffix avoids the ~16min
// collision window of the old `Date.now().slice(-6)` approach.
export function generateRunId(): string {
  return `RUN-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// Throw an abort signal-matching error so catch blocks can detect kills/timeouts.
const throwAborted = (): never => {
  const err = new Error('Run aborted');
  err.name = 'AbortError';
  throw err;
};

// Pick the right adapter for a source based on its config strategy:
//   - Adzuna → API adapter
//   - http    → HttpScrapeAdapter (axios+cheerio, no browser)
//   - browser → PageScrapeAdapter (Playwright+stealth)
function buildAdapter(source: DiscoverySourceRegister, country: string) {
  if (source.route === 'api' && source.slug === 'adzuna') {
    return new AdzunaAdapter(country);
  }
  if (source.route === 'api' && source.slug === 'jooble') {
    return new JoobleAdapter();
  }
  const cfg = getScraperConfig(source.slug);
  if (cfg?.strategy === 'http') {
    return new HttpScrapeAdapter({ sourceSlug: source.slug });
  }
  return new PageScrapeAdapter({ sourceSlug: source.slug });
}

interface SearchLocation {
  country: string;
  location: string;
}

// Flatten search groups into (country, location) pairs. Overrides (single
// location/keyword) collapse to one pair.
function buildSearchLocations(
  combined: { searchGroups: Array<{ country: string; locations: string[] }>; country: string },
  overrideLocation?: string,
  overrideCountry?: string
): SearchLocation[] {
  if (overrideLocation?.length) {
    return [{ country: overrideCountry || combined.country || 'au', location: overrideLocation }];
  }
  const pairs: SearchLocation[] = [];
  for (const g of combined.searchGroups) {
    for (const loc of g.locations) {
      pairs.push({ country: g.country, location: loc });
    }
  }
  if (pairs.length === 0) {
    return [{ country: combined.country || 'au', location: 'Australia' }];
  }
  return pairs;
}

// Which country does this source's board actually serve? 'global' means it
// accepts any market (LinkedIn, Adzuna which selects region via its API param,
// Jooble which aggregates globally by location string).
function sourceRegion(source: DiscoverySourceRegister): string {
  if (source.route === 'api' && (source.slug === 'adzuna' || source.slug === 'jooble')) return 'global';
  const cfg = getScraperConfig(source.slug);
  return cfg ? getRegion(cfg) : 'au';
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms / 1000}s`)), ms)
    ),
  ]);
}

// GET /api/v1/admin/discovery — dashboard stats
export const getDashboard = catchAsyncError(async (req: Request, res: Response) => {
  try {
    const [stats, sources, runs, sourceBreakdown] = await Promise.all([
      discoveryService.getDashboardStats(),
      discoveryService.listSources(),
      discoveryService.getRunHistory(10),
      discoveryService.getSourceBreakdown(),
    ]);

    res.apiSuccess({ stats, sources, runs, sourceBreakdown }, 'Discovery dashboard loaded');
  } catch (error: any) {
    return res.apiError(new ErrorHandler(error.message, 500));
  }
});

// POST /api/v1/admin/discovery/run — trigger a fetch run
export const triggerRun = catchAsyncError(async (req: Request, res: Response) => {
  try {
    const { source_slug, keywords: overrideKeywords, location: overrideLocation, country: overrideCountry } = req.body;

    let source = source_slug
      ? await discoveryService.getSourceBySlug(source_slug)
      : await discoveryService.getSourceBySlug('adzuna');

    // Auto-create Adzuna source if missing (first-run bootstrap)
    if (!source && (!source_slug || source_slug === 'adzuna')) {
      const { DiscoverySourceRegister } = await import('../../models/v1/discovery-source-register.model');
      source = await DiscoverySourceRegister.create({
        name: 'Adzuna',
        slug: 'adzuna',
        route: 'api',
        permission_outcome: 'Permitted',
        evidence: 'Developer API with keyed access.',
        api_key: process.env.ADZUNA_API_KEY || null,
        app_id: process.env.ADZUNA_APP_ID || null,
        cadence_minutes: 360,
        enabled: true,
        config: { country: 'au', results_per_page: 50, max_days_old: 1 },
      } as any);
      logger.info('Auto-created Adzuna source record');
    }

    if (!source) {
      return res.apiError(new ErrorHandler('Source not found', 404));
    }

    if (!source.enabled) {
      return res.apiError(new ErrorHandler(`Source "${source.name}" is disabled`, 400));
    }

    if (source.route !== 'api' && source.route !== 'email' && source.route !== 'page') {
      return res.apiError(new ErrorHandler(`Source "${source.name}" uses ${source.route} route — fetch not available yet`, 400));
    }

    // Load client profiles to derive search params
    const clientProfiles = await loadActiveClientProfiles();
    const combined = getCombinedSearchParams(clientProfiles);

    // Use overrides if provided, otherwise use combined client preferences
    const keywords = overrideKeywords?.length ? overrideKeywords : combined.keywords;
    const searchLocations = buildSearchLocations(combined, overrideLocation, overrideCountry);

    if (keywords.length === 0) {
      return res.apiError(new ErrorHandler('No keywords found in client profiles and none provided', 400));
    }

    // Create run record
    const runId = generateRunId();
    const run = await discoveryService.createRun({ run_id: runId, trigger: 'manual' });

    logger.info(`Run ${runId} (${source.name}): keywords=${keywords.join(',')}, locations=${searchLocations.map((s) => `${s.location}[${s.country}]`).join(',')}`);

    // Run fetch asynchronously (non-blocking)
    runFetchJob(source, runId, keywords, searchLocations, clientProfiles).catch((err) => {
      logger.error(`Run ${runId} failed: ${err.message}`);
    });

    res.apiSuccess({ run_id: runId, status: 'running' }, 'Discovery run started');
  } catch (error: any) {
    return res.apiError(new ErrorHandler(error.message, 500));
  }
});

// POST /api/v1/admin/discovery/run-all — trigger all active sources at once
export const triggerRunAll = catchAsyncError(async (req: Request, res: Response) => {
  try {
    const { keywords: overrideKeywords, location: overrideLocation, country: overrideCountry } = req.body;

    // Get all enabled sources
    const allSources = await discoveryService.listSources();
    const enabledSources = allSources.filter((s: any) => s.enabled);

    if (enabledSources.length === 0) {
      return res.apiError(new ErrorHandler('No enabled sources found', 400));
    }

    // Load client profiles to derive search params
    const clientProfiles = await loadActiveClientProfiles();
    const combined = getCombinedSearchParams(clientProfiles);

    // Use overrides if provided, otherwise use combined client preferences
    const keywords = overrideKeywords?.length ? overrideKeywords : combined.keywords;
    const searchLocations = buildSearchLocations(combined, overrideLocation, overrideCountry);

    if (keywords.length === 0) {
      return res.apiError(new ErrorHandler('No keywords found in client profiles and none provided', 400));
    }

    // Create one run record for the batch
    const runId = generateRunId();
    const run = await discoveryService.createRun({ run_id: runId, trigger: 'manual' });

    logger.info(`Run All ${runId}: keywords=${keywords.join(',')}, locations=${searchLocations.map((s) => `${s.location}[${s.country}]`).join(',')}`);

    // Run all enabled sources sequentially (non-blocking)
    runAllSources(enabledSources, runId, keywords, searchLocations, clientProfiles).catch((err) => {
      logger.error(`Run All ${runId} failed: ${err.message}`);
    });

    res.apiSuccess({ run_id: runId, status: 'running', sources_count: enabledSources.length }, `Discovery run started for ${enabledSources.length} sources`);
  } catch (error: any) {
    return res.apiError(new ErrorHandler(error.message, 500));
  }
});

// GET /api/v1/admin/discovery/runs — run history
export const getRuns = catchAsyncError(async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const filter = req.query.filter as 'today' | 'week' | 'all' | undefined;
    const runs = await discoveryService.getRunHistory(limit, filter);
    res.apiSuccess(runs, 'Run history loaded');
  } catch (error: any) {
    return res.apiError(new ErrorHandler(error.message, 500));
  }
});

// GET /api/v1/admin/discovery/sources — source list
export const getSources = catchAsyncError(async (req: Request, res: Response) => {
  try {
    const sources = await discoveryService.listSources();
    res.apiSuccess(sources, 'Sources loaded');
  } catch (error: any) {
    return res.apiError(new ErrorHandler(error.message, 500));
  }
});

// PATCH /api/v1/admin/discovery/sources/:id/toggle — pause/resume
export const toggleSource = catchAsyncError(async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const source = await discoveryService.getSource(id);
    if (!source) {
      return res.apiError(new ErrorHandler('Source not found', 404));
    }

    const updated = source.enabled
      ? await discoveryService.pauseSource(id)
      : await discoveryService.resumeSource(id);

    res.apiSuccess(updated, `Source ${updated?.enabled ? 'resumed' : 'paused'}`);
  } catch (error: any) {
    return res.apiError(new ErrorHandler(error.message, 500));
  }
});

// Internal: run the actual fetch job
async function runFetchJob(
  source: DiscoverySourceRegister,
  runId: string,
  keywords: string[],
  searchLocations: SearchLocation[],
  clientProfiles?: Map<string, any>
): Promise<void> {
  const startTime = Date.now();
  const controller = new AbortController();
  activeControllers.set(runId, controller);

  // Optional global timeout (0 = run to completion; admin can Kill).
  const globalTimer = armRunTimeout(controller, runId, 'Run');

  const log = async (level: 'info' | 'ok' | 'warn' | 'error', msg: string) => {
    logger.info(`[${runId}] ${msg}`);
    await appendLogEntry(runId, { ts: new Date().toISOString(), level, message: msg });
  };

  // Counters — declared here so catch block can access partial values
  let fetchedCount = 0;
  let dedupCount = 0;
  let enrichedCount = 0;
  let matchedCount = 0;
  let hqaCount = 0;
  let mqaCount = 0;
  let lqaCount = 0;
  const matchedClientIds = new Set<string>();
  let adapter: any;
  const allLocations = searchLocations.map((s) => s.location);

  try {
    await log('info', `Starting run for ${source.name} (${source.route})`);
    await log('info', `Keywords: ${keywords.join(', ')} | Locations: ${searchLocations.map((s) => `${s.location}[${s.country}]`).join(', ')}`);

    adapter = buildAdapter(source, searchLocations[0]?.country || 'au');
    await log('info', `Using ${adapter.constructor.name} for ${source.slug}`);

    const qualifyResult = await adapter.qualify();
    if (!qualifyResult.permitted) {
      await log('error', `Source not permitted: ${qualifyResult.reason}`);
      await discoveryService.completeRun(runId, {
        status: 'failed',
        duration_ms: Date.now() - startTime,
        error_message: qualifyResult.reason,
      });
      return;
    }
    await log('info', `Adapter qualified: ${qualifyResult.reason}`);

    // Launch browser and fetch
    await log('info', `Fetching jobs...`);
    const fetchStart = Date.now();
    // Skip timeout for Playwright scraping (Cloudflare + infinite scroll can take minutes)
    const isPageScrape = adapter instanceof PageScrapeAdapter;

    // Fetch jobs for each (country, location) pair separately, then aggregate.
    // Skip locations that don't match this board's served region (e.g. an AU
    // board won't search Nigeria; Adzuna/LinkedIn are region-agnostic).
    const region = sourceRegion(source);
    let searched = 0;
    let drafts: any[] = [];
    for (const sl of searchLocations) {
      if (controller.signal.aborted) throwAborted();
      if (region !== 'global' && region !== sl.country) {
        await log('info', `Skip ${source.name} for ${sl.location} [${sl.country}] — board serves [${region}]`);
        continue;
      }
      searched++;
      await log('info', `Fetching jobs from ${source.name} for location: ${sl.location} [${sl.country}]`);
      const locationDrafts: any[] = isPageScrape
        ? await adapter.fetch(keywords, sl.location, sl.country, controller.signal)
        : await withTimeout(adapter.fetch(keywords, sl.location, sl.country, controller.signal), FETCH_TIMEOUT_MS, source.name);
      await log('info', `${source.name} returned ${locationDrafts.length} listings for "${sl.location}"`);
      drafts.push(...locationDrafts);
    }

    const fetchDuration = ((Date.now() - fetchStart) / 1000).toFixed(1);

    await log('ok', `${source.name} returned ${drafts.length} total raw listings across ${searched} locations in ${fetchDuration}s`);

    if (drafts.length === 0) {
      await log('warn', `No jobs found — scraping may have failed or site returned empty results`);
      await discoveryService.completeRun(runId, {
        status: 'success',
        duration_ms: Date.now() - startTime,
        clients_count: 0,
        fetched_count: 0,
        dedup_count: 0,
        hqa_count: 0,
        mqa_count: 0,
        lqa_count: 0,
      });
      source.last_fetched_at = new Date();
      await source.save();
      return;
    }

    // Load client profiles for matching (use pre-loaded if available)
    await log('info', `Loading client profiles for matching...`);
    const resolvedProfiles = clientProfiles || await loadActiveClientProfiles();
    await log('info', `Loaded ${resolvedProfiles.size} active client profiles`);

    // If using Playwright adapter, do deep-scrape enrichment for first 20 jobs
    const isPlaywrightAdapter = adapter instanceof PageScrapeAdapter;
    const MAX_DEEP_SCRAPES = 20;
    let deepScrapeCount = 0;

    for (const draft of drafts) {
      if (controller.signal.aborted) throwAborted();

      const validation = validateDraft(draft);
      if (!validation.valid) {
        logger.info(`  Skipping invalid draft: ${validation.reason}`);
        continue;
      }

      const normalised = normaliseJob(draft);

      // Check for duplicate job
      const existingJob = await DiscoveryJob.findOne({
        where: { fingerprint_hash: normalised.fingerprint },
      });

      if (existingJob) {
        dedupCount++;
        continue;
      }

      const job: DiscoveryJob = await DiscoveryJob.create({
        source_id: source.id,
        source_job_id: draft.sourceJobId,
        title: draft.title,
        title_normalised: normalised.titleNormalised,
        company: draft.company,
        company_normalised: normalised.companyNormalised,
        location: draft.location,
        location_normalised: normalised.locationNormalised,
        remote_flag: draft.remoteFlag,
        description: draft.description,
        posted_date: draft.postedDate,
        salary_min: draft.salaryMin,
        salary_max: draft.salaryMax,
        currency: draft.currency,
        employment_type: draft.employmentType,
        apply_url: draft.applyUrl,
        source_url: draft.sourceUrl,
        fingerprint_hash: normalised.fingerprint,
        retrieved_at: new Date(),
      } as any);

      fetchedCount++;

      // Deep-scrape enrichment: visit job detail page to extract richer data
      if (isPlaywrightAdapter && deepScrapeCount < MAX_DEEP_SCRAPES && draft.applyUrl) {
        try {
          const deepData = await (adapter as PageScrapeAdapter).fetchDeepScrape(draft.applyUrl);
          if (deepData && deepData.text.length > 100) {
            const updatedFields: Record<string, any> = {};

            // AI extraction (preferred) — richer structured fields than regex
            const ai = await extractJobFieldsFromText(deepData.text);
            if (ai) {
              const enrichLines: string[] = [];
              if (ai.skills.length > 0) enrichLines.push(`[Enriched] Skills: ${ai.skills.join(', ')}`);
              if (ai.technologies.length > 0) enrichLines.push(`[Enriched] Technologies: ${ai.technologies.join(', ')}`);
              if (ai.salary && ai.salary !== 'N/A') enrichLines.push(`[Enriched] Salary: ${ai.salary}`);
              if (ai.work_mode && ai.work_mode !== 'N/A') enrichLines.push(`[Enriched] Work Mode: ${ai.work_mode}`);
              if (ai.visa_sponsorship && ai.visa_sponsorship !== 'N/A') enrichLines.push(`[Enriched] Visa Sponsorship: ${ai.visa_sponsorship}`);
              if (enrichLines.length > 0) {
                updatedFields.description = (job.description || '') + '\n\n' + enrichLines.join('\n');
              }
              if (ai.job_summary && ai.job_summary !== 'N/A' && ai.job_summary.length > (job.description?.length || 0)) {
                updatedFields.description = ai.job_summary.substring(0, 2000);
              }
            } else {
              // Regex fallback when AI extraction fails
              if (!job.salary_min) {
                const salaryMatch = deepData.text.match(/(?:salary|compensation|pay)[:\s]+([^\n]{5,80})/i)
                  || deepData.text.match(/([\$€£]\s*[\d,]+[\s\-–to]+[\d,]+)/i);
                if (salaryMatch) {
                  updatedFields.description = (job.description || '') + '\n\n[Enriched] Salary: ' + salaryMatch[1];
                }
              }
              const workModeMatch = deepData.text.match(/\b(remote|hybrid|on[- ]site|onsite)\b/i);
              if (workModeMatch && !job.description?.includes('work_mode:')) {
                updatedFields.description = (job.description || '') + '\n\n[Enriched] Work Mode: ' + workModeMatch[1];
              }
              if (deepData.text.length > (job.description?.length || 0)) {
                updatedFields.description = deepData.text.substring(0, 2000);
              }
            }

            if (Object.keys(updatedFields).length > 0) {
              await job.update(updatedFields);
              enrichedCount++;
              logger.info(`  [DEEP] Enriched: ${job.title} @ ${job.company}`);
            }
          }
        } catch (err: any) {
          logger.warn(`  [DEEP] Failed for ${draft.applyUrl}: ${err.message}`);
        }
        deepScrapeCount++;
      }

      // Match against client profiles and create ManualApplication records
      const matches = matchJobToClients(job, resolvedProfiles);
      if (matches.length > 0) {
        const created = await createClientApplications(job, matches, source.slug);
        matchedCount += created;
        for (const m of matches) matchedClientIds.add(m.credentialsId);
        await log('ok', `[MATCH] "${job.title}" @ ${job.company} → ${matches.length} client(s), ${created} applications created`);
      }

      // Score only NEW (non-duplicate) jobs
      const score = calculateMatchScore(keywords, allLocations, normalised);
      if (score >= 80) hqaCount++;
      else if (score >= 50) mqaCount++;
      else lqaCount++;

      logger.info(`  Job: ${draft.title} @ ${draft.company} — score: ${score}`);
    }

    if (isPlaywrightAdapter) {
      await log('info', `Deep-scrape enriched ${enrichedCount} of ${Math.min(deepScrapeCount, MAX_DEEP_SCRAPES)} jobs`);
    }
    await log('info', `Matching complete — ${matchedCount} ManualApplications created across ${matchedClientIds.size} clients`);
    await log('ok', `Done — ${fetchedCount} unique jobs (${dedupCount} deduped), ${hqaCount} HQA · ${mqaCount} MQA · ${lqaCount} LQA`);

    // Update run record
    const durationMs = Date.now() - startTime;
    await discoveryService.completeRun(runId, {
      status: 'success',
      duration_ms: durationMs,
      clients_count: matchedClientIds.size,
      fetched_count: fetchedCount,
      dedup_count: dedupCount,
      hqa_count: hqaCount,
      mqa_count: mqaCount,
      lqa_count: lqaCount,
    });

    // Update source last_fetched_at
    source.last_fetched_at = new Date();
    await source.save();

    await log('ok', `Run ${runId} completed in ${(durationMs / 1000).toFixed(1)}s`);

    logger.info(`Run ${runId} complete: ${fetchedCount} fetched, ${dedupCount} deduped, ${durationMs}ms`);
  } catch (error: any) {
    const durationMs = Date.now() - startTime;
    const partialStats = {
      duration_ms: durationMs,
      clients_count: matchedClientIds.size,
      fetched_count: fetchedCount,
      dedup_count: dedupCount,
      hqa_count: hqaCount,
      mqa_count: mqaCount,
      lqa_count: lqaCount,
    };

    if (error.name === 'AbortError') {
      await discoveryService.completeRun(runId, {
        ...partialStats,
        status: 'killed',
        error_message: 'Run killed by admin',
      });
      await log('warn', `Run killed by admin — ${fetchedCount} jobs saved, ${matchedCount} matched to ${matchedClientIds.size} clients`);
      logger.info(`Run ${runId} killed by admin — partial: ${fetchedCount} fetched, ${matchedCount} matched`);
    } else {
      await discoveryService.completeRun(runId, {
        ...partialStats,
        status: 'failed',
        error_message: error.message,
      });
      await log('error', `Run failed: ${error.message}`);
      logger.error(`Run ${runId} failed: ${error.message}`);
    }
  } finally {
    if (globalTimer) clearTimeout(globalTimer);
    activeControllers.delete(runId);
    if (adapter?.close) {
      await adapter.close().catch(() => {});
    }
  }
}

// Internal: run all enabled sources sequentially
export async function runAllSources(
  sources: any[],
  runId: string,
  keywords: string[],
  searchLocations: SearchLocation[],
  clientProfiles?: Map<string, any>
): Promise<void> {
  const startTime = Date.now();
  const controller = new AbortController();
  activeControllers.set(runId, controller);

  // Optional global timeout (0 = run to completion; admin can Kill).
  const globalTimer = armRunTimeout(controller, runId, 'Run All');

  let totalFetched = 0;
  let totalDedup = 0;
  let totalMatched = 0;
  let totalHqa = 0;
  let totalMqa = 0;
  let totalLqa = 0;
  let sourcesCompleted = 0;
  const allMatchedClientIds = new Set<string>();
  const allLocations = searchLocations.map((s) => s.location);

  const log = async (level: 'info' | 'ok' | 'warn' | 'error', msg: string) => {
    logger.info(`[${runId}] ${msg}`);
    await appendLogEntry(runId, { ts: new Date().toISOString(), level, message: msg });
  };

  await log('info', `Run All starting — ${sources.length} sources, keywords: ${keywords.join(', ')}, locations: ${searchLocations.map((s) => `${s.location}[${s.country}]`).join(', ')}`);

  // Load client profiles for matching (use pre-loaded if available)
  const resolvedProfiles = clientProfiles || await loadActiveClientProfiles();
  await log('info', `Loaded ${resolvedProfiles.size} active client profiles for matching`);

  for (const source of sources) {
    if (controller.signal.aborted) {
      await log('warn', `Run aborted — stopping source loop`);
      break;
    }

    let adapter: any;
    try {
      await log('info', `Starting ${source.name} (${source.route})...`);

      adapter = buildAdapter(source, searchLocations[0]?.country || 'au');

      const qualifyResult = await adapter.qualify();
      if (!qualifyResult.permitted) {
        await log('warn', `Skipping ${source.name} — ${qualifyResult.reason}`);
        continue;
      }

      let drafts: any[];
      try {
        // Skip timeout for Playwright scraping (Cloudflare + infinite scroll can take minutes)
        const isPageScrape = adapter instanceof PageScrapeAdapter;
        const region = sourceRegion(source);
        // Fetch for each (country, location) pair separately, then aggregate.
        drafts = [];
        let searched = 0;
        for (const sl of searchLocations) {
          if (region !== 'global' && region !== sl.country) continue;
          searched++;
          await log('info', `Fetching ${source.name} for location: ${sl.location} [${sl.country}]`);
          const locationDrafts: any[] = isPageScrape
            ? await adapter.fetch(keywords, sl.location, sl.country, controller.signal)
            : await withTimeout(adapter.fetch(keywords, sl.location, sl.country, controller.signal), FETCH_TIMEOUT_MS, source.name);
          await log('info', `${source.name} returned ${locationDrafts.length} listings for "${sl.location}"`);
          drafts.push(...locationDrafts);
        }
      } catch (err: any) {
        await log('warn', `${source.name} fetch failed — ${err.message}`);
        continue;
      }

      await log('info', `${source.name} returned ${drafts.length} total raw listings`);
      let sourceFetched = 0;
      let sourceDedup = 0;
      let sourceMatched = 0;

      for (const draft of drafts) {
        const validation = validateDraft(draft);
        if (!validation.valid) continue;

        const normalised = normaliseJob(draft);
        const existing = await DiscoveryJob.findOne({ where: { fingerprint_hash: normalised.fingerprint } });

        let job: DiscoveryJob;
        if (existing) {
          sourceDedup++;
          continue;
        }

        job = await DiscoveryJob.create({
          source_id: source.id,
          source_job_id: draft.sourceJobId,
          title: draft.title,
          title_normalised: normalised.titleNormalised,
          company: draft.company,
          company_normalised: normalised.companyNormalised,
          location: draft.location,
          location_normalised: normalised.locationNormalised,
          remote_flag: draft.remoteFlag,
          description: draft.description,
          posted_date: draft.postedDate,
          salary_min: draft.salaryMin,
          salary_max: draft.salaryMax,
          currency: draft.currency,
          employment_type: draft.employmentType,
          apply_url: draft.applyUrl,
          source_url: draft.sourceUrl,
          fingerprint_hash: normalised.fingerprint,
          retrieved_at: new Date(),
        } as any);

        sourceFetched++;

        // Match against clients and create ManualApplication records
        const matches = matchJobToClients(job, resolvedProfiles);
        if (matches.length > 0) {
          const created = await createClientApplications(job, matches, source.slug);
          sourceMatched += created;
          for (const m of matches) allMatchedClientIds.add(m.credentialsId);
        }

        const score = calculateMatchScore(keywords, allLocations, normalised);
        if (score >= 80) totalHqa++;
        else if (score >= 50) totalMqa++;
        else totalLqa++;
      }

      totalFetched += sourceFetched;
      totalDedup += sourceDedup;
      totalMatched += sourceMatched;
      sourcesCompleted++;

      // Update source last_fetched_at
      source.last_fetched_at = new Date();
      await source.save();

      await log('ok', `${source.name} complete — ${sourceFetched} saved, ${sourceDedup} deduped, ${sourceMatched} matched`);
    } catch (err: any) {
      await log('warn', `${source.name} failed — ${err.message}`);
    } finally {
      if (adapter?.close) await adapter.close().catch(() => {});
    }
  }

  const durationMs = Date.now() - startTime;

  if (controller.signal.aborted) {
    await discoveryService.completeRun(runId, {
      status: 'killed',
      duration_ms: durationMs,
      clients_count: allMatchedClientIds.size,
      fetched_count: totalFetched,
      dedup_count: totalDedup,
      hqa_count: totalHqa,
      mqa_count: totalMqa,
      lqa_count: totalLqa,
    });
    await log('warn', `Run ${runId} killed by admin — ${totalFetched} jobs saved, ${totalMatched} matched to ${allMatchedClientIds.size} clients`);
  } else {
    await discoveryService.completeRun(runId, {
      status: 'success',
      duration_ms: durationMs,
      clients_count: allMatchedClientIds.size,
      fetched_count: totalFetched,
      dedup_count: totalDedup,
      hqa_count: totalHqa,
      mqa_count: totalMqa,
      lqa_count: totalLqa,
    });
    await log('ok', `Run All complete — ${sourcesCompleted} sources, ${totalFetched} unique jobs, ${totalMatched} matched to ${allMatchedClientIds.size} clients, ${(durationMs / 1000).toFixed(1)}s`);
  }

  if (globalTimer) clearTimeout(globalTimer);
  activeControllers.delete(runId);

  // Heal any scores that failed to persist during this run (transient DB/DNS
  // blips) so the manual-application page shows AI scores for the new jobs.
  reclassifyUnscoredDiscovery(150).catch((err) => {
    logger.warn(`Post-run AI vetting backfill failed: ${err.message}`);
  });
}

function calculateMatchScore(keywords: string[], locations: string[], normalised: { titleNormalised: string; locationNormalised: string }): number {
  let score = 0;
  const titleLower = normalised.titleNormalised;
  const locationLower = normalised.locationNormalised;

  // Title match
  for (const kw of keywords) {
    if (titleLower.includes(kw.toLowerCase())) {
      score += 30;
      break;
    }
  }

  // Location match — check if any client location appears in the job's location
  const matchesLocation = locations.some((loc) => locationLower.includes(loc.toLowerCase()));
  if (matchesLocation || locationLower.includes('australia')) {
    score += 40;
  }

  // Base score for having a valid listing
  score += 30;

  return Math.min(score, 100);
}

// ─── AbortController Map (for Kill Run) ────────────────────────────────────────

const activeControllers = new Map<string, AbortController>();

// ─── Schedule Endpoints ────────────────────────────────────────────────────────

// GET /api/v1/admin/discovery/schedule
export const getSchedule = catchAsyncError(async (req: Request, res: Response) => {
  try {
    const schedule = await discoveryService.getSchedule();
    res.apiSuccess(schedule, 'Schedule loaded');
  } catch (error: any) {
    return res.apiError(new ErrorHandler(error.message, 500));
  }
});

// PATCH /api/v1/admin/discovery/schedule
export const updateSchedule = catchAsyncError(async (req: Request, res: Response) => {
  try {
    const { enabled, cadence_minutes } = req.body;
    const schedule = await discoveryService.updateSchedule({ enabled, cadence_minutes });
    res.apiSuccess(schedule, 'Schedule updated');
  } catch (error: any) {
    return res.apiError(new ErrorHandler(error.message, 500));
  }
});

// ─── Kill Run ──────────────────────────────────────────────────────────────────

// POST /api/v1/admin/discovery/runs/:id/kill
export const killRun = catchAsyncError(async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const run = await DiscoveryRun.findOne({ where: { run_id: id } });
    if (!run) {
      return res.apiError(new ErrorHandler('Run not found', 404));
    }

    if (run.status !== 'running') {
      return res.apiError(new ErrorHandler(`Run "${id}" is not running (status: ${run.status})`, 400));
    }

    const controller = activeControllers.get(id);
    if (controller) {
      controller.abort();
    }

    run.status = 'killed';
    await run.save();

    res.apiSuccess({ run_id: id, status: 'killed' }, 'Run killed');
  } catch (error: any) {
    return res.apiError(new ErrorHandler(error.message, 500));
  }
});

// POST /api/v1/admin/discovery/backfill-ai-vetting
// (Re)score ManualApplications created by the AI Discovery Agent that have no AI
// score yet (e.g. score-write failed during a transient DB blip, or created
// before scoring was wired in). Returns after the backfill completes.
export const backfillAiVetting = catchAsyncError(async (req: Request, res: Response) => {
  try {
    const limit = parseInt((req.query.limit as string) || '100', 10) || 100;
    const result = await reclassifyUnscoredDiscovery(limit);
    res.apiSuccess(result, `Backfill complete: ${result.scored} scored, ${result.failed} failed`);
  } catch (error: any) {
    return res.apiError(new ErrorHandler(error.message, 500));
  }
});

// GET /api/v1/admin/discovery/runs/:id/logs/stream — SSE stream of log entries
export const streamRunLogs = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    // Verify run exists
    const run = await DiscoveryRun.findOne({ where: { run_id: id } });
    if (!run) {
      return res.status(404).json({ success: false, message: 'Run not found' });
    }

    // Set SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    // Send existing log entries immediately
    const existingLogs = (run.log_entries as any[]) || [];
    for (const entry of existingLogs) {
      const data = JSON.stringify({ type: 'log', ...entry });
      res.write(`data: ${data}\n\n`);
    }

    // Register for live updates FIRST — then re-check status below. This closes
    // the race where the run completes between the initial status read and the
    // registerClient call (which would otherwise miss the complete event).
    registerClient(id, res);
    req.on('close', () => {
      removeClient(id, res);
    });

    // Re-check status AFTER registering to catch a completion that happened
    // during registration. Fresh query (not the stale `run` loaded above).
    const freshRun = await DiscoveryRun.findOne({ where: { run_id: id } });
    if (!freshRun || freshRun.status !== 'running') {
      const status = freshRun?.status ?? run.status;
      const data = JSON.stringify({
        type: 'complete',
        runId: id,
        status,
        duration_ms: freshRun?.duration_ms ?? run.duration_ms,
        clients_count: freshRun?.clients_count ?? run.clients_count,
        fetched_count: freshRun?.fetched_count ?? run.fetched_count,
        dedup_count: freshRun?.dedup_count ?? run.dedup_count,
        hqa_count: freshRun?.hqa_count ?? run.hqa_count,
        mqa_count: freshRun?.mqa_count ?? run.mqa_count,
        lqa_count: freshRun?.lqa_count ?? run.lqa_count,
      });
      res.write(`data: ${data}\n\n`);
      res.end();
      removeClient(id, res);
    }
  } catch (err: any) {
    logger.error(`SSE stream error for ${id}: ${err.message}`);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
};
