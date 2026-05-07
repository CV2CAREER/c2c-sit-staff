import { Router } from "express";
import {
  getApplications,
  softDeleteApplication,
  restoreApplication,
  permanentDeleteApplication,
} from "../../controllers/v1/applications.controller";
import { isUserAuthenticated } from "../../middlewares/auth";
import { checkBlacklistedTokens } from "../../middlewares/checkBlacklistedToken";

const applicationRouterV1 = Router();

applicationRouterV1.use(checkBlacklistedTokens, isUserAuthenticated);

// Application Endpoints
applicationRouterV1.get("/", getApplications);
applicationRouterV1.delete("/:applicationId", softDeleteApplication);
applicationRouterV1.patch("/:applicationId/restore", restoreApplication);
applicationRouterV1.delete("/:applicationId/permanent", permanentDeleteApplication);

export default applicationRouterV1;
