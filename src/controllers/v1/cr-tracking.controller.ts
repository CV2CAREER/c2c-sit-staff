import { Request, Response } from "express";
import catchAsyncError from "../../utils/catchAsyncError";
import ErrorHandler from "../../utils/errorHandler";
import { CRTrackingService } from "../../services/admin/cr-tracking.service";
import { getServiceLogger } from "../../utils/createLogger";

const logger = getServiceLogger("cr-tracking-controller");

/**
 * Get all CR Tracking entries
 */
export const getCRTrackingEntries = catchAsyncError(async (req: Request, res: Response) => {
  try {
    const active = req.query.active === "true";
    const recycle = req.query.recycle === "true";
    const filters = {
      isDeleted: active ? false : recycle ? true : req.query.isDeleted === "true"
    };

    const entries = await CRTrackingService.getAll(filters);

    return res.apiSuccess(entries, "CR Tracking entries retrieved successfully", 200);
  } catch (error: any) {
    logger.error(`❌ Failed to get CR tracking entries: ${error.message}`);
    return res.apiError(new ErrorHandler(error.message || "Failed to retrieve CR tracking entries", 500));
  }
});

/**
 * Create new CR Tracking entry
 */
export const createCRTracking = catchAsyncError(async (req: any, res: Response) => {
  try {
    const entry = await CRTrackingService.create(req, req.body, req.user);

    return res.apiSuccess(entry, "CR Tracking created successfully", 201);
  } catch (error: any) {
    logger.error(`❌ Failed to create CR tracking: ${error.message}`);
    return res.apiError(new ErrorHandler(error.message || "Failed to create CR tracking", 500));
  }
});

/**
 * Soft delete CR Tracking entry (move to recycle bin)
 */
export const softDeleteCRTracking = catchAsyncError(async (req: any, res: Response) => {
  try {
    const { id } = req.query as { id: string };

    if (!id) {
      return res.apiError(new ErrorHandler("CR Tracking ID is required", 400));
    }

    await CRTrackingService.softDelete(req, id, req.user);

    return res.apiSuccess({}, "CR Tracking moved to recycle bin successfully", 200);
  } catch (error: any) {
    logger.error(`❌ Failed to soft delete CR tracking: ${error.message}`);

    if (error.message === "CR Tracking entry not found" || error.message === "CR Tracking entry is already deleted") {
      return res.apiError(new ErrorHandler(error.message, 400));
    }

    return res.apiError(new ErrorHandler(error.message || "Failed to delete CR tracking", 500));
  }
});

/**
 * Restore CR Tracking entry from recycle bin
 */
export const restoreCRTracking = catchAsyncError(async (req: any, res: Response) => {
  try {
    const { id } = req.query as { id: string };

    if (!id) {
      return res.apiError(new ErrorHandler("CR Tracking ID is required", 400));
    }

    const entry = await CRTrackingService.restore(req, id, req.user);

    return res.apiSuccess(entry, "CR Tracking restored successfully", 200);
  } catch (error: any) {
    logger.error(`❌ Failed to restore CR tracking: ${error.message}`);

    if (error.message === "Deleted CR Tracking entry not found") {
      return res.apiError(new ErrorHandler(error.message, 404));
    }

    return res.apiError(new ErrorHandler(error.message || "Failed to restore CR tracking", 500));
  }
});

/**
 * Permanently delete CR Tracking entry
 */
export const permanentDeleteCRTracking = catchAsyncError(async (req: any, res: Response) => {
  try {
    const { id } = req.query as { id: string };

    if (!id) {
      return res.apiError(new ErrorHandler("CR Tracking ID is required", 400));
    }

    await CRTrackingService.permanentDelete(req, id, req.user);

    return res.apiSuccess({}, "CR Tracking permanently deleted successfully", 200);
  } catch (error: any) {
    logger.error(`❌ Failed to permanently delete CR tracking: ${error.message}`);

    if (error.message === "CR Tracking entry not found") {
      return res.apiError(new ErrorHandler(error.message, 404));
    }

    return res.apiError(new ErrorHandler(error.message || "Failed to permanently delete CR tracking", 500));
  }
});

/**
 * Get CR Tracking History logs
 */
export const getCRTrackingHistory = catchAsyncError(async (req: any, res: Response) => {
  try {
    const filters = {
      id: req.query.id as string,
      customId: req.query.customId as string,
      page: parseInt(req.query.page as string) || 1
    };

    const history = await CRTrackingService.getHistory(filters);

    return res.apiSuccess(history, "CR Tracking history retrieved successfully", 200);
  } catch (error: any) {
    logger.error(`❌ Failed to get CR tracking history: ${error.message}`);
    return res.apiError(new ErrorHandler(error.message || "Failed to retrieve CR tracking history", 500));
  }
});

/**
 * Notify NIL for CR Tracking
 */
export const notifyCRNIL = catchAsyncError(async (req: any, res: Response) => {
  try {
    const queryId = (req.query as { id?: string }).id;
    const bodyId = req.body?.id as string | undefined;
    const id = queryId || bodyId;

    if (!id) {
      return res.apiError(new ErrorHandler("CR Tracking ID is required", 400));
    }

    await CRTrackingService.notifyNIL(req, id, req.user);

    return res.apiSuccess({}, "CR NIL Notification sent successfully", 200);
  } catch (error: any) {
    logger.error(`❌ Failed to send NIL notification: ${error.message}`);

    if (["CR Tracking entry not found", "CR Owner not found", "CR Owner has no Slack ID configured"].includes(error.message)) {
      return res.apiError(new ErrorHandler(error.message, 404));
    }

    return res.apiError(new ErrorHandler(error.message || "Failed to send NIL notification", 500));
  }
});

/**
 * Modify CR Tracking (upgrade/downgrade)
 */
export const modifyCRTracking = catchAsyncError(async (req: any, res: Response) => {
  try {
    const { id, downgradeOrUpgrade } = req.query as { id: string; downgradeOrUpgrade: string };

    if (!id) {
      return res.apiError(new ErrorHandler("CR Tracking ID is required", 400));
    }

    if (!downgradeOrUpgrade || !['downgrade', 'upgrade'].includes(downgradeOrUpgrade)) {
      return res.apiError(new ErrorHandler("Valid downgradeOrUpgrade parameter is required (downgrade/upgrade)", 400));
    }

    let entry;
    if (downgradeOrUpgrade === 'downgrade') {
      entry = await CRTrackingService.downgrade(req, id, req.user);
    } else {
      entry = await CRTrackingService.upgrade(req, id, req.user);
    }

    return res.apiSuccess(entry, `CR Tracking ${downgradeOrUpgrade}d successfully`, 200);
  } catch (error: any) {
    logger.error(`❌ Failed to modify CR tracking: ${error.message}`);

    if (error.message === "CR Tracking entry not found") {
      return res.apiError(new ErrorHandler(error.message, 404));
    }

    return res.apiError(new ErrorHandler(error.message || "Failed to modify CR tracking", 500));
  }
});

/**
 * Update CR Tracking entry
 */
export const updateCRTracking = catchAsyncError(async (req: any, res: Response) => {
  try {
    const id = (req.query.id as string) || (req.body?.id as string) || (req.body?._id as string);

    if (!id) {
      return res.apiError(new ErrorHandler("CR Tracking ID is required", 400));
    }

    const entry = await CRTrackingService.update(req, id, req.body, req.user);
    return res.apiSuccess(entry, "CR Tracking updated successfully", 200);
  } catch (error: any) {
    logger.error(`âŒ Failed to update CR tracking: ${error.message}`);

    if (error.message === "CR Tracking entry not found") {
      return res.apiError(new ErrorHandler(error.message, 404));
    }

    return res.apiError(new ErrorHandler(error.message || "Failed to update CR tracking", 500));
  }
});
