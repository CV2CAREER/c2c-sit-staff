import { Response } from "express";
import * as JustCallMessageWebhookService from "../../services/justcall-message-webhook.service";
import catchAsyncError from "../../utils/catchAsyncError";
import ErrorHandler from "../../utils/errorHandler";
import { getServiceLogger } from "../../utils/createLogger";
import { JUSTCALL_WEBHOOK_SECRET } from "../../config/env";
import { SlackService } from "../../services/slack.service";
import {
  SlackChannel,
  SlackEventType,
  SlackNode,
  SlackProvider,
  SlackSeverity,
} from "../../utils/enum";

const logger = getServiceLogger("justcall-message-webhook-controller");

export const handleJustCallMessageWebhook = catchAsyncError(
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

    const eventType = req.body?.type ?? "unknown";
    const host = req.body?.host ?? req.headers?.host ?? "unknown";

    try {
      const { event, previous } = await JustCallMessageWebhookService.recordEvent(req.body);
      const isUpdate = previous !== null;

      logger.info(
        `JustCall message webhook ${isUpdate ? "updated" : "received"}: ${event.eventType} (${event.id})`,
      );

      setImmediate(async () => {
        try {
          await JustCallMessageWebhookService.rehostSmsMedia(event);
        } catch (err) {
          logger.error(`❌ Failed to rehost JustCall SMS media: ${err}`);
        }

        try {
          const contactLine = `Contact: ${event.contactName ?? "N/A"} (${event.contactNumber ?? "N/A"})`;

          const body = isUpdate
            ? [
                `🔄 JustCall message updated — ${previous!.eventType} → ${event.eventType}`,
                `Message ID: ${event.externalId ?? "N/A"}`,
                contactLine,
                ...JustCallMessageWebhookService.summarizeChanges(previous!, event),
              ].join("\n")
            : `✅ JustCall message recorded — ${event.eventType}\nEvent ID: ${event.id}\n${contactLine}`;

          await SlackService.notify({
            host,
            node: SlackNode.MESSAGING,
            provider: SlackProvider.JUSTCALL,
            severity: SlackSeverity.INFO,
            type: SlackEventType.SYSTEM_NOTIFICATION,
            trigger: isUpdate ? "justcall-message-webhook-updated" : "justcall-message-webhook-recorded",
            channel: SlackChannel.JOB_PIPELINE,
            body,
          });
          logger.info(
            `✅ Slack notified of ${isUpdate ? "updated" : "recorded"} JustCall message event: ${event.id}`,
          );
        } catch (err) {
          logger.error(`❌ Slack notification failed: ${err}`);
        }
      });

      return res.apiSuccess({ id: event.id }, isUpdate ? "Message event updated" : "Message event recorded");
    } catch (error: any) {
      setImmediate(async () => {
        try {
          await SlackService.notify({
            host,
            node: SlackNode.MESSAGING,
            provider: SlackProvider.JUSTCALL,
            severity: SlackSeverity.ERROR,
            type: SlackEventType.ERROR_ALERT,
            trigger: "justcall-message-webhook-failed",
            channel: SlackChannel.JOB_PIPELINE,
            body: `❌ JustCall message event failed to record — ${eventType}\nReason: ${error.message}`,
          });
          logger.info(`✅ Slack notified of failed JustCall message event: ${eventType}`);
        } catch (err) {
          logger.error(`❌ Slack notification failed: ${err}`);
        }
      });

      throw error;
    }
  },
);
