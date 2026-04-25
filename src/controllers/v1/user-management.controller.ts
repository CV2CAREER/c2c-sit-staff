import { Request, Response } from "express";
import catchAsyncError from "../../utils/catchAsyncError";
import { getServiceLogger } from "../../utils/createLogger";
import ErrorHandler from "../../utils/errorHandler";
import { Role } from "../../utils/enum";
import { userManagementService } from "../../services/admin/user-management.service";

const logger = getServiceLogger("user-management-controller"); 

const ensureAuthorized = (req: Request) => {
  const { user } = req;

  const allowedRoles = [Role.ADMIN, Role.ASSISTANT];
  if (!user || !allowedRoles.includes(user.role as Role)) {
    throw new ErrorHandler("Only admin and assistant users can access this endpoint.", 403);
  }

  return user;
};

/**
 * Admin User Management Controller
 */

export const updateUser = catchAsyncError(
  async (req: Request, res: Response) => {
    const authorizedUser = ensureAuthorized(req);
    const { userId } = req.params;
    
    logger.info(`User ${authorizedUser.email} (${authorizedUser.role}) attempting to update user ${userId}`);
    
    const updatedUser = await userManagementService.updateUser(
      userId,
      req.body,
      authorizedUser.id,
      authorizedUser.email
    );

    logger.info(`User ${userId} successfully updated by ${authorizedUser.email}`);

    res.apiSuccess(updatedUser, "User updated successfully");
  },
);

export const approveUserDocument = catchAsyncError(
  async (req: Request, res: Response) => {
    const authorizedUser = ensureAuthorized(req);
    const { documentId } = req.params;
    const host = req.headers.host || req.headers.origin || "localhost";
    
    logger.info(`User ${authorizedUser.email} approving document ${documentId}`);
    
    const result = await userManagementService.approveUserDocument(
      documentId,
      authorizedUser.id,
      authorizedUser.email,
      host
    );

    res.apiSuccess(result, `Document approved successfully`);
  },
);

export const rejectUserDocument = catchAsyncError(
  async (req: Request, res: Response) => {
    const authorizedUser = ensureAuthorized(req);
    const { documentId } = req.params;
    const { reason } = req.body;
    const host = req.headers.host || req.headers.origin || "localhost";
    
    logger.info(`User ${authorizedUser.email} rejecting document ${documentId}`);
    
    const result = await userManagementService.rejectUserDocument(
      documentId,
      reason,
      authorizedUser.id,
      authorizedUser.email,
      host
    );

    res.apiSuccess(result, `Document rejected successfully`);
  },
);

export const deleteUser = catchAsyncError(
  async (req: Request, res: Response) => {
    const authorizedUser = ensureAuthorized(req);
    const { userId } = req.params;
    const host = req.headers.host || req.headers.origin || "localhost";
    
    logger.info(`User ${authorizedUser.email} attempting to delete user ${userId}`);
    
    const result = await userManagementService.deleteUser(
      userId,
      authorizedUser.id,
      authorizedUser.email,
      host
    );

    res.apiSuccess(result, "User deleted successfully");
  },
);

export const restoreUser = catchAsyncError(
  async (req: Request, res: Response) => {
    const authorizedUser = ensureAuthorized(req);
    const { userId } = req.params;
    const host = req.headers.host || req.headers.origin || "localhost";
    
    logger.info(`User ${authorizedUser.email} attempting to restore user ${userId}`);
    
    const result = await userManagementService.restoreUser(
      userId,
      authorizedUser.id,
      authorizedUser.email,
      host
    );

    res.apiSuccess(result, "User restored successfully");
  },
);

export const purgeUser = catchAsyncError(
  async (req: Request, res: Response) => {
    const authorizedUser = ensureAuthorized(req);
    
    // Only super admin can permanently delete users
    if (authorizedUser.role !== Role.ADMIN) {
      throw new ErrorHandler("Only Super Admin can permanently delete users.", 403);
    }
    
    const { userId } = req.params;
    const host = req.headers.host || req.headers.origin || "localhost";
    
    logger.info(`User ${authorizedUser.email} attempting to permanently delete user ${userId}`);
    
    const result = await userManagementService.purgeUser(
      userId,
      authorizedUser.id,
      authorizedUser.email,
      host
    );

    res.apiSuccess(result, "User permanently deleted successfully");
  },
);

/**
 * Get pending documents for a user
 */
export const getPendingDocumentsByUserId = catchAsyncError(
  async (req: Request, res: Response) => {
    const authorizedUser = ensureAuthorized(req);
    const { userId } = req.params;
    
    logger.info(`User ${authorizedUser.email} getting pending documents for user ${userId}`);
    
    const pendingDocuments = await userManagementService.getPendingDocumentsByUserId(userId);

    res.apiSuccess(pendingDocuments, "Pending documents retrieved successfully");
  },
);

/**
 * Approve user account
 */
export const approveUserAccount = catchAsyncError(
  async (req: Request, res: Response) => {
    const authorizedUser = ensureAuthorized(req);
    const { userId } = req.params;
    const host = req.headers.host || req.headers.origin || "localhost";
    
    logger.info(`User ${authorizedUser.email} approving account for user ${userId}`);
    
    const result = await userManagementService.approveUserAccount(
      userId,
      authorizedUser.id,
      authorizedUser.email,
      host
    );

    res.apiSuccess(result, result.message);
  },
);

/**
 * Send user details sample to Slack
 */
export const sendUserDetailsToSlack = catchAsyncError(
  async (req: Request, res: Response) => {
    const authorizedUser = ensureAuthorized(req);
    const { userId } = req.params;
    const host = req.headers.host || req.headers.origin || "localhost";
    
    logger.info(`User ${authorizedUser.email} sending user details to Slack for user ${userId}`);
    
    const result = await userManagementService.sendUserDetailsToSlack(
      userId,
      authorizedUser.id,
      authorizedUser.email,
      host
    );

    res.apiSuccess(result, result.message);
  },
);

/**
 * Get all feature titles
 */
export const getFeatureTitles = catchAsyncError(
  async (req: Request, res: Response) => {
    ensureAuthorized(req);

    logger.info(`Processing request to get all feature titles`);

    const result = await userManagementService.getAllFeatureTitles();

    logger.info(`Retrieved ${result.features.length} feature titles`);

    res.apiSuccess(
      result,
      "Feature titles retrieved successfully",
    );
  },
);

/**
 * Get user preferences by user ID
 */
export const getUserPreferences = catchAsyncError(
  async (req: Request, res: Response) => {
    ensureAuthorized(req);
    const { userId } = req.params;

    logger.info(`Processing request to get preferences for user ID: ${userId}`);

    const result = await userManagementService.getUserPreferences(userId);

    logger.info(`User preferences retrieved for user ID: ${userId}`);

    res.apiSuccess(
      result,
      "User preferences retrieved successfully",
    );
  },
);

/**
 * Get job preferences history for user
 */
export const getJobPreferencesHistory = catchAsyncError(
  async (req: Request, res: Response) => {
    ensureAuthorized(req);
    const { userId } = req.params;

    logger.info(`Processing request to get job preferences history for user ID: ${userId}`);

    const result = await userManagementService.getJobPreferencesHistory(userId);

    logger.info(`Retrieved ${result.history.length} history entries for user ID: ${userId}`);

    res.apiSuccess(
      result,
      "Job preferences history retrieved successfully",
    );
  },
);

/**
 * Get user referrals
 */
export const getUserReferrals = catchAsyncError(
  async (req: Request, res: Response) => {
    ensureAuthorized(req);
    const { userId } = req.params;

    logger.info(`Processing request to get referrals for user ID: ${userId}`);

    const result = await userManagementService.getUserReferrals(userId);

    logger.info(`Retrieved ${result.count} referrals for user ID: ${userId}`);

    res.apiSuccess(
      result,
      "User referrals retrieved successfully",
    );
  },
);

/**
 * Get user uploaded documents
 */
export const getUserUploadedDocuments = catchAsyncError(
  async (req: Request, res: Response) => {
    ensureAuthorized(req);
    const { userId } = req.params;

    logger.info(`Processing request to get uploaded documents for user ID: ${userId}`);

    const result = await userManagementService.getUserUploadedDocuments(userId);

    logger.info(`Retrieved ${result.count} documents for user ID: ${userId}`);

    res.apiSuccess(
      result,
      "User uploaded documents retrieved successfully",
    );
  },
);

/**
 * Get user profile (exclude sensitive data)
 */
export const getUserProfile = catchAsyncError(
  async (req: Request, res: Response) => {
    ensureAuthorized(req);
    const { userId } = req.params;

    logger.info(`Processing request to get profile for user ID: ${userId}`);

    const result = await userManagementService.getUserProfile(userId);

    logger.info(`User profile retrieved successfully for ID: ${userId}`);

    res.apiSuccess(
      result,
      "User profile retrieved successfully",
    );
  },
);
