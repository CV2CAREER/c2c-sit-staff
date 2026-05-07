import { Request, Response } from "express";
import { InterviewPrepService } from "../../services/interview-prep.service";
import catchAsyncError from "../../utils/catchAsyncError";
import ErrorHandler from "../../utils/errorHandler";
import { getServiceLogger } from "../../utils/createLogger";

const logger = getServiceLogger("interview-prep-controller");

/**
 * GET /v1/admin/interview-prep
 * Get all interview Q&A records with optional filter: isDeleted
 */
export const getInterviewQnA = catchAsyncError(
  async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 15;
      const isDeleted =
        req.query.isDeleted !== undefined
          ? req.query.isDeleted === "true"
          : undefined;

      const result = await InterviewPrepService.getAll(page, pageSize, {
        isDeleted,
      });

      res.apiSuccess(result, "Interview Q&A records retrieved successfully");
    } catch (error: any) {
      logger.error(`Failed to fetch interview Q&A records: ${error.message}`);
      return res.apiError(new ErrorHandler(error.message, 500));
    }
  }
);

/**
 * DELETE /v1/admin/interview-prep/:prepId
 * Soft-delete an interview Q&A record (sets isDeleted = true)
 */
export const softDeleteInterviewQnA = catchAsyncError(
  async (req: Request, res: Response) => {
    try {
      const { prepId } = req.params;

      if (!prepId) {
        return res.apiError(new ErrorHandler("Record ID is required", 400));
      }

      const result = await InterviewPrepService.softDelete(req, prepId);

      res.apiSuccess(result, "Interview Q&A record deleted successfully");
    } catch (error: any) {
      logger.error(`Failed to delete interview Q&A record: ${error.message}`);
      return res.apiError(new ErrorHandler(error.message, 500));
    }
  }
);

/**
 * PATCH /v1/admin/interview-prep/:prepId/restore
 * Restore a soft-deleted interview Q&A record
 */
export const restoreInterviewQnA = catchAsyncError(
  async (req: Request, res: Response) => {
    try {
      const { prepId } = req.params;

      if (!prepId) {
        return res.apiError(new ErrorHandler("Record ID is required", 400));
      }

      const result = await InterviewPrepService.restore(req, prepId);

      res.apiSuccess(result, "Interview Q&A record restored successfully");
    } catch (error: any) {
      logger.error(`Failed to restore interview Q&A record: ${error.message}`);
      return res.apiError(new ErrorHandler(error.message, 500));
    }
  }
);

/**
 * DELETE /v1/admin/interview-prep/:prepId/permanent
 * Permanently delete an interview Q&A record from the database
 */
export const permanentDeleteInterviewQnA = catchAsyncError(
  async (req: Request, res: Response) => {
    try {
      const { prepId } = req.params;

      if (!prepId) {
        return res.apiError(new ErrorHandler("Record ID is required", 400));
      }

      const result = await InterviewPrepService.permanentDelete(req, prepId);

      res.apiSuccess(result, "Interview Q&A record permanently deleted");
    } catch (error: any) {
      logger.error(`Failed to permanently delete interview Q&A record: ${error.message}`);
      return res.apiError(new ErrorHandler(error.message, 500));
    }
  }
);
