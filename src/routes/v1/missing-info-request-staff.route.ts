import { Router } from "express";
import { checkBlacklistedTokens } from "@/middlewares/checkBlacklistedToken";
import { isUserAuthenticated } from "@/middlewares/auth";
import { authorizeRoles } from "@/middlewares/authorizeRoles";
import { dbMiddleware } from "@/middlewares/dbReady";
import {
  sendMissingInfoRequest,
  getOutstandingRequests,
  getRequestStats,
  bulkSendReminder,
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
missingInfoRequestStaffRouter.post("/bulk-reminder", authorizeRoles("admin"), bulkSendReminder);

export default missingInfoRequestStaffRouter;
