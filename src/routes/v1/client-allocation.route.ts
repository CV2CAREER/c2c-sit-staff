import { Router } from "express";
import { getClientAllocation } from "../../controllers/v1/client-allocation.controller";
import { authorizeRoles } from "@/middlewares/authorizeRoles";
import { isUserAuthenticated } from "@/middlewares/auth";
import { checkBlacklistedTokens } from "@/middlewares/checkBlacklistedToken";

const clientAllocationRouterV1 = Router();

clientAllocationRouterV1.use(checkBlacklistedTokens, isUserAuthenticated, authorizeRoles("admin"));

// No authentication - for testing only
clientAllocationRouterV1.get("/client-allocation", getClientAllocation);

export default clientAllocationRouterV1;
