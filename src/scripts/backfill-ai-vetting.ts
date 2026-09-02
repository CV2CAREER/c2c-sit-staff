/**
 * Backfill AI vetting classification for manual applications that have no
 * ai_status (or previously failed).
 *
 * The AI vetting on prod silently skipped every job because it looked up
 * `Profile.findOne({ userId, isActive: true })` while all prod profiles default
 * to `isActive: false`. The fix in campaign.service.ts uses the client's
 * `primary` profile instead. This script replays classification over the
 * affected rows using that same lookup.
 *
 * Usage:
 *   npx tsx src/scripts/backfill-ai-vetting.ts                # default: ai_status IS NULL
 *   npx tsx src/scripts/backfill-ai-vetting.ts --include-failed
 *   npx tsx src/scripts/backfill-ai-vetting.ts --limit 200
 *   npx tsx src/scripts/backfill-ai-vetting.ts --concurrency 3
 *   npx tsx src/scripts/backfill-ai-vetting.ts --client-id <userId>
 *   npx tsx src/scripts/backfill-ai-vetting.ts --only-with-client
 *   npx tsx src/scripts/backfill-ai-vetting.ts --dry-run
 *
 * The script is resumable: rows that get a classified/failed result are written
 * back, so re-running only processes rows still missing a status. It must be run
 * with the TARGET environment's .env (DB + ENCRYPTION_SECRET) so profiles decrypt
 * correctly — running it locally against prod will hit "Wrong key or corrupt data".
 */

import dotenv from 'dotenv';
dotenv.config();

import { Op } from 'sequelize';
import { ManualApplication } from '../models/v1/manual-application.model';
import { Profile } from '../models/v1/profile.model';
import { classifyJob } from '../services/ai-vetting.service';
import { getSequelize } from '../utils/sequelize';
import { getServiceLogger } from '../utils/createLogger';

const logger = getServiceLogger('backfill-ai-vetting');

const args = process.argv.slice(2);
const includeFailed = args.includes('--include-failed');
const dryRun = args.includes('--dry-run');

const readArg = (name: string): string | null => {
  const eq = args.find((a) => a.startsWith(`--${name}=`));
  if (eq) return eq.split('=')[1];
  const idx = args.indexOf(`--${name}`);
  if (idx >= 0 && args[idx + 1]) return args[idx + 1];
  return null;
};

const limit = (() => {
  const v = readArg('limit');
  const n = v ? parseInt(v, 10) : null;
  return n && Number.isFinite(n) ? n : null;
})();

const clientId = readArg('client-id');

const concurrency = (() => {
  const v = readArg('concurrency');
  const n = v ? parseInt(v, 10) : null;
  const c = n && Number.isFinite(n) ? n : 1;
  return Math.max(1, Math.min(c, 5));
})();

const onlyWithClient = args.includes('--only-with-client');
const statusFilter = readArg('status');
const todayOnly = args.includes('--today');

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const main = async (): Promise<void> => {
  await getSequelize().authenticate();
  logger.info('Connected to database');

  const where: Record<string, any> = { ai_status: null };
  if (includeFailed) {
    where.ai_status = { [Op.in]: [null, 'failed'] };
  }
  if (clientId) {
    where.client_id = clientId;
  }
  if (onlyWithClient) {
    where.client_id = { [Op.ne]: null };
  }
  if (todayOnly) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    where.createdAt = { [Op.gte]: today };
  }
  if (statusFilter) {
    where.Status = statusFilter;
  }

  const total = await ManualApplication.count({ where });
  logger.info(`Found ${total} row(s) to process${includeFailed ? ' (including failed)' : ''} (concurrency=${concurrency})${dryRun ? ' [DRY RUN]' : ''}`);

  const batch = limit && limit < total ? limit : total;
  const rows = await ManualApplication.findAll({
    where,
    order: [['createdAt', 'ASC']],
    limit: batch,
    raw: true,
  });

  let classified = 0;
  let failed = 0;
  let skippedNoProfile = 0;
  let errors = 0;

  const work = async (job: any) => {
    const log = `job ${job.id} (${String(job.Job_Title || '').slice(0, 60)})`;
    try {
      const profile = await Profile.findOne({
        where: { userId: job.client_id, name: 'primary' },
      });
      if (!profile) {
        logger.warn(`No primary profile for client ${job.client_id} — skipping ${log}`);
        skippedNoProfile++;
        return;
      }

      if (dryRun) {
        logger.info(`[DRY RUN] Would classify ${log} with profile ${profile.userId}`);
        return;
      }

      const result = await classifyJob(await ManualApplication.findByPk(job.id) as ManualApplication, profile);

      const updateFields: any = { ai_status: result.status };
      if (result.status === 'classified') {
        updateFields.ai_score = result.score;
        updateFields.ai_reason = result.reason;
        updateFields.ai_classified_at = new Date();
        updateFields.ai_prompt_version = result.promptVersion;
      } else {
        updateFields.ai_reason = result.reason;
      }

      await ManualApplication.update(updateFields, { where: { id: job.id } });

      if (result.status === 'classified') {
        classified++;
        logger.info(`Classified ${log}: ${result.score}`);
      } else {
        failed++;
        logger.info(`Classification failed for ${log}: ${result.reason}`);
      }
    } catch (err: any) {
      errors++;
      logger.error(`Error processing ${log}: ${err.message}`);
    }
  };

  // Process with bounded concurrency so the AI endpoint isn't hammered.
  for (let i = 0; i < rows.length; i += concurrency) {
    const slice = rows.slice(i, i + concurrency);
    await Promise.all(slice.map((job: any) => work(job)));
    logger.info(`Progress: ${Math.min(i + concurrency, rows.length)}/${rows.length} processed`);
    // Brief pause between batches to be gentle with the AI endpoint.
    await sleep(500);
  }

  logger.info(`Done. classified=${classified} failed=${failed} noProfile=${skippedNoProfile} errors=${errors}`);
  process.exit(0);
};

main().catch((err) => {
  logger.error('Backfill failed:', err);
  process.exit(1);
});
