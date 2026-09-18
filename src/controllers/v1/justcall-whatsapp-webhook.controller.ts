import { Response } from "express";
import * as JustCallWhatsAppWebhookService from "../../services/justcall-whatsapp-webhook.service";
import catchAsyncError from "../../utils/catchAsyncError";
import ErrorHandler from "../../utils/errorHandler";
import { getServiceLogger } from "../../utils/createLogger";
import { JUSTCALL_WEBHOOK_SECRET } from "../../config/env";

const logger = getServiceLogger("justcall-whatsapp-webhook-controller");

export const handleJustCallWhatsAppWebhook = catchAsyncError(
  async (req: any, res: Response) => {
    // JustCall lets you set a custom header value on the webhook config in
    // their dashboard. If we've configured a secret to expect, enforce it;
    // otherwise accept the call unauthenticated (JustCall has no built-in
    // signature scheme).
    if (JUSTCALL_WEBHOOK_SECRET) {
      const receivedSecret = req.headers["x-webhook-secret"];
      if (receivedSecret !== JUSTCALL_WEBHOOK_SECRET) {
        throw new ErrorHandler("Invalid webhook secret", 401);
      }
    }

    const { event, previous } = await JustCallWhatsAppWebhookService.recordEvent(req.body);
    const isUpdate = previous !== null;

    logger.info(
      `JustCall WhatsApp webhook ${isUpdate ? "updated" : "received"}: ${event.eventType} (${event.id})`,
    );

    setImmediate(async () => {
      try {
        await JustCallWhatsAppWebhookService.rehostWhatsAppMedia(event);
      } catch (err) {
        logger.error(`❌ Failed to rehost JustCall WhatsApp media: ${err}`);
      }
    });

    return res.apiSuccess(
      { id: event.id },
      isUpdate ? "WhatsApp message event updated" : "WhatsApp message event recorded",
    );
  },
);
