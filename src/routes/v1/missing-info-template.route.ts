import { Router } from "express";
import { checkBlacklistedTokens } from "@/middlewares/checkBlacklistedToken";
import { isUserAuthenticated } from "@/middlewares/auth";
import { authorizeRoles } from "@/middlewares/authorizeRoles";
import { dbMiddleware } from "@/middlewares/dbReady";
import {
  getMissingInfoTemplates,
  getMissingInfoTemplate,
  createMissingInfoTemplate,
  updateMissingInfoTemplate,
  deleteMissingInfoTemplate,
  publishMissingInfoTemplate,
} from "@/controllers/v1/missing-info-template.controller";

const missingInfoTemplateRouterV1 = Router();

missingInfoTemplateRouterV1.use(
  checkBlacklistedTokens,
  isUserAuthenticated,
  authorizeRoles("admin", "assistant"),
  dbMiddleware,
);

missingInfoTemplateRouterV1.get("/", getMissingInfoTemplates);
missingInfoTemplateRouterV1.get("/:id", getMissingInfoTemplate);
missingInfoTemplateRouterV1.post("/", authorizeRoles("admin"), createMissingInfoTemplate);
missingInfoTemplateRouterV1.put("/:id", authorizeRoles("admin"), updateMissingInfoTemplate);
missingInfoTemplateRouterV1.delete("/:id", authorizeRoles("admin"), deleteMissingInfoTemplate);
missingInfoTemplateRouterV1.post("/:id/publish", authorizeRoles("admin"), publishMissingInfoTemplate);

export default missingInfoTemplateRouterV1;
