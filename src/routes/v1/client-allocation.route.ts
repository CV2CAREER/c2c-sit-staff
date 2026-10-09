import { Router } from "express";
import {
  getClientAllocation,
  getActivePCsHandler,
} from "../../controllers/v1/client-allocation.controller";
import { authorizeRoles } from "@/middlewares/authorizeRoles";
import { isUserAuthenticated } from "@/middlewares/auth";
import { checkBlacklistedTokens } from "@/middlewares/checkBlacklistedToken";

const clientAllocationRouterV1 = Router();

clientAllocationRouterV1.use(checkBlacklistedTokens, isUserAuthenticated);

// Admin-only allocation view (guard moved from router level so the roster
// endpoint below can also admit assistants, matching the Missing Info screens).
clientAllocationRouterV1.get("/client-allocation", authorizeRoles("admin"), getClientAllocation);

// Active-PC roster for the Staff-queue owner dropdown + System-queue routing
// (SPR-21-51-002 / 51-003).
clientAllocationRouterV1.get(
  "/active-pcs",
  authorizeRoles("admin", "assistant"),
  getActivePCsHandler,
);

export default clientAllocationRouterV1;
