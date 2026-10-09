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
  formatDate,
  parseDate as parseCampaignDate,
} from "../../utils/campaign-calculator";

const logger = getServiceLogger("subscription-expiry-reminder-job");

// The C&S team is in Nigeria, but the server (DigitalOcean) runs on UTC. Every
// "today" / "days remaining" decision is made on the Lagos calendar date so the
// countdown matches what admins see locally, regardless of the host timezone.
const TIMEZONE = "Africa/Lagos";

// Ordered least → most urgent. A client is placed in the most urgent milestone
// they have reached (daysRemaining <= days), so the buckets are inclusive on
// both ends: 8–14, 1–7 and 0 (plus overdue catch-up). Each milestone is sent at
// most once per campaign end date, so a client is never re-notified daily. If a
// run is missed, the next run catches up with the milestone they are now in.
const MILESTONES: Array<{ days: number; label: string; emoji: string; severity: SlackSeverity }> = [
  { days: 14, label: "8–14 days",       emoji: "⚠️", severity: SlackSeverity.INFO },
  { days: 7,  label: "1–7 days",        emoji: "🚨", severity: SlackSeverity.INFO },
  { days: 0,  label: "0 days (expired)", emoji: "🔴", severity: SlackSeverity.INFO },
];

// How far past its end date a tracked subscription can still be picked up and
// deactivated when the expiry-day run was missed (server down, job failure).
const CATCH_UP_DAYS = 30;

// Stored in seekExternalCredentials so the job remembers what it already sent
// for the current campaign cycle. Keyed by CampaignEnd: a renewal or grace
// change moves the end date, which starts a fresh reminder cycle.
const MARKER_KEY = "ExpiryReminder";

interface ExpiryMarker {
  CampaignEnd: string;
  Milestone: number;
}

// Today's calendar date in Lagos, as UTC midnight so it lines up with the
// UTC-midnight dates produced by campaign-calculator's parseDate.
function todayInLagos(): Date {
  const [year, month, day] = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(new Date())
    .split("-")
    .map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

// Whole days between two UTC-midnight dates (0 = same day, negative = past).
function daysBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / 86_400_000);
}

interface ExpiringClient {
  credentialId: string;
  clientId: string;
  name: string;
  planTitle: string;
  campaignEnd: string;
  endDate: Date;
  daysRemaining: number;
  marker: ExpiryMarker | null;
  /** Raw selected row — SPR-21-13-009 reads jsonb.SeekSubDurDays. */
  jsonb: Record<string, any>;
}

// The campaign management page displays a *recomputed* CampaignEnd
// (SeekSubStartDate + SeekSubDurDays + GraceDuration) via
// `withRecomputedFields` in campaign.service.ts — the stored
// seekExternalCredentials.SeekSubEndDate is a stale write-time snapshot. The
// reminder uses the same calculator the page uses, so the countdown stays in
// lock-step with the source of truth.
//
// There is deliberately no SQL date pre-filter: filtering on the stored
// SeekSubEndDate silently dropped rows where it was missing or malformed (e.g.
// legacy rows that only have createdAt), even though their recomputed end date
// was in range. Only the handful of fields the calculator needs are selected,
// so loading every client row stays cheap.
async function loadClients(today: Date): Promise<ExpiringClient[]> {
  const jsonField = (key: string) =>
    [literal(`"seekExternalCredentials"->>'${key}'`), key] as [ReturnType<typeof literal>, string];

  const credentials = (await Credentials.findAll({
    where: {
      clientId: { [Op.ne]: null },
      isDeleted: false,
    },
    attributes: [
      "id",
      "clientId",
      "SeekSubStartDate",
      "createdAt",
      jsonField("SeekSubDurDays"),
      jsonField("GraceDuration"),
      jsonField("First_Name"),
      jsonField("Last_Name"),
      jsonField("Plan"),
      [literal(`"seekExternalCredentials"->'${MARKER_KEY}'`), MARKER_KEY],
    ],
    raw: true,
    // Skip the @AfterFind decrypt hook — it runs a query per row and none of
    // the encrypted fields are needed here. (Honoured at runtime by
    // Model.findAll, just missing from the FindOptions typings.)
    hooks: false,
  } as any)) as unknown as Array<Record<string, any>>;

  // A client can have more than one credentials row. Only the one with the
  // latest campaign end is their current subscription — an older, stale row
  // must not trigger reminders or deactivate a client who has renewed.
  const latestByClient = new Map<string, ExpiringClient>();

  for (const row of credentials) {
    const computed = calculateCampaignFields({
      SeekSubStartDate: row.SeekSubStartDate,
      createdAt: row.createdAt,
      SeekSubDurDays: row.SeekSubDurDays,
      GraceDuration: row.GraceDuration,
    });
    const endDate = parseCampaignDate(computed.CampaignEnd);
    if (!endDate || !computed.CampaignEnd) continue;

    const client: ExpiringClient = {
      credentialId: row.id,
      clientId: row.clientId,
      name: `${row.First_Name || ""} ${row.Last_Name || ""}`.trim() || `User ${row.clientId}`,
      planTitle: row.Plan || "Unknown",
      campaignEnd: computed.CampaignEnd,
      endDate,
      daysRemaining: daysBetween(today, endDate),
      marker: row[MARKER_KEY] || null,
      jsonb: row,
    };

    const existing = latestByClient.get(client.clientId);
    if (!existing || client.endDate > existing.endDate) {
      latestByClient.set(client.clientId, client);
    }
  }

  return [...latestByClient.values()];
}

/**
 * SPR-21-13-009 — the expiration-notice job reuses this exact end-date source
 * (recomputed CampaignEnd incl. grace) so the 14/7/0-day notices stay in
 * lock-step with the digest. Loads clients for "today" on the Lagos calendar.
 */
export async function loadClientsWithEndDate(): Promise<ExpiringClient[]> {
  return loadClients(todayInLagos());
}

// The milestone this client should be notified for on this run, or null.
function dueMilestone(client: ExpiringClient): number | null {
  const { daysRemaining, marker, campaignEnd } = client;
  if (daysRemaining > MILESTONES[0].days) return null;

  const reached = MILESTONES.reduce<number | null>(
    (current, milestone) => (daysRemaining <= milestone.days ? milestone.days : current),
    null,
  );
  if (reached === null) return null;

  const sameCycle = marker?.CampaignEnd === campaignEnd;
  if (sameCycle && marker!.Milestone <= reached) return null; // already sent

  if (daysRemaining < 0) {
    // Overdue: only catch up on cycles this job was already tracking (a
    // pre-expiry reminder was sent). Untracked past-due rows — e.g. plans
    // deactivated by an admin, or clients reactivated manually before this
    // tracking existed — are left alone rather than mass-deactivated.
    if (!sameCycle || daysRemaining < -CATCH_UP_DAYS) return null;
  }

  return reached;
}

// Records the sent milestone with an atomic JSONB merge, so it can't clobber a
// concurrent edit to other seekExternalCredentials keys.
async function saveMarker(client: ExpiringClient, milestone: number) {
  await Credentials.sequelize!.query(
    `UPDATE credentials
        SET "seekExternalCredentials" = COALESCE("seekExternalCredentials", '{}'::jsonb)
          || jsonb_build_object(
               '${MARKER_KEY}',
               jsonb_build_object('CampaignEnd', CAST(:campaignEnd AS text), 'Milestone', CAST(:milestone AS int))
             )
      WHERE id = :id`,
    {
      replacements: { id: client.credentialId, campaignEnd: client.campaignEnd, milestone },
    },
  );
}

// Keyed by the `days` value of each milestone.
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

function describeCountdown(daysRemaining: number): string {
  if (daysRemaining > 1) return `${daysRemaining} days left`;
  if (daysRemaining === 1) return "1 day left";
  if (daysRemaining === 0) return "expires today";
  const ago = -daysRemaining;
  return `expired ${ago} day${ago === 1 ? "" : "s"} ago — missed run, caught up`;
}

async function notifyMilestone(
  expiring: ExpiringClient[],
  milestone: (typeof MILESTONES)[number],
) {
  const { days, label, emoji, severity } = milestone;

  if (expiring.length === 0) {
    logger.info(`✅ No subscriptions due a ${label} reminder`);
    return;
  }

  // Show the client's real account email (User.email), not the jobsite alias.
  // Instances (not raw) so User's @AfterFind decrypts the PII email field.
  const clientIds = expiring.map(({ clientId }) => clientId);
  const users = await User.findAll({
    where: { id: clientIds },
    attributes: ["id", "email"],
    paranoid: false,
  });
  const emailByUserId = new Map(users.map((user) => [user.id, user.email]));

  const clientLines = expiring
    .sort((a, b) => a.daysRemaining - b.daysRemaining)
    .map(({ clientId, name, planTitle, campaignEnd, daysRemaining }) => {
      const email = emailByUserId.get(clientId) || "N/A";
      return `• *${name}* (${email}) — Plan: *${planTitle}* — Expires: ${campaignEnd} (${describeCountdown(daysRemaining)})`;
    })
    .join("\n");

  const runAt = new Date().toLocaleString("en-GB", { timeZone: TIMEZONE });

  const body = [
    `${emoji} *SUBSCRIPTION EXPIRY REMINDER — ${label.toUpperCase()} REMAINING*`,
    "",
    `*${expiring.length} client(s) affected:*`,
    clientLines,
    "",
    "*Next Steps:*",
    NEXT_STEPS[days],
    "",
    `_Automated check · ${runAt} WAT_`,
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

  if (days === 0) {
    await User.update(
      {
        campaignActive: false,
        hasActiveSubscription: false,
        selectedPlan: null,
        plan: null,
        planId: null,
      },
      { where: { id: clientIds } },
    );
    logger.info(`Subscription ended — reset subscription fields for users: ${clientIds.join(", ")}`);
  }

  // Marked only after Slack (and deactivation) succeed, so a failed send is
  // retried on the next run instead of being silently skipped.
  await Promise.all(expiring.map((client) => saveMarker(client, days)));

  logger.info(`📢 Sent ${label} expiry reminder for ${expiring.length} client(s)`);
}

/**
 * Core logic — exported so it can be triggered on-demand from a test/admin
 * endpoint without waiting for the scheduled time. Safe to re-run: milestones
 * already sent for the current cycle are not sent again.
 *
 * With `dryRun`, it only reports who would be notified per milestone — no
 * Slack post, no user deactivation, no markers written.
 */
export async function runSubscriptionExpiryReminderJob({ dryRun = false } = {}) {
  const today = todayInLagos();
  logger.info(
    `🔔 Running subscription expiry reminder job for ${formatDate(today)} (${TIMEZONE})${dryRun ? " [DRY RUN]" : ""}...`,
  );

  const clients = await loadClients(today);

  const dueByMilestone = new Map<number, ExpiringClient[]>();
  for (const client of clients) {
    const due = dueMilestone(client);
    if (due === null) continue;
    dueByMilestone.set(due, [...(dueByMilestone.get(due) || []), client]);
  }

  if (dryRun) {
    return {
      today: formatDate(today),
      timezone: TIMEZONE,
      clientsScanned: clients.length,
      milestones: MILESTONES.map(({ days, label }) => ({
        label,
        clients: (dueByMilestone.get(days) || [])
          .sort((a, b) => a.daysRemaining - b.daysRemaining)
          .map(({ clientId, name, planTitle, campaignEnd, daysRemaining, marker }) => ({
            clientId,
            name,
            planTitle,
            campaignEnd,
            daysRemaining,
            previousMarker: marker,
            wouldDeactivate: days === 0,
          })),
      })),
    };
  }

  for (const milestone of MILESTONES) {
    await notifyMilestone(dueByMilestone.get(milestone.days) || [], milestone);
  }
  logger.info("✅ Subscription expiry reminder job completed");
}

/**
 * Cron job: runs daily at 8 AM WAT (07:00 UTC).
 * Sends Slack notifications to the C&S team once when a subscription reaches
 * 14 days, 7 days, and expiry day (0 days remaining), and resets the user's
 * subscription fields on expiry.
 */
export function createSubscriptionExpiryReminderJob() {
  return cron.schedule(
    "0 8 * * *",
    async () => {
      try {
        await runSubscriptionExpiryReminderJob();
      } catch (error: any) {
        logger.error(`❌ Subscription expiry reminder job failed: ${error.message}`);
      }
    },
    {
      scheduled: false,
      timezone: TIMEZONE,
    } as any,
  );
}
