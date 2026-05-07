import { Request, Response } from "express";
import { ApplicationService } from "../../services/application.service";
import catchAsyncError from "../../utils/catchAsyncError";
import ErrorHandler from "../../utils/errorHandler";
import { getServiceLogger } from "../../utils/createLogger";

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
