import { Request, Response } from "express";
import catchAsyncError from "../../utils/catchAsyncError";
import ErrorHandler from "../../utils/errorHandler";
import { CECDailyLogService } from "../../services/v1/cec-daily-log.service";
import { auditTrailApplicationService } from "../../services/admin/audit-trail.application.service";

export const getCECDailyLogs = catchAsyncError(async (req: Request, res: Response) => {
  try {
    const result = await CECDailyLogService.getAll(req.query);
    res.apiSuccess(result, "Daily logs retrieved successfully");
  } catch (error: any) {
    return res.apiError(new ErrorHandler(error.message, 400));
  }
});

export const getCECClientsWithLogs = catchAsyncError(async (req: Request, res: Response) => {
  try {
    const result = await CECDailyLogService.getClientsWithLogs(req.query);
    res.apiSuccess(result, "Clients with logs retrieved successfully");
  } catch (error: any) {
    console.error("[CEC getClientsWithLogs] ERROR:", error.message, error.stack);
    return res.apiError(new ErrorHandler(error.message, 400));
  }
});

export const getCECDailyLogById = catchAsyncError(async (req: Request, res: Response) => {
  try {
    const record = await CECDailyLogService.getById(req.params.id);
    res.apiSuccess(record, "Daily log retrieved successfully");
  } catch (error: any) {
    const statusCode = error.message === "Daily log not found" ? 404 : 400;
    return res.apiError(new ErrorHandler(error.message, statusCode));
  }
});

export const getCECDailyLogStats = catchAsyncError(async (req: Request, res: Response) => {
  try {
    const stats = await CECDailyLogService.getStats();
    res.apiSuccess(stats, "Stats retrieved successfully");
  } catch (error: any) {
    return res.apiError(new ErrorHandler(error.message, 400));
  }
});

export const createCECDailyLog = catchAsyncError(async (req: any, res: Response) => {
  try {
    const record = await CECDailyLogService.create(req.body, req.user);
    auditTrailApplicationService.log({
      action: "CEC_DAILY_LOG_CREATE",
      actorUserId: req.user?.id || "unknown",
      targetType: "CECDailyLog",
      targetKey: record.id,
      before: null,
      after: record.toJSON(),
    }).catch(() => {});
    res.apiSuccess(record, "Daily log created successfully");
  } catch (error: any) {
    return res.apiError(new ErrorHandler(error.message, 400));
  }
});

export const updateCECDailyLog = catchAsyncError(async (req: any, res: Response) => {
  try {
    const before = await CECDailyLogService.getById(req.params.id).catch(() => null);
    const record = await CECDailyLogService.update(req.params.id, req.body, req.user);
    auditTrailApplicationService.log({
      action: "CEC_DAILY_LOG_UPDATE",
      actorUserId: req.user?.id || "unknown",
      targetType: "CECDailyLog",
      targetKey: record.id,
      before: before?.toJSON?.() ?? before,
      after: record.toJSON(),
    }).catch(() => {});
    res.apiSuccess(record, "Daily log updated successfully");
  } catch (error: any) {
    const statusCode = error.message === "Daily log not found" ? 404 : 400;
    return res.apiError(new ErrorHandler(error.message, statusCode));
  }
});

export const deleteCECDailyLog = catchAsyncError(async (req: any, res: Response) => {
  try {
    const before = await CECDailyLogService.getById(req.params.id).catch(() => null);
    await CECDailyLogService.delete(req.params.id, req.user);
    auditTrailApplicationService.log({
      action: "CEC_DAILY_LOG_DELETE",
      actorUserId: req.user?.id || "unknown",
      targetType: "CECDailyLog",
      targetKey: req.params.id,
      before: before?.toJSON?.() ?? before,
      after: null,
    }).catch(() => {});
    res.apiSuccess(null, "Daily log deleted successfully");
  } catch (error: any) {
    const statusCode = error.message === "Daily log not found" ? 404 : 400;
    return res.apiError(new ErrorHandler(error.message, statusCode));
  }
});
