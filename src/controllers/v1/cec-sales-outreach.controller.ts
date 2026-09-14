import { Request, Response } from "express";
import catchAsyncError from "../../utils/catchAsyncError";
import ErrorHandler from "../../utils/errorHandler";
import { CECSalesOutreachService } from "../../services/v1/cec-sales-outreach.service";
import { auditTrailApplicationService } from "../../services/admin/audit-trail.application.service";

export const getCECSalesOutreachs = catchAsyncError(async (req: Request, res: Response) => {
  try {
    const result = await CECSalesOutreachService.getAll(req.query);
    res.apiSuccess(result, "Sales outreachs retrieved successfully");
  } catch (error: any) {
    return res.apiError(new ErrorHandler(error.message, 400));
  }
});

export const getCECClientsWithSalesOutreachs = catchAsyncError(async (req: Request, res: Response) => {
  try {
    const result = await CECSalesOutreachService.getClientsWithLogs(req.query);
    res.apiSuccess(result, "Clients with sales outreachs retrieved successfully");
  } catch (error: any) {
    console.error("[CEC getClientsWithSalesOutreachs] ERROR:", error.message);
    return res.apiError(new ErrorHandler(error.message, 400));
  }
});

export const getCECSalesOutreachById = catchAsyncError(async (req: Request, res: Response) => {
  try {
    const record = await CECSalesOutreachService.getById(req.params.id);
    res.apiSuccess(record, "Sales outreach retrieved successfully");
  } catch (error: any) {
    const statusCode = error.message === "Sales outreach not found" ? 404 : 400;
    return res.apiError(new ErrorHandler(error.message, statusCode));
  }
});

export const getCECSalesOutreachStats = catchAsyncError(async (req: Request, res: Response) => {
  try {
    const stats = await CECSalesOutreachService.getStats();
    res.apiSuccess(stats, "Stats retrieved successfully");
  } catch (error: any) {
    return res.apiError(new ErrorHandler(error.message, 400));
  }
});

export const createCECSalesOutreach = catchAsyncError(async (req: any, res: Response) => {
  try {
    const record = await CECSalesOutreachService.create(req.body, req.user);
    auditTrailApplicationService.log({
      action: "CEC_SALES_OUTREACH_CREATE",
      actorUserId: req.user?.id || "unknown",
      targetType: "CECSalesOutreach",
      targetKey: record.id,
      before: null,
      after: record.toJSON(),
    }).catch(() => {});
    res.apiSuccess(record, "Sales outreach created successfully");
  } catch (error: any) {
    return res.apiError(new ErrorHandler(error.message, 400));
  }
});

export const updateCECSalesOutreach = catchAsyncError(async (req: any, res: Response) => {
  try {
    const before = await CECSalesOutreachService.getById(req.params.id).catch(() => null);
    const record = await CECSalesOutreachService.update(req.params.id, req.body, req.user);
    auditTrailApplicationService.log({
      action: "CEC_SALES_OUTREACH_UPDATE",
      actorUserId: req.user?.id || "unknown",
      targetType: "CECSalesOutreach",
      targetKey: record.id,
      before: before?.toJSON?.() ?? before,
      after: record.toJSON(),
    }).catch(() => {});
    res.apiSuccess(record, "Sales outreach updated successfully");
  } catch (error: any) {
    const statusCode = error.message === "Sales outreach not found" ? 404 : 400;
    return res.apiError(new ErrorHandler(error.message, statusCode));
  }
});

export const deleteCECSalesOutreach = catchAsyncError(async (req: any, res: Response) => {
  try {
    const before = await CECSalesOutreachService.getById(req.params.id).catch(() => null);
    await CECSalesOutreachService.delete(req.params.id, req.user);
    auditTrailApplicationService.log({
      action: "CEC_SALES_OUTREACH_DELETE",
      actorUserId: req.user?.id || "unknown",
      targetType: "CECSalesOutreach",
      targetKey: req.params.id,
      before: before?.toJSON?.() ?? before,
      after: null,
    }).catch(() => {});
    res.apiSuccess(null, "Sales outreach deleted successfully");
  } catch (error: any) {
    const statusCode = error.message === "Sales outreach not found" ? 404 : 400;
    return res.apiError(new ErrorHandler(error.message, statusCode));
  }
});
