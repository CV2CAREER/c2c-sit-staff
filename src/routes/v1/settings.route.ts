import { Router } from "express";
import {
  getMasterPassword,
  updateMasterPassword
} from "../../controllers/v1/settings.controller";
import { isUserAuthenticated } from "../../middlewares/auth";
import { authorizeRoles } from "../../middlewares/authorizeRoles";
import { checkBlacklistedTokens } from "../../middlewares/checkBlacklistedToken";

const settingsRouterV1 = Router();

// Protected routes
settingsRouterV1.use(checkBlacklistedTokens, isUserAuthenticated, authorizeRoles("admin"));

settingsRouterV1.get("/masterpass", getMasterPassword);
settingsRouterV1.post("/masterpass", updateMasterPassword);

export default settingsRouterV1;