import { Response } from "express";
import * as JustCallSalesDialerWebhookService from "../../services/justcall-sales-dialer-webhook.service";
import catchAsyncError from "../../utils/catchAsyncError";
import ErrorHandler from "../../utils/errorHandler";
import { getServiceLogger } from "../../utils/createLogger";
import { JUSTCALL_WEBHOOK_SECRET } from "../../config/env";

const logger = getServiceLogger("justcall-sales-dialer-webhook-controller");

export const handleJustCallSalesDialerWebhook = catchAsyncError(
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

    const { event, previous } = await JustCallSalesDialerWebhookService.recordEvent(req.body);
    const isUpdate = previous !== null;

    logger.info(
      `JustCall Sales Dialer webhook ${isUpdate ? "updated" : "received"}: ${event.eventType} (${event.id})`,
    );

    setImmediate(async () => {
      try {
        await JustCallSalesDialerWebhookService.rehostCallRecording(event);
      } catch (err) {
        logger.error(`❌ Failed to rehost JustCall Sales Dialer recording: ${err}`);
      }
    });

    return res.apiSuccess(
      { id: event.id },
      isUpdate ? "Sales Dialer call event updated" : "Sales Dialer call event recorded",
    );
  },
);
