import { JustCallAppointment } from "../models/v1/justcall-appointment.model";
import { JustCallAppointmentLog } from "../models/v1/justcall-appointment-log.model";
import { getServiceLogger } from "../utils/createLogger";
import { deepMerge, toExternalId } from "../utils/deepMerge";

const logger = getServiceLogger("JustCallAppointmentWebhookService");

export interface RecordAppointmentEventResult {
  event: JustCallAppointment;
  // Pre-update snapshot when this delivery updated an existing row (same
  // appointment), null when it created a brand new one.
  previous: Record<string, any> | null;
}

/**
 * Handles appointment.* events - JustCall's Calendar/booking feature. Kept
 * in its own table since its shape (calendar, customer, timezone-aware
 * slots, shared_with_agents, external_attendees) has nothing in common with
 * call, sms, whatsapp, sd, or jc.contact_* events beyond the general envelope.
 *
 * Upserts on externalId (JustCall's own appointment id) the same way the
 * other JustCall tables do, deep-merging each delivery's whole body onto
 * whatever is already on file so a narrower delivery (e.g. a reschedule that
 * only carries the changed slot) can't null out data a fuller one already
 * gave us.
 */
export const recordEvent = async (body: any): Promise<RecordAppointmentEventResult> => {
  const incomingData = body?.data ?? {};
  const externalId = toExternalId(incomingData?.id);
  const eventType = body?.type ?? "unknown";

  // Order by updatedAt so we always resolve to the row this appointment was
  // last written to, even if duplicate rows exist for the same externalId.
  const existing = externalId
    ? await JustCallAppointment.findOne({
        where: { externalId },
        order: [["updatedAt", "DESC"]],
      })
    : null;

  const mergedPayload = existing ? deepMerge(existing.payload ?? {}, body) : body;
  const mergedData = mergedPayload?.data ?? {};

  const fields = {
    eventType,
    requestId: body?.request_id,
    urlId: body?.url_id,
    externalId,
    calendarId: mergedData?.calendar_id,
    calendarName: mergedData?.calendar_name,
    bookedVia: mergedData?.booked_via,
    appointmentType: mergedData?.type,
    customerFirstName: mergedData?.customer_first_name,
    customerLastName: mergedData?.customer_last_name,
    customerEmail: mergedData?.customer_email,
    customerNumber: mergedData?.customer_number,
    notes: mergedData?.notes,
    // the merged, current-state view - not the raw body, which may only be
    // a partial patch. The untouched raw body is preserved in the log below.
    payload: mergedPayload,
  };

  let event: JustCallAppointment;
  let previous: Record<string, any> | null = null;
  let changes: string[] = [];

  if (existing) {
    const previousSnapshot: Record<string, any> = existing.toJSON();
    await existing.update(fields);
    event = existing;
    changes = summarizeChanges(previousSnapshot, event);
    previous = previousSnapshot;

    logger.info(
      `Updated JustCall appointment ${event.id} (${previousSnapshot.eventType} -> ${event.eventType})`,
    );
  } else {
    event = await JustCallAppointment.create(fields);

    logger.info(`Stored JustCall appointment ${event.id} (${event.eventType})`);
  }

  await JustCallAppointmentLog.create({
    justCallAppointmentId: event.id,
    eventType,
    changes,
    payload: body,
  });

  return { event, previous };
};

/**
 * Human-readable list of what changed between two deliveries for the same
 * appointment. Reads straight off the stored payloads rather than
 * event-specific columns, so it keeps working as new event types show up.
 */
export const summarizeChanges = (
  previous: Record<string, any>,
  event: JustCallAppointment,
): string[] => {
  const prevData = previous?.payload?.data ?? {};
  const currData = event.payload?.data ?? {};

  const changes: string[] = [];

  if (previous.eventType !== event.eventType) {
    changes.push(`Stage: ${previous.eventType} → ${event.eventType}`);
  }

  if (
    currData.appointment_date &&
    (prevData.appointment_date !== currData.appointment_date ||
      prevData.appointment_time !== currData.appointment_time)
  ) {
    changes.push(`Slot: ${currData.appointment_date} ${currData.appointment_time ?? ""}`.trim());
  }

  if (currData.notes && prevData.notes !== currData.notes) {
    changes.push(`Notes: ${currData.notes}`);
  }

  const prevAgents = Array.isArray(prevData.shared_with_agents) ? prevData.shared_with_agents : [];
  const currAgents = Array.isArray(currData.shared_with_agents) ? currData.shared_with_agents : [];
  if (currAgents.length > prevAgents.length) {
    changes.push(`Shared with ${currAgents.length} agent(s)`);
  }

  const prevAttendees = Array.isArray(prevData.external_attendees) ? prevData.external_attendees : [];
  const currAttendees = Array.isArray(currData.external_attendees) ? currData.external_attendees : [];
  if (currAttendees.length > prevAttendees.length) {
    changes.push(`External attendees: ${currAttendees.length}`);
  }

  return changes;
};
