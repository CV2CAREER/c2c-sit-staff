import { Request, Response } from "express";
import catchAsyncError from "../../utils/catchAsyncError";
import ErrorHandler from "../../utils/errorHandler";
import { CECReferralPayoutService } from "../../services/v1/cec-referral-payout.service";
import { auditTrailApplicationService } from "../../services/admin/audit-trail.application.service";

export const getCECReferralPayouts = catchAsyncError(async (req: Request, res: Response) => {
  try {
    const result = await CECReferralPayoutService.getAll(req.query);
    res.apiSuccess(result, "Referral payouts retrieved successfully");
  } catch (error: any) {
    return res.apiError(new ErrorHandler(error.message, 400));
  }
});

export const getCECClientsWithReferralPayouts = catchAsyncError(async (req: Request, res: Response) => {
  try {
    const result = await CECReferralPayoutService.getClientsWithLogs(req.query);
    res.apiSuccess(result, "Clients with referral payouts retrieved successfully");
  } catch (error: any) {
    console.error("[CEC getClientsWithReferralPayouts] ERROR:", error.message);
    return res.apiError(new ErrorHandler(error.message, 400));
  }
});

export const getCECReferralPayoutById = catchAsyncError(async (req: Request, res: Response) => {
  try {
    const record = await CECReferralPayoutService.getById(req.params.id);
    res.apiSuccess(record, "Referral payout retrieved successfully");
  } catch (error: any) {
    const statusCode = error.message === "Referral payout not found" ? 404 : 400;
    return res.apiError(new ErrorHandler(error.message, statusCode));
  }
});

export const getCECReferralPayoutStats = catchAsyncError(async (req: Request, res: Response) => {
  try {
    const stats = await CECReferralPayoutService.getStats();
    res.apiSuccess(stats, "Stats retrieved successfully");
  } catch (error: any) {
    return res.apiError(new ErrorHandler(error.message, 400));
  }
});

export const createCECReferralPayout = catchAsyncError(async (req: any, res: Response) => {
  try {
    const record = await CECReferralPayoutService.create(req.body, req.user);
    auditTrailApplicationService.log({
      action: "CEC_REFERRAL_PAYOUT_CREATE",
      actorUserId: req.user?.id || "unknown",
      targetType: "CECReferralPayout",
      targetKey: record.id,
      before: null,
      after: record.toJSON(),
    }).catch(() => {});
    res.apiSuccess(record, "Referral payout created successfully");
  } catch (error: any) {
    return res.apiError(new ErrorHandler(error.message, 400));
  }
});

export const updateCECReferralPayout = catchAsyncError(async (req: any, res: Response) => {
  try {
    const before = await CECReferralPayoutService.getById(req.params.id).catch(() => null);
    const record = await CECReferralPayoutService.update(req.params.id, req.body, req.user);
    auditTrailApplicationService.log({
      action: "CEC_REFERRAL_PAYOUT_UPDATE",
      actorUserId: req.user?.id || "unknown",
      targetType: "CECReferralPayout",
      targetKey: record.id,
      before: before?.toJSON?.() ?? before,
      after: record.toJSON(),
    }).catch(() => {});
    res.apiSuccess(record, "Referral payout updated successfully");
  } catch (error: any) {
    const statusCode = error.message === "Referral payout not found" ? 404 : 400;
    return res.apiError(new ErrorHandler(error.message, statusCode));
  }
});

export const deleteCECReferralPayout = catchAsyncError(async (req: any, res: Response) => {
  try {
    const before = await CECReferralPayoutService.getById(req.params.id).catch(() => null);
    await CECReferralPayoutService.delete(req.params.id, req.user);
    auditTrailApplicationService.log({
      action: "CEC_REFERRAL_PAYOUT_DELETE",
      actorUserId: req.user?.id || "unknown",
      targetType: "CECReferralPayout",
      targetKey: req.params.id,
      before: before?.toJSON?.() ?? before,
      after: null,
    }).catch(() => {});
    res.apiSuccess(null, "Referral payout deleted successfully");
  } catch (error: any) {
    const statusCode = error.message === "Referral payout not found" ? 404 : 400;
    return res.apiError(new ErrorHandler(error.message, statusCode));
  }
});
