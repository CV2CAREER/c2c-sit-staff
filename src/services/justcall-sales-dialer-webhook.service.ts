import axios from "axios";
import { JustCallSalesDialerCall } from "../models/v1/justcall-sales-dialer-call.model";
import { JustCallSalesDialerCallLog } from "../models/v1/justcall-sales-dialer-call-log.model";
import { getServiceLogger } from "../utils/createLogger";
import { deepMerge, pickPopulated, toExternalId } from "../utils/deepMerge";
import { uploadBufferToStorage } from "../utils/fileUpload";

const logger = getServiceLogger("JustCallSalesDialerWebhookService");

export interface RecordSalesDialerEventResult {
  event: JustCallSalesDialerCall;
  // Pre-update snapshot when this delivery updated an existing row (same
  // call), null when it created a brand new one.
  previous: Record<string, any> | null;
}

/**
 * Handles sd.* (Sales Dialer) events - see justcall-webhook.service.ts for
 * plain call.* and jc.* events. Sales Dialer adds a predictive-dialer
 * campaign, a CRM-style contact_id, human/machine answer detection, and an
 * auto-redial reattempt_number - different enough from a regular call to
 * warrant its own table, same reasoning as the sms.* and whatsapp.* split.
 *
 * Upserts on externalId the same way the other JustCall tables do,
 * deep-merging each delivery's whole body onto whatever is already on file
 * so a narrower delivery can't null out data a fuller one already gave us.
 */
export const recordEvent = async (body: any): Promise<RecordSalesDialerEventResult> => {
  const incomingData = body?.data ?? {};
  // Sales Dialer names its own id field call_id, not id like other families.
  const externalId = toExternalId(incomingData?.call_sid) ?? toExternalId(incomingData?.call_id);
  const eventType = body?.type ?? "unknown";

  // Order by updatedAt so we always resolve to the row this call was last
  // written to, even if duplicate rows exist for the same externalId.
  const existing = externalId
    ? await JustCallSalesDialerCall.findOne({
        where: { externalId },
        order: [["updatedAt", "DESC"]],
      })
    : null;

  const mergedPayload = existing ? deepMerge(existing.payload ?? {}, body) : body;
  const mergedData = mergedPayload?.data ?? {};
  const campaign = mergedData?.campaign ?? {};
  const callInfo = mergedData?.call_info ?? {};

  const fields = {
    eventType,
    requestId: body?.request_id,
    urlId: body?.url_id,
    externalId,
    campaignId:
      campaign?.id !== undefined && campaign?.id !== null ? String(campaign.id) : undefined,
    campaignName: campaign?.name,
    campaignType: campaign?.type,
    contactId:
      mergedData?.contact_id !== undefined && mergedData?.contact_id !== null
        ? String(mergedData.contact_id)
        : undefined,
    contactNumber: mergedData?.contact_number,
    contactName: mergedData?.contact_name,
    contactEmail: mergedData?.contact_email,
    salesDialerNumber: mergedData?.sales_dialer_number,
    agentId:
      mergedData?.agent_id !== undefined && mergedData?.agent_id !== null
        ? String(mergedData.agent_id)
        : undefined,
    agentName: mergedData?.agent_name,
    agentEmail: mergedData?.agent_email,
    direction: callInfo?.direction,
    callAnsweredBy: callInfo?.call_answered_by,
    disposition: callInfo?.disposition,
    reattemptNumber:
      callInfo?.reattempt_number !== undefined && callInfo?.reattempt_number !== null
        ? Number(callInfo.reattempt_number)
        : undefined,
    // the merged, current-state view - not the raw body, which may only be
    // a partial patch. The untouched raw body is preserved in the log below.
    payload: mergedPayload,
  };

  let event: JustCallSalesDialerCall;
  let previous: Record<string, any> | null = null;
  let changes: string[] = [];

  if (existing) {
    const previousSnapshot: Record<string, any> = existing.toJSON();
    await existing.update(fields);
    event = existing;
    changes = summarizeChanges(previousSnapshot, event);
    previous = previousSnapshot;

    logger.info(
      `Updated JustCall Sales Dialer call ${event.id} (${previousSnapshot.eventType} -> ${event.eventType})`,
    );
  } else {
    event = await JustCallSalesDialerCall.create(fields);

    logger.info(`Stored JustCall Sales Dialer call ${event.id} (${event.eventType})`);
  }

  await JustCallSalesDialerCallLog.create({
    justCallSalesDialerCallId: event.id,
    eventType,
    changes,
    payload: body,
  });

  return { event, previous };
};

/**
 * Human-readable list of what changed between two deliveries for the same
 * Sales Dialer call. Reads straight off the stored payloads rather than
 * event-specific columns, so it keeps working as new event types show up.
 */
export const summarizeChanges = (
  previous: Record<string, any>,
  event: JustCallSalesDialerCall,
): string[] => {
  const prevData = previous?.payload?.data ?? {};
  const currData = event.payload?.data ?? {};
  const prevCallInfo = prevData?.call_info ?? {};
  const currCallInfo = currData?.call_info ?? {};

  // JustCall names this block "justcall_iq" on some event types and
  // "justcall_ai" on others for the *same* call - pick whichever actually
  // has a call_summary rather than whichever key happens to exist.
  const prevAi = pickPopulated([prevData?.justcall_iq, prevData?.justcall_ai], "call_summary");
  const currAi = pickPopulated([currData?.justcall_iq, currData?.justcall_ai], "call_summary");

  const changes: string[] = [];

  if (previous.eventType !== event.eventType) {
    changes.push(`Stage: ${previous.eventType} → ${event.eventType}`);
  }

  if (
    currCallInfo.call_answered_by &&
    prevCallInfo.call_answered_by !== currCallInfo.call_answered_by
  ) {
    changes.push(`Answered by: ${currCallInfo.call_answered_by}`);
  }

  if (currCallInfo.duration && prevCallInfo.duration !== currCallInfo.duration) {
    changes.push(`Duration: ${currCallInfo.friendly_duration ?? `${currCallInfo.duration}s`}`);
  }

  if (currCallInfo.recording && !prevCallInfo.recording) {
    changes.push(`Recording available`);
  }

  if (currCallInfo.disposition && prevCallInfo.disposition !== currCallInfo.disposition) {
    changes.push(`Disposition: ${prevCallInfo.disposition || "none"} → ${currCallInfo.disposition}`);
  }

  if (currCallInfo.notes && prevCallInfo.notes !== currCallInfo.notes) {
    changes.push(`Notes: ${currCallInfo.notes}`);
  }

  // Sales Dialer's rating is numeric (0 = unrated), unlike the string
  // rating ("0" = unrated) on plain call.* events.
  if (
    currCallInfo.rating !== undefined &&
    currCallInfo.rating !== null &&
    currCallInfo.rating !== 0 &&
    currCallInfo.rating !== prevCallInfo.rating
  ) {
    changes.push(`Rating: ${currCallInfo.rating}`);
  }

  if (
    currCallInfo.reattempt_number !== undefined &&
    currCallInfo.reattempt_number !== null &&
    currCallInfo.reattempt_number !== prevCallInfo.reattempt_number
  ) {
    changes.push(`Reattempt: ${currCallInfo.reattempt_number}`);
  }

  if (currAi.call_summary && !prevAi.call_summary) {
    changes.push(`AI call summary available (score: ${currAi.call_score ?? "N/A"})`);
  }

  return changes;
};

const FIREBASE_STORAGE_PREFIX = "https://storage.googleapis.com/";

/**
 * Sales Dialer's call recording lives on JustCall's own AWS S3 bucket - a
 * link outside our control that can expire or be revoked. Re-hosts it into
 * our own Firebase Storage bucket and repoints call_info.recording at that
 * copy, keeping the original JustCall URL alongside as
 * `justcall_recording_url`. Best-effort: a download/upload failure leaves
 * the recording pointed at JustCall's URL rather than failing the whole event.
 */
export const rehostCallRecording = async (event: JustCallSalesDialerCall): Promise<void> => {
  const callInfo = event.payload?.data?.call_info;
  const recordingUrl = callInfo?.recording;

  if (!recordingUrl || recordingUrl.startsWith(FIREBASE_STORAGE_PREFIX)) return;

  try {
    const response = await axios.get(recordingUrl, { responseType: "arraybuffer" });
    const buffer = Buffer.from(response.data);
    const extension = recordingUrl.split(".").pop()?.split("?")[0] || "mp3";
    const filename = `${event.externalId || event.id}-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}.${extension}`;

    const uploaded = await uploadBufferToStorage(buffer, filename, {
      folder: "justcall-sales-dialer-recordings",
      mimeType: "audio/mpeg",
    });

    await event.update({
      payload: {
        ...event.payload,
        data: {
          ...event.payload.data,
          call_info: {
            ...callInfo,
            recording: uploaded.url,
            justcall_recording_url: recordingUrl,
          },
        },
      },
    });

    logger.info(`Re-hosted Sales Dialer recording for event ${event.id}`);
  } catch (error) {
    logger.error(`Failed to rehost JustCall Sales Dialer recording for event ${event.id}: ${error}`);
  }
};
