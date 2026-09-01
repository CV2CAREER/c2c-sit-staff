import { Router } from "express";
import { handleJustCallSalesDialerWebhook } from "../../controllers/v1/justcall-sales-dialer-webhook.controller";

const justCallSalesDialerWebhookRouterV1 = Router();
justCallSalesDialerWebhookRouterV1.post("/events", handleJustCallSalesDialerWebhook);

export default justCallSalesDialerWebhookRouterV1;
