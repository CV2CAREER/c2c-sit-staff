import { DiscoverySourceRegister } from '../../models/v1/discovery-source-register.model';
import { DiscoveryJob } from '../../models/v1/discovery-job.model';
import { DiscoveryMatch } from '../../models/v1/discovery-match.model';
import { DiscoveryRun } from '../../models/v1/discovery-run.model';
import { DiscoverySchedule } from '../../models/v1/discovery-schedule.model';
import { ManualApplication } from '../../models/v1/manual-application.model';
import { Credentials } from '../../models/v1/credentials.model';
import { Op, fn, col } from 'sequelize';
import { getServiceLogger } from '../../utils/createLogger';
import { pushLogEntry, pushRunComplete } from './discovery-sse';
import { AI_COST_PER_1M_TOKENS } from '../../config/env';

const logger = getServiceLogger('discovery-source-register');

// SPR-19-03-017 — the vendor being evaluated was abandoned by their own team
// over unprojectable AI cost (~$8,000, architecture called "unsustainable").
// This must stay visible before it becomes the same problem, hence "current
// volume" AND a 3x-client-growth projection, not just a running total.
const CLIENT_GROWTH_PROJECTION_MULTIPLIER = 3;

const estimateCostUsd = (tokens: number): number => (tokens / 1_000_000) * AI_COST_PER_1M_TOKENS;

export const listSources = async (): Promise<DiscoverySourceRegister[]> => {
  return DiscoverySourceRegister.findAll({
    attributes: { exclude: ['api_key', 'app_id'] },
    order: [['name', 'ASC']],
  });
};

export const getSource = async (id: string): Promise<DiscoverySourceRegister | null> => {
  return DiscoverySourceRegister.findByPk(id, {
    attributes: { exclude: ['api_key', 'app_id'] },
  });
};

export const getSourceBySlug = async (slug: string): Promise<DiscoverySourceRegister | null> => {
  return DiscoverySourceRegister.findOne({ where: { slug } });
};

export const pauseSource = async (id: string): Promise<DiscoverySourceRegister | null> => {
  const source = await DiscoverySourceRegister.findByPk(id);
  if (!source) return null;
  source.enabled = false;
  await source.save();
  logger.info(`Source paused: ${source.name} (${source.slug})`);
  // Return without sensitive fields
  const { api_key, app_id, ...safe } = source.get({ plain: true }) as any;
  return safe as DiscoverySourceRegister;
};

export const resumeSource = async (id: string): Promise<DiscoverySourceRegister | null> => {
  const source = await DiscoverySourceRegister.findByPk(id);
  if (!source) return null;
  source.enabled = true;
  await source.save();
  logger.info(`Source resumed: ${source.name} (${source.slug})`);
  // Return without sensitive fields
  const { api_key, app_id, ...safe } = source.get({ plain: true }) as any;
  return safe as DiscoverySourceRegister;
};

export const getDashboardStats = async (): Promise<{
  totalJobs: number;
  uniqueJobs: number;
  hqaCount: number;
  mqaCount: number;
  lqaCount: number;
  totalRuns: number;
  runsToday: number;
  sourcesActive: number;
  sourcesTotal: number;
  aiUsage: {
    tokensThisMonth: number;
    requestsThisMonth: number;
    estimatedMonthlyCostUsd: number;
    projectedCostAt3xVolumeUsd: number;
    costPer1mTokensUsd: number;
  };
}> => {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [totalJobs, uniqueJobs, hqaCount, mqaCount, lqaCount, totalRuns, runsToday, sourcesActive, sourcesTotal, monthlyUsage] =
    await Promise.all([
      DiscoveryJob.count(),
      DiscoveryJob.count({ distinct: true, col: 'fingerprint_hash' }),
      DiscoveryMatch.count({ where: { match_score: { [Op.gte]: 80 } } }),
      DiscoveryMatch.count({ where: { match_score: { [Op.between]: [50, 79.99] } } }),
      DiscoveryMatch.count({ where: { match_score: { [Op.lt]: 50 } } }),
      DiscoveryRun.count(),
      DiscoveryRun.count({ where: { started_at: { [Op.gte]: todayStart } } }),
      DiscoverySourceRegister.count({ where: { enabled: true } }),
      DiscoverySourceRegister.count(),
      DiscoveryRun.findOne({
        where: { started_at: { [Op.gte]: monthStart } },
        attributes: [
          [fn('COALESCE', fn('SUM', col('tokens_used')), 0), 'tokensThisMonth'],
          [fn('COALESCE', fn('SUM', col('ai_request_count')), 0), 'requestsThisMonth'],
        ],
        raw: true,
      }),
    ]);

  const tokensThisMonth = parseInt((monthlyUsage as any)?.tokensThisMonth || '0', 10);
  const requestsThisMonth = parseInt((monthlyUsage as any)?.requestsThisMonth || '0', 10);
  const estimatedMonthlyCostUsd = estimateCostUsd(tokensThisMonth);

  return {
    totalJobs,
    uniqueJobs,
    hqaCount,
    mqaCount,
    lqaCount,
    totalRuns,
    runsToday,
    sourcesActive,
    sourcesTotal,
    aiUsage: {
      tokensThisMonth,
      requestsThisMonth,
      estimatedMonthlyCostUsd,
      projectedCostAt3xVolumeUsd: estimatedMonthlyCostUsd * CLIENT_GROWTH_PROJECTION_MULTIPLIER,
      costPer1mTokensUsd: AI_COST_PER_1M_TOKENS,
    },
  };
};

export const getRunHistory = async (limit: number = 20, filter?: 'today' | 'week' | 'all'): Promise<DiscoveryRun[]> => {
  const where: any = {};

  if (filter === 'today') {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    where.started_at = { [Op.gte]: todayStart };
  } else if (filter === 'week') {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    where.started_at = { [Op.gte]: weekAgo };
  }

  return DiscoveryRun.findAll({
    where,
    order: [['started_at', 'DESC']],
    limit,
  });
};

export const createRun = async (data: {
  run_id: string;
  trigger: string;
  clients_count?: number;
}): Promise<DiscoveryRun> => {
  return DiscoveryRun.create({
    run_id: data.run_id,
    trigger: data.trigger,
    status: 'running',
    started_at: new Date(),
    clients_count: data.clients_count || 0,
  } as any);
};

export const completeRun = async (
  runId: string,
  data: {
    status: 'success' | 'failed' | 'killed';
    duration_ms?: number;
    clients_count?: number;
    fetched_count?: number;
    dedup_count?: number;
    hqa_count?: number;
    mqa_count?: number;
    lqa_count?: number;
    tokens_used?: number;
    ai_request_count?: number;
    error_message?: string;
  }
): Promise<void> => {
  const run = await DiscoveryRun.findOne({ where: { run_id: runId } });
  if (!run) return;
  Object.assign(run, data);
  await run.save();

  // Push completion to SSE clients and close connections
  pushRunComplete(runId, data.status, {
    duration_ms: data.duration_ms,
    clients_count: data.clients_count,
    fetched_count: data.fetched_count,
    dedup_count: data.dedup_count,
    hqa_count: data.hqa_count,
    mqa_count: data.mqa_count,
    lqa_count: data.lqa_count,
    tokens_used: data.tokens_used,
    ai_request_count: data.ai_request_count,
  });
};

export const getSourceBreakdown = async (): Promise<Array<{ name: string; slug: string; count: number }>> => {
  // Get all enabled sources
  const allSources = await DiscoverySourceRegister.findAll({
    where: { enabled: true },
    attributes: ['id', 'name', 'slug'],
    raw: true,
  });

  // Get job counts per source
  const counts = await DiscoveryJob.findAll({
    attributes: [
      'source_id',
      [fn('COUNT', col('DiscoveryJob.id')), 'count'],
    ],
    group: ['source_id'],
    raw: true,
  });

  const countMap = new Map<string, number>();
  for (const c of counts as any[]) {
    countMap.set(c.source_id, parseInt(c.count, 10));
  }

  return allSources.map((s) => ({
    name: s.name,
    slug: s.slug,
    count: countMap.get(s.id) || 0,
  }));
};

// ─── Schedule ──────────────────────────────────────────────────────────────────

function computeNextRunAt(cadenceMinutes: number): Date {
  const next = new Date();
  next.setMinutes(next.getMinutes() + cadenceMinutes);
  return next;
}

export const getSchedule = async (): Promise<any> => {
  let schedule = await DiscoverySchedule.findOne();
  if (!schedule) {
    schedule = await DiscoverySchedule.create({
      enabled: true,
      cadence_minutes: 360,
      next_run_at: computeNextRunAt(360),
    } as any);
  }
  return schedule;
};

export const updateSchedule = async (data: {
  enabled?: boolean;
  cadence_minutes?: number;
}): Promise<any> => {
  const schedule = await getSchedule();
  if (data.enabled !== undefined) schedule.enabled = data.enabled;
  if (data.cadence_minutes !== undefined) {
    schedule.cadence_minutes = data.cadence_minutes;
  }
  schedule.next_run_at = computeNextRunAt(schedule.cadence_minutes);
  await schedule.save();
  return schedule;
};

export const markScheduleRun = async (): Promise<void> => {
  const schedule = await getSchedule();
  schedule.last_run_at = new Date();
  schedule.next_run_at = computeNextRunAt(schedule.cadence_minutes);
  await schedule.save();
};

// ─── Log Entries ───────────────────────────────────────────────────────────────

export const appendLogEntry = async (
  runId: string,
  entry: { ts: string; level: string; message: string }
): Promise<void> => {
  // Push to SSE clients immediately (real-time streaming) — never skips.
  pushLogEntry(runId, entry);

  // Persist to the run record, but don't let a transient DB/DNS failure kill the
  // whole run: logging already reached SSE clients, and a lost line is acceptable
  // vs. aborting an in-flight scrape.
  try {
    const run = await DiscoveryRun.findOne({ where: { run_id: runId } });
    if (!run) return;
    const current = (run.log_entries as any[]) || [];
    current.push(entry);
    run.log_entries = current as any;
    await run.save();
  } catch (err: any) {
    logger.warn(`[${runId}] failed to persist log entry (${err.message}) — continuing`);
  }
};
