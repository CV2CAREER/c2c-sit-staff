import { Router } from "express";
import { handleJustCallMessageWebhook } from "../../controllers/v1/justcall-message-webhook.controller";

const justCallMessageWebhookRouterV1 = Router();
justCallMessageWebhookRouterV1.post("/events", handleJustCallMessageWebhook);

export default justCallMessageWebhookRouterV1;
