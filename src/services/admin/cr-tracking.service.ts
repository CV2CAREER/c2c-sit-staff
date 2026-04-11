import { getServiceLogger } from "../../utils/createLogger";
import { CRTracking } from "../../models/v1/cr-tracking.model";
import { CROwner } from "../../models/v1/cr/owner.model";
import { SlackService } from "../slack.service";
import { getEnvironmentFromHost } from "../../utils/slack-helpers";
import { SlackChannel, SlackEventType, SlackNode, SlackProvider, SlackSeverity } from "../../utils/enum";
import { uploadBase64ToStorage, generateUniqueFilename } from "../../utils/fileUpload";
import { CRTrackingHistory } from "../../models/v1/cr-tracking-history.model";

const logger = getServiceLogger("cr-tracking-service");

/**
 * CR Tracking Service
 * Optimized for speed and stability
 */
export class CRTrackingService {

  /**
   * Send Slack notification
   */
  private static async notifySlack(host: string, action: string, message: string, user: any) {
    setImmediate(async () => {
      try {
        const location = getEnvironmentFromHost(host);

        await SlackService.notify({
          location,
          host,
          node: SlackNode.MESSAGING,
          provider: SlackProvider.SYSTEM,
          severity: SlackSeverity.INFO,
          trigger: `CR Tracking ${action}`,
          type: SlackEventType.ADMIN_ACTION,
          channel: SlackChannel.CHANGE_REQUESTS,
          teamMentions: "CSM",
          body: message.trim(),
        });
      } catch (err) {
        logger.error(`❌ Slack notification failed: ${err}`);
      }
    });
  }

  /**
   * Get all CR Tracking entries with filters
   * Performance optimized
   */
  static async getAll(filters: { isDeleted?: boolean } = {}) {
    try {
      const whereClause: any = {};

      if (typeof filters.isDeleted === 'boolean') {
        whereClause.isDeleted = filters.isDeleted;
      }

      const entries = await CRTracking.findAll({
        where: whereClause,
        order: [['createdAt', 'DESC']],
        raw: true,
        benchmark: true
      });

      logger.info(`✅ Retrieved ${entries.length} CR tracking entries`);
      return entries;
    } catch (error: any) {
      logger.error(`❌ Failed to get CR tracking entries: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get CR Tracking History logs with pagination
   * Optimized PostgreSQL implementation with proper indexing
   */
  static async getHistory(filters: { id?: string; customId?: string; page?: number } = {}) {
    try {
      const page = filters.page || 1;
      const limit = 50;
      const offset = (page - 1) * limit;

      // Build query
      const whereClause: any = {};
      if (filters.id) whereClause.crId = filters.id;

      // Execute parallel queries for maximum performance
      const [logs, total] = await Promise.all([
        CRTrackingHistory.findAll({
          where: whereClause,
          include: [
            { association: "performer", attributes: ["id", "email", "firstName", "lastName"] }
          ],
          order: [['createdAt', 'DESC']],
          offset,
          limit,
          raw: true,
          nest: true
        }),
        CRTrackingHistory.count({ where: whereClause })
      ]);

      const totalPages = Math.ceil(total / limit);

      logger.info(`✅ Retrieved ${logs.length} CR tracking history logs for page ${page}`);

      return {
        data: logs,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
        totalCrHistoryLog: total,
        totalPages
      };
    } catch (error: any) {
      logger.error(`❌ Failed to get CR tracking history: ${error.message}`);
      throw error;
    }
  }

  /**
   * Notify NIL for CR Tracking
   * Optimized: all notifications run asynchronously in background
   */
  static async notifyNIL(req: any, crId: string, user: any) {
    try {
      const host = req.headers.host || req.headers.origin || "localhost";

      // Fetch CR entry
      const cr = await CRTracking.findByPk(crId);
      if (!cr) throw new Error("CR Tracking entry not found");

      // Fetch CR Owner
      let crOwner = await CROwner.findByPk(cr.ownerId, { raw: true });
      if (!crOwner && cr.nilId) {
        crOwner = await CROwner.findByPk(cr.nilId, { raw: true });
      }

      if (!crOwner) throw new Error("CR Owner not found");
      if (!crOwner.slackId) throw new Error("CR Owner has no Slack ID configured");

      // Fetch nominated developer
      let nominatedDev : any = null;
      if (cr.nominatedDeveloperId) {
        nominatedDev = await CROwner.findByPk(cr.nominatedDeveloperId, { raw: true });
      }

      // Update CR status
      await cr.update({ isNILNotified: true });

      // Create history log ASYNCHRONOUSLY
      setImmediate(async () => {
        try {
          await CRTrackingHistory.create({
            crId: cr.id,
            action: "NIL_NOTIFY",
            nilNotifiedBy: user.id,
            performedBy: user.id,
            previousState: cr.previous('isNILNotified') ? { isNILNotified: cr.previous('isNILNotified') } : null,
            newState: { isNILNotified: true }
          });
        } catch (err) {
          logger.warn(`Could not create history log: ${err}`);
        }
      });

      // Send Slack notification ASYNCHRONOUSLY (non-blocking)
      setImmediate(async () => {
        try {
          const ownerTag = crOwner.slackId ? `<@${crOwner.slackId}>` : crOwner.name;
          const devTag = nominatedDev?.slackId ? `<@${nominatedDev.slackId}>` : nominatedDev?.name || 'Unassigned';

          const message = `
✅ **Success: CR ${cr.changeRequestId || cr.id} identified and stakeholders tagged for action.**

⚠️ **Immediate Impact:** Process for this Change Request is pending approval/review from prioritized stakeholders.

📋 **Next Step:** Stakeholders should navigate to the CR Tracking dashboard and provide required information.

---
**Details:**
• Owner: ${ownerTag}
• Assignee: ${devTag}
• CR Name: ${cr.name}
• Priority Level: ${cr.level || 1}
• Status: ${cr.status || 'Pending'}
          `;

          await SlackService.notify({
            location: getEnvironmentFromHost(host),
            host,
            node: SlackNode.MESSAGING,
            provider: SlackProvider.SYSTEM,
            severity: SlackSeverity.INFO,
            trigger: "CR NIL Notification",
            type: SlackEventType.ADMIN_ACTION,
            channel: SlackChannel.CHANGE_REQUESTS,
            body: message.trim(),
          });
        } catch (err) {
          logger.error(`❌ Slack notification failed: ${err}`);
        }
      });

      logger.info(`✅ NIL Notification sent for CR ${crId} by ${user.email}`);
      return true;
    } catch (error: any) {
      logger.error(`❌ Failed to send NIL notification: ${error.message}`);
      throw error;
    }
  }

  /**
   * Soft delete CR Tracking entry (move to recycle bin)
   */
  static async softDelete(req: any, id: string, user: any) {
    try {
      const host = req.headers.host || req.headers.origin || "localhost";
      const entry = await CRTracking.findByPk(id);

      if (!entry) {
        throw new Error("CR Tracking entry not found");
      }

      if (entry.isDeleted) {
        throw new Error("CR Tracking entry is already deleted");
      }

      const previousState = entry.toJSON();
      
      await entry.update({
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: user.id
      });

      // Create history log ASYNCHRONOUSLY
      setImmediate(async () => {
        try {
          await CRTrackingHistory.create({
            crId: id,
            action: "SOFT_DELETE",
            previousState,
            newState: entry.toJSON(),
            performedBy: user.id
          });
        } catch (err) {
          logger.warn(`Could not create history log: ${err}`);
        }
      });

      const message = `
🗑️ *CR Tracking MOVED TO RECYCLE BIN* 🗑️
• Action by: ${user.email}
• Entry ID: ${id}
• CR Name: ${entry.name}
      `;
      await this.notifySlack(host, "Soft Deleted", message, user);

      logger.info(`✅ CR tracking ${id} soft deleted by ${user.email}`);
      return true;
    } catch (error: any) {
      logger.error(`❌ Failed to soft delete CR tracking: ${error.message}`);
      throw error;
    }
  }

  /**
   * Restore CR Tracking entry from recycle bin
   */
  static async restore(req: any, id: string, user: any) {
    try {
      const host = req.headers.host || req.headers.origin || "localhost";
      const entry = await CRTracking.findOne({
        where: { id, isDeleted: true }
      });

      if (!entry) {
        throw new Error("Deleted CR Tracking entry not found");
      }

      const previousState = entry.toJSON();
      
      await entry.update({
        isDeleted: false,
        deletedAt: null,
        deletedBy: null
      });

      // Create history log ASYNCHRONOUSLY
      setImmediate(async () => {
        try {
          await CRTrackingHistory.create({
            crId: id,
            action: "RESTORE",
            previousState,
            newState: entry.toJSON(),
            performedBy: user.id
          });
        } catch (err) {
          logger.warn(`Could not create history log: ${err}`);
        }
      });

      const message = `
🔄 *CR Tracking RESTORED* 🔄
• Action by: ${user.email}
• Entry ID: ${id}
• CR Name: ${entry.name}
      `;
      await this.notifySlack(host, "Restored", message, user);

      logger.info(`✅ CR tracking ${id} restored by ${user.email}`);
      return entry;
    } catch (error: any) {
      logger.error(`❌ Failed to restore CR tracking: ${error.message}`);
      throw error;
    }
  }

  /**
   * Permanently delete CR Tracking entry
   */
  static async permanentDelete(req: any, id: string, user: any) {
    try {
      const host = req.headers.host || req.headers.origin || "localhost";
      const entry = await CRTracking.findByPk(id);

      if (!entry) {
        throw new Error("CR Tracking entry not found");
      }

      const previousState = entry.toJSON();
      
      await entry.destroy();

      // Create history log ASYNCHRONOUSLY
      setImmediate(async () => {
        try {
          await CRTrackingHistory.create({
            crId: id,
            action: "PERMANENT_DELETE",
            previousState,
            performedBy: user.id
          });
        } catch (err) {
          logger.warn(`Could not create history log: ${err}`);
        }
      });

      const message = `
⚠️ *CR Tracking PERMANENTLY DELETED* ⚠️
• Action by: ${user.email}
• Entry ID: ${id}
• CR Name: ${entry.name}
      `;
      await this.notifySlack(host, "Permanently Deleted", message, user);

      logger.info(`✅ CR tracking ${id} permanently deleted by ${user.email}`);
      return true;
    } catch (error: any) {
      logger.error(`❌ Failed to permanently delete CR tracking: ${error.message}`);
      throw error;
    }
  }

  /**
   * Downgrade CR Tracking level
   */
  static async downgrade(req: any, id: string, user: any) {
    try {
      const host = req.headers.host || req.headers.origin || "localhost";
      const entry = await CRTracking.findByPk(id);

      if (!entry) {
        throw new Error("CR Tracking entry not found");
      }

      const currentLevel = entry.level ?? 1;
      const newLevel = Math.max(1, currentLevel - 1);
      const previousState = entry.toJSON();
      
      await entry.update({ level: newLevel });

      // Create history log ASYNCHRONOUSLY
      setImmediate(async () => {
        try {
          await CRTrackingHistory.create({
            crId: id,
            action: "DOWNGRADE",
            previousState,
            newState: entry.toJSON(),
            performedBy: user.id
          });
        } catch (err) {
          logger.warn(`Could not create history log: ${err}`);
        }
      });

      const message = `
⬇️ *CR Tracking DOWNGRADED* ⬇️
• Action by: ${user.email}
• Entry ID: ${id}
• CR Name: ${entry.name}
• New Level: ${newLevel}
      `;
      await this.notifySlack(host, "Downgraded", message, user);

      logger.info(`✅ CR tracking ${id} downgraded to level ${newLevel} by ${user.email}`);
      return entry;
    } catch (error: any) {
      logger.error(`❌ Failed to downgrade CR tracking: ${error.message}`);
      throw error;
    }
  }

  /**
   * Upgrade CR Tracking level
   */
  static async upgrade(req: any, id: string, user: any) {
    try {
      const host = req.headers.host || req.headers.origin || "localhost";
      const entry = await CRTracking.findByPk(id);

      if (!entry) {
        throw new Error("CR Tracking entry not found");
      }

      const currentLevel = entry.level ?? 1;
      const newLevel = Math.min(5, currentLevel + 1);
      const previousState = entry.toJSON();
      
      await entry.update({ level: newLevel });

      // Create history log ASYNCHRONOUSLY
      setImmediate(async () => {
        try {
          await CRTrackingHistory.create({
            crId: id,
            action: "UPGRADE",
            previousState,
            newState: entry.toJSON(),
            performedBy: user.id
          });
        } catch (err) {
          logger.warn(`Could not create history log: ${err}`);
        }
      });

      const message = `
⬆️ *CR Tracking UPGRADED* ⬆️
• Action by: ${user.email}
• Entry ID: ${id}
• CR Name: ${entry.name}
• New Level: ${newLevel}
      `;
      await this.notifySlack(host, "Upgraded", message, user);

      logger.info(`✅ CR tracking ${id} upgraded to level ${newLevel} by ${user.email}`);
      return entry;
    } catch (error: any) {
      logger.error(`❌ Failed to upgrade CR tracking: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create new CR Tracking entry
   */
  static async create(req: any, data: any, user: any) {
    try {
      const host = req.headers.host || req.headers.origin || "localhost";

      // Auto upload base64 images to Firebase Storage
      const uploadImageToFirebase = async (imageData: string) => {
        if (imageData && imageData.startsWith('data:image/')) {
          const filename = generateUniqueFilename("cr-image.png");
          const uploadResult = await uploadBase64ToStorage(imageData, filename, {
            folder: "cr-images"
          });
          return uploadResult.url;
        }
        return imageData;
      };

      // Process currentStateImageURLs array
      if (data.currentStateImageURLs) {
        if (!Array.isArray(data.currentStateImageURLs)) {
          data.currentStateImageURLs = [data.currentStateImageURLs];
        }
        data.currentStateImageURLs = await Promise.all(
          data.currentStateImageURLs.map((img: string) => uploadImageToFirebase(img))
        );
      }

      // Process futureStateImageURLs array
      if (data.futureStateImageURLs) {
        if (!Array.isArray(data.futureStateImageURLs)) {
          data.futureStateImageURLs = [data.futureStateImageURLs];
        }
        data.futureStateImageURLs = await Promise.all(
          data.futureStateImageURLs.map((img: string) => uploadImageToFirebase(img))
        );
      }

      const entry = await CRTracking.create({
        ...data,
        createdBy: user.id,
        updatedBy: user.id,
        isDeleted: false,
        level: data.level ?? 1
      });

      // Create history log ASYNCHRONOUSLY (non blocking)
      setImmediate(async () => {
        try {
          await CRTrackingHistory.create({
            crId: entry.id,
            action: "CREATE",
            newState: entry.toJSON(),
            performedBy: user.id
          });
        } catch (err) {
          logger.warn(`Could not create history log: ${err}`);
        }
      });

      // Fetch developer Slack ID for mentions
      let developerSlackTag = '';
      if (entry.nominatedDeveloperId) {
        try {
          const developer = await CROwner.findByPk(entry.nominatedDeveloperId, { raw: true });
          if (developer?.slackId) {
            developerSlackTag = `<@${developer.slackId}>`;
          }
        } catch (err) {
          logger.warn(`Could not fetch developer Slack ID: ${err}`);
        }
      }

      const message = `
*CR Tracking CREATED*
• Created by: ${user.email}
• Entry ID: ${entry.id}
• CR Name: ${entry.name}
• Level: ${entry.level ?? 1}
${entry.nominatedDeveloperId ? `• Nominated Developer: ${developerSlackTag || entry.nominatedDeveloperId}` : ''}
${entry.nominatedDeveloperEmail ? `• Developer Email: ${entry.nominatedDeveloperEmail}` : ''}
      `;
      await this.notifySlack(host, "Created", message, user);

      logger.info(`✅ CR tracking ${entry.id} created by ${user.email}`);
      return entry.toJSON();
    } catch (error: any) {
      logger.error(`❌ Failed to create CR tracking: ${error.message}`);
      throw error;
    }
  }
}