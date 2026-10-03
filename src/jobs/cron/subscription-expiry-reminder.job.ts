import cron from "node-cron";
import { Op, literal } from "sequelize";
import { User } from "../../models/v1/user.model";
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
import {
  calculateCampaignFields,
  daysUntil,
  parseDate as parseCampaignDate,
} from "../../utils/campaign-calculator";

const logger = getServiceLogger("subscription-expiry-reminder-job");

// Each bucket is [fromDays, toDays] inclusive — non-overlapping so a plan is
// notified by exactly one milestone per run.
const MILESTONES: Array<{ from: number; to: number; label: string; emoji: string; severity: SlackSeverity }> = [
  { from: 8,  to: 14, label: "8–14 days",     emoji: "⚠️",  severity: SlackSeverity.INFO },
  { from: 1,  to: 7,  label: "1–7 days",      emoji: "🚨",  severity: SlackSeverity.INFO },
  { from: 0,  to: 0,  label: "0 days (today)", emoji: "🔴",  severity: SlackSeverity.INFO },
];

export interface ExpiringClient {
  clientId: string;
  jsonb: Record<string, any>;
  endDate: Date;
  daysRemaining: number;
}

// The campaign management page displays a *recomputed* CampaignEnd
// (SeekSubStartDate + SeekSubDurDays + GraceDuration) via
// `withRecomputedFields` in campaign.service.ts — the stored
// seekExternalCredentials.SeekSubEndDate is a stale write-time snapshot that
// doesn't reflect later grace-period adjustments. Reading the stored value
// here let the reminder fire on a different date than the one admins see on
// the page. The reminder now uses the same calculator the page uses, so the
// countdown stays in lock-step with the source of truth.
//
// A widened SQL predicate keeps this a cheap query — Postgres filters the
// bulk of the table on the raw stored end date, and JS applies the exact
// milestone match after per-row recompute. The buffer covers grace periods
// that shift the recomputed CampaignEnd forward from the stored SeekSubEndDate.
const SQL_LOOKAHEAD_DAYS = 90;
const SQL_LOOKBEHIND_DAYS = 30;

/**
 * Loads every client with a recomputed campaign end date inside the query
 * window. Exported so the SPR-21-13-009 expiration-notice job reuses the exact
 * same end-date source (recomputed CampaignEnd incl. grace) as this digest.
 */
export async function loadClientsWithEndDate(): Promise<ExpiringClient[]> {
  const endDateExpr = `
    to_date(
      CASE
        WHEN "seekExternalCredentials"->>'SeekSubEndDate' ~ '^\\d{1,2}-\\d{1,2}-\\d{4}$'
        THEN "seekExternalCredentials"->>'SeekSubEndDate'
        ELSE '01-01-1970'
      END,
      'DD-MM-YYYY'
    )`;

  const credentials = await Credentials.findAll({
    where: {
      clientId: { [Op.ne]: null },
      [Op.and]: literal(
        `${endDateExpr} BETWEEN CURRENT_DATE - ${SQL_LOOKBEHIND_DAYS} AND CURRENT_DATE + ${SQL_LOOKAHEAD_DAYS}`,
      ),
    },
    attributes: ["clientId", "SeekSubStartDate", "createdAt", "seekExternalCredentials"],
    raw: true,
  });

  return credentials.flatMap((credential) => {
    const jsonb = ((credential as any).seekExternalCredentials || {}) as Record<string, any>;
    const computed = calculateCampaignFields({
      SeekSubStartDate: (credential as any).SeekSubStartDate,
      createdAt: (credential as any).createdAt,
      SeekSubDurDays: jsonb.SeekSubDurDays,
      GraceDuration: jsonb.GraceDuration,
    });
    const endDate = parseCampaignDate(computed.CampaignEnd);
    if (!endDate) return [];

    return [
      {
        clientId: credential.clientId as string,
        jsonb: { ...jsonb, CampaignEnd: computed.CampaignEnd },
        endDate,
        daysRemaining: daysUntil(endDate),
      },
    ];
  });
}

// Keyed by the `from` value of each milestone bucket.
const NEXT_STEPS: Record<number, string> = {
  8: [
    "• Contact each client to discuss renewal options before the deadline",
    "• Send a personalised renewal reminder email",
    "• Review the account health and flag any outstanding issues",
    "• Confirm the preferred payment method is up to date",
  ].join("\n"),
  1: [
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

async function notifyMilestone(
  clients: ExpiringClient[],
  from: number,
  to: number,
  label: string,
  emoji: string,
  severity: SlackSeverity,
) {
  const expiring = clients.filter(
    (client) => client.daysRemaining >= from && client.daysRemaining <= to,
  );

  if (expiring.length === 0) {
    logger.info(`✅ No subscriptions expiring in ${label}`);
    return;
  }

  const clientLines = expiring
    .map(({ clientId, jsonb, endDate }) => {
      const name =
        `${jsonb.First_Name || ""} ${jsonb.Last_Name || ""}`.trim() ||
        `User ${clientId}`;
      const email = jsonb.Alias_Email || "N/A";
      const planTitle = jsonb.Plan || "Unknown";
      const expiryDate = endDate.toLocaleDateString("en-GB");
      return `• *${name}* (${email}) — Plan: *${planTitle}* — Expires: ${expiryDate}`;
    })
    .join("\n");

  const body = [
    `${emoji} *SUBSCRIPTION EXPIRY REMINDER — ${label.toUpperCase()} REMAINING*`,
    "",
    `*${expiring.length} client(s) affected:*`,
    clientLines,
    "",
    "*Next Steps:*",
    NEXT_STEPS[from],
    "",
    `_Automated check · ${new Date().toISOString()}_`,
  ].join("\n");

  await SlackService.notify({
    location: getEnvironmentFromHost(process.env.CLIENT_APP_DOMAIN),
    host: process.env.CLIENT_APP_DOMAIN,
    node: SlackNode.BACKGROUND_JOB,
    provider: SlackProvider.SYSTEM,
    severity,
    trigger: `Subscription expiry reminder — ${label}`,
    type: SlackEventType.SYSTEM_JOB,
    channel: SlackChannel.TOWN_CRIER,
    teamMentions: "CSM,WFC",
    body,
  });

  if (from === 0) {
    await Promise.all(
      expiring.map(async ({ clientId }) => {
        await User.update(
          {
            campaignActive: false,
            hasActiveSubscription: false,
            selectedPlan: null,
            plan: null,
            planId: null,
          },
          { where: { id: clientId } },
        );

        logger.info(`Subscription ended for user ${clientId} — reset user subscription fields`);
      }),
    );
  }

  logger.info(`📢 Sent ${label} expiry reminder for ${expiring.length} client(s)`);
}

/**
 * Core logic — exported so it can be triggered on-demand from a test/admin
 * endpoint without waiting for the scheduled time.
 */
export async function runSubscriptionExpiryReminderJob() {
  logger.info("🔔 Running subscription expiry reminder job...");

  const clients = await loadClientsWithEndDate();

  for (const milestone of MILESTONES) {
    await notifyMilestone(
      clients,
      milestone.from,
      milestone.to,
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
