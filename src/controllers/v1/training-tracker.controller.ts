import { Request, Response } from "express";
import catchAsyncError from "../../utils/catchAsyncError";
import ErrorHandler from "../../utils/errorHandler";
import { TrainingTrackerService } from "../../services/training-tracker.service";
import { getServiceLogger } from "../../utils/createLogger";

const logger = getServiceLogger("training-tracker-controller");

/**
 * Get all training trackers
 */
export const getTrainingTrackers = catchAsyncError(async (req: Request, res: Response) => {
  try {
    const filters = {
      sessionId: req.query.sessionId as string,
      isDeleted: req.query.isDeleted === "true"
    };

    const trackers = await TrainingTrackerService.getAll(filters);

    return res.apiSuccess(trackers, "Training trackers retrieved successfully", 200);
  } catch (error: any) {
    logger.error(`❌ Failed to get training trackers: ${error.message}`);
    return res.apiError(new ErrorHandler(error.message || "Failed to retrieve training trackers", 500));
  }
});

/**
 * Get single training tracker by ID
 */
export const getTrainingTrackerById = catchAsyncError(async (req: Request, res: Response) => {
  try {
    const { id } = req.query as { id: string };

    if (!id) {
      return res.apiError(new ErrorHandler("Training tracker ID is required", 400));
    }

    const tracker = await TrainingTrackerService.getById(id);

    return res.apiSuccess(tracker, "Training tracker retrieved successfully", 200);
  } catch (error: any) {
    logger.error(`❌ Failed to get training tracker: ${error.message}`);

    if (error.message === "Training tracker not found") {
      return res.apiError(new ErrorHandler(error.message, 404));
    }

    return res.apiError(new ErrorHandler(error.message || "Failed to retrieve training tracker", 500));
  }
});

/**
 * Create new training tracker
 */
export const createTrainingTracker = catchAsyncError(async (req: any, res: Response) => {
  try {
    const tracker = await TrainingTrackerService.create(req, req.body, req.user);

    return res.apiSuccess(tracker, "Training tracker created successfully", 201);
  } catch (error: any) {
    logger.error(`❌ Failed to create training tracker: ${error.message}`);

    if (error.message.includes("already exists")) {
      return res.apiError(new ErrorHandler(error.message, 400));
    }

    return res.apiError(new ErrorHandler(error.message || "Failed to create training tracker", 500));
  }
});

/**
 * Update training tracker
 */
export const updateTrainingTracker = catchAsyncError(async (req: any, res: Response) => {
  try {
    const { id } = req.query as { id: string };

    if (!id) {
      return res.apiError(new ErrorHandler("Training tracker ID is required", 400));
    }

    const tracker = await TrainingTrackerService.update(req, id, req.body, req.user);

    return res.apiSuccess(tracker, "Training tracker updated successfully", 200);
  } catch (error: any) {
    logger.error(`❌ Failed to update training tracker: ${error.message}`);

    if (error.message === "Training tracker not found") {
      return res.apiError(new ErrorHandler(error.message, 404));
    }

    return res.apiError(new ErrorHandler(error.message || "Failed to update training tracker", 500));
  }
});

/**
 * Soft delete training tracker
 */
export const softDeleteTrainingTracker = catchAsyncError(async (req: any, res: Response) => {
  try {
    const { id } = req.query as { id: string };

    if (!id) {
      return res.apiError(new ErrorHandler("Training tracker ID is required", 400));
    }

    await TrainingTrackerService.softDelete(req, id, req.user);

    return res.apiSuccess({}, "Training tracker soft deleted successfully", 200);
  } catch (error: any) {
    logger.error(`❌ Failed to soft delete training tracker: ${error.message}`);

    if (error.message === "Training tracker not found" || error.message === "Training tracker is already deleted") {
      return res.apiError(new ErrorHandler(error.message, 400));
    }

    return res.apiError(new ErrorHandler(error.message || "Failed to soft delete training tracker", 500));
  }
});

/**
 * Restore training tracker
 */
export const restoreTrainingTracker = catchAsyncError(async (req: any, res: Response) => {
  try {
    const { id } = req.query as { id: string };

    if (!id) {
      return res.apiError(new ErrorHandler("Training tracker ID is required", 400));
    }

    const tracker = await TrainingTrackerService.restore(req, id, req.user);

    return res.apiSuccess(tracker, "Training tracker restored successfully", 200);
  } catch (error: any) {
    logger.error(`❌ Failed to restore training tracker: ${error.message}`);

    if (error.message === "Deleted training tracker not found") {
      return res.apiError(new ErrorHandler(error.message, 404));
    }

    return res.apiError(new ErrorHandler(error.message || "Failed to restore training tracker", 500));
  }
});

/**
 * Hard delete training tracker
 */
export const deleteTrainingTracker = catchAsyncError(async (req: any, res: Response) => {
  try {
    const { id } = req.query as { id: string };

    if (!id) {
      return res.apiError(new ErrorHandler("Training tracker ID is required", 400));
    }

    await TrainingTrackerService.delete(req, id, req.user);

    return res.apiSuccess({}, "Training tracker permanently deleted successfully", 204);
  } catch (error: any) {
    logger.error(`❌ Failed to delete training tracker: ${error.message}`);

    if (error.message === "Training tracker not found") {
      return res.apiError(new ErrorHandler(error.message, 404));
    }

    return res.apiError(new ErrorHandler(error.message || "Failed to delete training tracker", 500));
  }
});

/**
 * Get all sessions with client and coach details
 */
export const getAllSessions = catchAsyncError(async (req: Request, res: Response) => {
  try {
    const filters = {
      coachId: req.query.coachId as string,
      clientId: req.query.clientId as string,
      sessionStatus: req.query.sessionStatus as string
    };

    const sessions = await TrainingTrackerService.getAllSessions(filters);

    return res.apiSuccess(sessions, "Sessions retrieved successfully", 200);
  } catch (error: any) {
    logger.error(`❌ Failed to get sessions: ${error.message}`);
    return res.apiError(new ErrorHandler(error.message || "Failed to retrieve sessions", 500));
  }
});

/**
 * Export Training Tracker data as CSV
 */
export const exportTrainingTrackerCSV = catchAsyncError(async (req: any, res: Response) => {
  try {
    const filters = {
      sessionId: req.query.sessionId as string,
      trackerId: req.query.trackerId as string
    };

    if (!filters.sessionId && !filters.trackerId) {
      logger.warn("Export request without sessionId or trackerId");
      return res.apiError(new ErrorHandler("At least one filter (sessionId or trackerId) is required for export", 400));
    }

    const csv = await TrainingTrackerService.exportToCSV(req, filters, req.user);

    // Set CSV headers
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=training-trackers-${new Date().toISOString().split('T')[0]}.csv`);

    return res.send(csv);
  } catch (error: any) {
    logger.error(`❌ Failed to export training trackers: ${error.message}`);
    return res.apiError(new ErrorHandler(error.message || "Failed to export training trackers", 500));
  }
});
