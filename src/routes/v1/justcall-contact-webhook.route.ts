import { Router } from "express";
import { handleJustCallContactWebhook } from "../../controllers/v1/justcall-contact-webhook.controller";

const justCallContactWebhookRouterV1 = Router();
justCallContactWebhookRouterV1.post("/events", handleJustCallContactWebhook);

export default justCallContactWebhookRouterV1;
