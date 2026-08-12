import { Router } from "express";
import { checkBlacklistedTokens } from "@/middlewares/checkBlacklistedToken";
import { isUserAuthenticated } from "@/middlewares/auth";
import { authorizeRoles } from "@/middlewares/authorizeRoles";
import {
  createCommunicationTemplate,
  deleteCommunicationTemplate,
  getCommunicationTemplates,
  notifyMissingInfo,
  patchCommunicationTemplate,
} from "@/controllers/v1/communication-template.controller";

const communicationTemplateRouterV1 = Router();

communicationTemplateRouterV1.use(
  checkBlacklistedTokens,
  isUserAuthenticated,
  authorizeRoles("admin", "assistant"),
);

communicationTemplateRouterV1.get("/", getCommunicationTemplates);
communicationTemplateRouterV1.post("/", authorizeRoles("admin"), createCommunicationTemplate);
communicationTemplateRouterV1.patch("/", authorizeRoles("admin"), patchCommunicationTemplate);
communicationTemplateRouterV1.delete("/", authorizeRoles("admin"), deleteCommunicationTemplate);
communicationTemplateRouterV1.post("/notify-missing-info", authorizeRoles("admin"), notifyMissingInfo);
communicationTemplateRouterV1.post("/notify-missing-info-whatsapp", authorizeRoles("admin"), notifyMissingInfo);

export default communicationTemplateRouterV1;

