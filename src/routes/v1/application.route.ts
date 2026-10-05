import { Router } from "express";
import {
  getApplications,
  softDeleteApplication,
  restoreApplication,
  permanentDeleteApplication,
  postApplicationEmail,
  updateApplicationAssurance,
} from "../../controllers/v1/applications.controller";
import { isUserAuthenticated } from "../../middlewares/auth";
import { checkBlacklistedTokens } from "../../middlewares/checkBlacklistedToken";
import { authorizeRoles } from "../../middlewares/authorizeRoles";

const applicationRouterV1 = Router();

applicationRouterV1.use(checkBlacklistedTokens, isUserAuthenticated);

// Application Endpoints
applicationRouterV1.get("/", getApplications);
applicationRouterV1.post("/emails", authorizeRoles("admin"), postApplicationEmail);
// SPR-21-58-001: any admin or assistant may record the assurance result (server stamps who/when).
applicationRouterV1.patch("/:applicationId/assurance", authorizeRoles("admin", "assistant"), updateApplicationAssurance);
applicationRouterV1.delete("/:applicationId", authorizeRoles("admin"), softDeleteApplication);
applicationRouterV1.patch("/:applicationId/restore", authorizeRoles("admin"), restoreApplication);
applicationRouterV1.delete("/:applicationId/permanent", authorizeRoles("admin"), permanentDeleteApplication);

export default applicationRouterV1;
