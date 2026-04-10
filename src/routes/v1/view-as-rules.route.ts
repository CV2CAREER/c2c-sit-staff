import { Router } from "express";
import {
  getAllViewAsRules,
  getViewAsRuleByPersona,
  createViewAsRule,
  updateViewAsRule,
  checkViewAsPermission,
  getMyViewAsRule
} from "../../controllers/v1/view-as-rules.controller";
import { isUserAuthenticated } from "../../middlewares/auth";
import { authorizeRoles } from "@/middlewares/authorizeRoles";
import { checkBlacklistedTokens } from "../../middlewares/checkBlacklistedToken";

const viewAsRulesRouterV1 = Router();

// Admin protected routes
viewAsRulesRouterV1.use(checkBlacklistedTokens, isUserAuthenticated, authorizeRoles("admin"));

viewAsRulesRouterV1.get("/me", getMyViewAsRule);
viewAsRulesRouterV1.get("/", getAllViewAsRules);
viewAsRulesRouterV1.get("/:persona", getViewAsRuleByPersona);
viewAsRulesRouterV1.post("/", createViewAsRule);
viewAsRulesRouterV1.put("/:id", updateViewAsRule);
viewAsRulesRouterV1.post("/check", checkViewAsPermission);

export default viewAsRulesRouterV1;