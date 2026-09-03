import axios from "axios";
import { JustCallWhatsAppMessage } from "../models/v1/justcall-whatsapp-message.model";
import { JustCallWhatsAppMessageLog } from "../models/v1/justcall-whatsapp-message-log.model";
import { getServiceLogger } from "../utils/createLogger";
import { deepMerge, toExternalId } from "../utils/deepMerge";
import { uploadBufferToStorage } from "../utils/fileUpload";

const logger = getServiceLogger("JustCallWhatsAppWebhookService");

export interface RecordWhatsAppEventResult {
  event: JustCallWhatsAppMessage;
  // Pre-update snapshot when this delivery updated an existing row (same
  // message), null when it created a brand new one.
  previous: Record<string, any> | null;
}

/**
 * Handles whatsapp.* events - see justcall-webhook.service.ts (call.* and
 * jc.* events) and justcall-message-webhook.service.ts (sms.*) for the other
 * two families. WhatsApp's `data` shape overlaps with SMS on contact/agent
 * metadata and direction/delivery_status, but adds reactions, read
 * receipts, and business template messages (with their own header media) -
 * different enough to warrant its own table.
 *
 * Upserts on externalId the same way calls/SMS do, deep-merging each
 * delivery's whole body onto whatever is already on file so a narrower
 * delivery can't null out data a fuller one already gave us.
 */
export const recordEvent = async (body: any): Promise<RecordWhatsAppEventResult> => {
  const incomingData = body?.data ?? {};
  const externalId = toExternalId(incomingData?.id);
  const eventType = body?.type ?? "unknown";

  // Order by updatedAt so we always resolve to the row this message was
  // last written to, even if duplicate rows exist for the same externalId.
  const existing = externalId
    ? await JustCallWhatsAppMessage.findOne({
        where: { externalId },
        order: [["updatedAt", "DESC"]],
      })
    : null;

  const mergedPayload = existing ? deepMerge(existing.payload ?? {}, body) : body;
  const mergedData = mergedPayload?.data ?? {};
  const messageInfo = mergedData?.message_info ?? {};
  const template = messageInfo?.template ?? {};

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
    messageOrigin: mergedData?.message_origin,
    body: messageInfo?.body,
    isMms: messageInfo?.is_mms === "Yes",
    isTemplate: messageInfo?.is_template === "Yes",
    templateName: template?.template_name,
    // the merged, current-state view - not the raw body, which may only be
    // a partial patch. The untouched raw body is preserved in the log below.
    payload: mergedPayload,
  };

  let event: JustCallWhatsAppMessage;
  let previous: Record<string, any> | null = null;
  let changes: string[] = [];

  if (existing) {
    const previousSnapshot: Record<string, any> = existing.toJSON();
    await existing.update(fields);
    event = existing;
    changes = summarizeChanges(previousSnapshot, event);
    previous = previousSnapshot;

    logger.info(
      `Updated JustCall WhatsApp message ${event.id} (${previousSnapshot.eventType} -> ${event.eventType})`,
    );
  } else {
    event = await JustCallWhatsAppMessage.create(fields);

    logger.info(`Stored JustCall WhatsApp message ${event.id} (${event.eventType})`);
  }

  await JustCallWhatsAppMessageLog.create({
    justCallWhatsAppMessageId: event.id,
    eventType,
    changes,
    payload: body,
  });

  return { event, previous };
};

/**
 * Human-readable list of what changed between two deliveries for the same
 * WhatsApp message. Reads straight off the stored payloads rather than
 * event-specific columns, so it keeps working as new event types show up.
 */
export const summarizeChanges = (
  previous: Record<string, any>,
  event: JustCallWhatsAppMessage,
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

  if (currData.read_date && !prevData.read_date) {
    changes.push(`Read: ${currData.read_date} ${currData.read_time ?? ""}`.trim());
  }

  if (currData.reaction_inbound && prevData.reaction_inbound !== currData.reaction_inbound) {
    changes.push(`Reaction received: ${currData.reaction_inbound}`);
  }

  if (currData.reaction_outbound && prevData.reaction_outbound !== currData.reaction_outbound) {
    changes.push(`Reaction sent: ${currData.reaction_outbound}`);
  }

  if (currData.failure_reason && prevData.failure_reason !== currData.failure_reason) {
    changes.push(`Failed: ${currData.failure_reason}`);
  }

  const prevTemplate = prevData?.message_info?.template;
  const currTemplate = currData?.message_info?.template;
  if (currTemplate?.template_name && !prevTemplate?.template_name) {
    changes.push(`Template used: ${currTemplate.template_name}`);
  }

  return changes;
};

const FIREBASE_STORAGE_PREFIX = "https://storage.googleapis.com/";

/**
 * Downloads a single media URL and re-hosts it into our Firebase Storage
 * bucket, returning the updated {mediaUrl, originalUrl} or null if there was
 * nothing to do (already re-hosted, or no URL present).
 */
const rehostOne = async (
  mediaUrl: string | undefined,
  contentType: string | undefined,
  event: JustCallWhatsAppMessage,
  label: string,
): Promise<{ mediaUrl: string; originalUrl: string } | null> => {
  if (!mediaUrl || mediaUrl.startsWith(FIREBASE_STORAGE_PREFIX)) return null;

  try {
    const response = await axios.get(mediaUrl, { responseType: "arraybuffer" });
    const buffer = Buffer.from(response.data);
    const extension = contentType?.split("/")[1] || "bin";
    const filename = `${event.externalId || event.id}-${label}-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}.${extension}`;

    const uploaded = await uploadBufferToStorage(buffer, filename, {
      folder: "justcall-whatsapp-media",
      mimeType: contentType,
    });

    return { mediaUrl: uploaded.url, originalUrl: mediaUrl };
  } catch (error) {
    logger.error(`Failed to rehost JustCall WhatsApp ${label} for event ${event.id}: ${error}`);
    return null;
  }
};

/**
 * WhatsApp messages can carry media in two different places, both hosted on
 * JustCall's own CDN (Filestack) - a link we don't control and that can
 * expire or be revoked:
 *   - message_info.mms.media_url: the message's own attachment (a single
 *     object here, unlike SMS's mms array)
 *   - message_info.template.header_value: a business template's header
 *     image, present only when the template's header_type is media
 * Re-hosts whichever are present into our own Firebase Storage bucket and
 * repoints them at that copy, keeping the original JustCall URL alongside
 * (as justcall_media_url / justcall_header_value). Best-effort per field: a
 * download/upload failure leaves that one field pointed at JustCall's URL
 * rather than failing the whole event.
 */
export const rehostWhatsAppMedia = async (event: JustCallWhatsAppMessage): Promise<void> => {
  const messageInfo = event.payload?.data?.message_info;
  if (!messageInfo) return;

  const mms = messageInfo.mms;
  const template = messageInfo.template;

  const [rehostedMms, rehostedHeader] = await Promise.all([
    rehostOne(mms?.media_url, mms?.content_type, event, "mms"),
    rehostOne(template?.header_value, undefined, event, "header"),
  ]);

  if (!rehostedMms && !rehostedHeader) return;

  const updatedMessageInfo = {
    ...messageInfo,
    ...(rehostedMms
      ? { mms: { ...mms, media_url: rehostedMms.mediaUrl, justcall_media_url: rehostedMms.originalUrl } }
      : {}),
    ...(rehostedHeader
      ? {
          template: {
            ...template,
            header_value: rehostedHeader.mediaUrl,
            justcall_header_value: rehostedHeader.originalUrl,
          },
        }
      : {}),
  };

  await event.update({
    payload: {
      ...event.payload,
      data: {
        ...event.payload.data,
        message_info: updatedMessageInfo,
      },
    },
  });

  logger.info(
    `Re-hosted WhatsApp media for event ${event.id} (mms: ${!!rehostedMms}, header: ${!!rehostedHeader})`,
  );
};
