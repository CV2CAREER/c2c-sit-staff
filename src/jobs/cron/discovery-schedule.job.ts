import cron from "node-cron";
import { getServiceLogger } from "../../utils/createLogger";
import { getSchedule, markScheduleRun, listSources } from "../../services/discovery/discovery-source-register.service";
import { runAllSources, generateRunId } from "../../controllers/v1/admin-discovery.controller";
import { DiscoveryRun } from "../../models/v1/discovery-run.model";
import { loadActiveClientProfiles, getCombinedSearchParams } from "../../services/discovery/discovery-client-matcher";

const logger = getServiceLogger("discovery-schedule-cron-job");

export function createDiscoveryScheduleJob() {
  const job = cron.schedule("*/5 * * * *", async () => {
    try {
      const schedule = await getSchedule();

      if (!schedule.enabled) {
        return;
      }

      if (!schedule.next_run_at || new Date(schedule.next_run_at) > new Date()) {
        return;
      }

      // Check if a run is already in progress
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
      runAllSources(enabledSources, runId, keywords, searchLocations).catch((err) => {
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
