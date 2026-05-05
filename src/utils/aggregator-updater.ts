import { getServiceLogger } from "./createLogger";
import { SlackChannel } from "./enum";
import { sendStandardSlackNotification } from "./slack-helpers";
import { SlackNode, SlackProvider, SlackSeverity, SlackEventType } from "./enum";
import { User } from "../models/v1/user.model";
import { Aggregator } from "../models/v1/aggregator.model";
import { Profile } from "../models/v1/profile.model";
import crypto from "crypto";

const logger = getServiceLogger("aggregator-updater");

/**
 * Generate secure random password
 */
const generatePassword = (length = 12): string => {
  return crypto
    .randomBytes(Math.ceil(length / 2))
    .toString("hex")
    .slice(0, length);
};

// Predefined aggregator groups for geographic filtering
const AGGREGATOR_GROUPS: Record<string, Set<string>> = {
  global: new Set(["linkedin", "indeed", "jora", "escapecity"]),
  australia: new Set(["seek", "workforceaustralia", "careerone", "adzuna", "michaelpage", "randstad"]),
  "united kingdom": new Set(["monster", "jobserve", "reed", "nhsjobs", "cvlibrary"]),
  canada: new Set(["adecco", "jobbank"]),
};

// Cache for aggregator name to ID mapping
const aggregatorCache = new Map<string, string>();

interface AggregatorUpdateResult {
  aggregatorId: string;
  username: string;
  generatedEmail: string;
  password: string;
}

/**
 * Auto-populates job board aggregator credentials for user profile
 * Filters aggregators based on user's country location
 * 
 * @param generatedEmail Generated email alias for user
 * @param username Preferred username for job boards
 * @param userId MongoDB User ID
 * @param baseURL Request host/base URL for environment detection
 * @param isStage If true, skips actual processing
 * @returns List of processed aggregator names
 */
const updateAggregator = async (
  generatedEmail: string,
  username: string,
  userId: string,
  baseURL: string,
  isStage = false
): Promise<string[]> => {
  if (!generatedEmail) {
    logger.warn("No generated email provided for aggregator update");
    return [];
  }

  const user = await User.findByPk(userId, { raw: true });
  if (!user) {
    logger.error(`User not found for ID: ${userId}`);
    return [];
  }

  const userCountry = user.country?.toLowerCase() || "";
  const password = generatePassword(12);

  // Get or create user profile
  const profile = await findOrCreateProfile(userId.toString());
  if (!profile) {
    logger.error(`Failed to retrieve or create profile for user: ${userId}`);
    return [];
  }

  // Filter aggregators based on user country
  const aggregatorsToProcess = [
    "seek", "adzuna", "careerone", "jora", "reed",
    "michaelpage", "randstad", "jobbank", "adecco",
  ].filter(aggr => {
    if (aggr === "linkedin") return false;
    if (AGGREGATOR_GROUPS.australia.has(aggr) && userCountry !== "australia") return false;
    if (AGGREGATOR_GROUPS["united kingdom"].has(aggr) && userCountry !== "united kingdom") return false;
    if (AGGREGATOR_GROUPS.canada.has(aggr) && userCountry !== "canada") return false;
    return true;
  });

  if (aggregatorsToProcess.length === 0) {
    logger.info(`No aggregators applicable for user country: ${userCountry}`);
    return [];
  }

  // Pre-fetch all required aggregator documents
  const aggregators = await Aggregator.findAll({
    where: {
      name: aggregatorsToProcess
    },
    raw: true
  });

  // Build cache for quick lookups
  aggregators.forEach((agg: any) => {
    aggregatorCache.set(agg.name.toLowerCase(), agg.id);
  });

  // Get existing aggregators from profile
  const existingAggregatorIds = new Set(
    profile.aggregators?.map((ag: any) => ag.aggregatorId).filter(Boolean) || []
  );

  // Prepare new aggregator entries
  const newAggregators: AggregatorUpdateResult[] = aggregators
    .filter((agg: any) => !existingAggregatorIds.has(agg.id))
    .map((agg: any) => ({
      aggregatorId: agg.id,
      username,
      generatedEmail,
      password
    }));

  let processedAggregators: string[] = [];

  // Perform bulk update if there are new aggregators
  if (newAggregators.length > 0) {
    const existingAggregators = profile.aggregators || [];
    const updatedAggregators = [...existingAggregators, ...newAggregators];
    
    await Profile.update(
      { aggregators: updatedAggregators },
      { where: { id: profile.id } }
    );

    processedAggregators = newAggregators.map(agg =>
      aggregators.find((a: any) => a.id === agg.aggregatorId)?.name
    ).filter(Boolean) as string[];

    logger.info(`Added ${processedAggregators.length} new aggregators for user ${user.email}`);
  }

  // Send non-blocking Slack notification
  if (processedAggregators.length > 0 && !isStage) {
    setImmediate(async () => {
      await sendStandardSlackNotification({
        host: baseURL,
        node: SlackNode.USER_MANAGEMENT,
        provider: SlackProvider.SYSTEM,
        severity: SlackSeverity.INFO,
        type: SlackEventType.SYSTEM_NOTIFICATION,
        channel: SlackChannel.CRY_WOLF,
        body: `\`${user.firstName} ${user.lastName}\`'s Jobsites auto-populated for: ${processedAggregators.join(', ')}. \nKindly proceed to create accounts on respective job boards.`,
      });
    });
  }

  return processedAggregators;
};

/**
 * Optimized profile find or create implementation
 * Automatically creates profile if it doesn't exist for user
 * 
 * @param userId User MongoDB ID
 * @returns Populated user profile document
 */
async function findOrCreateProfile(userId: string) {
  const user = await User.findByPk(userId);
  if (!user) throw new Error("User not found");

  // Look up by userId + name regardless of whether profileId FK is wired up
  const [profile, created] = await Profile.findOrCreate({
    where: { userId, name: 'primary' },
    defaults: { userId, name: 'primary' } as any,
  });

  // Keep the FK in sync if it was missing
  if (created || !user.profileId) {
    await user.update({ profileId: profile.id });
  }

  return profile;
}

export default updateAggregator;