import { getServiceLogger } from "../utils/createLogger";
import ErrorHandler from "../utils/errorHandler";
import {
  SlackChannel,
  SlackEventType,
  SlackNode,
  SlackProvider,
  SlackSeverity,
} from "../utils/enum";
import moment from "moment-timezone";
import { SlackService } from "./slack.service";
import { sendMail } from "../config/sendGrid";
import { createGEvent, deleteGEvent } from "./google/calendar";
import { TEAM_EMAIL } from "../config/env";
import db from "../database/postgres";

const logger = getServiceLogger("sessions");

// Types
export interface SessionPayload {
  sessionType: "screening" | "interview" | "consultation";
  proposedTime: {
    startTime: string;
    endTime: string;
  };
  clientAvailabilityId: string;
  coach?: string;
  client?: string;
  timezone?: string;
  description?: string;
}

export interface SessionQuery {
  sid?: string;
  status?: string;
  type?: string;
  list?: string;
  sessiongrading?: string;
}

// Helper: Check for overlapping sessions
export const checkOverlappingSession = async (
  coachId: string,
  timeSlot: any,
) => {
  try {
    logger.info(`Checking overlapping sessions for coach: ${coachId}`);

    const overlapping = await db.session.findOne({
      where: {
        coach: coachId,
        [db.sequelize.Op.or]: [
          {
            "time.startTime": timeSlot.startTime,
            "time.endTime": timeSlot.endTime,
            sessionStatus: "pending",
          },
          {
            [db.sequelize.Op.and]: [
              { "time.startTime": { [db.sequelize.Op.lt]: timeSlot.endTime } },
              { "time.endTime": { [db.sequelize.Op.gt]: timeSlot.startTime } },
              { sessionStatus: "pending" },
            ],
          },
        ],
      },
    });

    return overlapping;
  } catch (error) {
    logger.error("Error checking overlapping sessions:", error);
    throw new ErrorHandler("Failed to check overlapping sessions", 500);
  }
};

// Helper: Create chat session
export const createChatSession = async (participants: string[]) => {
  try {
    logger.info(
      `Creating chat session for participants: ${participants.join(", ")}`,
    );

    const chatUrl = "https://chat-service-qvx23.ondigitalocean.app/v1/sessions";
    const response = await fetch(chatUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ participants }),
    });

    if (!response.ok) {
      throw new Error(`Chat service error: ${response.statusText}`);
    }

    const data = (await response.json()) as any;
    logger.info("Chat session created successfully");
    return data.sessionId;
  } catch (error) {
    logger.error("Error creating chat session:", error);
    throw new ErrorHandler("Failed to create chat session", 500);
  }
};

// Helper: Send booking emails
export const sendBookingEmails = async (
  clientData: any,
  coachData: any,
  sessionDetails: any,
) => {
  try {
    logger.info(
      `Sending booking emails for session between ${clientData.email} and ${coachData.email}`,
    );

    const emailDetails = {
      meetingTime: `${sessionDetails.time.startTime.split(" ")[1]} ${sessionDetails.time.startTime.split(" ")[2]} - ${sessionDetails.time.endTime.split(" ")[1]} ${sessionDetails.time.endTime.split(" ")[2]}`,
      meetingDate: sessionDetails.time.startTime.split(" ")[0],
      coachName: `${coachData.firstName} ${coachData.lastName}`,
      clientName: `${clientData.firstName} ${clientData.lastName}`,
      meetingLink: sessionDetails.meetingLink,
      sessionType: sessionDetails.sessionType,
      timeZone: sessionDetails.timezone,
    };

    // Send emails to client, coach, and team
    await Promise.all([
      sendMail({
        email: clientData.email,
        subject: `Live Session With Performance Coach ${coachData.firstName} ${coachData.lastName}`,
        templateName: "session-booked-client.ejs",
        templateData: { ...emailDetails, clientName: clientData.firstName },
      }),
      sendMail({
        email: coachData.email,
        subject: `Live Session With ${clientData.firstName} ${clientData.lastName}`,
        templateName: "session-booked-coach.ejs",
        templateData: { ...emailDetails, coachName: coachData.firstName },
      }),
      sendMail({
        email: TEAM_EMAIL,
        subject: `${clientData.firstName} ${clientData.lastName} Live Session With Performance Coach ${coachData.firstName} ${coachData.lastName}`,
        templateName: "session-booked-admin.ejs",
        templateData: { ...emailDetails, clientEmail: clientData.email },
      }),
    ]);

    logger.info("Booking emails sent successfully");
  } catch (error) {
    logger.error("Error sending booking emails:", error);
    throw new ErrorHandler("Failed to send booking emails", 500);
  }
};

// Helper: Format spacing for timezone
const removeSpaces = (input: string) => input.replace(/\s+/g, "");

// Helper: Create Google Calendar event
export const createCalendarEvent = async (
  sessionData: any,
  clientData: any,
  coachData: any,
  isClient: boolean,
) => {
  try {
    logger.info(`Creating calendar event for session`);

    const baseDate = isClient
      ? new Date(sessionData.schedule.date)
      : new Date(sessionData.availability.day);

    const eventData = {
      summary: `${clientData.firstName} ${clientData.lastName}: ${
        sessionData.sessionType === "interview"
          ? "Panel Interview Preparatory Session"
          : sessionData.sessionType === "screening"
            ? "Screening Calls Preparatory Session"
            : "Career Consultation Session"
      }${isClient ? ` with ${coachData.firstName} ${coachData.lastName}` : ""}`,
      description: "Coaching session schedule",
      sendUpdates: "all",
      start: {
        dateTime: moment
          .utc(baseDate)
          .set({
            hour: moment(sessionData.time.startTime).hour(),
            minute: moment(sessionData.time.startTime).minute(),
            second: moment(sessionData.time.startTime).second(),
          })
          .tz(removeSpaces(sessionData.timezone), true)
          .toISOString(),
      },
      end: {
        dateTime: moment
          .utc(baseDate)
          .set({
            hour: moment(sessionData.time.endTime).hour(),
            minute: moment(sessionData.time.endTime).minute(),
            second: moment(sessionData.time.endTime).second(),
          })
          .tz(removeSpaces(sessionData.timezone), true)
          .toISOString(),
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: "email", minutes: 1440 },
          { method: "email", minutes: 720 },
          { method: "email", minutes: 360 },
          { method: "email", minutes: 120 },
          { method: "email", minutes: 60 },
        ],
      },
      attendees: [
        {
          email: clientData.email,
          comment: `Join ${sessionData.sessionType} session hosted by ${coachData.firstName} ${coachData.lastName}`,
          displayName: `${clientData.firstName} ${clientData.lastName}`,
          responseStatus: "needsAction",
        },
        {
          email: coachData.email,
          comment: `Join booked ${sessionData.sessionType} session by ${clientData.firstName} ${clientData.lastName}`,
          displayName: `${coachData.firstName} ${coachData.lastName}`,
          responseStatus: "needsAction",
        },
        {
          email: process.env.TEAM_EMAIL,
          comment: `Join booked ${sessionData.sessionType} session by ${clientData.firstName} ${clientData.lastName}`,
          displayName: `${coachData.firstName} ${coachData.lastName}`,
          responseStatus: "needsAction",
        },
      ],
      hangoutLink: sessionData.meetingLink,
      conferenceData: {
        entryPoints: [
          {
            entryPointType: "video",
            uri: sessionData.meetingLink,
            label: sessionData.meetingLink.substring(8),
          },
        ],
        conferenceSolution: {
          key: { type: "hangoutsMeet" },
          name: "Google Meet",
          iconUri:
            "https://fonts.gstatic.com/s/i/productlogos/meet_2020q4/v6/web-512dp/logo_meet_2020q4_color_2x_web_512dp.png",
        },
      },
      conferenceId: sessionData.meetingLink.substring(
        sessionData.meetingLink.length - 11,
      ),
    };

    // TODO: Implement Google Calendar integration
    const eventId = await createGEvent(eventData as any);
    logger.info(`Calendar event created: ${eventId}`);
    return eventId;
  } catch (error) {
    logger.error("Error creating calendar event:", error);
    throw new ErrorHandler("Failed to create calendar event", 500);
  }
};

// Main function: Create a new session
export const createSession = async (
  userId: string,
  role: string,
  payload: SessionPayload,
) => {
  try {
    logger.info(`Creating session for user: ${userId}, role: ${role}`);

    if (!userId) {
      throw new ErrorHandler("User not authenticated", 401);
    }

    // Check for overlapping sessions
    const overlappingSession = await checkOverlappingSession(userId, {
      startTime: payload.proposedTime.startTime,
      endTime: payload.proposedTime.endTime,
    });

    if (overlappingSession) {
      throw new ErrorHandler("This slot is not available", 400);
    }

    let newSession: any;

    if (role && role.toLowerCase() === "client") {
      newSession = await handleClientBooking(userId, payload);
    } else if (role && ["coach", "admin"].includes(role.toLowerCase())) {
      newSession = await handleCoachBooking(userId, payload);
    } else {
      throw new ErrorHandler("Invalid user role", 400);
    }

    if (newSession && newSession._id) {
      logger.info(`Session created successfully: ${newSession._id}`);
    }
    return newSession;
  } catch (error) {
    logger.error("Error creating session:", error);
    if (error instanceof ErrorHandler) {
      throw error;
    }
    throw new ErrorHandler("Unable to create a session", 500);
  }
};

// Handle client booking
export const handleClientBooking = async (
  userId: string,
  payload: SessionPayload,
) => {
  try {
    logger.info(`Handling client booking for user: ${userId}`);
    // Note: Update these queries with your actual database models
    throw new ErrorHandler("Database models not configured", 500);
  } catch (error) {
    logger.error("Error in handleClientBooking:", error);
    if (error instanceof ErrorHandler) {
      throw error;
    }
    throw new ErrorHandler("Unable to handle client booking", 500);
  }
};

// Handle coach booking
export const handleCoachBooking = async (userId: string, payload: any) => {
  try {
    logger.info(`Handling coach booking for user: ${userId}`);
    // Note: Update these queries with your actual database models
    throw new ErrorHandler("Database models not configured", 500);
  } catch (error) {
    logger.error("Error in handleCoachBooking:", error);
    if (error instanceof ErrorHandler) {
      throw error;
    }
    throw new ErrorHandler("Unable to handle coach booking", 500);
  }
};

// Reschedule session
export const rescheduleSession = async (userId: string, body: any) => {
  try {
    logger.info(`Rescheduling session for user: ${userId}`);
    const {
      clientAvailabilityId,
      proposedDate,
      proposedTime,
      session,
      timeZone,
    } = body;
    // Note: Update with your actual database models
    throw new ErrorHandler("Database models not configured", 500);
  } catch (error) {
    logger.error("Error rescheduling session:", error);
    if (error instanceof ErrorHandler) {
      throw error;
    }
    throw new ErrorHandler("Unable to reschedule session", 500);
  }
};

// Get sessions
export const getSessions = async (
  userId: string,
  role: string,
  query: SessionQuery,
) => {
  try {
    logger.info(`Getting sessions for user: ${userId}, role: ${role}`);

    if (!userId || !role) {
      throw new ErrorHandler("User not authenticated", 401);
    }

    const { sid: sessionId, status: sessionStatus, type: sessionType } = query;

    if (sessionId) {
      return await getSessionById(sessionId, role);
    }

    return await getSessionsByRole(userId, role, sessionStatus, sessionType);
  } catch (error) {
    logger.error("Error retrieving sessions:", error);
    if (error instanceof ErrorHandler) {
      throw error;
    }
    throw new ErrorHandler("Unable to retrieve sessions", 500);
  }
};

// Get session by ID
export const getSessionById = async (sessionId: string, role: string) => {
  try {
    logger.info(`Getting session: ${sessionId}`);
    // Note: Update with your actual database model
    throw new ErrorHandler("Database models not configured", 500);
  } catch (error) {
    logger.error("Error retrieving session:", error);
    if (error instanceof ErrorHandler) {
      throw error;
    }
    throw new ErrorHandler("Unable to retrieve session", 500);
  }
};

// Get sessions by role
export const getSessionsByRole = async (
  userId: string,
  role: string,
  sessionStatus?: string,
  sessionType?: string,
) => {
  try {
    logger.info(`Getting ${role} sessions for user: ${userId}`);

    switch (role.toLowerCase()) {
      case "client":
        return await getClientSessions(userId, sessionStatus, sessionType);
      case "coach":
      case "admin":
      case "technology":
      case "business":
        return await getCoachSessions(userId, sessionStatus, sessionType);
      default:
        throw new ErrorHandler("Unhandled user type", 400);
    }
  } catch (error) {
    logger.error("Error getting sessions by role:", error);
    if (error instanceof ErrorHandler) {
      throw error;
    }
    throw new ErrorHandler("Unable to get sessions", 500);
  }
};

// Get client sessions
export const getClientSessions = async (
  userId: string,
  sessionStatus?: string,
  sessionType?: string,
) => {
  try {
    logger.info(`Getting client sessions for user: ${userId}`);
    // Note: Update with your actual database model
    throw new ErrorHandler("Database models not configured", 500);
  } catch (error) {
    logger.error("Error getting client sessions:", error);
    if (error instanceof ErrorHandler) {
      throw error;
    }
    throw new ErrorHandler("Unable to get client sessions", 500);
  }
};

// Get coach sessions
export const getCoachSessions = async (
  userId: string,
  sessionStatus?: string,
  sessionType?: string,
) => {
  try {
    logger.info(`Getting coach sessions for user: ${userId}`);
    // Note: Update with your actual database model
    throw new ErrorHandler("Database models not configured", 500);
  } catch (error) {
    logger.error("Error getting coach sessions:", error);
    if (error instanceof ErrorHandler) {
      throw error;
    }
    throw new ErrorHandler("Unable to get coach sessions", 500);
  }
};

// Update session
export const updateSession = async (
  sessionId: string,
  updateData: any,
  isGrading: boolean = false,
) => {
  try {
    logger.info(`Updating session: ${sessionId}, isGrading: ${isGrading}`);
    // Note: Update with your actual database model
    throw new ErrorHandler("Database models not configured", 500);
  } catch (error) {
    logger.error("Error updating session:", error);
    if (error instanceof ErrorHandler) {
      throw error;
    }
    throw new ErrorHandler("Unable to update session", 500);
  }
};

// Cancel session
export const cancelSession = async (sessionId: string, userName?: string) => {
  try {
    logger.info(`Cancelling session: ${sessionId}`);

    if (!sessionId) {
      throw new ErrorHandler("Session ID is required", 400);
    }

    // Note: Update with your actual database model
    throw new ErrorHandler("Database models not configured", 500);
  } catch (error) {
    logger.error("Error cancelling session:", error);
    if (error instanceof ErrorHandler) {
      throw error;
    }
    throw new ErrorHandler("Unable to cancel session", 500);
  }
};
