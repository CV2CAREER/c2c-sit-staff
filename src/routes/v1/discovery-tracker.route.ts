import { Router } from "express";
import {
  getManualApplicationsController,
  getManualApplicationFilterValuesController,
  updateManualApplicationController,
  deleteManualApplicationController,
} from "../../controllers/v1/discovery-tracker.controller";
import { checkBlacklistedTokens } from "../../middlewares/checkBlacklistedToken";
import { isUserAuthenticated } from "../../middlewares/auth";
import { authorizeRoles } from "../../middlewares/authorizeRoles";

const discoveryTrackerRouterV1 = Router();

// This router is the manual_applications table itself — assistants keep
// full read/write access here (list, edit, soft-delete, restore, delete),
// unlike the admin-only default applied elsewhere in admin.route.ts.
discoveryTrackerRouterV1.use(
  checkBlacklistedTokens,
  isUserAuthenticated,
  authorizeRoles("admin", "assistant"),
);

discoveryTrackerRouterV1.get("/", getManualApplicationsController);
discoveryTrackerRouterV1.get("/filter-values", getManualApplicationFilterValuesController);
discoveryTrackerRouterV1.patch("/", authorizeRoles('admin'), updateManualApplicationController);
discoveryTrackerRouterV1.delete("/", authorizeRoles('admin'), deleteManualApplicationController);

export default discoveryTrackerRouterV1;
