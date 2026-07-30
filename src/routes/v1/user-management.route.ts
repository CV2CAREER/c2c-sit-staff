import { Router } from "express";
import { checkBlacklistedTokens } from "../../middlewares/checkBlacklistedToken";
import { isUserAuthenticated } from "../../middlewares/auth";
import { 
  updateUser, 
  approveUserDocument, 
  rejectUserDocument, 
  deleteUser,
  restoreUser,
  purgeUser,
  getPendingDocumentsByUserId,
  approveUserAccount,
  sendUserDetailsToSlack,
  getFeatureTitles,
  getUserPreferences,
  getJobPreferencesHistory,
  getUserReferrals,
  getUserUploadedDocuments,
  getUserProfile,
  getUserProgress,
  getInflightUsers,
  updateJobPreference,
} from "../../controllers/v1/user-management.controller";
import { authorizeRoles } from "@/middlewares/authorizeRoles";

const userManagementRouterV1 = Router();

/**
 * User Management Routes (Admin/Assistant Access)
 */
userManagementRouterV1.use(checkBlacklistedTokens, isUserAuthenticated, authorizeRoles("admin", "assistant"));

// Update user details
userManagementRouterV1.patch(
  "/users/:userId", authorizeRoles("admin"), updateUser
);

// Approve user document
userManagementRouterV1.post(
  "/users/documents/:documentId/approve", authorizeRoles("admin"), approveUserDocument
);

// Reject user document
userManagementRouterV1.post(
  "/documents/:documentId/reject", authorizeRoles("admin"), rejectUserDocument
);

// Get pending documents for user
userManagementRouterV1.get(
  "/users/:userId/documents/pending", authorizeRoles("admin"), getPendingDocumentsByUserId
);

// Delete user (soft delete to recycle bin)
userManagementRouterV1.delete(
  "/users/:userId", authorizeRoles("admin"), deleteUser
);

// Restore soft deleted user
userManagementRouterV1.post(
  "/users/:userId/restore", authorizeRoles("admin"), restoreUser
);

// Permanently delete user (irreversible)
userManagementRouterV1.delete(
  "/users/:userId/purge", authorizeRoles("admin"), purgeUser
);

// Approve user account
userManagementRouterV1.post(
  "/users/:userId/approve", authorizeRoles("admin"), approveUserAccount
);

// Send user details sample to Slack
userManagementRouterV1.post(
  "/users/:userId/send-slack-sample", authorizeRoles("admin"), sendUserDetailsToSlack
);

// Get all feature titles
userManagementRouterV1.get(
  "/features", getFeatureTitles
);

// Get user preferences by user ID
userManagementRouterV1.get(
  "/users/:userId/preferences", authorizeRoles("admin"), getUserPreferences
);

// Get job preferences history for user
userManagementRouterV1.get(
  "/users/:userId/preferences/history", getJobPreferencesHistory
);

// Get user referrals
userManagementRouterV1.get(
  "/users/:userId/referrals", getUserReferrals
);

// Get user uploaded documents
userManagementRouterV1.get(
  "/users/:userId/documents", getUserUploadedDocuments
);

// Get user profile (exclude sensitive data)
userManagementRouterV1.get(
  "/users/:userId/profile", getUserProfile
);

// Get user progress
userManagementRouterV1.get(
  "/users/:userId/progress", getUserProgress
);

// Get all users with INFLIGHT campaigns
userManagementRouterV1.get(
  "/users/inflight", getInflightUsers
);

// Update job preference (step-based or full)
userManagementRouterV1.put(
  "/users/:userId/preferences/:profileType", authorizeRoles("admin"), updateJobPreference
);

export default userManagementRouterV1;
