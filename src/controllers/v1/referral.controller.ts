import { Request, Response } from "express";
import { ReferralService } from "../../services/referral.service";
import catchAsyncError from "../../utils/catchAsyncError";
import ErrorHandler from "../../utils/errorHandler";
import { getServiceLogger } from "../../utils/createLogger";

const logger = getServiceLogger("referral-controller");

/**
 * ⚡ GET /v1/referrals
 * Get aggregated referrals
 */
export const getReferrals = catchAsyncError(
  async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 15;
      const variance = req.query.variance as string;
      const isDeleted = req.query.isDeleted === "true";
      const claimStatus = req.query.claimStatus as string;

      let result;

      if (variance === "claim") {
        result = await ReferralService.getPendingClaims(page, pageSize, { isDeleted, claimStatus });
      } else {
        result = await ReferralService.getAllReferrals(page, pageSize, { isDeleted, claimStatus });
      }

      res.apiSuccess(result, "Referrals retrieved successfully");
    } catch (error: any) {
      logger.error(`Failed to fetch referrals: ${error.message}`);
      return res.apiError(new ErrorHandler(error.message, 500));
    }
  }
);

/**
 * ⚡ POST /v1/referrals/approve
 * Approve referral claim
 */
export const approveReferral = catchAsyncError(
  async (req: Request, res: Response) => {
    try {
      const { referralId } = req.body;

      if (!referralId) {
        return res.apiError(new ErrorHandler("Referral ID is required", 400));
      }

      const result = await ReferralService.approveClaim(req, referralId);

      res.apiSuccess(result, "Referral approved successfully");
    } catch (error: any) {
      logger.error(`Failed to approve referral: ${error.message}`);
      return res.apiError(new ErrorHandler(error.message, 500));
    }
  }
);

/**
 * ⚡ POST /v1/referrals/decline
 * Decline referral claim
 */
export const declineReferral = catchAsyncError(
  async (req: Request, res: Response) => {
    try {
      const { referralId, reason } = req.body;

      if (!referralId) {
        return res.apiError(new ErrorHandler("Referral ID is required", 400));
      }

      const result = await ReferralService.declineClaim(req, referralId, reason);

      res.apiSuccess(result, "Referral declined successfully");
    } catch (error: any) {
      logger.error(`Failed to decline referral: ${error.message}`);
      return res.apiError(new ErrorHandler(error.message, 500));
    }
  }
);

/**
 * ⚡ GET /v1/referrals/user/:userId
 * Get referrals for specific user
 */
export const getUserReferrals = catchAsyncError(
  async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;

      if (!userId) {
        return res.apiError(new ErrorHandler("User ID is required", 400));
      }

      const result = await ReferralService.getUserReferrals(userId);

      res.apiSuccess(result, "User referrals retrieved successfully");
    } catch (error: any) {
      logger.error(`Failed to fetch user referrals: ${error.message}`);
      return res.apiError(new ErrorHandler(error.message, 500));
    }
  }
);

/**
 * ⚡ GET /v1/referrals/by-email?email=
 * Get referrals for a user directly by email (no userId→email lookup)
 */
export const getUserReferralsByEmail = catchAsyncError(
  async (req: Request, res: Response) => {
    const email = req.query.email as string;

    if (!email) {
      return res.apiError(new ErrorHandler("Email query parameter is required", 400));
    }

    try {
      const result = await ReferralService.getUserReferralsByEmail(email);
      res.apiSuccess(result, "Referrals successfully retrieved");
    } catch (error: any) {
      logger.error(`Failed to fetch referrals by email: ${error.message}`);
      return res.apiError(new ErrorHandler(error.message, 500));
    }
  }
);

/**
 * ⚡ DELETE /v1/referrals/:referralId
 * Soft-delete a referral record
 */
export const deleteReferral = catchAsyncError(
  async (req: Request, res: Response) => {
    try {
      const { referralId } = req.params;

      if (!referralId) {
        return res.apiError(new ErrorHandler("Referral ID is required", 400));
      }

      const result = await ReferralService.deleteReferral(req, referralId);

      res.apiSuccess(result, "Referral deleted successfully");
    } catch (error: any) {
      logger.error(`Failed to delete referral: ${error.message}`);
      return res.apiError(new ErrorHandler(error.message, 500));
    }
  }
);

/**
 * ⚡ PATCH /v1/referrals/:referralId/restore
 * Restore a soft-deleted referral record
 */
export const restoreReferral = catchAsyncError(
  async (req: Request, res: Response) => {
    try {
      const { referralId } = req.params;

      if (!referralId) {
        return res.apiError(new ErrorHandler("Referral ID is required", 400));
      }

      const result = await ReferralService.restoreReferral(req, referralId);

      res.apiSuccess(result, "Referral restored successfully");
    } catch (error: any) {
      logger.error(`Failed to restore referral: ${error.message}`);
      return res.apiError(new ErrorHandler(error.message, 500));
    }
  }
);

/**
 * ⚡ DELETE /v1/referrals/:referralId/permanent
 * Permanently delete a referral record from the database
 */
export const permanentDeleteReferral = catchAsyncError(
  async (req: Request, res: Response) => {
    try {
      const { referralId } = req.params;

      if (!referralId) {
        return res.apiError(new ErrorHandler("Referral ID is required", 400));
      }

      const result = await ReferralService.permanentDeleteReferral(req, referralId);

      res.apiSuccess(result, "Referral permanently deleted");
    } catch (error: any) {
      logger.error(`Failed to permanently delete referral: ${error.message}`);
      return res.apiError(new ErrorHandler(error.message, 500));
    }
  }
);

/**
 * ⚡ GET /v1/coach/referrals
 * Get referrals for authenticated coach by email
 */
export const getCoachReferrals = catchAsyncError(
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        return res.apiError(new ErrorHandler("User authentication required", 401));
      }

      const result = await ReferralService.getUserReferrals(userId);

      res.apiSuccess({ data: result.referrals }, "Coach referrals retrieved successfully");
    } catch (error: any) {
      logger.error(`Failed to fetch coach referrals: ${error.message}`);
      return res.apiError(new ErrorHandler(error.message, 500));
    }
  }
);
