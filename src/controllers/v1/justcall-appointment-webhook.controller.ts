import { Response } from "express";
import * as JustCallAppointmentWebhookService from "../../services/justcall-appointment-webhook.service";
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

const logger = getServiceLogger("justcall-appointment-webhook-controller");

export const handleJustCallAppointmentWebhook = catchAsyncError(
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
      const { event, previous } = await JustCallAppointmentWebhookService.recordEvent(req.body);
      const isUpdate = previous !== null;

      logger.info(
        `JustCall appointment webhook ${isUpdate ? "updated" : "received"}: ${event.eventType} (${event.id})`,
      );

      setImmediate(async () => {
        try {
          const customerLine = `Customer: ${event.customerFirstName ?? "N/A"} ${event.customerLastName ?? ""} (${event.customerEmail ?? "N/A"})`.trim();
          const calendarLine = `Calendar: ${event.calendarName ?? "N/A"}`;

          const body = isUpdate
            ? [
                `🔄 JustCall appointment updated — ${previous!.eventType} → ${event.eventType}`,
                `Appointment ID: ${event.externalId ?? "N/A"}`,
                calendarLine,
                customerLine,
                ...JustCallAppointmentWebhookService.summarizeChanges(previous!, event),
              ].join("\n")
            : `✅ JustCall appointment recorded — ${event.eventType}\nEvent ID: ${event.id}\n${calendarLine}\n${customerLine}`;

          await SlackService.notify({
            host,
            node: SlackNode.USER_MANAGEMENT,
            provider: SlackProvider.JUSTCALL,
            severity: SlackSeverity.INFO,
            type: SlackEventType.SYSTEM_NOTIFICATION,
            trigger: isUpdate
              ? "justcall-appointment-webhook-updated"
              : "justcall-appointment-webhook-recorded",
            channel: SlackChannel.JOB_PIPELINE,
            body,
          });
          logger.info(
            `✅ Slack notified of ${isUpdate ? "updated" : "recorded"} JustCall appointment: ${event.id}`,
          );
        } catch (err) {
          logger.error(`❌ Slack notification failed: ${err}`);
        }
      });

      return res.apiSuccess(
        { id: event.id },
        isUpdate ? "Appointment event updated" : "Appointment event recorded",
      );
    } catch (error: any) {
      setImmediate(async () => {
        try {
          await SlackService.notify({
            host,
            node: SlackNode.USER_MANAGEMENT,
            provider: SlackProvider.JUSTCALL,
            severity: SlackSeverity.ERROR,
            type: SlackEventType.ERROR_ALERT,
            trigger: "justcall-appointment-webhook-failed",
            channel: SlackChannel.JOB_PIPELINE,
            body: `❌ JustCall appointment event failed to record — ${eventType}\nReason: ${error.message}`,
          });
          logger.info(`✅ Slack notified of failed JustCall appointment event: ${eventType}`);
        } catch (err) {
          logger.error(`❌ Slack notification failed: ${err}`);
        }
      });

      throw error;
    }
  },
);
