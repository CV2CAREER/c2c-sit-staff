/**
 * Run the subscription expiry reminder job from the terminal.
 *
 *   npx tsx src/scripts/run-subscription-expiry-reminder.ts          # dry run (default)
 *   npx tsx src/scripts/run-subscription-expiry-reminder.ts --live   # real run
 *
 * Dry run only prints who would be notified — no Slack post, no user
 * deactivation, no reminder markers written. --live does all three against the
 * database in .env, so check DB_NAME first.
 */
import { DATABASE_NAME } from "../config/env";
import { getSequelize } from "../utils/sequelize";
import { runSubscriptionExpiryReminderJob } from "../jobs/cron/subscription-expiry-reminder.job";

const live = process.argv.includes("--live");

(async () => {
  const sequelize = getSequelize();
  await sequelize.authenticate();

  console.log(`\nDatabase: ${DATABASE_NAME} · Mode: ${live ? "LIVE" : "DRY RUN"}\n`);

  const result = await runSubscriptionExpiryReminderJob({ dryRun: !live });

  if (result) {
    console.log(`Today (${result.timezone}): ${result.today} · Clients scanned: ${result.clientsScanned}\n`);
    for (const { label, clients } of result.milestones) {
      console.log(`${label} — ${clients.length} client(s)`);
      for (const client of clients) {
        console.log(
          `  • ${client.name} (${client.clientId}) — ${client.planTitle} — ends ${client.campaignEnd} ` +
            `(${client.daysRemaining} days)${client.wouldDeactivate ? " → would deactivate" : ""}`,
        );
      }
      console.log("");
    }
  } else {
    console.log("Live run finished — see the log above for what was sent.");
  }

  await sequelize.close();
  process.exit(0);
})().catch((error) => {
  console.error("Job failed:", error);
  process.exit(1);
});
