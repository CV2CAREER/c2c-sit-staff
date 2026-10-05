import { ManualApplication } from '../../models/v1/manual-application.model';
import { Profile } from '../../models/v1/profile.model';
import { classifyJob, AiVettingResult } from '../ai-vetting.service';
import { aiVettingConfigApplicationService } from '../admin/ai-vetting-config.application.service';
import { Op } from 'sequelize';
import { getServiceLogger } from '../../utils/createLogger';

const logger = getServiceLogger('discovery-ai-vetting');

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

// Error patterns that indicate a transient DB/network fault worth retrying.
const TRANSIENT = /ECONNREFUSED|ECONNRESET|ETIMEDOUT|EAI_AGAIN|ENOTFOUND|SequelizeConnection|ConnectionManager|connect/i;

async function withRetry<T>(fn: () => Promise<T>, attempts = 5, baseDelayMs = 1200): Promise<T> {
  let lastErr: any;
  for (let i = 1; i <= attempts; i++) {
    try {
      return await fn();
    } catch (err: any) {
      lastErr = err;
      const transient = TRANSIENT.test(err?.message || String(err));
      if (!transient || i === attempts) throw err;
      logger.warn(`Transient DB error (attempt ${i}/${attempts}): ${err.message} — retrying`);
      await sleep(baseDelayMs * i);
    }
  }
  throw lastErr;
}

/**
 * Persist a classifyJob result onto a ManualApplication, retrying transient DB
 * failures (e.g. the intermittent getaddrinfo EAI_AGAIN) so the score isn't lost.
 */
export async function applyAiVettingResult(manualApp: ManualApplication, result: AiVettingResult): Promise<void> {
  const updateFields: any = { ai_status: result.status };
  if (result.status === 'classified') {
    updateFields.ai_score = result.score;
    updateFields.ai_reason = result.reason;
    updateFields.ai_classified_at = new Date();
    updateFields.ai_prompt_version = result.promptVersion;
  } else {
    updateFields.ai_reason = result.reason;
  }
  await withRetry(() => manualApp.update(updateFields));
}

const MAX_CONCURRENCY = 4;

/**
 * Backfill: (re)score ManualApplication rows that have no AI score yet — created
 * by the AI Discovery Agent (or otherwise untouched) and still UNATTENDED. Runs
 * classifyJob per row, concurrency-limited, idempotent (skips already scored).
 */
export async function reclassifyUnscoredDiscovery(limit = 100): Promise<{
  scanned: number;
  scored: number;
  failed: number;
  skippedNoProfile: number;
}> {
  const config = await aiVettingConfigApplicationService.getConfig();
  if (!config.enabled) {
    logger.warn('AI vetting is disabled in config — skipping backfill');
    return { scanned: 0, scored: 0, failed: 0, skippedNoProfile: 0 };
  }

  const rows = await ManualApplication.findAll({
    where: {
      [Op.and]: [
        { ai_status: null },
        { Status: 'UNATTENDED' },
        { QualityScore: null },
        { isDeleted: false },
        { [Op.or]: [{ discovery_method: 'machine' }, { DiscoveredBy: 'AI Discovery Agent' }] },
      ],
    },
    order: [['createdAt', 'ASC']],
    limit,
  });

  logger.info(`Reclassifying ${rows.length} unscored discovery application(s)`);
  if (rows.length === 0) return { scanned: 0, scored: 0, failed: 0, skippedNoProfile: 0 };

  let scored = 0;
  let failed = 0;
  let skippedNoProfile = 0;
  let idx = 0;

  async function worker(): Promise<void> {
    while (idx < rows.length) {
      const current = idx++;
      const manualApp = rows[current];
      try {
        const profile = await Profile.findOne({
          where: { userId: manualApp.client_id, name: 'primary' },
        });
        if (!profile) {
          skippedNoProfile++;
          continue;
        }
        const result = await classifyJob(manualApp, profile);
        await applyAiVettingResult(manualApp, result);
        if (result.status === 'classified') {
          scored++;
          logger.info(`Backfill scored ${manualApp.id}: ${result.score}`);
        } else {
          failed++;
        }
      } catch (err: any) {
        failed++;
        logger.error(`Backfill failed for application ${manualApp.id}: ${err.message}`);
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(MAX_CONCURRENCY, rows.length) }, () => worker()));

  logger.info(`Reclassify complete: ${scored} scored, ${failed} failed, ${skippedNoProfile} no profile`);
  return { scanned: rows.length, scored, failed, skippedNoProfile };
}
