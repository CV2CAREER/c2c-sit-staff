import { Router } from "express";
import { checkBlacklistedTokens } from "@/middlewares/checkBlacklistedToken";
import { isUserAuthenticated } from "@/middlewares/auth";
import { authorizeRoles } from "@/middlewares/authorizeRoles";
import { dbMiddleware } from "@/middlewares/dbReady";
import {
  sendMissingInfoRequest,
  getOutstandingRequests,
  getRequestStats,
  getRequestResponses,
  bulkSendReminder,
  getClientRequests,
  sendSingleReminder,
  cancelRequest,
  resolveRequest,
  declineRequest,
  reusePriorSubmission,
  logCopyAudit,
} from "@/controllers/v1/missing-info-request-staff.controller";

const missingInfoRequestStaffRouter = Router();

missingInfoRequestStaffRouter.use(
  checkBlacklistedTokens,
  isUserAuthenticated,
  authorizeRoles("admin", "assistant"),
  dbMiddleware,
);

missingInfoRequestStaffRouter.post("/send", authorizeRoles("admin"), sendMissingInfoRequest);
missingInfoRequestStaffRouter.get("/outstanding", getOutstandingRequests);
missingInfoRequestStaffRouter.get("/stats", getRequestStats);
missingInfoRequestStaffRouter.get("/client/:targetUserId", getClientRequests);
missingInfoRequestStaffRouter.get("/:id/responses", getRequestResponses);
missingInfoRequestStaffRouter.post("/:id/reminder", sendSingleReminder);
missingInfoRequestStaffRouter.post("/:id/resolve", resolveRequest);
missingInfoRequestStaffRouter.post("/:id/cancel", authorizeRoles("admin"), cancelRequest);
missingInfoRequestStaffRouter.post("/:id/decline", authorizeRoles("admin"), declineRequest);
missingInfoRequestStaffRouter.post("/:id/reuse", authorizeRoles("admin"), reusePriorSubmission);
missingInfoRequestStaffRouter.post("/:id/copy-audit", logCopyAudit);
missingInfoRequestStaffRouter.post("/bulk-reminder", authorizeRoles("admin"), bulkSendReminder);

export default missingInfoRequestStaffRouter;
