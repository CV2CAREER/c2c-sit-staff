import { Op } from "sequelize";
import { Feature, SubscriptionTier } from "../models/v1/feature.model";
import { SlackService } from "./slack.service";
import { getServiceLogger } from "../utils/createLogger";
import {
  SlackChannel,
  SlackEventType,
  SlackNode,
  SlackProvider,
  SlackSeverity,
} from "../utils/enum";
import { getEnvironmentFromHost } from "../utils/slack-helpers";
import ErrorHandler from "../utils/errorHandler";

const logger = getServiceLogger("feature-service");

type FeatureQueryOptions = {
  locationId?: string;
  tier?: string;
  isActive?: boolean;
};

type FeatureUpdateInput = Partial<{
  title: string;
  tier: SubscriptionTier;
  price: number;
  jobApplications: number;
  cvResumeRequests: number;
  screeningPrep: number;
  interviewPrep: number;
  resumeDevelopment: number;
  validityPeriod: string;
  pauseOptionMonths: number;
  subscriptionBreak: string;
  profileLimit: number;
  isTopUp: boolean;
  description: string | null;
  extra: string | null;
  isActive: boolean;
  locationIds: string[];
}>;

const FEATURE_UPDATE_KEYS = new Set<keyof FeatureUpdateInput>([
  "title",
  "tier",
  "price",
  "jobApplications",
  "cvResumeRequests",
  "screeningPrep",
  "interviewPrep",
  "resumeDevelopment",
  "validityPeriod",
  "pauseOptionMonths",
  "subscriptionBreak",
  "profileLimit",
  "isTopUp",
  "description",
  "extra",
  "isActive",
  "locationIds",
]);

const INTEGER_FIELDS: Array<keyof FeatureUpdateInput> = [
  "jobApplications",
  "cvResumeRequests",
  "screeningPrep",
  "interviewPrep",
  "resumeDevelopment",
  "pauseOptionMonths",
  "profileLimit",
];

const DECIMAL_FIELDS: Array<keyof FeatureUpdateInput> = ["price"];
const BOOLEAN_FIELDS: Array<keyof FeatureUpdateInput> = ["isTopUp", "isActive"];
const NULLABLE_STRING_FIELDS: Array<keyof FeatureUpdateInput> = [
  "description",
  "extra",
];

const serializeFeature = (feature: Feature) => ({
  id: feature.id,
  _id: feature.id,
  title: feature.title,
  tier: feature.tier,
  price: Number(feature.price),
  jobApplications: feature.jobApplications,
  cvResumeRequests: feature.cvResumeRequests,
  screeningPrep: feature.screeningPrep ?? 0,
  interviewPrep: feature.interviewPrep ?? 0,
  resumeDevelopment: feature.resumeDevelopment ?? 0,
  validityPeriod: feature.validityPeriod,
  pauseOptionMonths: feature.pauseOptionMonths,
  subscriptionBreak: feature.subscriptionBreak,
  profileLimit: feature.profileLimit,
  isTopUp: feature.isTopUp,
  description: feature.description ?? null,
  extra: feature.extra ?? null,
  isActive: feature.isActive,
  locationIds: feature.locationIds || [],
  createdAt: feature.createdAt,
  updatedAt: feature.updatedAt,
});

const selectPreferredLocationFeatures = (
  features: Feature[],
  locationId?: string,
) => {
  if (!locationId) {
    return features;
  }

  const preferredByTitle = new Map<string, Feature>();

  for (const feature of features) {
    const titleKey = feature.title.trim().toLowerCase();
    const existing = preferredByTitle.get(titleKey);

    if (!existing) {
      preferredByTitle.set(titleKey, feature);
      continue;
    }

    const currentExactMatch =
      Array.isArray(feature.locationIds) &&
      feature.locationIds.length === 1 &&
      feature.locationIds[0] === locationId;
    const existingExactMatch =
      Array.isArray(existing.locationIds) &&
      existing.locationIds.length === 1 &&
      existing.locationIds[0] === locationId;

    if (currentExactMatch && !existingExactMatch) {
      preferredByTitle.set(titleKey, feature);
      continue;
    }

    if (currentExactMatch === existingExactMatch) {
      const currentStamp = feature.updatedAt?.getTime?.() ?? feature.createdAt?.getTime?.() ?? 0;
      const existingStamp = existing.updatedAt?.getTime?.() ?? existing.createdAt?.getTime?.() ?? 0;
      if (currentStamp > existingStamp) {
        preferredByTitle.set(titleKey, feature);
      }
    }
  }

  return [...preferredByTitle.values()];
};

const toOptionalBoolean = (value: unknown): boolean | undefined => {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === "true") {
    return true;
  }
  if (normalized === "false") {
    return false;
  }

  return undefined;
};

const coerceNumber = (
  value: unknown,
  fieldName: string,
  integerOnly = false,
) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    if (integerOnly && !Number.isInteger(value)) {
      throw new ErrorHandler(`${fieldName} must be an integer.`, 400);
    }

    return value;
  }

  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ErrorHandler(`${fieldName} must be a valid number.`, 400);
  }

  const parsed = integerOnly ? Number.parseInt(value, 10) : Number(value);
  if (!Number.isFinite(parsed)) {
    throw new ErrorHandler(`${fieldName} must be a valid number.`, 400);
  }

  if (integerOnly && !Number.isInteger(parsed)) {
    throw new ErrorHandler(`${fieldName} must be an integer.`, 400);
  }

  return parsed;
};

const normalizeTier = (value: unknown): SubscriptionTier => {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ErrorHandler("tier must be a valid subscription tier.", 400);
  }

  const normalized = value.trim().toLowerCase();
  const tier = Object.values(SubscriptionTier).find(
    (candidate) => candidate.toLowerCase() === normalized,
  );

  if (!tier) {
    throw new ErrorHandler("tier must be a valid subscription tier.", 400);
  }

  return tier;
};

const sanitizeUpdates = (
  updates: Record<string, unknown>,
): FeatureUpdateInput => {
  const sanitized: FeatureUpdateInput = {};

  for (const [key, value] of Object.entries(updates)) {
    if (!FEATURE_UPDATE_KEYS.has(key as keyof FeatureUpdateInput)) {
      continue;
    }

    const typedKey = key as keyof FeatureUpdateInput;

    if (typedKey === "tier") {
      sanitized.tier = normalizeTier(value);
      continue;
    }

    if (typedKey === "locationIds") {
      if (
        !Array.isArray(value) ||
        value.some(
          (item) => typeof item !== "string" || item.trim().length === 0,
        )
      ) {
        throw new ErrorHandler(
          "locationIds must be an array of non-empty strings.",
          400,
        );
      }

      sanitized.locationIds = value.map((item) => item.trim());
      continue;
    }

    if (INTEGER_FIELDS.includes(typedKey)) {
      sanitized[typedKey] = coerceNumber(value, key, true) as never;
      continue;
    }

    if (DECIMAL_FIELDS.includes(typedKey)) {
      sanitized[typedKey] = coerceNumber(value, key, false) as never;
      continue;
    }

    if (BOOLEAN_FIELDS.includes(typedKey)) {
      const parsed = toOptionalBoolean(value);
      if (typeof parsed !== "boolean") {
        throw new ErrorHandler(`${key} must be a boolean.`, 400);
      }

      sanitized[typedKey] = parsed as never;
      continue;
    }

    if (NULLABLE_STRING_FIELDS.includes(typedKey)) {
      if (value == null || value === "") {
        sanitized[typedKey] = null as never;
        continue;
      }

      if (typeof value !== "string") {
        throw new ErrorHandler(`${key} must be a string.`, 400);
      }

      sanitized[typedKey] = value.trim() as never;
      continue;
    }

    if (typeof value !== "string" || value.trim().length === 0) {
      throw new ErrorHandler(`${key} must be a non-empty string.`, 400);
    }

    sanitized[typedKey] = value.trim() as never;
  }

  if (Object.keys(sanitized).length === 0) {
    throw new ErrorHandler("No valid feature update fields were provided.", 400);
  }

  return sanitized;
};

export class FeatureService {
  static async getAllFeatures(options: FeatureQueryOptions = {}) {
    try {
      const where: Record<string, unknown> = {};

      if (options.locationId) {
        where.locationIds = {
          [Op.contains]: [options.locationId],
        };
      }

      if (options.tier) {
        where.tier = normalizeTier(options.tier);
      }

      if (typeof options.isActive === "boolean") {
        where.isActive = options.isActive;
      }

      const features = await Feature.findAll({
        where,
        order: [["createdAt", "DESC"]],
      });

      const selectedFeatures = selectPreferredLocationFeatures(
        features,
        options.locationId,
      );

      logger.info(`Retrieved ${selectedFeatures.length} features from database`);
      return selectedFeatures.map(serializeFeature);
    } catch (error: any) {
      logger.error(`Failed to retrieve features: ${error.message}`);
      throw error;
    }
  }

  static async getFeatureById(id: string) {
    try {
      const feature = await Feature.findByPk(id);

      if (!feature) {
        logger.warn(`Feature with ID ${id} not found`);
        throw new ErrorHandler(`Feature with ID ${id} not found`, 404);
      }

      logger.info(`Retrieved feature ${id}`);
      return serializeFeature(feature);
    } catch (error: any) {
      logger.error(`Failed to retrieve feature ${id}: ${error.message}`);
      throw error;
    }
  }

  static async updateFeature(
    req: any,
    id: string,
    updates: Record<string, unknown>,
    userId: string | null,
    userEmail: string,
  ) {
    const host = req.headers.host || req.headers.origin || "localhost";
    const location = getEnvironmentFromHost(host);
    const sanitizedUpdates = sanitizeUpdates(updates);

    const feature = await Feature.findByPk(id);

    if (!feature) {
      throw new ErrorHandler(`Feature with ID ${id} not found`, 404);
    }

    await feature.update(sanitizedUpdates);

    const updatedFeature = await Feature.findByPk(id);

    setImmediate(async () => {
      try {
        const updateSummary = Object.entries(sanitizedUpdates)
          .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
          .join("\n- ");

        const message = `
Feature Updated
- Feature ID: ${id}
- Updated by: ${userEmail}
- Changes made:
- ${updateSummary}

Feature Details:
- Title: ${feature.title}
- Tier: ${feature.tier}
- Price: $${feature.price}
- Job Applications: ${feature.jobApplications}
- CV/Resume Requests: ${feature.cvResumeRequests}
- Validity Period: ${feature.validityPeriod}
        `;

        await SlackService.notify({
          location,
          host,
          node: SlackNode.MESSAGING,
          provider: SlackProvider.SYSTEM,
          severity: SlackSeverity.INFO,
          trigger: "Feature Settings Updated",
          type: SlackEventType.ADMIN_ACTION,
          channel: SlackChannel.TOWN_CRIER,
          teamMentions: "CSM",
          body: message.trim(),
        });

        logger.info(`Slack notification sent for feature ${id} update`);
      } catch (err) {
        logger.error(`Slack notification failed for feature ${id}: ${err}`);
      }
    });

    logger.info(
      `Feature ${id} updated successfully by ${userEmail}${userId ? ` (${userId})` : ""}`,
    );

    return updatedFeature ? serializeFeature(updatedFeature) : null;
  }
}
