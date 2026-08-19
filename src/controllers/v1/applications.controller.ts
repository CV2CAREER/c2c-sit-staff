import { Request, Response } from "express";
import { ApplicationService } from "../../services/application.service";
import catchAsyncError from "../../utils/catchAsyncError";
import ErrorHandler from "../../utils/errorHandler";
import { getServiceLogger } from "../../utils/createLogger";
import { User } from "../../models/v1/user.model";
import { ApplicationStatus, Progress, SlackNode, SlackProvider, SlackSeverity, SlackEventType, SlackChannel } from "../../utils/enum";
import { sendApplicationActionUserEmail, sendApplicationActionAdminEmail } from "../../services/email.service";
import { SlackService } from "../../services/slack.service";
import { getEnvironmentFromHost } from "../../utils/slack-helpers";
import { CLIENT_APP_DOMAIN, TEAM_EMAIL } from "../../config/env";

const logger = getServiceLogger("applications-controller");

/**
 * GET /v1/admin/applications
 * Get all applications with optional filters: isDeleted, status, source, aggregator
 */
export const getApplications = catchAsyncError(
  async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 15;
      const isDeleted =
        req.query.isDeleted !== undefined
          ? req.query.isDeleted === "true"
          : undefined;
      const status = req.query.status as string;
      const source = req.query.source as string;
      const aggregator = req.query.aggregator as string;

      const result = await ApplicationService.getApplications(page, pageSize, {
        isDeleted,
        status,
        source,
        aggregator,
      });

      res.apiSuccess(result, "Applications retrieved successfully");
    } catch (error: any) {
      logger.error(`Failed to fetch applications: ${error.message}`);
      return res.apiError(new ErrorHandler(error.message, 500));
    }
  }
);

/**
 * DELETE /v1/admin/applications/:applicationId
 * Soft-delete an application (sets isDeleted = true)
 */
export const softDeleteApplication = catchAsyncError(
  async (req: Request, res: Response) => {
    try {
      const { applicationId } = req.params;

      if (!applicationId) {
        return res.apiError(new ErrorHandler("Application ID is required", 400));
      }

      const result = await ApplicationService.softDeleteApplication(
        req,
        applicationId
      );

      res.apiSuccess(result, "Application deleted successfully");
    } catch (error: any) {
      logger.error(`Failed to delete application: ${error.message}`);
      return res.apiError(new ErrorHandler(error.message, 500));
    }
  }
);

/**
 * PATCH /v1/admin/applications/:applicationId/restore
 * Restore a soft-deleted application
 */
export const restoreApplication = catchAsyncError(
  async (req: Request, res: Response) => {
    try {
      const { applicationId } = req.params;

      if (!applicationId) {
        return res.apiError(new ErrorHandler("Application ID is required", 400));
      }

      const result = await ApplicationService.restoreApplication(
        req,
        applicationId
      );

      res.apiSuccess(result, "Application restored successfully");
    } catch (error: any) {
      logger.error(`Failed to restore application: ${error.message}`);
      return res.apiError(new ErrorHandler(error.message, 500));
    }
  }
);

/**
 * DELETE /v1/admin/applications/:applicationId/permanent
 * Permanently delete an application from the database
 */
export const permanentDeleteApplication = catchAsyncError(
  async (req: Request, res: Response) => {
    try {
      const { applicationId } = req.params;

      if (!applicationId) {
        return res.apiError(new ErrorHandler("Application ID is required", 400));
      }

      const result = await ApplicationService.permanentDeleteApplication(
        req,
        applicationId
      );

      res.apiSuccess(result, "Application permanently deleted");
    } catch (error: any) {
      logger.error(`Failed to permanently delete application: ${error.message}`);
      return res.apiError(new ErrorHandler(error.message, 500));
    }
  }
);

/**
 * POST /v1/admin/applications/emails
 * Start or end a client's application by setting their progress milestone.
 * type=ADMIN-APPLICATION-START → APPLICATION_COMMENCED
 * type=ADMIN-APPLICATION-END   → APPLICATION_EXPIRED
 */
export const postApplicationEmail = catchAsyncError(
  async (req: Request, res: Response) => {
    try {
      const { type, userId } = req.body;

      logger.info(`[ApplicationEmail] Request — type: ${type}, userId: ${userId}`);

      if (!type || !userId) {
        logger.warn(`[ApplicationEmail] Missing required fields — type: ${type}, userId: ${userId}`);
        return res.apiError(new ErrorHandler("type and userId are required", 400));
      }

      let progress: Progress;
      let applicationStatus: ApplicationStatus;
      let label: string;
      if (type === "ADMIN-APPLICATION-START") {
        progress = Progress.APPLICATION_COMMENCED;
        applicationStatus = ApplicationStatus.COMMENCED;
        label = "started";
      } else if (type === "ADMIN-APPLICATION-END") {
        progress = Progress.APPLICATION_EXPIRED;
        applicationStatus = ApplicationStatus.HOLD;
        label = "ended";
      } else {
        logger.warn(`[ApplicationEmail] Unknown type: ${type}`);
        return res.apiError(new ErrorHandler(`Unknown application email type: ${type}`, 400));
      }

      const user = await User.findByPk(userId);
      if (!user) {
        logger.warn(`[ApplicationEmail] User not found for id: ${userId}`);
        return res.apiError(new ErrorHandler(`User not found`, 404));
      }

      await user.update({ progress, applicationStatus });

      const clientName = `${user.firstName} ${user.lastName}`;
      const actor = req.user as User;
      const triggeredBy = actor
        ? `${actor.firstName || ""} ${actor.lastName || ""}`.trim() || actor.email
        : "Admin";
      const host = (req.headers.host || req.headers.origin || "localhost") as string;
      const action = type === "ADMIN-APPLICATION-START" ? "start" : "end";

      logger.info(`[ApplicationEmail] User ${user.id} progress set to "${progress}" via type "${type}"`);

      res.apiSuccess(null, `Application ${label} successfully`);

      setImmediate(async () => {
        try {
          await Promise.all([
            sendApplicationActionUserEmail({
              name: clientName,
              email: user.email,
              frontendUrl: CLIENT_APP_DOMAIN || "",
              action,
            }),
            sendApplicationActionAdminEmail({
              name: clientName,
              email: user.email,
              triggeredBy,
              action,
            }),
          ]);
        } catch (emailErr: any) {
          logger.error(`[ApplicationEmail] Email send failed for user ${user.id}: ${emailErr.message}`);
        }

        try {
          const location = getEnvironmentFromHost(host);
          await SlackService.notify({
            node: SlackNode.APPLICATION,
            provider: SlackProvider.SYSTEM,
            severity: SlackSeverity.INFO,
            type: SlackEventType.ADMIN_ACTION,
            body: `Application *${action === "start" ? "commenced" : "ended"}* for client *${clientName}* (${user.email}).`,
            channel: SlackChannel.TOWN_CRIER,
            teamMentions: "CSM",
            trigger: triggeredBy,
            host,
            location,
          });
        } catch (slackErr: any) {
          logger.error(`[ApplicationEmail] Slack notify failed for user ${user.id}: ${slackErr.message}`);
        }
      });
    } catch (error: any) {
      logger.error(`Failed to process application email action: ${error.message}`);
      return res.apiError(new ErrorHandler(error.message, 500));
    }
  }
);
