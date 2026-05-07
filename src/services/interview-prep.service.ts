import { getServiceLogger } from "../utils/createLogger";
import { InterviewPrepQuestionAnswer } from "../models/v1/interview-prep.model";
import { User } from "../models/v1/user.model";
import { SlackService } from "./slack.service";
import { getEnvironmentFromHost } from "../utils/slack-helpers";
import {
  SlackChannel,
  SlackEventType,
  SlackNode,
  SlackProvider,
  SlackSeverity,
} from "../utils/enum";

const logger = getServiceLogger("interview-prep-service");

export interface InterviewPrepFilters {
  isDeleted?: boolean;
}

export class InterviewPrepService {
  /**
   * Get all interview Q&A records with optional filters and pagination
   */
  static async getAll(
    page: number = 1,
    pageSize: number = 15,
    filters?: InterviewPrepFilters
  ) {
    try {
      logger.info(`Fetching interview Q&A records (page: ${page}, size: ${pageSize})`);

      const where: any = {};

      if (filters?.isDeleted !== undefined) {
        where.isDeleted = filters.isDeleted;
      } else {
        where.isDeleted = false;
      }

      const { count, rows } = await InterviewPrepQuestionAnswer.findAndCountAll({
        where,
        include: [
          {
            model: User,
            as: "user",
            attributes: ["id", "email", "firstName", "lastName"],
          },
        ],
        order: [["createdAt", "DESC"]],
        limit: pageSize,
        offset: (page - 1) * pageSize,
        raw: true,
        nest: true,
      });

      logger.info(`Found ${count} interview Q&A records, returning ${rows.length}`);

      return {
        data: rows,
        pagination: {
          totalCount: count,
          currentPage: page,
          pageSize,
          totalPages: Math.ceil(count / pageSize),
        },
      };
    } catch (error: any) {
      logger.error(`Failed to fetch interview Q&A records: ${error.message}`);
      throw error;
    }
  }

  /**
   * Soft-delete an interview Q&A record (sets isDeleted = true)
   */
  static async softDelete(req: any, prepId: string) {
    const host = req.headers.host || req.headers.origin || "localhost";
    const location = getEnvironmentFromHost(host);
    try {
      const record = await InterviewPrepQuestionAnswer.findByPk(prepId);

      if (!record) {
        throw new Error("Interview Q&A record not found");
      }

      if (record.isDeleted) {
        throw new Error("Interview Q&A record is already deleted");
      }

      const adminName = req.user
        ? `${(req.user as any).firstName || ""} ${(req.user as any).lastName || ""}`.trim() ||
          (req.user as any).email
        : "system";

      await record.update({ isDeleted: true, updatedBy: adminName });

      logger.info(`Interview Q&A record ${prepId} soft-deleted by ${adminName}`);

      setImmediate(async () => {
        try {
          const message = `
Interview Q&A Record Soft Deleted
• Deleted by: ${adminName}
• Record ID: ${prepId}
• User ID: ${record.userId}
• User Role: ${record.userRole}
          `.trim();

          await SlackService.notify({
            location,
            host,
            node: SlackNode.APPLICATION,
            provider: SlackProvider.SYSTEM,
            severity: SlackSeverity.INFO,
            trigger: "Interview Q&A Soft Deleted",
            type: SlackEventType.ADMIN_ACTION,
            channel: SlackChannel.TOWN_CRIER,
            teamMentions: "CSM",
            body: message,
          });
        } catch (err) {
          logger.error(`Slack notification failed: ${err}`);
        }
      });

      return { success: true, message: "Interview Q&A record deleted successfully" };
    } catch (error: any) {
      logger.error(`Failed to soft-delete interview Q&A record: ${error.message}`);
      throw error;
    }
  }

  /**
   * Restore a soft-deleted interview Q&A record (sets isDeleted = false)
   */
  static async restore(req: any, prepId: string) {
    const host = req.headers.host || req.headers.origin || "localhost";
    const location = getEnvironmentFromHost(host);
    try {
      const record = await InterviewPrepQuestionAnswer.findByPk(prepId);

      if (!record) {
        throw new Error("Interview Q&A record not found");
      }

      if (!record.isDeleted) {
        throw new Error("Interview Q&A record is not deleted");
      }

      const adminName = req.user
        ? `${(req.user as any).firstName || ""} ${(req.user as any).lastName || ""}`.trim() ||
          (req.user as any).email
        : "system";

      await record.update({ isDeleted: false, updatedBy: adminName });

      logger.info(`Interview Q&A record ${prepId} restored by ${adminName}`);

      setImmediate(async () => {
        try {
          const message = `
Interview Q&A Record Restored
• Restored by: ${adminName}
• Record ID: ${prepId}
• User ID: ${record.userId}
• User Role: ${record.userRole}
          `.trim();

          await SlackService.notify({
            location,
            host,
            node: SlackNode.APPLICATION,
            provider: SlackProvider.SYSTEM,
            severity: SlackSeverity.INFO,
            trigger: "Interview Q&A Restored",
            type: SlackEventType.ADMIN_ACTION,
            channel: SlackChannel.TOWN_CRIER,
            teamMentions: "CSM",
            body: message,
          });
        } catch (err) {
          logger.error(`Slack notification failed: ${err}`);
        }
      });

      return { success: true, message: "Interview Q&A record restored successfully" };
    } catch (error: any) {
      logger.error(`Failed to restore interview Q&A record: ${error.message}`);
      throw error;
    }
  }

  /**
   * Permanently delete an interview Q&A record from the database
   */
  static async permanentDelete(req: any, prepId: string) {
    const host = req.headers.host || req.headers.origin || "localhost";
    const location = getEnvironmentFromHost(host);
    try {
      const record = await InterviewPrepQuestionAnswer.findByPk(prepId);

      if (!record) {
        throw new Error("Interview Q&A record not found");
      }

      const adminName = req.user
        ? `${(req.user as any).firstName || ""} ${(req.user as any).lastName || ""}`.trim() ||
          (req.user as any).email
        : "system";

      const snapshot = {
        id: prepId,
        userId: record.userId,
        userRole: record.userRole,
      };

      await record.destroy();

      logger.info(`Interview Q&A record ${prepId} permanently deleted by ${adminName}`);

      setImmediate(async () => {
        try {
          const message = `
Interview Q&A Record Permanently Deleted
• Deleted by: ${adminName}
• Record ID: ${snapshot.id}
• User ID: ${snapshot.userId}
• User Role: ${snapshot.userRole}
          `.trim();

          await SlackService.notify({
            location,
            host,
            node: SlackNode.APPLICATION,
            provider: SlackProvider.SYSTEM,
            severity: SlackSeverity.INFO,
            trigger: "Interview Q&A Permanently Deleted",
            type: SlackEventType.ADMIN_ACTION,
            channel: SlackChannel.TOWN_CRIER,
            teamMentions: "CSM",
            body: message,
          });
        } catch (err) {
          logger.error(`Slack notification failed: ${err}`);
        }
      });

      return { success: true, message: "Interview Q&A record permanently deleted" };
    } catch (error: any) {
      logger.error(`Failed to permanently delete interview Q&A record: ${error.message}`);
      throw error;
    }
  }
}
