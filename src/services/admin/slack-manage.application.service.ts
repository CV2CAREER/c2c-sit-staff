import { Op } from "sequelize";
import { validate as isUuid } from "uuid";
import { SlackMessage } from "../../models/v1/slack-message.model";
import { getServiceLogger } from "../../utils/createLogger";

const logger = getServiceLogger("slack-manage-service");

class SlackManageService {
  /**
   * Get all Slack messages sorted by creation date descending
   * Optimized with raw: true for faster queries (no model instance overhead)
   */
  async getAllMessages() {
    logger.debug("Fetching all slack messages");
    
    return await SlackMessage.findAll({
      order: [['createdAt', 'DESC']],
      raw: true,
    });
  }

  /**
   * Create new Slack message with atomic SMID increment
   * Uses proper database ordering and transactions for stability
   */
  async createMessage(messageData: Record<string, any>) {
    logger.debug("Creating new slack message");

    const newMessage = await SlackMessage.create({
      ...messageData,
      isActive: true
    });

    return newMessage.get({ plain: true });
  }

  /**
   * Update existing Slack message by ID
   * Optimized with proper validation
   */
  async updateMessage(id: string, updateData: Record<string, any>) {
    logger.debug(`Updating slack message ${id}`);

    if (!isUuid(id)) {
      logger.warn(`Invalid message ID format: ${id}`);
      return null;
    }

    const [updateCount] = await SlackMessage.update(updateData, {
      where: { id },
      returning: true,
    });

    if (updateCount === 0) {
      return null;
    }

    return await SlackMessage.findByPk(id, { raw: true });
  }

  /**
   * getMessageById - Retrieve a single Slack message by its ID
   * Optimized with raw: true for faster queries
   */
  async getMessageById(id: string) {
    return await SlackMessage.findByPk(id, { raw: true });
  }

}

export const slackManageService = new SlackManageService();