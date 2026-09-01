import { Response } from "express";
import * as JustCallSalesDialerWebhookService from "../../services/justcall-sales-dialer-webhook.service";
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

    const eventType = req.body?.type ?? "unknown";
    const host = req.body?.host ?? req.headers?.host ?? "unknown";

    try {
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

        try {
          const contactLine = `Contact: ${event.contactName ?? "N/A"} (${event.contactNumber ?? "N/A"})`;
          const campaignLine = `Campaign: ${event.campaignName ?? "N/A"}`;

          const body = isUpdate
            ? [
                `🔄 JustCall Sales Dialer call updated — ${previous!.eventType} → ${event.eventType}`,
                `Call SID: ${event.externalId ?? "N/A"}`,
                campaignLine,
                contactLine,
                ...JustCallSalesDialerWebhookService.summarizeChanges(previous!, event),
              ].join("\n")
            : `✅ JustCall Sales Dialer call recorded — ${event.eventType}\nEvent ID: ${event.id}\n${campaignLine}\n${contactLine}`;

          await SlackService.notify({
            host,
            node: SlackNode.TELEPHONY,
            provider: SlackProvider.JUSTCALL,
            severity: SlackSeverity.INFO,
            type: SlackEventType.SYSTEM_NOTIFICATION,
            trigger: isUpdate
              ? "justcall-sales-dialer-webhook-updated"
              : "justcall-sales-dialer-webhook-recorded",
            channel: SlackChannel.JOB_PIPELINE,
            body,
          });
          logger.info(
            `✅ Slack notified of ${isUpdate ? "updated" : "recorded"} JustCall Sales Dialer call: ${event.id}`,
          );
        } catch (err) {
          logger.error(`❌ Slack notification failed: ${err}`);
        }
      });

      return res.apiSuccess(
        { id: event.id },
        isUpdate ? "Sales Dialer call event updated" : "Sales Dialer call event recorded",
      );
    } catch (error: any) {
      setImmediate(async () => {
        try {
          await SlackService.notify({
            host,
            node: SlackNode.TELEPHONY,
            provider: SlackProvider.JUSTCALL,
            severity: SlackSeverity.ERROR,
            type: SlackEventType.ERROR_ALERT,
            trigger: "justcall-sales-dialer-webhook-failed",
            channel: SlackChannel.JOB_PIPELINE,
            body: `❌ JustCall Sales Dialer call failed to record — ${eventType}\nReason: ${error.message}`,
          });
          logger.info(`✅ Slack notified of failed JustCall Sales Dialer call: ${eventType}`);
        } catch (err) {
          logger.error(`❌ Slack notification failed: ${err}`);
        }
      });

      throw error;
    }
  },
);
