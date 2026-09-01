import { SendGridEvent } from "../models/v1/sendgrid-event.model";
import { SendGridEventLog } from "../models/v1/sendgrid-event-log.model";
import { getServiceLogger } from "../utils/createLogger";

const logger = getServiceLogger("SendGridWebhookService");

// Events worth a Slack alert - routine delivered/open/click/processed
// volume would flood the channel across every send, so only surface the
// ones that need a human to look at something.
const NOTIFY_EVENT_TYPES = new Set(["bounce", "dropped", "spamreport", "unsubscribe"]);

export interface ProcessedSendGridEvent {
  eventType: string;
  email?: string;
  isDuplicate: boolean;
  notifyWorthy: boolean;
  reason?: string;
}

/**
 * SendGrid batches many events - possibly for several different emails - into
 * one webhook POST. Entirely self-contained: SendGridEvent/SendGridEventLog
 * hold everything needed, with no reference to EmailLog (which backs the
 * client-facing notifications list) at all, so this can never alter that
 * table or anything that reads it - same reasoning as the JustCall tables
 * each being independent of any pre-existing system.
 *
 * Upserts SendGridEvent on sg_message_id (order by updatedAt DESC, same as
 * the JustCall tables, in case of duplicate rows). sgEventId is unique on
 * SendGridEventLog, so a redelivered event is silently skipped rather than
 * double-counted or re-alerted.
 */
export const processEvents = async (events: any[]): Promise<ProcessedSendGridEvent[]> => {
  const results: ProcessedSendGridEvent[] = [];

  for (const event of events) {
    const eventType = event?.event ?? "unknown";
    const sgEventId = event?.sg_event_id;
    const sgMessageId = event?.sg_message_id;

    if (sgEventId) {
      const existingLog = await SendGridEventLog.findOne({ where: { sgEventId } });
      if (existingLog) {
        logger.info(`Skipping duplicate SendGrid event ${sgEventId} (${eventType})`);
        results.push({ eventType, email: event?.email, isDuplicate: true, notifyWorthy: false });
        continue;
      }
    }

    const existing = sgMessageId
      ? await SendGridEvent.findOne({
          where: { sgMessageId },
          order: [["updatedAt", "DESC"]],
        })
      : null;

    const fields = buildFields(existing, event);

    let record: SendGridEvent;
    if (existing) {
      await existing.update(fields);
      record = existing;
    } else {
      record = await SendGridEvent.create(fields);
    }

    await SendGridEventLog.create({
      sendGridEventId: record.id,
      sgEventId,
      eventType,
      eventTimestamp: event?.timestamp ? new Date(event.timestamp * 1000) : undefined,
      payload: event,
    });

    results.push({
      eventType,
      email: event?.email,
      isDuplicate: false,
      notifyWorthy: NOTIFY_EVENT_TYPES.has(eventType),
      reason: event?.reason,
    });
  }

  return results;
};

const buildFields = (
  existing: SendGridEvent | null,
  event: any,
): Record<string, any> => {
  const now = event?.timestamp ? new Date(event.timestamp * 1000) : new Date();
  const eventType = event?.event;

  const fields: Record<string, any> = {
    sgMessageId: event?.sg_message_id,
    email: event?.email,
    lastEventType: eventType,
    lastEventAt: now,
    payload: event,
    // preserve prior milestone columns; only the switch below overwrites
    // the one(s) relevant to this specific event
    deliveredAt: existing?.deliveredAt,
    openedAt: existing?.openedAt,
    openCount: existing?.openCount ?? 0,
    clickedAt: existing?.clickedAt,
    clickCount: existing?.clickCount ?? 0,
    bouncedAt: existing?.bouncedAt,
    bounceReason: existing?.bounceReason,
    droppedAt: existing?.droppedAt,
    dropReason: existing?.dropReason,
    unsubscribedAt: existing?.unsubscribedAt,
    spamReportedAt: existing?.spamReportedAt,
  };

  switch (eventType) {
    case "delivered":
      fields.deliveredAt = existing?.deliveredAt ?? now;
      break;
    case "open":
      fields.openedAt = existing?.openedAt ?? now;
      fields.openCount = (existing?.openCount ?? 0) + 1;
      break;
    case "click":
      fields.clickedAt = existing?.clickedAt ?? now;
      fields.clickCount = (existing?.clickCount ?? 0) + 1;
      break;
    case "bounce":
      fields.bouncedAt = now;
      fields.bounceReason = event?.reason?.slice(0, 512);
      break;
    case "dropped":
      fields.droppedAt = now;
      fields.dropReason = event?.reason?.slice(0, 512);
      break;
    case "unsubscribe":
    case "group_unsubscribe":
      fields.unsubscribedAt = now;
      break;
    case "spamreport":
      fields.spamReportedAt = now;
      break;
    default:
      // processed, deferred, group_resubscribe - lastEventType/lastEventAt
      // above is enough; no dedicated column for these.
      break;
  }

  return fields;
};
