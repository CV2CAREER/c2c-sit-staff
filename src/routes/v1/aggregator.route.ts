import { Router } from "express";
import {
  createAggregator,
  getAggregators,
  updateAggregator,
  deleteAggregators,
  getSlackQueue,
  addToSlackQueue,
  removeFromSlackQueue
} from "../../controllers/v1/aggregator.controller";
import { isUserAuthenticated } from "../../middlewares/auth";
import { checkBlacklistedTokens } from "../../middlewares/checkBlacklistedToken";
import { authorizeRoles } from "@/middlewares/authorizeRoles";

const aggregatorRouterV1 = Router();

aggregatorRouterV1.use(checkBlacklistedTokens, isUserAuthenticated, authorizeRoles("admin"));

// Aggregator Endpoints
aggregatorRouterV1.get("/", getAggregators);
aggregatorRouterV1.post("/", createAggregator);
aggregatorRouterV1.put("/", updateAggregator);
aggregatorRouterV1.delete("/", deleteAggregators);

// Slack Queue Management Endpoints
aggregatorRouterV1.get("/slack/queue", getSlackQueue);
aggregatorRouterV1.post("/slack/queue", addToSlackQueue);
aggregatorRouterV1.delete("/slack/queue", removeFromSlackQueue);

export default aggregatorRouterV1;
