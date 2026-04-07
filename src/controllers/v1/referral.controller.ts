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
      const archived = req.query.archived?.toString() === "true";
      const variance = req.query.variance as string;

      let result;

      if (variance === "claim") {
        result = await ReferralService.getPendingClaims(page, pageSize);
      } else {
        result = await ReferralService.getAllReferrals(page, pageSize);
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