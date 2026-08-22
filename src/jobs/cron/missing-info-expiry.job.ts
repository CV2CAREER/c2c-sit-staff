import cron from "node-cron";
import { Op } from "sequelize";
import { MissingInfoRequest } from "../../models/v1/missing-info-request.model";
import { getServiceLogger } from "../../utils/createLogger";

const logger = getServiceLogger("missing-info-expiry-job");

// Business-confirmed value — default 14 days until a number is provided.
// Overridable via env so it never ships on a hard-coded guess.
const EXPIRY_DAYS = Number(process.env.MISSING_INFO_EXPIRY_DAYS ?? 14);

export function createMissingInfoExpiryJob() {
  const job = cron.schedule("0 2 * * *", async () => {
    try {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - EXPIRY_DAYS);

      const stale = await MissingInfoRequest.findAll({
        where: {
          status: { [Op.in]: ["pending", "viewed", "in_progress"] },
          createdAt: { [Op.lt]: cutoff },
        },
        attributes: ["id"],
      });

      if (stale.length === 0) {
        logger.info("Missing info expiry: no stale requests to expire");
        return;
      }

      const ids = stale.map((r) => r.id);
      const [affectedCount] = await MissingInfoRequest.update(
        { status: "expired" },
        { where: { id: ids } },
      );

      logger.info(`Missing info expiry: expired ${affectedCount} stale request(s)`);
    } catch (err: any) {
      logger.error(`Missing info expiry job failed: ${err?.message}`);
    }
  });

  return job;
}
