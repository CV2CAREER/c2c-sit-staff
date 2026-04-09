import { Router } from "express";
import {
  getEOTOptions,
  createEOTRequest
} from "../../controllers/v1/cr-eot.controller";
import { isUserAuthenticated } from "../../middlewares/auth";
import { checkBlacklistedTokens } from "../../middlewares/checkBlacklistedToken";
import { authorizeRoles } from "../../middlewares/authorizeRoles";

const crEOTRouterV1 = Router();

crEOTRouterV1.use(checkBlacklistedTokens, isUserAuthenticated);

crEOTRouterV1.get("/", getEOTOptions);
crEOTRouterV1.post("/", authorizeRoles('admin', 'assistance'), createEOTRequest);

export default crEOTRouterV1;