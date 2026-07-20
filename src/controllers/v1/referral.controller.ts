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

/**
 * ⚡ GET /v1/referrals/partner/summary
 * Get partner referral summary — total, invited, registered, paid referrals + earnings + referral link
 */
export const getPartnerSummary = catchAsyncError(
  async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      if (!user || !user.id) {
        return res.apiError(new ErrorHandler("User authentication required", 401));
      }

      const result = await ReferralService.getPartnerSummary(user.id, user);

      res.apiSuccess(
        result,
        "Partner summary retrieved successfully"
      );
    } catch (error: any) {
      logger.error(`Failed to fetch partner summary: ${error.message}`);
      return res.apiError(new ErrorHandler(error.message, 500));
    }
  }
);

/**
 * ⚡ POST /v1/referrals/send-email
 * Send referral invitation email to a potential referral
 */
export const sendReferralEmail = catchAsyncError(
  async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      if (!user || !user.id) {
        return res.apiError(new ErrorHandler("User authentication required", 401));
      }

      const { firstName, lastName, middleName, email, phoneNumber } = req.body;
      if (!firstName || !lastName || !email) {
        return res.apiError(new ErrorHandler("firstName, lastName and email are required", 400));
      }

      const host = req.headers.host || req.headers.origin || "localhost";

      const result = await ReferralService.handleSendReferralEmail(
        user.id,
        { firstName, lastName, middleName, email, phoneNumber },
        host,
      );

      res.apiSuccess(result, "Referral email sent successfully");
    } catch (error: any) {
      logger.error(`Failed to send referral email: ${error.message}`);
      return res.apiError(new ErrorHandler(error.message, 500));
    }
  }
);

/**
 * ⚡ POST /v1/referrals/claim
 * Claim a referral — validates that the authenticated user was referred by the provided referrer
 */
export const claimReferral = catchAsyncError(
  async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      if (!user || !user.id) {
        return res.apiError(new ErrorHandler("User authentication required", 401));
      }

      const { firstName, lastName, middleName, email, phoneNumber } = req.body;
      if (!firstName || !lastName || !email) {
        return res.apiError(new ErrorHandler("firstName, lastName and email are required", 400));
      }

      const host = req.headers.host || req.headers.origin || "localhost";

      const result = await ReferralService.handleClaimReferral(
        user.id,
        { firstName, lastName, middleName, email, phoneNumber },
        host,
      );

      res.apiSuccess(result, "Referral claimed successfully");
    } catch (error: any) {
      logger.error(`Failed to claim referral: ${error.message}`);
      return res.apiError(new ErrorHandler(error.message, 500));
    }
  }
);

/**
 * ⚡ POST /v1/referrals/bulk-upload
 * Bulk upload referrals from spreadsheet data
 */
/**
 * ⚡ PUT /v1/referrals?id=:id&action=UPDATE_PAYMENT_STATUS
 * Update referral payment status (e.g. mark CRP as paid)
 */
export const updateReferralPaymentStatus = catchAsyncError(
  async (req: Request, res: Response) => {
    try {
      const id = req.query.id as string;
      const { paymentStatus } = req.body;

      if (!id) {
        return res.apiError(new ErrorHandler("Referral ID is required", 400));
      }
      if (!paymentStatus) {
        return res.apiError(new ErrorHandler("paymentStatus is required", 400));
      }

      const result = await ReferralService.updatePaymentStatus(req, id, paymentStatus);
      res.apiSuccess(result, "Payment status updated successfully");
    } catch (error: any) {
      logger.error(`Failed to update payment status: ${error.message}`);
      return res.apiError(new ErrorHandler(error.message, 500));
    }
  }
);

export const bulkUploadReferrals = catchAsyncError(
  async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      if (!user || !user.id) {
        return res.apiError(new ErrorHandler("User authentication required", 401));
      }

      const { referrals } = req.body;
      if (!referrals || !Array.isArray(referrals) || referrals.length === 0) {
        return res.apiError(new ErrorHandler("referrals array is required and must not be empty", 400));
      }

      const host = req.headers.host || req.headers.origin || "localhost";

      const result = await ReferralService.handleBulkUploadReferrals(
        user.id,
        referrals,
        host,
      );

      res.apiSuccess(result, "Bulk referral emails queued successfully");
    } catch (error: any) {
      logger.error(`Failed to bulk upload referrals: ${error.message}`);
      return res.apiError(new ErrorHandler(error.message, 500));
    }
  }
);
