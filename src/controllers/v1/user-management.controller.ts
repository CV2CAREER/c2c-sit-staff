import { Request, Response } from "express";
import catchAsyncError from "../../utils/catchAsyncError";
import { getServiceLogger } from "../../utils/createLogger";
import ErrorHandler from "../../utils/errorHandler";
import { Role } from "../../utils/enum";
import { userManagementService, IJobPreferenceQuery } from "../../services/admin/user-management.service";

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
    const fullName = `${authorizedUser.firstName} ${authorizedUser.lastName}`;
    
    logger.info(`User ${authorizedUser.email} (${authorizedUser.role}) attempting to update user ${userId}`);
    
    const updatedUser = await userManagementService.updateUser(
      userId,
      req.body,
      authorizedUser.id,
      authorizedUser.email,
      fullName
    );

    logger.info(`User ${userId} successfully updated by ${authorizedUser.email}`);

    res.apiSuccess(updatedUser, "User updated successfully");
  },
);

export const updateDocumentFlags = catchAsyncError(
  async (req: Request, res: Response) => {
    const authorizedUser = ensureAuthorized(req);
    const { userId } = req.params;
    const fullName = `${authorizedUser.firstName} ${authorizedUser.lastName}`;

    const result = await userManagementService.updateDocumentFlags(
      userId,
      { hasResume: req.body?.hasResume, hasCoverLetter: req.body?.hasCoverLetter },
      authorizedUser.id,
      authorizedUser.email,
      fullName
    );

    res.apiSuccess(result, "C/R and C/L updated successfully");
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

export const bulkDeleteUsers = catchAsyncError(
  async (req: Request, res: Response) => {
    const authorizedUser = ensureAuthorized(req);
    const { userIds } = req.body;
    const host = req.headers.host || req.headers.origin || "localhost";

    if (!Array.isArray(userIds) || userIds.length === 0) {
      throw new ErrorHandler("userIds must be a non-empty array.", 400);
    }

    logger.info(`User ${authorizedUser.email} attempting to bulk delete ${userIds.length} user(s)`);

    const result = await userManagementService.bulkDeleteUsers(
      userIds,
      authorizedUser.id,
      authorizedUser.email,
      host
    );

    res.apiSuccess(result, result.message);
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

export const bulkPurgeUsers = catchAsyncError(
  async (req: Request, res: Response) => {
    const authorizedUser = ensureAuthorized(req);

    // Only super admin can permanently delete users
    if (authorizedUser.role !== Role.ADMIN) {
      throw new ErrorHandler("Only Super Admin can permanently delete users.", 403);
    }

    const { userIds } = req.body;
    const host = req.headers.host || req.headers.origin || "localhost";

    if (!Array.isArray(userIds) || userIds.length === 0) {
      throw new ErrorHandler("userIds must be a non-empty array.", 400);
    }

    logger.info(`User ${authorizedUser.email} attempting to permanently bulk delete ${userIds.length} user(s)`);

    const result = await userManagementService.bulkPurgeUsers(
      userIds,
      authorizedUser.id,
      authorizedUser.email,
      host
    );

    res.apiSuccess(result, result.message);
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
 * Suspend user account
 */
export const suspendUserAccount = catchAsyncError(
  async (req: Request, res: Response) => {
    const authorizedUser = ensureAuthorized(req);
    const { userId } = req.params;
    const host = req.headers.host || req.headers.origin || "localhost";

    logger.info(`User ${authorizedUser.email} suspending account for user ${userId}`);

    const result = await userManagementService.suspendUserAccount(
      userId,
      authorizedUser.id,
      authorizedUser.email,
      host,
    );

    res.apiSuccess(result, result.message);
  },
);

/**
 * Restrict user account
 */
export const restrictUserAccount = catchAsyncError(
  async (req: Request, res: Response) => {
    const authorizedUser = ensureAuthorized(req);
    const { userId } = req.params;
    const host = req.headers.host || req.headers.origin || "localhost";

    logger.info(`User ${authorizedUser.email} restricting account for user ${userId}`);

    const result = await userManagementService.restrictUserAccount(
      userId,
      authorizedUser.id,
      authorizedUser.email,
      host,
    );

    res.apiSuccess(result, result.message);
  },
);

/**
 * Assign / update / allow a referrer relationship for a client.
 */
export const assignReferrer = catchAsyncError(
  async (req: Request, res: Response) => {
    const authorizedUser = ensureAuthorized(req);
    const { userId } = req.params;
    const host = req.headers.host || req.headers.origin || "localhost";
    const { referrer, referralNumber, freeBeforeReferral } = req.body ?? {};

    const result = await userManagementService.assignReferrer(
      userId,
      { referrer, referralNumber, freeBeforeReferral },
      authorizedUser.id,
      authorizedUser.email,
      host,
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
    const { field, search, page, limit } = req.query as {
      field?: string;
      search?: string;
      page?: string;
      limit?: string;
    };

    logger.info(`Processing request to get job preferences history for user ID: ${userId}`);

    const result = await userManagementService.getJobPreferencesHistory(userId, {
      field: field ? String(field) : undefined,
      search: search ? String(search) : undefined,
      page: page ? parseInt(String(page), 10) : undefined,
      limit: limit ? parseInt(String(limit), 10) : undefined,
    });

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
 * Get user progress
 */
export const getUserProgress = catchAsyncError(
  async (req: Request, res: Response) => {
    ensureAuthorized(req);
    const { userId } = req.params;

    logger.info(`Processing request to get progress for user ID: ${userId}`);

    const result = await userManagementService.getUserProgress(userId);

    logger.info(`User progress retrieved successfully for ID: ${userId}`);

    res.apiSuccess(result, "User progress retrieved successfully");
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

/**
 * Get all users with INFLIGHT campaigns
 */
export const getInflightUsers = catchAsyncError(
  async (req: Request, res: Response) => {
    ensureAuthorized(req);

    logger.info(`Processing request to get all users with INFLIGHT campaigns`);

    const result = await userManagementService.getInflightUsers();

    logger.info(`Retrieved ${result.count} users with INFLIGHT campaigns`);

    res.apiSuccess(
      result,
      "Users with INFLIGHT campaigns retrieved successfully",
    );
  },
);

/**
 * Update job preference for a user (admin/assistant)
 */
export const updateJobPreference = catchAsyncError(
  async (req: Request, res: Response) => {
    const authorizedUser = ensureAuthorized(req);
    const { userId, profileType } = req.params;
    const validProfileType = (profileType || 'primary') as 'primary' | 'secondary';
    const updateData = req.body?.profile || req.body;
    const query: IJobPreferenceQuery = req.body?.params || req.query;
    const host = req.headers.host || req.headers.origin || "localhost";

    logger.info(`Admin ${authorizedUser.email} updating ${validProfileType} job preference for user ${userId}`);

    const result = await userManagementService.updateJobPreference(
      userId,
      validProfileType,
      updateData,
      query,
      host,
    );

    res.apiSuccess(result, result.message);
  },
);
