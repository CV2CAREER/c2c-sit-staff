import { Router } from "express";
import {
  getResources,
  createResource,
  updateResource,
  deleteResource
} from "../../controllers/v1/resources.controller";
import { isUserAuthenticated } from "../../middlewares/auth";
import { checkBlacklistedTokens } from "../../middlewares/checkBlacklistedToken";

const resourcesRouterV1 = Router();

resourcesRouterV1.use(checkBlacklistedTokens, isUserAuthenticated);

// Resources Endpoints
resourcesRouterV1.get("/", getResources);
resourcesRouterV1.post("/", createResource);
resourcesRouterV1.put("/", updateResource);
resourcesRouterV1.delete("/", deleteResource);

export default resourcesRouterV1;