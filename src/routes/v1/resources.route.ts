import { Router } from "express";
import {
  getResources,
  createResource,
  updateResource,
  deleteResource
} from "../../controllers/v1/resources.controller";
import { isUserAuthenticated } from "../../middlewares/auth";
import { checkBlacklistedTokens } from "../../middlewares/checkBlacklistedToken";
import { authorizeRoles } from "@/middlewares/authorizeRoles";

const resourcesRouterV1 = Router();

resourcesRouterV1.use(checkBlacklistedTokens, isUserAuthenticated, authorizeRoles("admin", "assistant"));

// Resources Endpoints
resourcesRouterV1.get("/", getResources);
resourcesRouterV1.post("/", authorizeRoles("admin"), createResource);
resourcesRouterV1.put("/", authorizeRoles("admin"), updateResource);
resourcesRouterV1.delete("/", authorizeRoles("admin"), deleteResource);

export default resourcesRouterV1;