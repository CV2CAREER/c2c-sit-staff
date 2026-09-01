import { Router } from "express";
import { handleSendGridWebhook } from "../../controllers/v1/sendgrid-webhook.controller";

const sendGridWebhookRouterV1 = Router();
sendGridWebhookRouterV1.post("/events", handleSendGridWebhook);

export default sendGridWebhookRouterV1;
