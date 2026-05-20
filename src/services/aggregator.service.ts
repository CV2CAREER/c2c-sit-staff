import { Aggregator } from "../models/v1/aggregator.model";
import { SlackService } from "./slack.service";
import { getServiceLogger } from "../utils/createLogger";
import { SlackChannel, SlackEventType, SlackNode, SlackProvider, SlackSeverity } from "../utils/enum";
import { getEnvironmentFromHost } from "../utils/slack-helpers";
import { uploadBase64ToStorage, generateUniqueFilename } from "../utils/fileUpload";
import { SLACK_USERS_TOKEN } from "../config/env";
import { Op } from "sequelize";
import { getConnectedRedis } from "../config/redis";
import axios from "axios";

const logger = getServiceLogger("aggregator-service");

export class AggregatorService {
  // Send Slack notification for aggregator actions
  private static async sendSlackNotification(
    action: string,
    aggregator: Aggregator | string,
    userEmail: string,
    host: string,
    changes?: any
  ) {
    try {
      const location = getEnvironmentFromHost(host);
      
      let message = `:gear: **Aggregator ${action}** :gear:\n`;
      message += `• Action performed by: ${userEmail}\n`;
      
      if (typeof aggregator === 'string') {
        message += `• Aggregator ID: ${aggregator}\n`;
      } else {
        message += `• Aggregator ID: ${aggregator.id}\n`;
        message += `• Aggregator Name: ${aggregator.name}\n`;
        message += `• Enabled: ${aggregator.isEnabled ? '✅ Yes' : '❌ No'}\n`;
      }

      if (changes && Object.keys(changes).length > 0) {
        const changeSummary = Object.entries(changes)
          .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
          .join("\n• ");
        message += `\n**Changes Made:**\n• ${changeSummary}\n`;
      }

      await SlackService.notify({
        location,
        host,
        node: SlackNode.MESSAGING,
        provider: SlackProvider.SYSTEM,
        severity: SlackSeverity.INFO,
        trigger: `Aggregator ${action}`,
        type: SlackEventType.ADMIN_ACTION,
        channel: SlackChannel.TOWN_CRIER,
        teamMentions: "CSM",
        body: message.trim(),
      });
      
      logger.info(`✅ Slack notification sent for aggregator ${action}`);
    } catch (err) {
      logger.error(`❌ Slack notification failed for aggregator ${action}: ${err}`);
    }
  }

  // ==============================================
  // SLACK QUEUE MANAGEMENT METHODS
  // ==============================================

  /**
   * Initialize Redis client
   */
  private static async getRedisClient() {
    return await getConnectedRedis();
  }

  /**
   * Lookup user by email using Slack API
   */
  static async lookupUserByEmail(email: string) {
    try {
      const response = await axios.post(
        "https://slack.com/api/users.lookupByEmail",
        new URLSearchParams({ email }),
        {
          headers: {
            Authorization: `Bearer ${SLACK_USERS_TOKEN}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }
      );

      if (response.data.ok) {
        const userId = response.data.user.id;
        return { email, userId };
      } else {
        logger.error("Slack API error:", response.data.error);
        throw new Error(`Slack API error: ${response.data.error}`);
      }
    } catch (error: any) {
      logger.error("Error during Slack API call:", error.message);
      throw new Error(`Slack API error: ${error.message}`);
    }
  }

  /**
   * Get queue data
   */
  static async getQueue(queue: string) {
    try {
      const rdClient = await this.getRedisClient();
      
      if (!rdClient) {
        logger.error("Redis connection not available");
        throw new Error("Redis connection not available");
      }

      const current = await rdClient.get(`${queue.toUpperCase()}_CURRENT_PROCESSING`);
      let result = await rdClient.lrange(queue, 0, -1);
      result = result.map((e) => e.split(":;")[0]);

      return { result, current };
    } catch (error: any) {
      logger.error("Error fetching queue data:", error);
      throw error;
    }
  }

  /**
   * Add user to queue
   */
  static async addToQueue(email: string, queue: string, userEmail?: string, host?: string) {
    try {
      const rdClient = await this.getRedisClient();
      
      if (!rdClient) {
        logger.error("Redis connection not available");
        throw new Error("Redis connection not available");
      }

      // Lookup user in Slack
      await this.lookupUserByEmail(email);

      const combinedValue = `${email}`;
      const values = await rdClient.lrange(queue, 0, -1);

      if (values.includes(combinedValue)) {
        return { saved: false, message: `${email} is already in the queue.` };
      }

      await rdClient.lpush(queue, combinedValue);
      const updatedQueue = await rdClient.lrange(queue, 0, -1);

      await rdClient.quit();

      // Send Slack notification
      if (userEmail && host) {
        setImmediate(async () => {
          try {
            const location = getEnvironmentFromHost(host);
            const message = `
:inbox_tray: **User Added to Slack Queue** :inbox_tray:
• Action performed by: ${userEmail}
• User added: ${email}
• Queue: ${queue}
• Queue length: ${updatedQueue.length}
            `;

            await SlackService.notify({
              location,
              host,
              node: SlackNode.MESSAGING,
              provider: SlackProvider.SYSTEM,
              severity: SlackSeverity.INFO,
              trigger: "Slack Queue Updated",
              type: SlackEventType.ADMIN_ACTION,
              channel: SlackChannel.TOWN_CRIER,
              teamMentions: "CSM",
              body: message.trim(),
            });
            
            logger.info(`✅ Slack notification sent for queue add`);
          } catch (err) {
            logger.error(`❌ Slack notification failed for queue add: ${err}`);
          }
        });
      }

      return { saved: true, queue: updatedQueue };
    } catch (error: any) {
      logger.error("Error adding to queue:", error);
      throw error;
    }
  }

  /**
   * Remove user from queue
   */
  static async removeFromQueue(email: string, queue: string, userEmail?: string, host?: string) {
    try {
      const rdClient = await this.getRedisClient();
      
      if (!rdClient) {
        logger.error("Redis connection not available");
        throw new Error("Redis connection not available");
      }

      const values = await rdClient.lrange(queue, 0, -1);

      if (!values.some((e) => e.includes(email))) {
        throw new Error("This element is not in the queue");
      }

      const value = values.find((e) => e.includes(email));
      if (typeof value === "undefined") {
        await rdClient.quit();
        throw new Error("This element is not in the queue");
      }

      const result = await rdClient.lrem(queue, 1, value);

      await rdClient.quit();

      // Send Slack notification
      if (userEmail && host) {
        setImmediate(async () => {
          try {
            const location = getEnvironmentFromHost(host);
            const message = `
:outbox_tray: **User Removed from Slack Queue** :outbox_tray:
• Action performed by: ${userEmail}
• User removed: ${email}
• Queue: ${queue}
• Remaining queue length: ${values.length - result}
            `;

            await SlackService.notify({
              location,
              host,
              node: SlackNode.MESSAGING,
              provider: SlackProvider.SYSTEM,
              severity: SlackSeverity.INFO,
              trigger: "Slack Queue Updated",
              type: SlackEventType.ADMIN_ACTION,
              channel: SlackChannel.TOWN_CRIER,
              teamMentions: "CSM",
              body: message.trim(),
            });
            
            logger.info(`✅ Slack notification sent for queue remove`);
          } catch (err) {
            logger.error(`❌ Slack notification failed for queue remove: ${err}`);
          }
        });
      }

      return { deleted: result };
    } catch (error: any) {
      logger.error("Error removing from queue:", error);
      throw error;
    }
  }


  // Create new aggregator
  static async createAggregator(data: any, userId?: string, userEmail?: string, host?: string) {
    try {
      // Handle base64 image upload if provided
      if (data.picture && typeof data.picture === 'object' && data.picture.base64) {
        const generatedFilename = generateUniqueFilename(data.picture.filename || "aggregator-image.png");
        const uploadResult = await uploadBase64ToStorage(data.picture.base64, generatedFilename, {
          folder: "aggregator-logos",
        });
        data.picture = uploadResult;
      }

      const aggregator = await Aggregator.create({
        ...data,
        updatedByUserId: userId
      });
      
      logger.info(`Aggregator created: ${aggregator.id}`);

      // Send Slack notification asynchronously
      if (userEmail && host) {
        setImmediate(async () => {
          await this.sendSlackNotification('Created', aggregator, userEmail, host);
        });
      }

      return aggregator;
    } catch (error: any) {
      logger.error(`Failed to create aggregator: ${error.message}`);
      throw error;
    }
  }

  // Get aggregator by ID
  static async getAggregatorById(id: string) {
    try {
      const aggregator = await Aggregator.findByPk(id, {
        attributes: ['id', 'name', 'picture', 'isEnabled', 'config', 'createdAt', 'updatedAt']
      });

      if (!aggregator) {
        throw new Error(`Aggregator with ID ${id} not found`);
      }

      logger.info(`Retrieved aggregator: ${id}`);
      return aggregator;
    } catch (error: any) {
      logger.error(`Failed to retrieve aggregator ${id}: ${error.message}`);
      throw error;
    }
  }

  // Get all aggregators with optional date filtering and active-only flag
  static async getAllAggregators(startDate?: string, endDate?: string, activeOnly?: boolean) {
    try {
      const where: any = {};

      if (activeOnly) {
        where.isStage = false;
      }

      if (startDate && endDate) {
        where.createdAt = {
          [Op.between]: [new Date(startDate), new Date(endDate)]
        };
      }

      const aggregators = await Aggregator.findAll({
        where,
        attributes: ['id', 'name', 'picture', 'isEnabled', 'config', 'createdAt', 'updatedAt'],
        order: [['createdAt', 'ASC']]
      });
      
      logger.info(`Retrieved ${aggregators.length} aggregators`);
      return aggregators;
    } catch (error: any) {
      logger.error(`Failed to retrieve aggregators: ${error.message}`);
      throw error;
    }
  }

  // Update aggregator
  static async updateAggregator(id: string, updates: any, userId?: string, userEmail?: string, host?: string) {
    try {
      const aggregator = await Aggregator.findByPk(id);

      if (!aggregator) {
        throw new Error(`Aggregator with ID ${id} not found`);
      }

      // Handle base64 image upload if provided
      if (updates.picture && typeof updates.picture === 'object' && updates.picture.base64) {
        const generatedFilename = generateUniqueFilename(updates.picture.filename || "aggregator-image.png");
        const uploadResult = await uploadBase64ToStorage(updates.picture.base64, generatedFilename, {
          folder: "aggregator-logos",
        });
        updates.picture = uploadResult;
      }

      await aggregator.update({
        ...updates,
        updatedByUserId: userId
      });

      const updatedAggregator = await Aggregator.findByPk(id);
      logger.info(`Aggregator updated: ${id}`);

      // Send Slack notification asynchronously
      if (userEmail && host) {
        setImmediate(async () => {
          await this.sendSlackNotification('Updated', aggregator, userEmail, host, updates);
        });
      }

      return updatedAggregator;
    } catch (error: any) {
      logger.error(`Failed to update aggregator ${id}: ${error.message}`);
      throw error;
    }
  }

  // Delete single aggregator
  static async deleteAggregator(id: string, userEmail?: string, host?: string) {
    try {
      const result = await Aggregator.destroy({
        where: { id }
      });

      if (!result) {
        throw new Error(`Aggregator with ID ${id} not found`);
      }

      logger.info(`Aggregator deleted: ${id}`);

      // Send Slack notification asynchronously
      if (userEmail && host) {
        setImmediate(async () => {
          await this.sendSlackNotification('Deleted', id, userEmail, host);
        });
      }

      return { deletedCount: result };
    } catch (error: any) {
      logger.error(`Failed to delete aggregator ${id}: ${error.message}`);
      throw error;
    }
  }

  // Delete multiple aggregators
  static async deleteMultipleAggregators(ids: string[], userEmail?: string, host?: string) {
    try {
      const result = await Aggregator.destroy({
        where: {
          id: {
            [Op.in]: ids
          }
        }
      });

      logger.info(`Deleted ${result} aggregators`);

      // Send Slack notification asynchronously
      if (userEmail && host) {
        setImmediate(async () => {
          try {
            const location = getEnvironmentFromHost(host);
            const message = `:gear: **Multiple Aggregators Deleted** :gear:\n• Action performed by: ${userEmail}\n• Number of aggregators deleted: ${result}\n• Aggregator IDs: ${ids.join(', ')}`;

            await SlackService.notify({
              location,
              host,
              node: SlackNode.MESSAGING,
              provider: SlackProvider.SYSTEM,
              severity: SlackSeverity.INFO,
              trigger: "Multiple Aggregators Deleted",
              type: SlackEventType.ADMIN_ACTION,
              channel: SlackChannel.VA,
              teamMentions: "CSM",
              body: message.trim(),
            });
            
            logger.info(`✅ Slack notification sent for multiple aggregator delete`);
          } catch (err) {
            logger.error(`❌ Slack notification failed: ${err}`);
          }
        });
      }

      return { deletedCount: result };
    } catch (error: any) {
      logger.error(`Failed to delete multiple aggregators: ${error.message}`);
      throw error;
    }
  }
}