import { Router } from "express";
import { handleJustCallWhatsAppWebhook } from "../../controllers/v1/justcall-whatsapp-webhook.controller";

const justCallWhatsAppWebhookRouterV1 = Router();
justCallWhatsAppWebhookRouterV1.post("/events", handleJustCallWhatsAppWebhook);

export default justCallWhatsAppWebhookRouterV1;
