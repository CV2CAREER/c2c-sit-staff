import cron from "node-cron";
import { getServiceLogger } from "../../utils/createLogger";
import { DiscoveryRun } from "../../models/v1/discovery-run.model";
import { DiscoveryJob } from "../../models/v1/discovery-job.model";
import { DiscoveryMatch } from "../../models/v1/discovery-match.model";
import { ManualApplication } from "../../models/v1/manual-application.model";
import { sendStandardSlackNotification } from "../../utils/slack-helpers";
import { SlackNode, SlackProvider, SlackSeverity, SlackEventType, SlackChannel } from "../../utils/enum";
import { Op, fn, col } from "sequelize";

const logger = getServiceLogger("discovery-daily-summary-cron");

export function createDiscoveryDailySummaryJob() {
  // Runs daily at 23:55 WAT (end of day)
  const job = cron.schedule("55 23 * * *", async () => {
    try {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const todayEnd = new Date(todayStart);
      todayEnd.setDate(todayEnd.getDate() + 1);

      // Aggregate today's runs
      const runsToday = await DiscoveryRun.count({
        where: {
          started_at: { [Op.gte]: todayStart, [Op.lt]: todayEnd },
        },
      });

      const runsSucceeded = await DiscoveryRun.count({
        where: {
          started_at: { [Op.gte]: todayStart, [Op.lt]: todayEnd },
          status: "success",
        },
      });

      const runsFailed = await DiscoveryRun.count({
        where: {
          started_at: { [Op.gte]: todayStart, [Op.lt]: todayEnd },
          status: "failed",
        },
      });

      // Aggregate today's discovered jobs (created today)
      const recordsDiscovered = await DiscoveryJob.count({
        where: {
          retrieved_at: { [Op.gte]: todayStart, [Op.lt]: todayEnd },
        },
      });

      // Aggregate today's matches proposed (created today)
      const matchesProposed = await DiscoveryMatch.count({
        where: {
          createdAt: { [Op.gte]: todayStart, [Op.lt]: todayEnd },
        },
      });

      // Approved = HQA + MQA (score >= 50)
      const matchesApproved = await DiscoveryMatch.count({
        where: {
          createdAt: { [Op.gte]: todayStart, [Op.lt]: todayEnd },
          match_score: { [Op.gte]: 50 },
        },
      });

      // Applications created today
      const appsCreated = await ManualApplication.count({
        where: {
          createdAt: { [Op.gte]: todayStart, [Op.lt]: todayEnd },
          discovery_method: { [Op.ne]: null },
        },
      });

      const dateStr = `${now.getDate().toString().padStart(2, "0")}/${(now.getMonth() + 1).toString().padStart(2, "0")}/${now.getFullYear()}`;

      const body = [
        `📊 AI Discovery Daily Summary — ${dateStr}`,
        ``,
        `• Runs: ${runsToday} total (${runsSucceeded} succeeded, ${runsFailed} failed)`,
        `• Records discovered: ${recordsDiscovered}`,
        `• Matches proposed: ${matchesProposed}`,
        `• Matches approved (HQA+MQA): ${matchesApproved}`,
        `• Applications created: ${appsCreated}`,
      ].join("\n");

      await sendStandardSlackNotification({
        node: SlackNode.AI,
        provider: SlackProvider.DIGITAL_OCEAN_AI,
        severity: SlackSeverity.INFO,
        type: SlackEventType.CRON_EXECUTION,
        channel: SlackChannel.JOB_PIPELINE,
        body,
      }).catch(() => {});

      logger.info(`Discovery daily summary posted: ${runsToday} runs, ${recordsDiscovered} discovered, ${matchesProposed} proposed, ${matchesApproved} approved`);
    } catch (error: any) {
      logger.error(`Discovery daily summary job failed: ${error.message}`);
    }
  });

  return job;
}
