import { QueryTypes } from "sequelize";
import { getServiceLogger } from "../utils/createLogger";
import { getSequelize } from "../utils/sequelize";
import { Role, SignUpAs } from "../utils/enum";

const logger = getServiceLogger("backfill-sign-up-as");

/**
 * Backfills `signUpAs` for every existing user where it's still null, using
 * isAmbassador/role as a best-effort stand-in for what they would have
 * picked at signup:
 *
 *   - isAmbassador = true            -> Ambassador
 *   - role = "partner"               -> Channel_Partner
 *   - role in ("guest", "client")    -> Job_Seeker
 *   - anything else                  -> Employee
 *
 * Runs as a single UPDATE (no per-row loop) so it never triggers the User
 * model's @AfterFind PII-decryption hook — that hook fires one KMS call per
 * row per field and reliably times out over a table this size.
 * npx tsx src/scripts/backfill-sign-up-as.ts
 */
export const backfillSignUpAs = async (): Promise<void> => {
  const sequelize = getSequelize();

  const replacements = {
    ambassador: SignUpAs.AMBASSADOR,
    channelPartner: SignUpAs.CHANNEL_PARTNER,
    jobSeeker: SignUpAs.JOB_SEEKER,
    employee: SignUpAs.EMPLOYEE,
    partnerRole: Role.PARTNER,
    guestRole: Role.GUEST,
    clientRole: Role.CLIENT,
  };

  const caseExpression = `
    CASE
      WHEN "isAmbassador" = true THEN :ambassador
      WHEN role = :partnerRole THEN :channelPartner
      WHEN role IN (:guestRole, :clientRole) THEN :jobSeeker
      ELSE :employee
    END
  `;

  const preview = await sequelize.query<{ derived: SignUpAs; count: string }>(
    `
      SELECT ${caseExpression} AS derived, COUNT(*) AS count
        FROM users
       WHERE "signUpAs" IS NULL
       GROUP BY derived
    `,
    { type: QueryTypes.SELECT, replacements },
  );

  if (preview.length === 0) {
    logger.info("Sign-up-as backfill: no users with a null signUpAs — nothing to do");
    return;
  }

  logger.info(
    `Sign-up-as backfill: about to update ${preview
      .map((row) => `${row.derived}: ${row.count}`)
      .join(", ")}`,
  );

  const [affectedRows] = await sequelize.query(
    `
      UPDATE users
         SET "signUpAs" = (${caseExpression})::"enum_users_signUpAs"
       WHERE "signUpAs" IS NULL
    `,
    { type: QueryTypes.UPDATE, replacements },
  );

  logger.info(`Sign-up-as backfill complete — ${affectedRows ?? 0} user(s) updated`);
};

// Standalone entrypoint — run directly with:
//   npx tsx src/scripts/backfill-sign-up-as.ts
if (require.main === module) {
  require("dotenv").config();

  (async () => {
    const sequelize = getSequelize();
    try {
      await sequelize.authenticate();
      logger.info("Connected to database");
      await backfillSignUpAs();
      await sequelize.close();
      process.exit(0);
    } catch (error) {
      logger.error("Sign-up-as backfill failed:", error);
      try {
        await sequelize.close();
      } catch {
        // ignore
      }
      process.exit(1);
    }
  })();
}
