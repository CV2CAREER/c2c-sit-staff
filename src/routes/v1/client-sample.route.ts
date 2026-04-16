import { Router } from "express";
import * as clientSampleController from "../../controllers/v1/client-sample.controller";
import { isUserAuthenticated } from "../../middlewares/auth";
import { checkBlacklistedTokens } from "../../middlewares/checkBlacklistedToken";

const clientSampleRouterV1 = Router();

// All routes here require authentication and blacklisted token check
clientSampleRouterV1.use(checkBlacklistedTokens);
clientSampleRouterV1.use(isUserAuthenticated);

// 1. Get Client Sample Users
clientSampleRouterV1.get("/users", clientSampleController.getUsers);

// 2. Get Client Sample Table (Handles Queued, Processing, Completed via variance query param)
clientSampleRouterV1.get("/table", clientSampleController.getTable);

// 3. Run Client Sample / Retry Client Sample
clientSampleRouterV1.post("/table", clientSampleController.runSample);

// 4. Remove from Queue
clientSampleRouterV1.delete("/table", clientSampleController.removeFromQueue);

// 5. Get Load Balancer
clientSampleRouterV1.get("/loadBalancer", clientSampleController.getLoadBalancer);

export default clientSampleRouterV1;
