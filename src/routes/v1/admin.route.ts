import { Router } from "express";
import { getAdminAnalytics } from "../../controllers/v1/admin.controller";
import { isUserAuthenticated } from "../../middlewares/auth";
import { checkBlacklistedTokens } from "../../middlewares/checkBlacklistedToken";

const adminRouterV1 = Router();

adminRouterV1.get(
  "/analytics",
  checkBlacklistedTokens,
  isUserAuthenticated,
  getAdminAnalytics,
);

export default adminRouterV1;

