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
communicationTemplateRouterV1.post("/", createCommunicationTemplate);
communicationTemplateRouterV1.patch("/", patchCommunicationTemplate);
communicationTemplateRouterV1.delete("/", deleteCommunicationTemplate);
communicationTemplateRouterV1.post("/notify-missing-info", notifyMissingInfo);
communicationTemplateRouterV1.post("/notify-missing-info-whatsapp", notifyMissingInfo);

export default communicationTemplateRouterV1;

