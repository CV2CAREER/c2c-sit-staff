import axios from "axios";
import { JustCallMessageEvent } from "../models/v1/justcall-message.model";
import { JustCallMessageEventLog } from "../models/v1/justcall-message-log.model";
import { getServiceLogger } from "../utils/createLogger";
import { deepMerge, toExternalId } from "../utils/deepMerge";
import { uploadBufferToStorage } from "../utils/fileUpload";

const logger = getServiceLogger("JustCallMessageWebhookService");

export interface RecordMessageEventResult {
  event: JustCallMessageEvent;
  // Pre-update snapshot when this delivery updated an existing row (same
  // message), null when it created a brand new one.
  previous: Record<string, any> | null;
}

/**
 * Handles sms.* events - see justcall-webhook.service.ts for call.* and
 * jc.* events, which have an almost entirely disjoint `data` shape
 * (call_info, call_duration, queue, justcall_iq) and their own table.
 *
 * A message can get more than one delivery (e.g. delivery_status moving
 * from "sent" to "delivered"), so we upsert on externalId the same way calls
 * do, deep-merging each delivery's whole body onto whatever is already on
 * file so a narrower delivery can't null out data a fuller one already gave us.
 */
export const recordEvent = async (body: any): Promise<RecordMessageEventResult> => {
  const incomingData = body?.data ?? {};
  const externalId = toExternalId(incomingData?.sms_id) ?? toExternalId(incomingData?.id);
  const eventType = body?.type ?? "unknown";

  // Order by updatedAt so we always resolve to the row this message was
  // last written to, even if duplicate rows exist for the same externalId.
  const existing = externalId
    ? await JustCallMessageEvent.findOne({
        where: { externalId },
        order: [["updatedAt", "DESC"]],
      })
    : null;

  const mergedPayload = existing ? deepMerge(existing.payload ?? {}, body) : body;
  const mergedData = mergedPayload?.data ?? {};
  const smsInfo = mergedData?.sms_info ?? {};

  const fields = {
    eventType,
    requestId: body?.request_id,
    urlId: body?.url_id,
    externalId,
    contactNumber: mergedData?.contact_number,
    contactName: mergedData?.contact_name,
    contactEmail: mergedData?.contact_email,
    justcallNumber: mergedData?.justcall_number,
    justcallLineName: mergedData?.justcall_line_name,
    agentId:
      mergedData?.agent_id !== undefined && mergedData?.agent_id !== null
        ? String(mergedData.agent_id)
        : undefined,
    agentName: mergedData?.agent_name,
    agentEmail: mergedData?.agent_email,
    direction: mergedData?.direction,
    deliveryStatus: mergedData?.delivery_status,
    body: smsInfo?.body,
    isMms: !!smsInfo?.is_mms,
    medium: mergedData?.medium,
    // the merged, current-state view - not the raw body, which may only be
    // a partial patch. The untouched raw body is preserved in the log below.
    payload: mergedPayload,
  };

  let event: JustCallMessageEvent;
  let previous: Record<string, any> | null = null;
  let changes: string[] = [];

  if (existing) {
    const previousSnapshot: Record<string, any> = existing.toJSON();
    await existing.update(fields);
    event = existing;
    changes = summarizeChanges(previousSnapshot, event);
    previous = previousSnapshot;

    logger.info(
      `Updated JustCall message event ${event.id} (${previousSnapshot.eventType} -> ${event.eventType})`,
    );
  } else {
    event = await JustCallMessageEvent.create(fields);

    logger.info(`Stored JustCall message event ${event.id} (${event.eventType})`);
  }

  await JustCallMessageEventLog.create({
    justCallMessageEventId: event.id,
    eventType,
    changes,
    payload: body,
  });

  return { event, previous };
};

/**
 * Human-readable list of what changed between two deliveries for the same
 * message. Reads straight off the stored payloads rather than event-specific
 * columns, so it keeps working as new event types show up.
 */
export const summarizeChanges = (
  previous: Record<string, any>,
  event: JustCallMessageEvent,
): string[] => {
  const prevData = previous?.payload?.data ?? {};
  const currData = event.payload?.data ?? {};

  const changes: string[] = [];

  if (previous.eventType !== event.eventType) {
    changes.push(`Stage: ${previous.eventType} → ${event.eventType}`);
  }

  if (
    currData.delivery_status &&
    prevData.delivery_status !== currData.delivery_status
  ) {
    changes.push(`Delivery: ${prevData.delivery_status || "N/A"} → ${currData.delivery_status}`);
  }

  const prevMms = prevData?.sms_info?.mms;
  const currMms = currData?.sms_info?.mms;
  if (Array.isArray(currMms) && currMms.length > 0 && !Array.isArray(prevMms)) {
    changes.push(`MMS attachment(s): ${currMms.length}`);
  }

  return changes;
};

const FIREBASE_STORAGE_PREFIX = "https://storage.googleapis.com/";

/**
 * MMS attachments point `sms_info.mms[].media_url` at JustCall's own CDN
 * (Filestack) - a link we don't control and that can expire or be revoked.
 * Re-hosts each attachment into our own Firebase Storage bucket and repoints
 * `media_url` at that copy, keeping the original JustCall URL alongside as
 * `justcall_media_url` for reference. Best-effort: a download/upload failure
 * for one attachment leaves it pointed at JustCall's URL rather than failing
 * the whole event.
 */
export const rehostSmsMedia = async (event: JustCallMessageEvent): Promise<void> => {
  const mms = event.payload?.data?.sms_info?.mms;
  if (!Array.isArray(mms) || mms.length === 0) return;

  let changed = false;

  const rehostedMms = await Promise.all(
    mms.map(async (item: any) => {
      if (!item?.media_url || item.media_url.startsWith(FIREBASE_STORAGE_PREFIX)) {
        return item;
      }

      try {
        const response = await axios.get(item.media_url, { responseType: "arraybuffer" });
        const buffer = Buffer.from(response.data);
        const extension = item.content_type?.split("/")[1] || "bin";
        const filename = `${event.externalId || event.id}-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 8)}.${extension}`;

        const uploaded = await uploadBufferToStorage(buffer, filename, {
          folder: "justcall-sms-media",
          mimeType: item.content_type,
        });

        changed = true;
        return { ...item, media_url: uploaded.url, justcall_media_url: item.media_url };
      } catch (error) {
        logger.error(`Failed to rehost JustCall MMS media for event ${event.id}: ${error}`);
        return item;
      }
    }),
  );

  if (!changed) return;

  await event.update({
    payload: {
      ...event.payload,
      data: {
        ...event.payload.data,
        sms_info: {
          ...event.payload.data.sms_info,
          mms: rehostedMms,
        },
      },
    },
  });

  logger.info(`Re-hosted ${rehostedMms.length} MMS attachment(s) for message event ${event.id}`);
};
