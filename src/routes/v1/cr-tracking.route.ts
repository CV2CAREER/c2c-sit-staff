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
crTrackingRouterV1.post("/options", createCROption);
crTrackingRouterV1.put("/options", updateCROption);
crTrackingRouterV1.delete("/options", deleteCROption);
crTrackingRouterV1.post("/", createCRTracking);
crTrackingRouterV1.put("/", updateCRTracking);
crTrackingRouterV1.delete("/", softDeleteCRTracking);
crTrackingRouterV1.post("/restore", restoreCRTracking);
crTrackingRouterV1.delete("/delete", permanentDeleteCRTracking);
crTrackingRouterV1.put("/modify", modifyCRTracking);
crTrackingRouterV1.get("/history", getCRTrackingHistory);
crTrackingRouterV1.post("/notify-nil", notifyCRNIL);

export default crTrackingRouterV1;
