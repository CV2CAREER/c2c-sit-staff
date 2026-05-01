import { validate as isUuid } from "uuid";
import { getServiceLogger } from "../../utils/createLogger";
import ErrorHandler from "../../utils/errorHandler";
import { User } from "../../models/v1/user.model";
import { Profile } from "../../models/v1/profile.model";
import { Aggregator } from "../../models/v1/aggregator.model";
import { updateTitlesV2, runTestClientSamples } from "../../utils/aggregator-title-updater";
import updateAggregator from "../../utils/aggregator-updater";
import createEmailAlias from "../../utils/email-alias";

const logger = getServiceLogger("jobsite-service");

class JobsiteService {
  /**
   * Retrieve all aggregator (jobsite) links on a user's primary profile,
   * with full Aggregator details populated.
   */
  async getUserJobsites(userId: string) {
    if (!isUuid(userId)) throw new ErrorHandler("Invalid user ID.", 400);

    const user = await User.findByPk(userId);
    if (!user) throw new ErrorHandler("User not found.", 404);

    const profile = await Profile.findOne({ where: { userId, name: "primary" } });
    if (!profile) return { aggregators: [] };

    const links: any[] = profile.aggregators || [];

    const populated = await Promise.all(
      links.map(async (link) => {
        const agg = await Aggregator.findByPk(link.aggregatorId, {
          attributes: ["id", "name", "picture", "isEnabled", "config"],
        });
        return { ...link, aggregator: agg ? agg.toJSON() : null };
      })
    );

    return { aggregators: populated };
  }

  /**
   * Auto-assign jobsites to a user based on their country.
   * Generates an email alias, then delegates to updateAggregator which
   * filters aggregators by AGGREGATOR_GROUPS and populates profile.aggregators.
   */
  async assignUserJobsites(userId: string, host: string) {
    if (!isUuid(userId)) throw new ErrorHandler("Invalid user ID.", 400);

    const user = await User.findByPk(userId);
    if (!user) throw new ErrorHandler("User not found.", 404);

    const aliasResult = await createEmailAlias(host, user.email);
    const generatedEmail = aliasResult.data || user.email;

    const processedAggregators = await updateAggregator(
      generatedEmail,
      generatedEmail,
      userId,
      host
    );

    logger.info(`Jobsites assigned for user ${userId}: ${processedAggregators.join(", ")}`);
    return {
      message: "Jobsite and aggregator successfully updated",
      generatedEmail,
      assignedJobsites: processedAggregators,
    };
  }

  /**
   * Update specific fields on an existing aggregator link in the user's profile.
   * Prevents reassigning the aggregatorId.
   */
  async updateUserJobsite(userId: string, aggId: string, updates: Record<string, any>) {
    if (!isUuid(userId)) throw new ErrorHandler("Invalid user ID.", 400);
    if (!aggId) throw new ErrorHandler("Aggregator ID is required.", 400);

    const user = await User.findByPk(userId);
    if (!user) throw new ErrorHandler("User not found.", 404);

    const profile = await Profile.findOne({ where: { userId, name: "primary" } });
    if (!profile) throw new ErrorHandler("Profile not found.", 404);

    const existing: any[] = profile.aggregators || [];
    const idx = existing.findIndex((l) => l.aggregatorId === aggId);
    if (idx === -1) throw new ErrorHandler("Jobsite not found on user profile.", 404);

    const { aggregatorId: _ignored, ...safeUpdates } = updates;

    const updatedLinks = existing.map((l, i) =>
      i === idx ? { ...l, ...safeUpdates } : l
    );

    await profile.update({ aggregators: updatedLinks });

    logger.info(`Jobsite updated for user ${userId}, aggId: ${aggId}`);
    return { aggregators: updatedLinks };
  }

  /**
   * Trigger title sync and client sample queue for a specific jobsite.
   */
  async triggerJobsite(userId: string, aggId: string, host: string) {
    if (!isUuid(userId)) throw new ErrorHandler("Invalid user ID.", 400);
    if (!aggId) throw new ErrorHandler("Aggregator ID is required.", 400);

    const user = await User.findByPk(userId);
    if (!user) throw new ErrorHandler("User not found.", 404);

    const profile = await Profile.findOne({ where: { userId, name: "primary" } });
    if (!profile) throw new ErrorHandler("Profile not found.", 404);

    const link = (profile.aggregators || []).find((l: any) => l.aggregatorId === aggId);
    if (!link) throw new ErrorHandler("Jobsite not found on user profile.", 404);

    const aggregator = await Aggregator.findByPk(aggId, { attributes: ["id", "name"] });
    if (!aggregator) throw new ErrorHandler("Aggregator not found.", 404);

    await updateTitlesV2(userId, aggregator.name);
    await runTestClientSamples(userId, (link as any).generatedEmail, aggregator.name, host);

    logger.info(`Trigger completed for user ${userId}, aggregator: ${aggregator.name}`);
    return { message: "Triggered successfully" };
  }

  /**
   * Remove one or more aggregator links from a user's profile by aggregatorId(s).
   */
  async deleteUserJobsites(userId: string, aggId?: string, aggIds?: string[]) {
    if (!isUuid(userId)) throw new ErrorHandler("Invalid user ID.", 400);

    const targetIds = new Set<string>();
    if (aggId) targetIds.add(aggId);
    aggIds?.forEach((id) => targetIds.add(id));
    if (targetIds.size === 0) throw new ErrorHandler("Provide aggId or aggIds to delete.", 400);

    const user = await User.findByPk(userId);
    if (!user) throw new ErrorHandler("User not found.", 404);

    const profile = await Profile.findOne({ where: { userId, name: "primary" } });
    if (!profile) throw new ErrorHandler("Profile not found.", 404);

    const existing: any[] = profile.aggregators || [];
    const updatedLinks = existing.filter((l) => !targetIds.has(l.aggregatorId));

    await profile.update({ aggregators: updatedLinks });

    logger.info(`Deleted ${targetIds.size} jobsite(s) for user ${userId}`);
    return { aggregators: updatedLinks };
  }
}

export const jobsiteService = new JobsiteService();
