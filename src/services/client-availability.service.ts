import { getServiceLogger } from "../utils/createLogger";
import { sendMail } from "../config/sendGrid";
import moment from "moment-timezone";
import {
  ClientAvailabilityStatus,
  DayOfWeek,
  SessionStatus,
  SessionType,
  SlackChannel,
  SlackEventType,
  SlackLocation,
  SlackNode,
  SlackProvider,
  SlackSeverity,
} from "../utils/enum";
import ErrorHandler from "../utils/errorHandler";
import { ClientAvailability } from "../models/v1/client-availability.model";
import { Session } from "../models/v1/session.model";
import { User } from "../models/v1/user.model";
import { SlackService } from "./slack.service";
import { PROD_FRONTEND_URL, TEAM_EMAIL } from "../config/env";

const logger = getServiceLogger("ClientAvailabilityService");

const DEFAULT_MEETING_LINK = "https://meet.google.com/ipd-yhtc-kkg";

function calculateDurationMinutes(startTime: string, endTime: string): number {
  const start = moment(startTime, ["HH:mm", "h:mm A", "HH:mm:ss"]);
  const end = moment(endTime, ["HH:mm", "h:mm A", "HH:mm:ss"]);
  const diff = end.diff(start, "minutes");
  return diff > 0 ? diff : 0;
}

export async function declineClientAvailability(
  availabilityId: string,
  coachId: string,
  reason?: string,
): Promise<void> {
  try {
    const availability = await ClientAvailability.findOne({
      where: { id: availabilityId, isAvailable: true, isDeleted: false },
      include: [
        {
          model: User,
          as: "client",
          attributes: ["id", "firstName", "lastName", "email"],
          required: true,
        },
      ],
    });

    if (!availability) {
      throw new ErrorHandler(
        "Client availability not found or already processed",
        404,
      );
    }

    const coach = await User.findByPk(coachId, {
      attributes: ["id", "firstName", "lastName"],
    });

    await ClientAvailability.update(
      { status: ClientAvailabilityStatus.REJECTED, isAvailable: false, isDeleted: true },
      { where: { id: availabilityId } },
    );

    await availability.destroy();

    logger.info(
      `Coach ${coachId} declined availability ${availabilityId}`,
    );

    setImmediate(() => {
      sendDeclineNotifications(availability, coach, reason).catch((err) =>
        logger.error("Background decline notification error:", err),
      );
    });
  } catch (error: any) {
    logger.error("Failed to decline client availability:", error);
    if (error instanceof ErrorHandler) throw error;
    throw new ErrorHandler("Failed to decline client availability", 500);
  }
}

async function sendDeclineNotifications(
  availability: ClientAvailability,
  coach: User | null,
  reason?: string,
): Promise<void> {
  const client = (availability as any).client as User;
  const frontendUrl = PROD_FRONTEND_URL || "https://rat.cvtocareer.com";
  const currentYear = new Date().getFullYear();
  const formattedDate = moment.utc(availability.date).format("dddd, Do MMMM YYYY");
  const timeRange = `${availability.startTime} – ${availability.endTime}`;
  const coachName = coach ? `${coach.firstName} ${coach.lastName}` : "Your Coach";

  // Email → client
  sendMail({
    email: client.email,
    subject: "Your Session Request Could Not Be Confirmed — CVtoCAREER",
    templateName: "availability-declined-client.ejs",
    templateData: {
      name: client.firstName,
      date: formattedDate,
      time: timeRange,
      timezone: availability.timezone,
      sessionType: availability.sessionType,
      reason: reason || null,
      frontendUrl,
      currentYear,
    },
  }).catch((err) =>
    logger.error(`Failed to send decline email to client ${client.email}:`, err),
  );

  // Slack → TOWN_CRIER
  SlackService.notify({
    node: SlackNode.USER_MANAGEMENT,
    provider: SlackProvider.SYSTEM,
    severity: SlackSeverity.INFO,
    type: SlackEventType.ADMIN_ACTION,
    trigger: "client-availability-declined",
    channel: SlackChannel.TOWN_CRIER,
    body: `❌ *Availability Declined*\n\nCoach *${coachName}* declined the session request from client *${client.firstName} ${client.lastName}* (${client.email}).\n\n*Date:* ${formattedDate}\n*Time:* ${timeRange} (${availability.timezone})\n*Session Type:* ${availability.sessionType}${reason ? `\n*Reason:* ${reason}` : ""}`,
  }).catch((err) => logger.error("Failed to send Slack decline notification:", err));
}

export async function getAllClientAvailabilities(): Promise<any[]> {
  try {
    const availabilities = await ClientAvailability.findAll({
      where: { isAvailable: true, isDeleted: false },
      include: [
        {
          model: User,
          as: "client",
          attributes: ["id", "firstName", "lastName", "email"],
          required: true,
        },
      ],
      order: [["date", "ASC"]],
    });

    logger.info(`Retrieved ${availabilities.length} client availabilities`);
    return availabilities;
  } catch (error: any) {
    logger.error("Failed to retrieve client availabilities:", error);
    throw new ErrorHandler("Failed to retrieve client availabilities", 500);
  }
}

export async function acceptClientAvailability(
  availabilityId: string,
  coachId: string,
  meetingLink?: string,
): Promise<any> {
  try {
    const availability = await ClientAvailability.findOne({
      where: { id: availabilityId, isAvailable: true, isDeleted: false },
      include: [
        {
          model: User,
          as: "client",
          attributes: ["id", "firstName", "lastName", "email"],
          required: true,
        },
      ],
    });

    if (!availability) {
      throw new ErrorHandler(
        "Client availability not found or already accepted",
        404,
      );
    }

    const coach = await User.findByPk(coachId, {
      attributes: ["id", "firstName", "lastName", "email"],
    });

    if (!coach) {
      throw new ErrorHandler("Coach not found", 404);
    }

    const resolvedMeetingLink = meetingLink || DEFAULT_MEETING_LINK;
    const duration = calculateDurationMinutes(
      availability.startTime,
      availability.endTime,
    );

    const sessionDate = moment.utc(availability.date).format("YYYY-MM-DD");
    const sessionDay = moment.utc(availability.date).format("dddd").toLowerCase() as DayOfWeek;

    const session = await Session.create({
      clientId: availability.clientId,
      coachId,
      sessionType: availability.sessionType as unknown as SessionType,
      sessionStatus: SessionStatus.SCHEDULED,
      time: {
        startTime: availability.startTime,
        endTime: availability.endTime,
      },
      timezone: availability.timezone,
      meetingLink: resolvedMeetingLink,
      duration,
      sessionDate,
      sessionDay,
    } as any);

    await ClientAvailability.update(
      { status: ClientAvailabilityStatus.ACCEPTED, isAvailable: false },
      { where: { id: availabilityId } },
    );

    setImmediate(() => {
      sendAcceptanceNotifications(
        availability,
        coach,
        resolvedMeetingLink,
        duration,
      ).catch((err) =>
        logger.error("Background notification error:", err),
      );
    });

    logger.info(
      `Coach ${coachId} accepted availability ${availabilityId} — session ${session.id} created (${duration} min)`,
    );
    return session;
  } catch (error: any) {
    logger.error("Failed to accept client availability:", error);
    if (error instanceof ErrorHandler) throw error;
    throw new ErrorHandler("Failed to accept client availability", 500);
  }
}

export interface ProposeReschedulePayload {
  date: string;
  startTime: string;
  endTime: string;
  timezone: string;
  meetingLink?: string;
}

export async function proposeRescheduleToClient(
  availabilityId: string,
  coachId: string,
  payload: ProposeReschedulePayload,
): Promise<void> {
  try {
    const availability = await ClientAvailability.findOne({
      where: { id: availabilityId, isAvailable: true, isDeleted: false },
      include: [
        {
          model: User,
          as: "client",
          attributes: ["id", "firstName", "lastName", "email"],
          required: true,
        },
      ],
    });

    if (!availability) {
      throw new ErrorHandler(
        "Client availability not found or already processed",
        404,
      );
    }

    const coach = await User.findByPk(coachId, {
      attributes: ["id", "firstName", "lastName"],
    });

    await ClientAvailability.update(
      { status: ClientAvailabilityStatus.REJECTED, isAvailable: false, isDeleted: true },
      { where: { id: availabilityId } },
    );

    await availability.destroy();

    logger.info(
      `Coach ${coachId} proposed reschedule for availability ${availabilityId} → ${payload.date} ${payload.startTime}–${payload.endTime}`,
    );

    setImmediate(() => {
      sendProposeRescheduleNotifications(availability, coach, payload).catch((err) =>
        logger.error("Background propose-reschedule notification error:", err),
      );
    });
  } catch (error: any) {
    logger.error("Failed to propose reschedule:", error);
    if (error instanceof ErrorHandler) throw error;
    throw new ErrorHandler("Failed to propose reschedule", 500);
  }
}

async function sendProposeRescheduleNotifications(
  availability: ClientAvailability,
  coach: User | null,
  payload: ProposeReschedulePayload,
): Promise<void> {
  const client = (availability as any).client as User;
  const frontendUrl = PROD_FRONTEND_URL || "https://rat.cvtocareer.com";
  const currentYear = new Date().getFullYear();

  const originalDate = moment.utc(availability.date).format("dddd, Do MMMM YYYY");
  const originalTime = `${availability.startTime} – ${availability.endTime}`;
  const proposedDate = moment.utc(payload.date).format("dddd, Do MMMM YYYY");
  const proposedTime = `${payload.startTime} – ${payload.endTime}`;
  const coachName = coach ? `${coach.firstName} ${coach.lastName}` : "Your Coach";

  // Email → client
  sendMail({
    email: client.email,
    subject: "Your Coach Has Proposed a New Session Time — CVtoCAREER",
    templateName: "availability-reschedule-proposed.ejs",
    templateData: {
      name: client.firstName,
      coachName,
      originalDate,
      originalTime,
      originalTimezone: availability.timezone,
      sessionType: availability.sessionType,
      proposedDate,
      proposedTime,
      proposedTimezone: payload.timezone,
      meetingLink: payload.meetingLink || null,
      frontendUrl,
      currentYear,
    },
  }).catch((err) =>
    logger.error(`Failed to send propose-reschedule email to client ${client.email}:`, err),
  );

  // Slack → TOWN_CRIER
  SlackService.notify({
    node: SlackNode.USER_MANAGEMENT,
    provider: SlackProvider.SYSTEM,
    severity: SlackSeverity.INFO,
    type: SlackEventType.ADMIN_ACTION,
    trigger: "client-availability-reschedule-proposed",
    channel: SlackChannel.TOWN_CRIER,
    body: `🔄 *Reschedule Proposed*\n\nCoach *${coachName}* proposed a new time for client *${client.firstName} ${client.lastName}* (${client.email}).\n\n*Original:* ${originalDate} ${originalTime} (${availability.timezone})\n*Proposed:* ${proposedDate} ${proposedTime} (${payload.timezone})\n*Session Type:* ${availability.sessionType}`,
  }).catch((err) => logger.error("Failed to send Slack propose-reschedule notification:", err));
}

export interface ReschedulePayload {
  startTime: string;
  endTime: string;
  date?: string;
  timezone?: string;
  meetingLink?: string;
}

export async function rescheduleSession(
  sessionId: string,
  coachId: string,
  payload: ReschedulePayload,
): Promise<any> {
  try {
    const session = await Session.findOne({
      where: { id: sessionId, coachId },
      include: [
        {
          model: User,
          as: "client",
          attributes: ["id", "firstName", "lastName", "email"],
          required: false,
        },
        {
          model: User,
          as: "coach",
          attributes: ["id", "firstName", "lastName", "email"],
          required: false,
        },
      ],
    });

    if (!session) {
      throw new ErrorHandler(
        "Session not found or you are not assigned to this session",
        404,
      );
    }

    if (
      session.sessionStatus === SessionStatus.COMPLETED ||
      session.sessionStatus === SessionStatus.CANCELED
    ) {
      throw new ErrorHandler(
        `Cannot reschedule a ${session.sessionStatus} session`,
        400,
      );
    }

    const { startTime, endTime, date, timezone, meetingLink } = payload;

    if (!startTime || !endTime) {
      throw new ErrorHandler("startTime and endTime are required", 400);
    }

    const duration = calculateDurationMinutes(startTime, endTime);
    const resolvedMeetingLink = meetingLink || (session.meetingLink ?? DEFAULT_MEETING_LINK);
    const resolvedTimezone = timezone || session.timezone;

    await Session.update(
      {
        time: { startTime, endTime },
        duration,
        timezone: resolvedTimezone,
        meetingLink: resolvedMeetingLink,
        ...(date ? { scheduleId: undefined } : {}),
      },
      { where: { id: sessionId } },
    );

    const updated = await Session.findByPk(sessionId);

    setImmediate(() => {
      sendRescheduleNotifications(
        session,
        { startTime, endTime, date, timezone: resolvedTimezone },
        resolvedMeetingLink,
        duration,
      ).catch((err) =>
        logger.error("Background reschedule notification error:", err),
      );
    });

    logger.info(
      `Coach ${coachId} rescheduled session ${sessionId} to ${startTime}–${endTime} (${duration} min)`,
    );
    return updated;
  } catch (error: any) {
    logger.error("Failed to reschedule session:", error);
    if (error instanceof ErrorHandler) throw error;
    throw new ErrorHandler("Failed to reschedule session", 500);
  }
}

async function sendRescheduleNotifications(
  session: Session,
  newTime: { startTime: string; endTime: string; date?: string; timezone?: string },
  meetingLink: string,
  duration: number,
): Promise<void> {
  const client = (session as any).client as User | undefined;
  const coach = (session as any).coach as User | undefined;
  const frontendUrl = PROD_FRONTEND_URL || "https://app.cvtocareer.com";
  const currentYear = new Date().getFullYear();

  const formattedDate = newTime.date
    ? moment.utc(newTime.date).format("dddd, Do MMMM YYYY")
    : "TBD";
  const timeRange = `${newTime.startTime} – ${newTime.endTime}`;
  const timezone = newTime.timezone || "UTC";

  const sharedData = {
    date: formattedDate,
    time: timeRange,
    timezone,
    sessionType: session.sessionType,
    meetingLink,
    duration,
    frontendUrl,
    currentYear,
  };

  // Email → client
  if (client) {
    sendMail({
      email: client.email,
      subject: "Your Session Has Been Rescheduled — CVtoCAREER",
      templateName: "session-rescheduled.ejs",
        templateData: {
        ...sharedData,
        name: client.firstName,
        coachName: coach ? `${coach.firstName} ${coach.lastName}` : "Your Coach",
        recipientType: "client",
      },
    }).catch((err) =>
      logger.error(`Failed to send reschedule email to client ${client.email}:`, err),
    );
  }

  // Email → coach
  if (coach) {
    sendMail({
      email: coach.email,
      subject: "Session Rescheduled Confirmation — CVtoCAREER",
      templateName: "session-rescheduled.ejs",
        templateData: {
        ...sharedData,
        name: coach.firstName,
        clientName: client ? `${client.firstName} ${client.lastName}` : "Client",
        recipientType: "coach",
      },
    }).catch((err) =>
      logger.error(`Failed to send reschedule email to coach ${coach.email}:`, err),
    );
  }

  // Email → delivery team
  sendMail({
    email: TEAM_EMAIL,
    subject: "Session Rescheduled — CVtoCAREER",
    templateName: "session-rescheduled.ejs",
    templateData: {
      ...sharedData,
      name: "Team",
      clientName: client ? `${client.firstName} ${client.lastName}` : "Client",
      clientEmail: client?.email ?? "",
      coachName: coach ? `${coach.firstName} ${coach.lastName}` : "Coach",
      coachEmail: coach?.email ?? "",
      recipientType: "admin",
    },
  }).catch((err) =>
    logger.error(`Failed to send reschedule notification to delivery team:`, err),
  );

  // Slack notification — location: LOCALHOST bypasses the CRY_WOLF → TOWN_CRIER prod override in slack-helpers.ts
  SlackService.notify({
    node: SlackNode.USER_MANAGEMENT,
    provider: SlackProvider.SYSTEM,
    severity: SlackSeverity.INFO,
    type: SlackEventType.ADMIN_ACTION,
    trigger: "session-rescheduled",
    channel: SlackChannel.CRY_WOLF,
    location: SlackLocation.LOCALHOST,
    body: `🔄 *Session Rescheduled*\n\nCoach *${coach ? `${coach.firstName} ${coach.lastName}` : "Unknown"}* rescheduled a session with client *${client ? `${client.firstName} ${client.lastName}` : "Unknown"}*.\n\n*Session ID:* ${session.id}\n*New Date:* ${formattedDate}\n*New Time:* ${timeRange} (${timezone})\n*Duration:* ${duration} minutes\n*Session Type:* ${session.sessionType}\n*Meeting Link:* ${meetingLink}`,
  }).catch((err) => logger.error("Failed to send Slack reschedule notification:", err));
}

async function sendAcceptanceNotifications(
  availability: ClientAvailability,
  coach: User,
  meetingLink: string,
  duration: number,
): Promise<void> {
  const client = (availability as any).client as User;
  const formattedDate = moment
    .utc(availability.date)
    .format("dddd, Do MMMM YYYY");
  const timeRange = `${availability.startTime} – ${availability.endTime}`;
  const frontendUrl = PROD_FRONTEND_URL || "https://app.cvtocareer.com";
  const currentYear = new Date().getFullYear();

  const sharedData = {
    date: formattedDate,
    time: timeRange,
    timezone: availability.timezone,
    sessionType: availability.sessionType,
    meetingLink,
    duration,
    frontendUrl,
    currentYear,
  };

  // Email → client
  sendMail({
    email: client.email,
    subject: "Your Session Has Been Confirmed — CVtoCAREER",
    templateName: "session-confirmed.ejs",
    templateData: {
      ...sharedData,
      name: client.firstName,
      coachName: `${coach.firstName} ${coach.lastName}`,
    },
  }).catch((err) =>
    logger.error(`Failed to send session-confirmed email to client ${client.email}:`, err),
  );

  // Email → coach
  sendMail({
    email: coach.email,
    subject: "Session Booking Confirmed — CVtoCAREER",
    templateName: "coach-session-confirmed.ejs",
    templateData: {
      ...sharedData,
      name: coach.firstName,
      clientName: `${client.firstName} ${client.lastName}`,
    },
  }).catch((err) =>
    logger.error(`Failed to send coach-session-confirmed email to coach ${coach.email}:`, err),
  );

  // Email → delivery team
  sendMail({
    email: TEAM_EMAIL,
    subject: "Session Booked — Coach Accepted Client Availability",
    templateName: "admin-session-booked.ejs",
    templateData: {
      ...sharedData,
      name: "Team",
      clientName: `${client.firstName} ${client.lastName}`,
      clientEmail: client.email,
      coachName: `${coach.firstName} ${coach.lastName}`,
      coachEmail: coach.email,
    },
  }).catch((err) =>
    logger.error(`Failed to send session-booked notification to delivery team:`, err),
  );

  // Slack notification
  SlackService.notify({
    node: SlackNode.USER_MANAGEMENT,
    provider: SlackProvider.SYSTEM,
    severity: SlackSeverity.INFO,
    type: SlackEventType.ADMIN_ACTION,
    trigger: "client-availability-accepted",
    channel: SlackChannel.CRY_WOLF,
    body: `📅 *Session Booked*\n\nCoach *${coach.firstName} ${coach.lastName}* (${coach.email}) accepted a session with client *${client.firstName} ${client.lastName}* (${client.email}).\n\n*Date:* ${formattedDate}\n*Time:* ${timeRange} (${availability.timezone})\n*Duration:* ${duration} minutes\n*Session Type:* ${availability.sessionType}\n*Meeting Link:* ${meetingLink}`,
  }).catch((err) => logger.error("Failed to send Slack notification:", err));
}
