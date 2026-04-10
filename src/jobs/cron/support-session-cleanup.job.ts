import cron from "node-cron";
import { Op } from "sequelize";
import { SupportSession } from "../../models/v1/support-session.model";
import { getServiceLogger } from "../../utils/createLogger";
import { SlackService } from "../../services/slack.service";
import { getEnvironmentFromHost } from "../../utils/slack-helpers";
import { SlackChannel, SlackEventType, SlackNode, SlackProvider, SlackSeverity } from "../../utils/enum";

const logger = getServiceLogger("support-session-cleanup-job");

/**
 * Cron job: Run every 30 minutes
 * Closes sessions that have been open for more than 5 minutes without any activity
 */
export const supportSessionCleanupJob = cron.schedule("*/30 * * * *", async () => {
  try {
    logger.info("🔍 Running support session cleanup job...");

    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    // Find all open sessions with no activity for more than 5 minutes
    const staleSessions = await SupportSession.findAll({
      where: {
        status: "open",
        updatedAt: {
          [Op.lt]: fiveMinutesAgo
        }
      }
    });

    if (staleSessions.length === 0) {
      logger.info("✅ No stale sessions found to clean up");
      return;
    }

    // Close all stale sessions
    const updateResult = await SupportSession.update(
      {
        status: "closed",
        closedAt: new Date()
      },
      {
        where: {
          id: {
            [Op.in]: staleSessions.map(s => s.id)
          }
        }
      }
    );

    logger.info(`✅ Closed ${updateResult[0]} stale support sessions`);

    // Send Slack notification if any sessions were closed
    if (updateResult[0] > 0) {
      setImmediate(async () => {
        try {
          await SlackService.notify({
            location: getEnvironmentFromHost(process.env.HOST || "localhost"),
            host: process.env.HOST || "localhost",
            node: SlackNode.BACKGROUND_JOB,
            provider: SlackProvider.SYSTEM,
            severity: SlackSeverity.INFO,
            trigger: "Support Session Auto-Close",
            type: SlackEventType.SYSTEM_JOB,
            channel: SlackChannel.TOWN_CRIER,
            teamMentions: "CSM",
            body: `🤖 **AUTO CLOSED STALE SUPPORT SESSIONS** 🤖\n• Closed: ${updateResult[0]} sessions\n• Reason: Open for more than 5 minutes\n• Trigger: Automated cleanup job (runs every 30 minutes)\n• Timestamp: ${new Date().toISOString()}`
          });
        } catch (err) {
          logger.warn(`Could not send Slack notification for cleanup job: ${err}`);
        }
      });
    }

  } catch (error: any) {
    logger.error(`❌ Support session cleanup job failed: ${error.message}`);
  }
}, {
  scheduled: false,
  timezone: "Africa/Lagos"
} as any);

/**
 * Start the cron job
 */
export const createSupportSessionCleanupJob = () => {
  return supportSessionCleanupJob;
};
