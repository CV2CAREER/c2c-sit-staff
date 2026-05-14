import cron from "node-cron";
import { Op } from "sequelize";
import { Plan } from "../../models/v1/plan.model";
import { Credentials } from "../../models/v1/credentials.model";
import { getServiceLogger } from "../../utils/createLogger";
import { SlackService } from "../../services/slack.service";
import { getEnvironmentFromHost } from "../../utils/slack-helpers";
import {
  SlackChannel,
  SlackEventType,
  SlackNode,
  SlackProvider,
  SlackSeverity,
} from "../../utils/enum";

const logger = getServiceLogger("subscription-expiry-reminder-job");

const MILESTONES: Array<{ days: number; label: string; emoji: string; severity: SlackSeverity }> = [
  { days: 14, label: "14 days",              emoji: "⚠️",  severity: SlackSeverity.INFO },
  { days: 7,  label: "7 days",               emoji: "🚨",  severity: SlackSeverity.INFO },
  { days: 0,  label: "0 days (today)",        emoji: "🔴",  severity: SlackSeverity.INFO },
];

function getDayRange(daysFromNow: number): { start: Date; end: Date } {
  const start = new Date();
  start.setDate(start.getDate() + daysFromNow);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

const NEXT_STEPS: Record<number, string> = {
  14: [
    "• Contact each client to discuss renewal options before the deadline",
    "• Send a personalised renewal reminder email",
    "• Review the account health and flag any outstanding issues",
    "• Confirm the preferred payment method is up to date",
  ].join("\n"),
  7: [
    "• Follow up with clients who have not yet renewed",
    "• Escalate to the account manager if there is no response within 24 hours",
    "• Begin preparing any landing steps in case renewal does not proceed",
    "• Check if a plan extension or grace period applies",
  ].join("\n"),
  0: [
    "• Immediately reach out to expiring clients — same-day contact required",
    "• Initiate the renewal or landing process now",
    "• Update the client status in the system once confirmed",
    "• Ensure aggregators and campaign flags are deactivated if not renewed",
    "• Log outcome in the client record and notify the delivery team",
  ].join("\n"),
};

async function notifyMilestone(days: number, label: string, emoji: string, severity: SlackSeverity) {
  const { start, end } = getDayRange(days);

  const plans = await Plan.findAll({
    where: {
      expiresAt: { [Op.between]: [start, end] },
      hasExpired: false,
      deletedAt: null,
    },
    attributes: ["id", "userId", "title", "expiresAt"],
    raw: true,
  });

  if (plans.length === 0) {
    logger.info(`✅ No subscriptions expiring in ${label}`);
    return;
  }

  const userIds = plans.map((p) => p.userId);

  const credentials = await Credentials.findAll({
    where: { clientId: { [Op.in]: userIds } },
    attributes: ["clientId", "seekExternalCredentials"],
    raw: true,
  });

  const credByUserId = new Map(
    credentials.map((c) => [c.clientId, (c as any).seekExternalCredentials || {}])
  );

  const clientLines = plans
    .map((plan) => {
      const jsonb = credByUserId.get(plan.userId) || {};
      const name =
        `${jsonb.First_Name || ""} ${jsonb.Last_Name || ""}`.trim() ||
        `User ${plan.userId}`;
      const email = jsonb.Alias_Email || "N/A";
      const expiryDate = plan.expiresAt
        ? new Date(plan.expiresAt as any).toLocaleDateString("en-GB")
        : "Unknown";
      return `• *${name}* (${email}) — Plan: *${plan.title}* — Expires: ${expiryDate}`;
    })
    .join("\n");

  const body = [
    `${emoji} *SUBSCRIPTION EXPIRY REMINDER — ${label.toUpperCase()} REMAINING*`,
    "",
    `*${plans.length} client(s) affected:*`,
    clientLines,
    "",
    "*Next Steps:*",
    NEXT_STEPS[days],
    "",
    `_Automated check · ${new Date().toISOString()}_`,
  ].join("\n");

  await SlackService.notify({
    location: getEnvironmentFromHost(process.env.HOST || "localhost"),
    host: process.env.HOST || "localhost",
    node: SlackNode.BACKGROUND_JOB,
    provider: SlackProvider.SYSTEM,
    severity,
    trigger: `Subscription expiry reminder — ${label}`,
    type: SlackEventType.SYSTEM_JOB,
    channel: SlackChannel.TOWN_CRIER,
    teamMentions: "CSM",
    body,
  });

  logger.info(`📢 Sent ${label} expiry reminder for ${plans.length} client(s)`);
}

/**
 * Core logic — exported so it can be triggered on-demand from a test/admin
 * endpoint without waiting for the scheduled time.
 */
export async function runSubscriptionExpiryReminderJob() {
  logger.info("🔔 Running subscription expiry reminder job...");
  for (const milestone of MILESTONES) {
    await notifyMilestone(
      milestone.days,
      milestone.label,
      milestone.emoji,
      milestone.severity,
    );
  }
  logger.info("✅ Subscription expiry reminder job completed");
}

/**
 * Cron job: runs daily at 8 AM WAT (07:00 UTC).
 * Sends Slack notifications to the C&S team for subscriptions expiring
 * in 14 days, 7 days, and on expiry day (0 days remaining).
 */
export function createSubscriptionExpiryReminderJob() {
  return cron.schedule(
    "0 7 * * *",
    async () => {
      try {
        await runSubscriptionExpiryReminderJob();
      } catch (error: any) {
        logger.error(`❌ Subscription expiry reminder job failed: ${error.message}`);
      }
    },
    {
      scheduled: false,
      timezone: "Africa/Lagos",
    } as any,
  );
}
