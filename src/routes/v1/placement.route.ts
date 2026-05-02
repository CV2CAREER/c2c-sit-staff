import { Router } from "express";
import { checkBlacklistedTokens } from "../../middlewares/checkBlacklistedToken";
import { isUserAuthenticated } from "../../middlewares/auth";
import { PlacementController } from "../../controllers/v1/placement.controller";

const placementRouterV1 = Router();

placementRouterV1.use(checkBlacklistedTokens, isUserAuthenticated);

/**
 * Placement Controller Routes
 * Dashboard and client management for placement controllers (assistants)
 */

// GET /api/v1/placement/summary - Get dashboard summary for placement controller
placementRouterV1.get("/summary", PlacementController.getDashboardSummary);

export default placementRouterV1;
