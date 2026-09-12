import { Response } from "express";
import * as SendGridWebhookService from "../../services/sendgrid-webhook.service";
import catchAsyncError from "../../utils/catchAsyncError";
import ErrorHandler from "../../utils/errorHandler";
import { getServiceLogger } from "../../utils/createLogger";
import { SENDGRID_WEBHOOK_PUBLIC_KEY } from "../../config/env";
import { verifySendGridSignature } from "../../utils/sendgridSignature";
import { SlackService } from "../../services/slack.service";
import {
  SlackChannel,
  SlackEventType,
  SlackNode,
  SlackProvider,
  SlackSeverity,
} from "../../utils/enum";

const logger = getServiceLogger("sendgrid-webhook-controller");

export const handleSendGridWebhook = catchAsyncError(async (req: any, res: Response) => {
  // SendGrid supports real ECDSA-signed payloads (unlike JustCall, which has
  // no signature scheme at all) - verify against the raw body when a public
  // key is configured; skip verification if it isn't set.
  if (SENDGRID_WEBHOOK_PUBLIC_KEY) {
    const signature = req.headers["x-twilio-email-event-webhook-signature"];
    const timestamp = req.headers["x-twilio-email-event-webhook-timestamp"];
    const isValid = verifySendGridSignature(
      SENDGRID_WEBHOOK_PUBLIC_KEY,
      req.rawBody,
      signature,
      timestamp,
    );
    if (!isValid) {
      throw new ErrorHandler("Invalid webhook signature", 401);
    }
  }

  // SendGrid always posts an array - possibly events for several different
  // emails batched into one request.
  const events = Array.isArray(req.body) ? req.body : [];

  const results = await SendGridWebhookService.processEvents(events);

  logger.info(
    `SendGrid webhook processed ${results.length} event(s) (${results.filter((r) => r.isDuplicate).length} duplicate(s) skipped)`,
  );

  setImmediate(async () => {
    for (const result of results) {
      if (!result.notifyWorthy) continue;

      try {
        await SlackService.notify({
          node: SlackNode.MESSAGING,
          provider: SlackProvider.SENDGRID,
          severity: SlackSeverity.ERROR,
          type: SlackEventType.ERROR_ALERT,
          trigger: `sendgrid-${result.eventType}`,
          channel: SlackChannel.TOWN_CRIER,
          body: [
            `⚠️ SendGrid event: ${result.eventType}`,
            `Email: ${result.email ?? "N/A"}`,
            result.reason ? `Reason: ${result.reason}` : undefined,
          ]
            .filter(Boolean)
            .join("\n"),
        });
      } catch (err) {
        logger.error(`❌ Slack notification failed: ${err}`);
      }
    }
  });

  // SendGrid expects a fast 2xx with no particular body, and will retry
  // (then eventually disable the webhook) on repeated non-2xx responses.
  return res.apiSuccess({ processed: results.length }, "Events processed");
});
