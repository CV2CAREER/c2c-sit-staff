import cron from "node-cron";
import { getServiceLogger } from "../../utils/createLogger";
import { User } from "../../models/v1/user.model";
import { Plan } from "../../models/v1/plan.model";
import { UnsubscribedUser } from "../../models/v1/unsubscribed-user.model";
import { Op } from "sequelize";

const logger = getServiceLogger("subscription-check-cron-job");

/**
 * Cron job to automatically unsubscribe users without active subscriptions
 */
export function createSubscriptionCheckJob() {
  // Run daily at midnight
  const job = cron.schedule("0 0 * * *", async () => {
    try {
      logger.info("🔍 Running subscription check job...");

      // Find users who:
      // 1. Have NO active subscription allocation
      // 2. Are NOT already in unsubscribed_users table

      // First get all users with active subscriptions from Plan model
      const activeSubscriptionUserIds = await Plan.findAll({
        where: {
          paymentStatus: "completed",
          hasExpired: false,
          deletedAt: null,
          expiresAt: {
            [Op.or]: {
              [Op.eq]: null,
              [Op.gt]: new Date()
            }
          }
        },
        attributes: ['userId'],
        raw: true
      });

      const activeUserIds = activeSubscriptionUserIds.map(item => item.userId);

      // Get users who are not already unsubscribed
      const alreadyUnsubscribedUserIds = await UnsubscribedUser.findAll({
        attributes: ['userId'],
        raw: true
      });

      const unsubscribedUserIds = alreadyUnsubscribedUserIds.map(item => item.userId);

      // Find all users not in active list and not already unsubscribed
      const usersToUnsubscribe = await User.findAll({
        where: {
          id: {
            [Op.notIn]: [...activeUserIds, ...unsubscribedUserIds]
          },
          isEmailVerified: true
        },
        attributes: ['id', 'firstName']
      });

      if (usersToUnsubscribe.length === 0) {
        logger.info("✅ No users to unsubscribe. Job completed.");
        return;
      }

      logger.info(`⚠️ Found ${usersToUnsubscribe.length} users without active subscriptions to unsubscribe`);

      const currentDate = new Date();
      const formattedDate = currentDate.toISOString().split('T')[0];
      const formattedTime = currentDate.toLocaleTimeString();

      // Bulk insert into unsubscribed_users
      const unsubscribeRecords = usersToUnsubscribe.map(user => ({
        userId: user.id,
        reason: "Automatically unsubscribed - no active subscription",
        date: formattedDate,
        time: formattedTime,
      }));

      await UnsubscribedUser.bulkCreate(unsubscribeRecords, {
        ignoreDuplicates: true
      });

      logger.info(`✅ Successfully added ${usersToUnsubscribe.length} users to unsubscribed list`);

    } catch (error: any) {
      logger.error(`❌ Subscription check job failed: ${error.message}`);
    }
  });

  return job;
}