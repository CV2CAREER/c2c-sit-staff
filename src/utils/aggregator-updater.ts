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
  global: new Set(["Linkedin", "Indeed", "JORA", "Escapecity"]),
  australia: new Set(["SEEK", "WorkforceAustralia", "AareerOne", "Adzuna", "MichaelPage", "Randstad"]),
  "united kingdom": new Set(["Monster", "Jobserve", "REED", "NHSJOBS", "CVLIBRARY"]),
  canada: new Set(["Adecco", "jobbank"]),
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
 * Normalise a country string for matching against AGGREGATOR_GROUPS keys.
 * Returns the matched group key, or the raw lower-cased input if no match.
 */
function resolveCountryGroup(rawCountry: string): string {
  const c = rawCountry.trim().toLowerCase();

  // Direct match against group keys
  for (const groupKey of Object.keys(AGGREGATOR_GROUPS)) {
    if (c === groupKey) return groupKey;
  }

  // Fuzzy / common-name matching
  if (c === "usa" || c === "united states" || c === "united states of america") return "global";
  if (c === "uk") return "united kingdom";
  if (c.includes("australia") || c === "aus") return "australia";

  // Default: return raw for pass-through logic
  return c;
}

/**
 * Auto-populates job board aggregator credentials for user profile.
 * Filters aggregators based on user's country location.
 * Falls back to the profile's country field if the user's country is not set.
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

  // Derive country from user record, falling back to profile
  let userCountry = (user.country || "").trim().toLowerCase();

  if (!userCountry) {
    // Try to get country from the user's primary profile
    const profile = await Profile.findOne({
      where: { userId, name: "primary" },
      raw: true,
    });
    if (profile?.country) {
      userCountry = profile.country.trim().toLowerCase();
      logger.info(`Fell back to profile.country for user ${userId}: "${userCountry}"`);
    }
  }

  const resolvedGroup = resolveCountryGroup(userCountry);

  logger.info(`[updateAggregator] User ${userId} — country="${user.country || "(empty)"}", resolved="${resolvedGroup}"`);

  const password = generatePassword(12);

  // Get or create user profile
  const profile = await findOrCreateProfile(userId.toString());
  if (!profile) {
    logger.error(`Failed to retrieve or create profile for user: ${userId}`);
    return [];
  }

  // Determine which aggregators to assign:
  //   - Always assign global aggregators (linkedin, indeed, jora, escapecity)
  //   - Assign country-specific aggregators if resolvedGroup matches
  const allCandidateNames = new Set<string>();
  for (const [, names] of Object.entries(AGGREGATOR_GROUPS)) {
    for (const name of names) allCandidateNames.add(name);
  }

  const aggregatorsToProcess = Array.from(allCandidateNames).filter((aggr) => {
    // Skip linkedin (handled separately)
    if (aggr === "linkedin") return false;

    // Always include global aggregators
    if (AGGREGATOR_GROUPS.global.has(aggr)) return true;

    // For country-specific groups
    for (const [groupKey, groupSet] of Object.entries(AGGREGATOR_GROUPS)) {
      if (groupKey === "global") continue;
      if (groupSet.has(aggr)) {
        // Include only if the resolved group matches
        return resolvedGroup === groupKey;
      }
    }

    // Fallback – include if not in any group
    return true;
  });

  if (aggregatorsToProcess.length === 0) {
    logger.info(`No aggregators applicable for user country: "${userCountry}" (resolved: "${resolvedGroup}")`);
    return [];
  }

  logger.info(`[updateAggregator] Candidates after country filter: [${aggregatorsToProcess.join(", ")}]`);

  // Pre-fetch all required aggregator documents
  const aggregators = await Aggregator.findAll({
    where: {
      name: aggregatorsToProcess
    },
    raw: true
  });

  logger.info(`[updateAggregator] Found ${aggregators.length} aggregator DB records out of ${aggregatorsToProcess.length} candidates`);

  if (aggregators.length === 0) {
    logger.warn(
      `No Aggregator records found in DB for names: [${aggregatorsToProcess.join(", ")}]. ` +
      `Please seed the aggregator_throttle_configs table.`
    );
    return [];
  }

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

    logger.info(`Added ${processedAggregators.length} new aggregators for user ${user.email}: [${processedAggregators.join(", ")}]`);
  } else {
    logger.info(`All applicable aggregators already exist on user's profile — nothing new to add.`);
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

  logger.info(`[updateAggregator] Complete for user ${userId}. Assigned: [${processedAggregators.join(", ")}]`);
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