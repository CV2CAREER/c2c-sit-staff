import { Op } from "sequelize";
import { getServiceLogger } from "../utils/createLogger";
import { Promotion, PromotionLength } from "../models/v1/promotion.model";
import { SlackService } from "./slack.service";
import { getEnvironmentFromHost } from "../utils/slack-helpers";
import {
  SlackChannel,
  SlackEventType,
  SlackNode,
  SlackProvider,
  SlackSeverity,
} from "../utils/enum";

const logger = getServiceLogger("promotion-service");

const toNonNegativeInteger = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }

  return Math.trunc(parsed);
};

const toOptionalDate = (value: unknown): Date | null => {
  if (value == null) {
    return null;
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return null;
};

const parseNumberOfFreePromo = (description: string | null | undefined) => {
  if (!description) {
    return 0;
  }

  try {
    const parsed = JSON.parse(description);
    if (typeof parsed?.numberOfFreePromo === "number") {
      return toNonNegativeInteger(parsed.numberOfFreePromo);
    }
  } catch {
    const numeric = Number(description);
    if (Number.isFinite(numeric) && numeric >= 0) {
      return Math.trunc(numeric);
    }
  }

  return 0;
};

const normalizePromotionLengthPayload = (data: any) => {
  const numberOfReferralsBeforePromo = toNonNegativeInteger(
    data?.numberOfReferralsBeforePromo ?? data?.duration,
  );
  const numberOfFreePromo = toNonNegativeInteger(data?.numberOfFreePromo);

  return {
    duration: numberOfReferralsBeforePromo,
    name:
      typeof data?.name === "string" && data.name.trim().length > 0
        ? data.name.trim()
        : "Promotion Length",
    description: JSON.stringify({ numberOfFreePromo }),
    isActive: typeof data?.isActive === "boolean" ? data.isActive : true,
  };
};

const serializePromotion = (promotion: Promotion | any) => {
  const source = typeof promotion?.toJSON === "function" ? promotion.toJSON() : promotion;
  const expiryDate = toOptionalDate(source?.expiryDate ?? source?.date);

  return {
    _id: source.id,
    id: source.id,
    name: source.name ?? "",
    country: source.country ?? "",
    expiryDate: expiryDate ? expiryDate.toISOString() : null,
    countryCode: source.countryCode ?? "",
    type: source.type ?? "CODE",
    promotionCode: source.promotionCode ?? "",
    isActive: Boolean(source.isActive),
    discountPercentage: source.discountPercentage ?? null,
    maxUsage: source.maxUsage ?? 0,
    usageCount: source.usageCount ?? 0,
    createdAt: source.createdAt,
    updatedAt: source.updatedAt,
  };
};

const serializePromotionLength = (promotionLength: PromotionLength | any) => {
  const source =
    typeof promotionLength?.toJSON === "function"
      ? promotionLength.toJSON()
      : promotionLength;

  return {
    _id: source.id,
    id: source.id,
    numberOfReferralsBeforePromo: toNonNegativeInteger(source.duration),
    numberOfFreePromo: parseNumberOfFreePromo(source.description),
    isActive: Boolean(source.isActive),
    createdAt: source.createdAt,
    updatedAt: source.updatedAt,
  };
};

export class PromotionService {
  static async getPromotionByCode(promotionCode: string) {
    try {
      const promotion = await Promotion.findOne({
        where: { promotionCode, isActive: true },
      });

      return promotion ? serializePromotion(promotion) : null;
    } catch (error: any) {
      logger.error(`Failed to get promotion: ${error.message}`);
      throw error;
    }
  }

  static async createPromotion(req: any, data: any, user: any) {
    const host = req.headers.host || req.headers.origin || "localhost";
    const location = getEnvironmentFromHost(host);
    const expiryDate = toOptionalDate(data?.expiryDate ?? data?.date);
    const normalizedType = data?.country ? "COUNTRY" : "CODE";
    const name =
      data?.name ||
      `${user.firstName}:${user.lastName}:${user.email}:${data.promotionCode}`;

    try {
      if (data.country) {
        const existing = await Promotion.findOne({ where: { country: data.country } });
        if (existing) throw new Error("Promotion already exists for this country");
      }

      if (!data.country && !data.promotionCode) {
        throw new Error("Promotion code is required");
      }

      const promotion = await Promotion.create({
        country: data.country ?? null,
        name,
        expiryDate,
        countryCode: data.countryCode ?? null,
        promotionCode: data.promotionCode ?? null,
        type: data.type || normalizedType,
        isActive: typeof data?.isActive === "boolean" ? data.isActive : true,
        discountPercentage: data.discountPercentage ?? null,
        maxUsage: data.maxUsage ?? 0,
        usageCount: data.usageCount ?? 0,
      });

      setImmediate(async () => {
        try {
          const message = `
New Promotion Created
• Created by: ${user.email}
• Promotion Code: ${promotion.promotionCode || "N/A"}
• Country: ${promotion.country || "Global"}
• Type: ${promotion.type}
• Active: ${promotion.isActive ? "Yes" : "No"}
          `;

          await SlackService.notify({
            location,
            host,
            node: SlackNode.MESSAGING,
            provider: SlackProvider.SYSTEM,
            severity: SlackSeverity.INFO,
            trigger: "Promotion Created",
            type: SlackEventType.ADMIN_ACTION,
            channel: SlackChannel.TOWN_CRIER,
            teamMentions: "CSM",
            body: message.trim(),
          });
        } catch (err) {
          logger.error(`Slack notification failed: ${err}`);
        }
      });

      return serializePromotion(promotion);
    } catch (error: any) {
      logger.error(`Failed to create promotion: ${error.message}`);
      throw error;
    }
  }

  static async getUserPromotions(user: any) {
    try {
      const pattern = `^${user.firstName}:${user.lastName}:${user.email}:`;

      const [activePromotion, allPromotions] = await Promise.all([
        Promotion.findOne({
          where: {
            isActive: true,
            name: { [Op.iLike]: `${pattern}%` },
          },
        }),
        Promotion.findAll({
          where: {
            name: { [Op.iLike]: `${pattern}%` },
          },
          order: [["createdAt", "DESC"]],
        }),
      ]);

      return {
        activePromotion: activePromotion ? serializePromotion(activePromotion) : null,
        totalPromsCount: allPromotions.length,
      };
    } catch (error: any) {
      logger.error(`Failed to get user promotions: ${error.message}`);
      throw error;
    }
  }

  static async getAllPromotions() {
    try {
      const promotions = await Promotion.findAll({
        order: [["createdAt", "DESC"]],
      });
      return promotions.map(serializePromotion);
    } catch (error: any) {
      logger.error(`Failed to get promotions: ${error.message}`);
      throw error;
    }
  }

  static async getPromotionLengths() {
    try {
      const promotionLengths = await PromotionLength.findAll({
        where: { isActive: true },
      });
      return promotionLengths.map(serializePromotionLength);
    } catch (error: any) {
      logger.error(`Failed to get promotion lengths: ${error.message}`);
      throw error;
    }
  }

  static async createPromotionLength(data: any) {
    try {
      const normalized = normalizePromotionLengthPayload(data);
      const created = await PromotionLength.create(normalized);
      return serializePromotionLength(created);
    } catch (error: any) {
      logger.error(`Failed to create promotion length: ${error.message}`);
      throw error;
    }
  }

  static async updatePromotionLength(id: string, data: any) {
    try {
      const promotionLength = await PromotionLength.findByPk(id);
      if (!promotionLength) throw new Error("Promotion length not found");

      const normalized = normalizePromotionLengthPayload({
        ...promotionLength.toJSON(),
        ...data,
      });

      await promotionLength.update(normalized);
      return serializePromotionLength(promotionLength);
    } catch (error: any) {
      logger.error(`Failed to update promotion length: ${error.message}`);
      throw error;
    }
  }

  static async deletePromotion(req: any, id: string) {
    const host = req.headers.host || req.headers.origin || "localhost";
    const location = getEnvironmentFromHost(host);
    try {
      const promotion = await Promotion.findByPk(id);
      if (!promotion) throw new Error("Promotion not found");

      const promotionData = promotion.toJSON();
      await promotion.destroy();

      setImmediate(async () => {
        try {
          const message = `
Promotion Deleted
• Promotion ID: ${id}
• Promotion Code: ${promotionData.promotionCode || "N/A"}
• Country: ${promotionData.country || "Global"}
          `;

          await SlackService.notify({
            location,
            host,
            node: SlackNode.MESSAGING,
            provider: SlackProvider.SYSTEM,
            severity: SlackSeverity.INFO,
            trigger: "Promotion Deleted",
            type: SlackEventType.ADMIN_ACTION,
            channel: SlackChannel.TOWN_CRIER,
            teamMentions: "CSM",
            body: message.trim(),
          });
        } catch (err) {
          logger.error(`Slack notification failed: ${err}`);
        }
      });

      return true;
    } catch (error: any) {
      logger.error(`Failed to delete promotion: ${error.message}`);
      throw error;
    }
  }
}
