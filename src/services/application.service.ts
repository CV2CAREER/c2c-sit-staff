import { Op } from "sequelize";
import { getServiceLogger } from "../utils/createLogger";
import { Application } from "../models/v1/application.model";
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

const logger = getServiceLogger("application-service");

export interface ApplicationFilters {
  isDeleted?: boolean;
  status?: string;
  source?: string;
  aggregator?: string;
}

export class ApplicationService {
  /**
   * Get all applications with optional filters and pagination
   */
  static async getApplications(
    page: number = 1,
    pageSize: number = 15,
    filters?: ApplicationFilters
  ) {
    try {
      logger.info(`Fetching applications (page: ${page}, size: ${pageSize})`);

      const where: any = {};

      if (filters?.isDeleted !== undefined) {
        where.isDeleted = filters.isDeleted;
      } else {
        where.isDeleted = false;
      }

      if (filters?.status && filters.status !== "all") {
        where.Status = filters.status;
      }

      if (filters?.source && filters.source !== "all") {
        where.Run_Source = filters.source;
      }

      if (filters?.aggregator && filters.aggregator !== "all") {
        where.Internal_Jobsite = filters.aggregator;
      }

      const { count, rows } = await Application.findAndCountAll({
        where,
        include: [
          {
            model: User,
            as: "user",
            attributes: ["id", "firstName", "lastName"],
          },
        ],
        order: [["createdAt", "DESC"]],
        limit: pageSize,
        offset: (page - 1) * pageSize,
        raw: true,
        nest: true,
      });

      const uniqueCount = await Application.count({
        where,
        distinct: true,
        col: "JobId",
      });

      logger.info(`Found ${count} applications, returning ${rows.length}`);

      return {
        data: rows,
        pagination: {
          totalCount: count,
          currentPage: page,
          pageSize,
          totalPages: Math.ceil(count / pageSize),
        },
        uniqueCount,
      };
    } catch (error: any) {
      logger.error(`Failed to fetch applications: ${error.message}`);
      throw error;
    }
  }

  /**
   * Soft-delete an application (sets isDeleted = true)
   */
  static async softDeleteApplication(req: any, applicationId: string) {
    const host = req.headers.host || req.headers.origin || "localhost";
    const location = getEnvironmentFromHost(host);
    try {
      const application = await Application.findByPk(applicationId);

      if (!application) {
        throw new Error("Application not found");
      }

      if (application.isDeleted) {
        throw new Error("Application is already deleted");
      }

      const adminName = req.user
        ? `${(req.user as any).firstName || ""} ${(req.user as any).lastName || ""}`.trim() ||
          (req.user as any).email
        : "system";

      await application.update({ isDeleted: true, updateBy: adminName });

      logger.info(`Application ${applicationId} soft-deleted by ${adminName}`);

      setImmediate(async () => {
        try {
          const message = `
Application Record Soft Deleted
• Deleted by: ${adminName}
• Application ID: ${applicationId}
• Job Title: ${application.Job_Title}
• Client: ${application.Client}
• Status: ${application.Status}
          `.trim();

          await SlackService.notify({
            location,
            host,
            node: SlackNode.APPLICATION,
            provider: SlackProvider.SYSTEM,
            severity: SlackSeverity.INFO,
            trigger: "Application Soft Deleted",
            type: SlackEventType.ADMIN_ACTION,
            channel: SlackChannel.TOWN_CRIER,
            teamMentions: "CSM",
            body: message,
          });
        } catch (err) {
          logger.error(`Slack notification failed: ${err}`);
        }
      });

      return { success: true, message: "Application deleted successfully" };
    } catch (error: any) {
      logger.error(`Failed to soft-delete application: ${error.message}`);
      throw error;
    }
  }

  /**
   * Restore a soft-deleted application (sets isDeleted = false)
   */
  static async restoreApplication(req: any, applicationId: string) {
    const host = req.headers.host || req.headers.origin || "localhost";
    const location = getEnvironmentFromHost(host);
    try {
      const application = await Application.findByPk(applicationId);

      if (!application) {
        throw new Error("Application not found");
      }

      if (!application.isDeleted) {
        throw new Error("Application is not deleted");
      }

      const adminName = req.user
        ? `${(req.user as any).firstName || ""} ${(req.user as any).lastName || ""}`.trim() ||
          (req.user as any).email
        : "system";

      await application.update({ isDeleted: false, updateBy: adminName });

      logger.info(`Application ${applicationId} restored by ${adminName}`);

      setImmediate(async () => {
        try {
          const message = `
Application Record Restored
• Restored by: ${adminName}
• Application ID: ${applicationId}
• Job Title: ${application.Job_Title}
• Client: ${application.Client}
          `.trim();

          await SlackService.notify({
            location,
            host,
            node: SlackNode.APPLICATION,
            provider: SlackProvider.SYSTEM,
            severity: SlackSeverity.INFO,
            trigger: "Application Restored",
            type: SlackEventType.ADMIN_ACTION,
            channel: SlackChannel.TOWN_CRIER,
            teamMentions: "CSM",
            body: message,
          });
        } catch (err) {
          logger.error(`Slack notification failed: ${err}`);
        }
      });

      return { success: true, message: "Application restored successfully" };
    } catch (error: any) {
      logger.error(`Failed to restore application: ${error.message}`);
      throw error;
    }
  }

  /**
   * Permanently delete an application from the database
   */
  static async permanentDeleteApplication(req: any, applicationId: string) {
    const host = req.headers.host || req.headers.origin || "localhost";
    const location = getEnvironmentFromHost(host);
    try {
      const application = await Application.findByPk(applicationId);

      if (!application) {
        throw new Error("Application not found");
      }

      const adminName = req.user
        ? `${(req.user as any).firstName || ""} ${(req.user as any).lastName || ""}`.trim() ||
          (req.user as any).email
        : "system";

      const snapshot = {
        id: applicationId,
        jobTitle: application.Job_Title,
        client: application.Client,
        status: application.Status,
      };

      await application.destroy();

      logger.info(
        `Application ${applicationId} permanently deleted by ${adminName}`
      );

      setImmediate(async () => {
        try {
          const message = `
Application Record Permanently Deleted
• Deleted by: ${adminName}
• Application ID: ${snapshot.id}
• Job Title: ${snapshot.jobTitle}
• Client: ${snapshot.client}
• Status: ${snapshot.status}
          `.trim();

          await SlackService.notify({
            location,
            host,
            node: SlackNode.APPLICATION,
            provider: SlackProvider.SYSTEM,
            severity: SlackSeverity.INFO,
            trigger: "Application Permanently Deleted",
            type: SlackEventType.ADMIN_ACTION,
            channel: SlackChannel.TOWN_CRIER,
            teamMentions: "CSM",
            body: message,
          });
        } catch (err) {
          logger.error(`Slack notification failed: ${err}`);
        }
      });

      return { success: true, message: "Application permanently deleted" };
    } catch (error: any) {
      logger.error(
        `Failed to permanently delete application: ${error.message}`
      );
      throw error;
    }
  }
}
