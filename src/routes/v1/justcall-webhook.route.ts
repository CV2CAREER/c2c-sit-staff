import { Router } from "express";
import { handleJustCallWebhook } from "../../controllers/v1/justcall-webhook.controller";

const justCallWebhookRouterV1 = Router();
justCallWebhookRouterV1.post("/events", handleJustCallWebhook);

export default justCallWebhookRouterV1;
