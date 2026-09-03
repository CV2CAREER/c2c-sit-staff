import { Router } from "express";
import { handleJustCallAppointmentWebhook } from "../../controllers/v1/justcall-appointment-webhook.controller";

const justCallAppointmentWebhookRouterV1 = Router();
justCallAppointmentWebhookRouterV1.post("/events", handleJustCallAppointmentWebhook);

export default justCallAppointmentWebhookRouterV1;
