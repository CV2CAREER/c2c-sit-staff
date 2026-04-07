import { Op } from "sequelize";
import { getServiceLogger } from "../utils/createLogger";
import { Promotion, PromotionLength } from "../models/v1/promotion.model";
import { User } from "../models/v1/user.model";
import { SlackService } from "./slack.service";
import { getEnvironmentFromHost } from "../utils/slack-helpers";
import { SlackChannel, SlackEventType, SlackNode, SlackProvider, SlackSeverity } from "../utils/enum";

const logger = getServiceLogger("promotion-service");

export class PromotionService {
  /**
   * Get promotion by code (NO AUTH)
   */
  static async getPromotionByCode(promotionCode: string) {
    try {
      return await Promotion.findOne({
        where: { promotionCode, isActive: true }
      });
    } catch (error: any) {
      logger.error(`❌ Failed to get promotion: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create new promotion
   */
  static async createPromotion(req: any, data: any, user: any) {
    const host = req.headers.host || req.headers.origin || "localhost";
    const location = getEnvironmentFromHost(host);
    try {
      if (data.country) {
        const existing = await Promotion.findOne({ where: { country: data.country } });
        if (existing) throw new Error("Promotion already exists for this country");
      }

      if (!data.country && !data.promotionCode) {
        throw new Error("Promotion code is required");
      }

      const type = data.country ? 'COUNTRY' : 'CODE';
      const name = data.name || `${user.firstName}:${user.lastName}:${user.email}:${data.promotionCode}`;

      const promotion = await Promotion.create({
        ...data,
        name,
        type: data.type || type
      });

      // Send Slack Notification
      setImmediate(async () => {
        try {
          const message = `
🎉 **New Promotion Created** 🎉
• Created by: ${user.email}
• Promotion Code: ${promotion.promotionCode || 'N/A'}
• Country: ${promotion.country || 'Global'}
• Type: ${promotion.type}
• Active: ${promotion.isActive ? '✅ Yes' : '❌ No'}
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
          logger.error(`❌ Slack notification failed: ${err}`);
        }
      });

      return promotion;
    } catch (error: any) {
      logger.error(`❌ Failed to create promotion: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get user promotions
   */
  static async getUserPromotions(user: any) {
    try {
      const pattern = `^${user.firstName}:${user.lastName}:${user.email}:`;
      
      const [activePromotion, allPromotions] = await Promise.all([
        Promotion.findOne({
          where: {
            isActive: true,
            name: { [Op.iLike]: `${pattern}%` }
          }
        }),
        Promotion.findAll({
          where: {
            name: { [Op.iLike]: `${pattern}%` }
          },
          order: [['createdAt', 'DESC']]
        })
      ]);

      return {
        activePromotion,
        totalPromsCount: allPromotions.length
      };
    } catch (error: any) {
      logger.error(`❌ Failed to get user promotions: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get all promotions
   */
  static async getAllPromotions() {
    try {
      return await Promotion.findAll({
        order: [['createdAt', 'DESC']]
      });
    } catch (error: any) {
      logger.error(`❌ Failed to get promotions: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get promotion lengths
   */
  static async getPromotionLengths() {
    try {
      return await PromotionLength.findAll({
        where: { isActive: true }
      });
    } catch (error: any) {
      logger.error(`❌ Failed to get promotion lengths: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create promotion length
   */
  static async createPromotionLength(data: any) {
    try {
      return await PromotionLength.create(data);
    } catch (error: any) {
      logger.error(`❌ Failed to create promotion length: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update promotion length
   */
  static async updatePromotionLength(id: string, data: any) {
    try {
      const promotionLength = await PromotionLength.findByPk(id);
      if (!promotionLength) throw new Error("Promotion length not found");
      
      await promotionLength.update(data);
      return promotionLength;
    } catch (error: any) {
      logger.error(`❌ Failed to update promotion length: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete promotion
   */
  static async deletePromotion(req: any, id: string) {
    const host = req.headers.host || req.headers.origin || "localhost";
    const location = getEnvironmentFromHost(host);
    try {
      const promotion = await Promotion.findByPk(id);
      if (!promotion) throw new Error("Promotion not found");
      
      const promotionData = promotion.toJSON();
      await promotion.destroy();

      // Send Slack Notification
      setImmediate(async () => {
        try {
          const message = `
🗑️ **Promotion Deleted** 🗑️
• Promotion ID: ${id}
• Promotion Code: ${promotionData.promotionCode || 'N/A'}
• Country: ${promotionData.country || 'Global'}
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
          logger.error(`❌ Slack notification failed: ${err}`);
        }
      });

      return true;
    } catch (error: any) {
      logger.error(`❌ Failed to delete promotion: ${error.message}`);
      throw error;
    }
  }
}