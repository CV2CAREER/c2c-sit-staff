import { Router } from "express";
import {
  assignPlacementController,
  getAdminAnalytics,
  getInFlightSubscriptions,
  getPlacementControllers,
  unassignPlacementController,
} from "../../controllers/v1/admin.controller";
import { isUserAuthenticated } from "../../middlewares/auth";
import { checkBlacklistedTokens } from "../../middlewares/checkBlacklistedToken";

const adminRouterV1 = Router();

adminRouterV1.get(
  "/analytics",
  checkBlacklistedTokens,
  isUserAuthenticated,
  getAdminAnalytics,
);
adminRouterV1.get(
  "/in-flight",
  checkBlacklistedTokens,
  isUserAuthenticated,
  getInFlightSubscriptions,
);
adminRouterV1.get(
  "/in-flight/staff",
  checkBlacklistedTokens,
  isUserAuthenticated,
  getPlacementControllers,
);
adminRouterV1.post(
  "/in-flight/assign",
  checkBlacklistedTokens,
  isUserAuthenticated,
  assignPlacementController,
);
adminRouterV1.patch(
  "/in-flight/:planId/unassign",
  checkBlacklistedTokens,
  isUserAuthenticated,
  unassignPlacementController,
);

export default adminRouterV1;
