import { Router } from "express";
import { checkBlacklistedTokens } from "@/middlewares/checkBlacklistedToken";
import { isUserAuthenticated } from "@/middlewares/auth";
import { authorizeRoles } from "@/middlewares/authorizeRoles";
import {
  createCommunicationTemplate,
  deleteCommunicationTemplate,
  getCommunicationTemplates,
  listEmailTriggers,
  notifyMissingInfo,
  patchCommunicationTemplate,
  rebindEmailTrigger,
  resetEmailTrigger,
  resolveTestSend,
  sendDraftTestEmail,
  sendTestEmail,
} from "@/controllers/v1/communication-template.controller";

const communicationTemplateRouterV1 = Router();

communicationTemplateRouterV1.use(
  checkBlacklistedTokens,
  isUserAuthenticated,
  authorizeRoles("admin", "assistant"),
);

communicationTemplateRouterV1.get("/triggers", listEmailTriggers);
communicationTemplateRouterV1.patch("/triggers/:triggerKey", authorizeRoles("admin"), rebindEmailTrigger);
communicationTemplateRouterV1.delete("/triggers/:triggerKey", authorizeRoles("admin"), resetEmailTrigger);
communicationTemplateRouterV1.get("/:id/test-send/resolve", resolveTestSend);
communicationTemplateRouterV1.post("/:id/test-send", sendTestEmail);
communicationTemplateRouterV1.post("/test-send-draft", sendDraftTestEmail);

communicationTemplateRouterV1.get("/", getCommunicationTemplates);
communicationTemplateRouterV1.post("/", authorizeRoles("admin"), createCommunicationTemplate);
communicationTemplateRouterV1.patch("/", authorizeRoles("admin"), patchCommunicationTemplate);
communicationTemplateRouterV1.delete("/", authorizeRoles("admin"), deleteCommunicationTemplate);
communicationTemplateRouterV1.post("/notify-missing-info", authorizeRoles("admin"), notifyMissingInfo);
communicationTemplateRouterV1.post("/notify-missing-info-whatsapp", authorizeRoles("admin"), notifyMissingInfo);

export default communicationTemplateRouterV1;

