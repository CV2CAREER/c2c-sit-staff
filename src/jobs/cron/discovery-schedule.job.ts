import cron from "node-cron";
import { getServiceLogger } from "../../utils/createLogger";
import { getSchedule, markScheduleRun, listSources, reapStaleRuns } from "../../services/discovery/discovery-source-register.service";
import { runAllSources, generateRunId } from "../../controllers/v1/admin-discovery.controller";
import { DiscoveryRun } from "../../models/v1/discovery-run.model";
import { loadActiveClientProfiles, getCombinedSearchParams } from "../../services/discovery/discovery-client-matcher";

const logger = getServiceLogger("discovery-schedule-cron-job");

// Runs older than this are considered orphaned (default 90min, ~2.5× the
// 360min cadence). Override with DISCOVERY_STALE_RUN_MINUTES.
const STALE_RUN_MINUTES = (() => {
  const v = parseInt(process.env.DISCOVERY_STALE_RUN_MINUTES || '90', 10);
  return Number.isFinite(v) && v > 0 ? v : 90;
})();

/**
 * Reap orphaned `running` runs left behind by a crashed/restarted process.
 * Called once at startup (before first cron tick) and again inside the cron
 * tick itself so that mid-timer crashes are also caught.
 */
async function reapOrphanedRuns(): Promise<number> {
  try {
    return await reapStaleRuns(STALE_RUN_MINUTES);
  } catch (err: any) {
    logger.error(`Stale-run reaper failed: ${err.message}`);
    return 0;
  }
}

export async function reapStaleRunsOnStartup(): Promise<void> {
  const reaped = await reapOrphanedRuns();
  if (reaped > 0) {
    logger.info(`Startup reaper: marked ${reaped} orphaned run(s) as failed`);
  }
}

export function createDiscoveryScheduleJob() {
  const job = cron.schedule("*/5 * * * *", async () => {
    try {
      // 1. Reap any runs orphaned by a mid-timer crash or restart
      await reapOrphanedRuns();

      // 2. Read schedule — harden against DB/DNS timeouts
      let schedule;
      try {
        schedule = await getSchedule();
      } catch (err: any) {
        logger.error(`Discovery schedule: getSchedule failed (${err.message}) — will retry next tick`);
        return;
      }

      if (!schedule.enabled) {
        return;
      }

      if (!schedule.next_run_at || new Date(schedule.next_run_at) > new Date()) {
        return;
      }

      // 3. Check if a run is already in progress (post-reap, this is reliable)
      const activeRun = await DiscoveryRun.findOne({ where: { status: "running" } });
      if (activeRun) {
        logger.info("Discovery schedule: skipping — a run is already in progress");
        return;
      }

      logger.info(`Discovery schedule: triggered — cadence ${schedule.cadence_minutes}min`);

      // Get all enabled sources
      const allSources = await listSources();
      const enabledSources = allSources.filter((s: any) => s.enabled);

      if (enabledSources.length === 0) {
        logger.info("Discovery schedule: no enabled sources — skipping");
        await markScheduleRun();
        return;
      }

      // Load client preferences for search params
      const clientProfiles = await loadActiveClientProfiles();
      const combined = getCombinedSearchParams(clientProfiles);
      const keywords = combined.keywords.length > 0 ? combined.keywords : ['engineer'];
      const searchLocations = combined.searchGroups.flatMap((g) =>
        g.locations.map((location) => ({ country: g.country, location }))
      );
      if (searchLocations.length === 0) {
        searchLocations.push({ country: 'au', location: 'Australia' });
      }

      // Create run record
      const runId = generateRunId();
      await DiscoveryRun.create({
        run_id: runId,
        trigger: "scheduled",
        status: "running",
        started_at: new Date(),
        clients_count: 0,
      } as any);

      // Fire and forget — non-blocking
      runAllSources(enabledSources, runId, keywords, searchLocations, clientProfiles).catch((err) => {
        logger.error(`Discovery schedule run ${runId} failed: ${err.message}`);
      });

      await markScheduleRun();
      logger.info(`Discovery schedule: run ${runId} started for ${enabledSources.length} sources`);
    } catch (error: any) {
      logger.error(`Discovery schedule job failed: ${error.message}`);
    }
  });

  return job;
}
