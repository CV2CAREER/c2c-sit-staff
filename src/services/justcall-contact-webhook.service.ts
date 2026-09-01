import { JustCallContact } from "../models/v1/justcall-contact.model";
import { JustCallContactLog } from "../models/v1/justcall-contact-log.model";
import { getServiceLogger } from "../utils/createLogger";
import { deepMerge, toExternalId } from "../utils/deepMerge";

const logger = getServiceLogger("JustCallContactWebhookService");

export interface RecordContactEventResult {
  event: JustCallContact;
  // Pre-update snapshot when this delivery updated an existing row (same
  // contact), null when it created a brand new one.
  previous: Record<string, any> | null;
}

/**
 * Handles jc.contact_* events - a JustCall contact/CRM record, not tied to
 * any call or message. Kept in its own table since its shape (name,
 * other_numbers, notes, blacklist/dnd/dnm compliance flags) has nothing in
 * common with call, sms, whatsapp, or sd events beyond the general envelope.
 *
 * Upserts on externalId (JustCall's own contact id) the same way the other
 * JustCall tables do, deep-merging each delivery's whole body onto whatever
 * is already on file so a narrower delivery can't null out data a fuller
 * one already gave us.
 */
export const recordEvent = async (body: any): Promise<RecordContactEventResult> => {
  const incomingData = body?.data ?? {};
  const externalId = toExternalId(incomingData?.id);
  const eventType = body?.type ?? "unknown";

  // Order by updatedAt so we always resolve to the row this contact was
  // last written to, even if duplicate rows exist for the same externalId.
  const existing = externalId
    ? await JustCallContact.findOne({
        where: { externalId },
        order: [["updatedAt", "DESC"]],
      })
    : null;

  const mergedPayload = existing ? deepMerge(existing.payload ?? {}, body) : body;
  const mergedData = mergedPayload?.data ?? {};
  const status = mergedData?.status ?? {};

  const fields = {
    eventType,
    requestId: body?.request_id,
    urlId: body?.url_id,
    externalId,
    name: mergedData?.name,
    contactNumber: mergedData?.contact_number,
    email: mergedData?.email,
    company: mergedData?.company,
    agentId:
      mergedData?.agent_id !== undefined && mergedData?.agent_id !== null
        ? String(mergedData.agent_id)
        : undefined,
    blacklist: !!status?.blacklist,
    dnd: !!status?.dnd,
    dnm: !!status?.dnm,
    // the merged, current-state view - not the raw body, which may only be
    // a partial patch. The untouched raw body is preserved in the log below.
    payload: mergedPayload,
  };

  let event: JustCallContact;
  let previous: Record<string, any> | null = null;
  let changes: string[] = [];

  if (existing) {
    const previousSnapshot: Record<string, any> = existing.toJSON();
    await existing.update(fields);
    event = existing;
    changes = summarizeChanges(previousSnapshot, event);
    previous = previousSnapshot;

    logger.info(
      `Updated JustCall contact ${event.id} (${previousSnapshot.eventType} -> ${event.eventType})`,
    );
  } else {
    event = await JustCallContact.create(fields);

    logger.info(`Stored JustCall contact ${event.id} (${event.eventType})`);
  }

  await JustCallContactLog.create({
    justCallContactId: event.id,
    eventType,
    changes,
    payload: body,
  });

  return { event, previous };
};

/**
 * Human-readable list of what changed between two deliveries for the same
 * contact. Reads straight off the stored payloads rather than event-specific
 * columns, so it keeps working as new event types show up.
 */
export const summarizeChanges = (
  previous: Record<string, any>,
  event: JustCallContact,
): string[] => {
  const prevData = previous?.payload?.data ?? {};
  const currData = event.payload?.data ?? {};
  const prevStatus = prevData?.status ?? {};
  const currStatus = currData?.status ?? {};

  const changes: string[] = [];

  if (previous.eventType !== event.eventType) {
    changes.push(`Stage: ${previous.eventType} → ${event.eventType}`);
  }

  if (!!currStatus.blacklist !== !!prevStatus.blacklist) {
    changes.push(currStatus.blacklist ? "Blacklisted" : "Removed from blacklist");
  }

  if (!!currStatus.dnd !== !!prevStatus.dnd) {
    changes.push(currStatus.dnd ? "Marked Do Not Disturb" : "Do Not Disturb cleared");
  }

  if (!!currStatus.dnm !== !!prevStatus.dnm) {
    changes.push(currStatus.dnm ? "Marked Do Not Mail" : "Do Not Mail cleared");
  }

  if (currData.company && prevData.company !== currData.company) {
    changes.push(`Company: ${prevData.company || "N/A"} → ${currData.company}`);
  }

  if (
    currData.agent_id !== undefined &&
    currData.agent_id !== null &&
    currData.agent_id !== prevData.agent_id
  ) {
    changes.push(`Reassigned to agent ${currData.agent_id}`);
  }

  const prevNotes = Array.isArray(prevData.notes) ? prevData.notes : [];
  const currNotes = Array.isArray(currData.notes) ? currData.notes : [];
  if (currNotes.length > prevNotes.length) {
    const latest = currNotes[currNotes.length - 1];
    changes.push(`Note added: ${latest?.description ?? "(no description)"}`);
  }

  return changes;
};
