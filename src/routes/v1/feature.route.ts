import { Router } from "express";
import {
  getAllFeatures,
  getFeatureById,
  updateFeature
} from "../../controllers/v1/feature.controller";
import { isUserAuthenticated } from "../../middlewares/auth";
import { checkBlacklistedTokens } from "../../middlewares/checkBlacklistedToken";
import { authorizeRoles } from "@/middlewares/authorizeRoles";

const featureRouterV1 = Router();

featureRouterV1.use(checkBlacklistedTokens, isUserAuthenticated);

// Feature Endpoints
featureRouterV1.get("/", getAllFeatures);
featureRouterV1.patch("/update", authorizeRoles("admin"), updateFeature);
featureRouterV1.get("/:id", getFeatureById);

export default featureRouterV1;
