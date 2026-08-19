import { Router } from "express";
import {
  getCRTrackingEntries,
  createCRTracking,
  updateCRTracking,
  softDeleteCRTracking,
  restoreCRTracking,
  permanentDeleteCRTracking,
  modifyCRTracking,
  getCRTrackingHistory,
  notifyCRNIL
} from "../../controllers/v1/cr-tracking.controller";
import {
  getCROptions,
  createCROption,
  updateCROption,
  deleteCROption
} from "../../controllers/v1/cr-options.controller";
import { isUserAuthenticated } from "../../middlewares/auth";
import { authorizeRoles } from "../../middlewares/authorizeRoles";
import { checkBlacklistedTokens } from "../../middlewares/checkBlacklistedToken";

const crTrackingRouterV1 = Router();

crTrackingRouterV1.use(checkBlacklistedTokens, isUserAuthenticated, authorizeRoles("admin", "assistant"));

crTrackingRouterV1.get("/", getCRTrackingEntries);
crTrackingRouterV1.get("/options", getCROptions);
crTrackingRouterV1.post("/options", authorizeRoles("admin"), createCROption);
crTrackingRouterV1.put("/options", authorizeRoles("admin"), updateCROption);
crTrackingRouterV1.delete("/options", authorizeRoles("admin"), deleteCROption);
crTrackingRouterV1.post("/", authorizeRoles("admin"), createCRTracking);
crTrackingRouterV1.put("/", authorizeRoles("admin"), updateCRTracking);
crTrackingRouterV1.delete("/", authorizeRoles("admin"), softDeleteCRTracking);
crTrackingRouterV1.post("/restore", authorizeRoles("admin"), restoreCRTracking);
crTrackingRouterV1.delete("/delete", authorizeRoles("admin"), permanentDeleteCRTracking);
crTrackingRouterV1.put("/modify", authorizeRoles("admin"), modifyCRTracking);
crTrackingRouterV1.get("/history", getCRTrackingHistory);
crTrackingRouterV1.post("/notify-nil", authorizeRoles("admin"), notifyCRNIL);

export default crTrackingRouterV1;
