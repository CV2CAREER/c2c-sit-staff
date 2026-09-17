import { Request, Response } from "express";
import catchAsyncError from "../../utils/catchAsyncError";
import ErrorHandler from "../../utils/errorHandler";
import { CECIssueBurndownService } from "../../services/v1/cec-issue-burndown.service";
import { auditTrailApplicationService } from "../../services/admin/audit-trail.application.service";

export const getCECIssueBurndowns = catchAsyncError(async (req: Request, res: Response) => {
  try {
    const result = await CECIssueBurndownService.getAll(req.query);
    res.apiSuccess(result, "Issue burndowns retrieved successfully");
  } catch (error: any) {
    return res.apiError(new ErrorHandler(error.message, 400));
  }
});

export const getCECClientsWithIssueBurndowns = catchAsyncError(async (req: Request, res: Response) => {
  try {
    const result = await CECIssueBurndownService.getClientsWithLogs(req.query);
    res.apiSuccess(result, "Clients with issue burndowns retrieved successfully");
  } catch (error: any) {
    console.error("[CEC getClientsWithIssueBurndowns] ERROR:", error.message);
    return res.apiError(new ErrorHandler(error.message, 400));
  }
});

export const getCECIssueBurndownById = catchAsyncError(async (req: Request, res: Response) => {
  try {
    const record = await CECIssueBurndownService.getById(req.params.id);
    res.apiSuccess(record, "Issue burndown retrieved successfully");
  } catch (error: any) {
    const statusCode = error.message === "Issue burndown not found" ? 404 : 400;
    return res.apiError(new ErrorHandler(error.message, statusCode));
  }
});

export const getCECIssueBurndownStats = catchAsyncError(async (req: Request, res: Response) => {
  try {
    const stats = await CECIssueBurndownService.getStats();
    res.apiSuccess(stats, "Stats retrieved successfully");
  } catch (error: any) {
    return res.apiError(new ErrorHandler(error.message, 400));
  }
});

export const createCECIssueBurndown = catchAsyncError(async (req: any, res: Response) => {
  try {
    const record = await CECIssueBurndownService.create(req.body, req.user);
    auditTrailApplicationService.log({
      action: "CEC_ISSUE_BURNDOWN_CREATE",
      actorUserId: req.user?.id || "unknown",
      targetType: "CECIssueBurndown",
      targetKey: record.id,
      before: null,
      after: record.toJSON(),
    }).catch(() => {});
    res.apiSuccess(record, "Issue burndown created successfully");
  } catch (error: any) {
    return res.apiError(new ErrorHandler(error.message, 400));
  }
});

export const updateCECIssueBurndown = catchAsyncError(async (req: any, res: Response) => {
  try {
    const before = await CECIssueBurndownService.getById(req.params.id).catch(() => null);
    const record = await CECIssueBurndownService.update(req.params.id, req.body, req.user);
    auditTrailApplicationService.log({
      action: "CEC_ISSUE_BURNDOWN_UPDATE",
      actorUserId: req.user?.id || "unknown",
      targetType: "CECIssueBurndown",
      targetKey: record.id,
      before: before?.toJSON?.() ?? before,
      after: record.toJSON(),
    }).catch(() => {});
    res.apiSuccess(record, "Issue burndown updated successfully");
  } catch (error: any) {
    const statusCode = error.message === "Issue burndown not found" ? 404 : 400;
    return res.apiError(new ErrorHandler(error.message, statusCode));
  }
});

export const deleteCECIssueBurndown = catchAsyncError(async (req: any, res: Response) => {
  try {
    const before = await CECIssueBurndownService.getById(req.params.id).catch(() => null);
    await CECIssueBurndownService.delete(req.params.id, req.user);
    auditTrailApplicationService.log({
      action: "CEC_ISSUE_BURNDOWN_DELETE",
      actorUserId: req.user?.id || "unknown",
      targetType: "CECIssueBurndown",
      targetKey: req.params.id,
      before: before?.toJSON?.() ?? before,
      after: null,
    }).catch(() => {});
    res.apiSuccess(null, "Issue burndown deleted successfully");
  } catch (error: any) {
    const statusCode = error.message === "Issue burndown not found" ? 404 : 400;
    return res.apiError(new ErrorHandler(error.message, statusCode));
  }
});
