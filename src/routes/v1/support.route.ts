import { Router } from "express";
import {
  createSupportSession,
  sendSupportMessage,
  getSessionMessages,
  submitFeedback,
  assignStaffToSession,
  endSupportSession,
  getAllSupportSessions
} from "../../controllers/v1/support.controller";
import { isUserAuthenticated } from "../../middlewares/auth";
import { checkBlacklistedTokens } from "../../middlewares/checkBlacklistedToken";
import { authorizeRoles } from "@/middlewares/authorizeRoles";

const supportRouterV1 = Router();

// All support routes require authentication
supportRouterV1.use(checkBlacklistedTokens, isUserAuthenticated, authorizeRoles("admin"));

supportRouterV1.post("/", createSupportSession);
supportRouterV1.post("/:sessionId/messages", sendSupportMessage);
supportRouterV1.get("/:sessionId/messages", getSessionMessages);
supportRouterV1.post("/:sessionId/feedback", submitFeedback);
supportRouterV1.put("/assign", assignStaffToSession);
supportRouterV1.put("/:sessionId/end", endSupportSession);
supportRouterV1.get("/", getAllSupportSessions);

export default supportRouterV1;