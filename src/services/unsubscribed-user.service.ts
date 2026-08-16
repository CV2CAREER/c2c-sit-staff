import { UnsubscribedUser } from "../models/v1/unsubscribed-user.model";
import { User } from "../models/v1/user.model";
import { getServiceLogger } from "../utils/createLogger";
import { SlackService } from "./slack.service";
import { getEnvironmentFromHost } from "../utils/slack-helpers";
import { SlackChannel, SlackEventType, SlackNode, SlackProvider, SlackSeverity } from "../utils/enum";
import { getConnectedRedis } from "../config/redis";

const logger = getServiceLogger("unsubscribed-user-service");

export class UnsubscribedUserService {
  private static async getRedisClient() {
    return await getConnectedRedis();
  }

  /**
   * Get all unsubscribed users with user details (firstName, lastName)
   */
  static async getAllUnsubscribedUsers() {
    try {
      const records = await UnsubscribedUser.findAll({
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'firstName', 'lastName'],
          }
        ],
        order: [['createdAt', 'DESC']],
        raw: true,
        nest: true,
      });

      // Flatten user details into each record for easy frontend consumption
      return records.map((record: any) => ({
        id: record.id,
        userId: record.userId,
        reason: record.reason,
        date: record.date,
        time: record.time,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
        firstName: record.user?.firstName || 'Unknown',
        lastName: record.user?.lastName || 'User',
        email: record.user?.email || '',
      }));
    } catch (error: any) {
      logger.error(`Failed to retrieve unsubscribed users: ${error.message}`);
      throw error;
    }
  }

  /**
   * Remove user from unsubscribed list
   */
  static async removeUnsubscribedUser(userId: string, email: string) {
    try {
      // Remove from database
      const deletedCount = await UnsubscribedUser.destroy({
        where: { userId }
      });

      // Remove from Redis
      const redisClient = await this.getRedisClient();
      if (redisClient) {
        await redisClient.srem('UNSUBSCRIBED_LIST', email);
      }

      logger.info(`✅ User ${userId} removed from unsubscribed list`);

      return {
        success: true,
        deleted: deletedCount > 0
      };
    } catch (error: any) {
      logger.error(`Failed to remove unsubscribed user: ${error.message}`);
      throw error;
    }
  }

  /**
   * Unsubscribe a user by ID (admin can unsubscribe any user)
   */
  static async unsubscribeUser(userId: string, reason: string, host?: string) {
    try {
      // Get user details
      const user = await User.findByPk(userId, {
        attributes: ['id', 'firstName']
      });

      if (!user) {
        throw new Error("User not found");
      }

      // Check if user already unsubscribed
      let unsubscribeRecord = await UnsubscribedUser.findOne({
        where: { userId }
      });

      if (!unsubscribeRecord) {
        const currentDate = new Date();
        const formattedDate = currentDate.toISOString().split('T')[0];
        const formattedTime = currentDate.toLocaleTimeString();

        // Create new unsubscribe record
        unsubscribeRecord = await UnsubscribedUser.create({
          userId,
          reason,
          date: formattedDate,
          time: formattedTime,
        });
      } else if (!unsubscribeRecord.reason && reason) {
        // Update reason if not already set
        await unsubscribeRecord.update({ reason });
      }

      // Add to Redis unsubscribed list
      const redisClient = await this.getRedisClient();
      
      let isUnsubscribed = 0;
      
      if (redisClient) {
        // Check if already in Redis
        isUnsubscribed = await redisClient.sismember('UNSUBSCRIBED_LIST', user.email);
        
        if (!isUnsubscribed) {
          await redisClient.sadd('UNSUBSCRIBED_LIST', user.email);
        }
      }

      // Send Slack notification
      if (host) {
        setImmediate(async () => {
          try {
            const location = getEnvironmentFromHost(host);
            const message = `
✅ **User Unsubscribed** ✅
• User: ${user.firstName}
• Email: ${user.email}
• Reason: ${reason || 'No reason provided'}
            `;

            await SlackService.notify({
              location,
              host,
              node: SlackNode.MESSAGING,
              provider: SlackProvider.SYSTEM,
              severity: SlackSeverity.INFO,
              trigger: "User Unsubscribed",
              type: SlackEventType.ADMIN_ACTION,
              channel: SlackChannel.TOWN_CRIER,
              body: message.trim(),
            });
            
            logger.info(`✅ Slack notification sent for user unsubscribe`);
          } catch (err) {
            logger.error(`❌ Slack notification failed for unsubscribe: ${err}`);
          }
        });
      }

      return {
        success: true,
        alreadyUnsubscribed: isUnsubscribed === 1,
        record: unsubscribeRecord
      };
    } catch (error: any) {
      logger.error(`Failed to unsubscribe user: ${error.message}`);
      throw error;
    }
  }
}