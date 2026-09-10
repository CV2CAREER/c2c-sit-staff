import { JustCallEvent } from "../models/v1/justcall-event.model";
import { JustCallEventLog } from "../models/v1/justcall-event-log.model";
import { getServiceLogger } from "../utils/createLogger";
import { deepMerge, pickPopulated, toExternalId } from "../utils/deepMerge";

const logger = getServiceLogger("JustCallWebhookService");

export interface RecordEventResult {
  event: JustCallEvent;
  // Pre-update snapshot when this delivery updated an existing row (same
  // call), null when it created a brand new one.
  previous: Record<string, any> | null;
}

/**
 * Handles call.* and jc.* (AI-analysis) events - see
 * justcall-message-webhook.service.ts for sms.*, which has an almost
 * entirely disjoint `data` shape and its own table.
 *
 * Not every delivery is a full snapshot - call.updated, for instance, only
 * carries the fields that actually changed (disposition/notes/rating),
 * omitting contact/agent/duration info a fuller event already gave us. Some
 * fields also live outside `data` and only get populated on certain event
 * types (e.g. queue_position on call.enters_queue). So each delivery's whole
 * body is deep-merged onto whatever is already on file rather than replacing
 * it outright, and the promoted columns are derived from that merged view -
 * a partial or narrower delivery can't null out data a fuller one already
 * captured.
 *
 * A single call fires several webhook deliveries that share the same
 * call_sid as it progresses (call.initiated -> call.ringing -> call.completed).
 * We upsert `justcall_events` on externalId so it always holds one current
 * record per call, and log every delivery - whatever changed vs. the prior
 * one, plus its own untouched raw body - into `justcall_event_logs`, so the
 * full history survives even though the current-state row gets overwritten.
 */
export const recordEvent = async (body: any): Promise<RecordEventResult> => {
  const incomingData = body?.data ?? {};
  const externalId = toExternalId(incomingData?.call_sid) ?? toExternalId(incomingData?.id);
  const eventType = body?.type ?? "unknown";

  // Order by updatedAt so we always resolve to the row this call was last
  // written to, even if duplicate rows exist for the same externalId (e.g.
  // left over from testing before this upsert behavior existed).
  const existing = externalId
    ? await JustCallEvent.findOne({
        where: { externalId },
        order: [["updatedAt", "DESC"]],
      })
    : null;

  const mergedPayload = existing ? deepMerge(existing.payload ?? {}, body) : body;
  const mergedData = mergedPayload?.data ?? {};
  const callInfo = mergedData?.call_info ?? {};

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
    // call.ai_voice_agent has no call_info block at all - direction lives
    // directly on data as call_direction instead.
    direction: callInfo?.direction ?? mergedData?.call_direction,
    status: callInfo?.status ?? mergedData?.status,
    // the merged, current-state view - not the raw body, which may only be
    // a partial patch. The untouched raw body is preserved in the log below.
    payload: mergedPayload,
  };

  let event: JustCallEvent;
  let previous: Record<string, any> | null = null;
  let changes: string[] = [];

  if (existing) {
    const previousSnapshot: Record<string, any> = existing.toJSON();
    await existing.update(fields);
    event = existing;
    changes = summarizeChanges(previousSnapshot, event);
    previous = previousSnapshot;

    logger.info(
      `Updated JustCall event ${event.id} (${previousSnapshot.eventType} -> ${event.eventType})`,
    );
  } else {
    event = await JustCallEvent.create(fields);

    logger.info(`Stored JustCall event ${event.id} (${event.eventType})`);
  }

  await JustCallEventLog.create({
    justCallEventId: event.id,
    eventType,
    changes,
    payload: body,
  });

  return { event, previous };
};

/**
 * Human-readable list of what changed between two deliveries for the same
 * call. Reads straight off the stored payloads rather than event-specific
 * columns, so it keeps working as new event types show up.
 */
export const summarizeChanges = (
  previous: Record<string, any>,
  event: JustCallEvent,
): string[] => {
  const prevPayload = previous?.payload ?? {};
  const currPayload = event.payload ?? {};
  const prevData = prevPayload?.data ?? {};
  const currData = currPayload?.data ?? {};
  const prevCallInfo = prevData?.call_info ?? {};
  const currCallInfo = currData?.call_info ?? {};
  const prevDuration = prevData?.call_duration ?? {};
  const currDuration = currData?.call_duration ?? {};

  // JustCall names this block "justcall_iq" on some event types and
  // "justcall_ai" on others for the *same* call - pick whichever actually
  // has a call_summary rather than whichever key happens to exist.
  const prevAi = pickPopulated([prevData?.justcall_iq, prevData?.justcall_ai], "call_summary");
  const currAi = pickPopulated([currData?.justcall_iq, currData?.justcall_ai], "call_summary");

  const changes: string[] = [];

  if (previous.eventType !== event.eventType) {
    changes.push(`Stage: ${previous.eventType} → ${event.eventType}`);
  }

  if (currCallInfo.type && prevCallInfo.type !== currCallInfo.type) {
    changes.push(`Outcome: ${prevCallInfo.type || "pending"} → ${currCallInfo.type}`);
  }

  if (prevCallInfo.status !== currCallInfo.status) {
    changes.push(`Status: ${prevCallInfo.status ?? "N/A"} → ${currCallInfo.status ?? "N/A"}`);
  }

  if (currDuration.total_duration && prevDuration.total_duration !== currDuration.total_duration) {
    changes.push(`Duration: ${currDuration.friendly_duration ?? `${currDuration.total_duration}s`}`);
  }

  if (currCallInfo.recording && !prevCallInfo.recording) {
    changes.push(`Recording available`);
  }

  if (currCallInfo.voicemail_transcription && !prevCallInfo.voicemail_transcription) {
    changes.push(`Voicemail transcription available`);
  }

  if (currCallInfo.disposition && prevCallInfo.disposition !== currCallInfo.disposition) {
    changes.push(`Disposition: ${prevCallInfo.disposition || "none"} → ${currCallInfo.disposition}`);
  }

  if (
    currCallInfo.rating &&
    currCallInfo.rating !== "0" &&
    prevCallInfo.rating !== currCallInfo.rating
  ) {
    changes.push(`Rating: ${currCallInfo.rating}`);
  }

  if (currCallInfo.notes && prevCallInfo.notes !== currCallInfo.notes) {
    changes.push(`Notes: ${currCallInfo.notes}`);
  }

  if (
    currCallInfo.missed_call_reason &&
    prevCallInfo.missed_call_reason !== currCallInfo.missed_call_reason
  ) {
    changes.push(`Missed reason: ${currCallInfo.missed_call_reason}`);
  }

  if (
    currPayload.queue_position &&
    prevPayload.queue_position !== currPayload.queue_position
  ) {
    changes.push(`Queue position: ${currPayload.queue_position}`);
  }

  if (
    currPayload.exit_reason &&
    prevPayload.exit_reason !== currPayload.exit_reason
  ) {
    changes.push(`Queue exit: ${currPayload.exit_reason}`);
  }

  if (currAi.call_summary && !prevAi.call_summary) {
    changes.push(`AI call summary available (score: ${currAi.call_score ?? "N/A"})`);
  }

  // call.ai_voice_agent: the AI agent's own actions (SMS sent, appointment
  // scheduled, call transferred, disposition set, etc.) during/after the call.
  if (currData.action_count && prevData.action_count !== currData.action_count) {
    const actionNames = Array.isArray(currData.actions)
      ? currData.actions.map((action: any) => action?.name).filter(Boolean).join(", ")
      : "";
    changes.push(`AI voice agent actions (${currData.action_count}): ${actionNames}`);
  }

  return changes;
};
