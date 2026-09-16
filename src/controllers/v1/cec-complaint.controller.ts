import { Request, Response } from "express";
import catchAsyncError from "../../utils/catchAsyncError";
import ErrorHandler from "../../utils/errorHandler";
import { CECComplaintService } from "../../services/v1/cec-complaint.service";
import { auditTrailApplicationService } from "../../services/admin/audit-trail.application.service";

export const getCECComplaints = catchAsyncError(async (req: Request, res: Response) => {
  try {
    const result = await CECComplaintService.getAll(req.query);
    res.apiSuccess(result, "Complaints retrieved successfully");
  } catch (error: any) {
    return res.apiError(new ErrorHandler(error.message, 400));
  }
});

export const getCECClientsWithComplaints = catchAsyncError(async (req: Request, res: Response) => {
  try {
    const result = await CECComplaintService.getClientsWithLogs(req.query);
    res.apiSuccess(result, "Clients with complaints retrieved successfully");
  } catch (error: any) {
    console.error("[CEC getClientsWithComplaints] ERROR:", error.message);
    return res.apiError(new ErrorHandler(error.message, 400));
  }
});

export const getCECComplaintById = catchAsyncError(async (req: Request, res: Response) => {
  try {
    const record = await CECComplaintService.getById(req.params.id);
    res.apiSuccess(record, "Complaint retrieved successfully");
  } catch (error: any) {
    const statusCode = error.message === "Complaint not found" ? 404 : 400;
    return res.apiError(new ErrorHandler(error.message, statusCode));
  }
});

export const getCECComplaintStats = catchAsyncError(async (req: Request, res: Response) => {
  try {
    const stats = await CECComplaintService.getStats();
    res.apiSuccess(stats, "Stats retrieved successfully");
  } catch (error: any) {
    return res.apiError(new ErrorHandler(error.message, 400));
  }
});

export const createCECComplaint = catchAsyncError(async (req: any, res: Response) => {
  try {
    const record = await CECComplaintService.create(req.body, req.user);
    auditTrailApplicationService.log({
      action: "CEC_COMPLAINT_CREATE",
      actorUserId: req.user?.id || "unknown",
      targetType: "CECComplaint",
      targetKey: record.id,
      before: null,
      after: record.toJSON(),
    }).catch(() => {});
    res.apiSuccess(record, "Complaint created successfully");
  } catch (error: any) {
    return res.apiError(new ErrorHandler(error.message, 400));
  }
});

export const updateCECComplaint = catchAsyncError(async (req: any, res: Response) => {
  try {
    const before = await CECComplaintService.getById(req.params.id).catch(() => null);
    const record = await CECComplaintService.update(req.params.id, req.body, req.user);
    auditTrailApplicationService.log({
      action: "CEC_COMPLAINT_UPDATE",
      actorUserId: req.user?.id || "unknown",
      targetType: "CECComplaint",
      targetKey: record.id,
      before: before?.toJSON?.() ?? before,
      after: record.toJSON(),
    }).catch(() => {});
    res.apiSuccess(record, "Complaint updated successfully");
  } catch (error: any) {
    const statusCode = error.message === "Complaint not found" ? 404 : 400;
    return res.apiError(new ErrorHandler(error.message, statusCode));
  }
});

export const deleteCECComplaint = catchAsyncError(async (req: any, res: Response) => {
  try {
    const before = await CECComplaintService.getById(req.params.id).catch(() => null);
    await CECComplaintService.delete(req.params.id, req.user);
    auditTrailApplicationService.log({
      action: "CEC_COMPLAINT_DELETE",
      actorUserId: req.user?.id || "unknown",
      targetType: "CECComplaint",
      targetKey: req.params.id,
      before: before?.toJSON?.() ?? before,
      after: null,
    }).catch(() => {});
    res.apiSuccess(null, "Complaint deleted successfully");
  } catch (error: any) {
    const statusCode = error.message === "Complaint not found" ? 404 : 400;
    return res.apiError(new ErrorHandler(error.message, statusCode));
  }
});
