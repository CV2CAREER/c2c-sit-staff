import { Response } from "express";
import * as JustCallWebhookService from "../../services/justcall-webhook.service";
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

const logger = getServiceLogger("justcall-webhook-controller");

export const handleJustCallWebhook = catchAsyncError(
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
      const { event, previous } = await JustCallWebhookService.recordEvent(req.body);
      const isUpdate = previous !== null;

      logger.info(
        `JustCall webhook ${isUpdate ? "updated" : "received"}: ${event.eventType} (${event.id})`,
      );

      setImmediate(async () => {
        try {
          const contactLine = `Contact: ${event.contactName ?? "N/A"} (${event.contactNumber ?? "N/A"})`;

          const body = isUpdate
            ? [
                `🔄 JustCall event updated — ${previous!.eventType} → ${event.eventType}`,
                `Call SID: ${event.externalId ?? "N/A"}`,
                contactLine,
                ...JustCallWebhookService.summarizeChanges(previous!, event),
              ].join("\n")
            : `✅ JustCall event recorded — ${event.eventType}\nEvent ID: ${event.id}\n${contactLine}`;

          await SlackService.notify({
            host,
            node: SlackNode.TELEPHONY,
            provider: SlackProvider.JUSTCALL,
            severity: SlackSeverity.INFO,
            type: SlackEventType.SYSTEM_NOTIFICATION,
            trigger: isUpdate ? "justcall-webhook-updated" : "justcall-webhook-recorded",
            channel: SlackChannel.JOB_PIPELINE,
            body,
          });
          logger.info(
            `✅ Slack notified of ${isUpdate ? "updated" : "recorded"} JustCall event: ${event.id}`,
          );
        } catch (err) {
          logger.error(`❌ Slack notification failed: ${err}`);
        }
      });

      return res.apiSuccess({ id: event.id }, isUpdate ? "Event updated" : "Event recorded");
    } catch (error: any) {
      setImmediate(async () => {
        try {
          await SlackService.notify({
            host,
            node: SlackNode.TELEPHONY,
            provider: SlackProvider.JUSTCALL,
            severity: SlackSeverity.ERROR,
            type: SlackEventType.ERROR_ALERT,
            trigger: "justcall-webhook-failed",
            channel: SlackChannel.JOB_PIPELINE,
            body: `❌ JustCall event failed to record — ${eventType}\nReason: ${error.message}`,
          });
          logger.info(`✅ Slack notified of failed JustCall event: ${eventType}`);
        } catch (err) {
          logger.error(`❌ Slack notification failed: ${err}`);
        }
      });

      throw error;
    }
  },
);
