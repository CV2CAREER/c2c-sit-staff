import { Router } from "express";
import { viewAsUser } from "../../controllers/v1/view-as-user.controller";
import { checkBlacklistedTokens } from "../../middlewares/checkBlacklistedToken";
import { isUserAuthenticated } from "../../middlewares/auth";
import { authorizeRoles } from "../../middlewares/authorizeRoles";

const viewAsUserRouterV1 = Router();

viewAsUserRouterV1.post(
  "/",
  checkBlacklistedTokens,
  isUserAuthenticated,
  authorizeRoles("admin", "assistant"),
  viewAsUser
);

export default viewAsUserRouterV1;
