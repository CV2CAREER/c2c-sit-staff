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
  private static buildCRName(payload: Record<string, any>) {
    const candidates = [payload?.name, payload?.description, payload?.changeType, payload?.crType];

    for (const candidate of candidates) {
      if (typeof candidate === "string" && candidate.trim()) {
        return candidate.trim();
      }
    }

    return `CR ${new Date().toISOString()}`;
  }

  private static normalizeCreatePayload(data: any) {
    const payload: any = { ...(data || {}) };

    if (payload.crStatus && !payload.status) {
      payload.status = payload.crStatus;
    }
    delete payload.crStatus;
    delete payload._id;

    if (payload.nil && !payload.NIL) {
      payload.NIL = payload.nil;
    }
    delete payload.nil;

    if (payload.change && !payload.changeType) {
      payload.changeType = payload.change;
    }
    delete payload.change;

    if (payload.futureStateImageUrls && !payload.futureStateImageURLs) {
      payload.futureStateImageURLs = payload.futureStateImageUrls;
    }
    delete payload.futureStateImageUrls;

    if (payload.currentStateImageUrls && !payload.currentStateImageURLs) {
      payload.currentStateImageURLs = payload.currentStateImageUrls;
    }
    delete payload.currentStateImageUrls;

    payload.name = this.buildCRName(payload);

    return payload;
  }

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
        include: [
          { association: "owner", attributes: ["id", "name", "email", "slackId"] },
          { association: "nil", attributes: ["id", "name", "email", "slackId"] },
          { association: "nominatedDeveloper", attributes: ["id", "name", "email", "slackId"] },
          { association: "creator", attributes: ["id", "firstName", "lastName", "email"] },
        ],
        order: [['createdAt', 'DESC']],
        benchmark: true
      });

      logger.info(`✅ Retrieved ${entries.length} CR tracking entries`);
      const mapped = entries.map((entry: any) => {
        const plain = entry?.toJSON ? entry.toJSON() : entry;
        const createdDate = plain.createdAt ? new Date(plain.createdAt).getTime() : Date.now();
        const days = Math.floor((Date.now() - createdDate) / (24 * 60 * 60 * 1000));

        return {
          ...plain,
          _id: plain.id,
          id: plain.changeRequestId || plain.id,
          name: plain.name || plain.description || "",
          cardName: plain.name || plain.description || "",
          crStatus: plain.status,
          owner: plain.owner?.name || plain.owner || "",
          ownerEmail: plain.ownerEmail || plain.owner?.email || "",
          NIL: plain.nil?.name || plain.NIL || "",
          nilEmail: plain.nilEmail || plain.nil?.email || "",
          nominatedDeveloper: plain.nominatedDeveloper?.name || plain.nominatedDeveloper || "",
          nominatedDeveloperEmail:
            plain.nominatedDeveloperEmail || plain.nominatedDeveloper?.email || "",
          impactedProvider: plain.impactedProvider || [],
          impactedProdiver: plain.impactedProvider || [],
          createdBy:
            `${plain.creator?.firstName || ""} ${plain.creator?.lastName || ""}`.trim() ||
            plain.createdBy,
          counter: days > 0 ? days : 0,
        };
      });

      logger.info(`Retrieved ${mapped.length} CR tracking entries`);
      return mapped;
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
            { association: "performer", attributes: ["id", "firstName", "lastName", "email"] }
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
   * Update CR Tracking entry
   */
  static async update(req: any, id: string, updates: any, user: any) {
    try {
      const entry = await CRTracking.findByPk(id);
      if (!entry) {
        throw new Error("CR Tracking entry not found");
      }

      const previousState = entry.toJSON();
      const payload = updates?.newRow && typeof updates.newRow === "object" ? updates.newRow : updates;
      const normalized: any = { ...(payload || {}) };

      delete normalized._id;
      delete normalized.id;
      delete normalized.newRow;
      delete normalized.trackerId;
      delete normalized.counter;
      delete normalized.createdBy;
      delete normalized.creator;
      delete normalized.cardName;
      delete normalized.createdAt;
      delete normalized.updatedAt;

      if (normalized.crStatus && !normalized.status) {
        normalized.status = normalized.crStatus;
      }
      delete normalized.crStatus;

      if (typeof normalized.impactedPersona === "string") {
        normalized.impactedPersona = normalized.impactedPersona
          .split(";")
          .map((v: string) => v.trim())
          .filter(Boolean);
      }
      if (typeof normalized.impactedProvider === "string") {
        normalized.impactedProvider = normalized.impactedProvider
          .split(";")
          .map((v: string) => v.trim())
          .filter(Boolean);
      }
      if (typeof normalized.impactedNode === "string") {
        normalized.impactedNode = normalized.impactedNode
          .split(";")
          .map((v: string) => v.trim())
          .filter(Boolean);
      }
      if (typeof normalized.currentStateImageURLs === "string") {
        normalized.currentStateImageURLs = normalized.currentStateImageURLs
          .split(",")
          .map((v: string) => v.trim())
          .filter(Boolean);
      }
      if (typeof normalized.futureStateImageURLs === "string") {
        normalized.futureStateImageURLs = normalized.futureStateImageURLs
          .split(",")
          .map((v: string) => v.trim())
          .filter(Boolean);
      }

      if (normalized.owner && !normalized.ownerId) {
        const owner = await CROwner.findOne({ where: { name: normalized.owner }, raw: true });
        if (owner) {
          normalized.ownerId = owner.id;
          normalized.ownerEmail = normalized.ownerEmail || owner.email;
        }
      }
      if (normalized.NIL && !normalized.nilId) {
        const nil = await CROwner.findOne({ where: { name: normalized.NIL }, raw: true });
        if (nil) {
          normalized.nilId = nil.id;
          normalized.nilEmail = normalized.nilEmail || nil.email;
        }
      }
      if (normalized.nominatedDeveloper && !normalized.nominatedDeveloperId) {
        const developer = await CROwner.findOne({
          where: { name: normalized.nominatedDeveloper },
          raw: true,
        });
        if (developer) {
          normalized.nominatedDeveloperId = developer.id;
          normalized.nominatedDeveloperEmail =
            normalized.nominatedDeveloperEmail || developer.email;
        }
      }

      if (normalized.note && typeof normalized.note === "string" && normalized.note.trim()) {
        const existingTrail = Array.isArray(entry.noteTrail) ? entry.noteTrail : [];
        normalized.noteTrail = [
          ...existingTrail,
          {
            note: normalized.note.trim(),
            addedBy: user?.email || user?.id || "system",
            addedAt: new Date(),
          },
        ];
      }

      normalized.updatedBy = user?.id;
      await entry.update(normalized);

      setImmediate(async () => {
        try {
          await CRTrackingHistory.create({
            crId: id,
            action: "UPDATE",
            previousState,
            newState: entry.toJSON(),
            performedBy: user?.id,
          });
        } catch (historyError) {
          logger.warn(`Could not create history log: ${historyError}`);
        }
      });

      if (payload?.notify) {
        try {
          await this.notifyNIL(req, id, user);
        } catch (notifyError) {
          logger.warn(`Unable to trigger NIL notification after update: ${notifyError}`);
        }
      }

      return entry.toJSON();
    } catch (error: any) {
      logger.error(`Failed to update CR tracking: ${error.message}`);
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
      const payload = this.normalizeCreatePayload(data);

      if (typeof payload.impactedPersona === "string") {
        payload.impactedPersona = payload.impactedPersona
          .split(";")
          .map((v: string) => v.trim())
          .filter(Boolean);
      }
      if (typeof payload.impactedProvider === "string") {
        payload.impactedProvider = payload.impactedProvider
          .split(";")
          .map((v: string) => v.trim())
          .filter(Boolean);
      }
      if (typeof payload.impactedNode === "string") {
        payload.impactedNode = payload.impactedNode
          .split(";")
          .map((v: string) => v.trim())
          .filter(Boolean);
      }
      if (typeof payload.currentStateImageURLs === "string") {
        payload.currentStateImageURLs = payload.currentStateImageURLs
          .split(",")
          .map((v: string) => v.trim())
          .filter(Boolean);
      }
      if (typeof payload.futureStateImageURLs === "string") {
        payload.futureStateImageURLs = payload.futureStateImageURLs
          .split(",")
          .map((v: string) => v.trim())
          .filter(Boolean);
      }

      if (payload.owner && !payload.ownerId) {
        const owner = await CROwner.findOne({ where: { name: payload.owner }, raw: true });
        if (owner) {
          payload.ownerId = owner.id;
          payload.ownerEmail = payload.ownerEmail || owner.email;
        }
      }
      if (payload.NIL && !payload.nilId) {
        const nil = await CROwner.findOne({ where: { name: payload.NIL }, raw: true });
        if (nil) {
          payload.nilId = nil.id;
          payload.nilEmail = payload.nilEmail || nil.email;
        }
      }
      if (payload.nominatedDeveloper && !payload.nominatedDeveloperId) {
        const developer = await CROwner.findOne({
          where: { name: payload.nominatedDeveloper },
          raw: true,
        });
        if (developer) {
          payload.nominatedDeveloperId = developer.id;
          payload.nominatedDeveloperEmail =
            payload.nominatedDeveloperEmail || developer.email;
        }
      }

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
      if (payload.currentStateImageURLs) {
        if (!Array.isArray(payload.currentStateImageURLs)) {
          payload.currentStateImageURLs = [payload.currentStateImageURLs];
        }
        payload.currentStateImageURLs = await Promise.all(
          payload.currentStateImageURLs.map((img: string) => uploadImageToFirebase(img))
        );
      }

      // Process futureStateImageURLs array
      if (payload.futureStateImageURLs) {
        if (!Array.isArray(payload.futureStateImageURLs)) {
          payload.futureStateImageURLs = [payload.futureStateImageURLs];
        }
        payload.futureStateImageURLs = await Promise.all(
          payload.futureStateImageURLs.map((img: string) => uploadImageToFirebase(img))
        );
      }

      const entry = await CRTracking.create({
        ...payload,
        createdBy: user.id,
        updatedBy: user.id,
        isDeleted: false,
        level: payload.level ?? 1
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
