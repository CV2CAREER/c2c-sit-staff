import { google } from "googleapis";
import { getServiceLogger } from "../../utils/createLogger";
import ErrorHandler from "../../utils/errorHandler";
import { getMeetAuthClient } from "./auth";

const logger = getServiceLogger("google-calendar");

type MeetUpdateOptions = {
  record?: boolean;
  transcribe?: boolean;
  transcriptionLanguage?: string;
  takeNotes?: boolean;
  notesLanguage?: string;
  accessType?: "OPEN" | "TRUSTED" | "RESTRICTED";
};

let SpacesServiceClient: any = null;

// Dynamically import SpacesServiceClient if available
try {
  SpacesServiceClient = require("@google-apps/meet").SpacesServiceClient;
} catch (error) {
  logger.warn("@google-apps/meet not available, Google Meet features disabled");
}

// Import credentials from JSON file
let credentials: any = null;
try {
  credentials = require("../../config/cvtocareer-394713-cefc518e6714.json");
} catch (error) {
  logger.warn("Google credentials file not found, will use env variables");
}

// Initialize Google Calendar API
const getCalendarClient = () => {
  try {
    if (!credentials) {
      throw new Error("Google Calendar credentials not configured");
    }

    const auth = new google.auth.JWT({
      email: credentials.client_email,
      key: credentials.private_key.replace(/\\n/g, "\n"),
      scopes: ["https://www.googleapis.com/auth/calendar"],
    });

    return google.calendar({
      version: "v3",
      auth,
    });
  } catch (error) {
    logger.error("Error initializing Google Calendar client:", error);
    throw new ErrorHandler("Failed to initialize Google Calendar", 500);
  }
};

/**
 * Create a Google Calendar event
 */
export const createGEvent = async (eventData: any): Promise<string> => {
  try {
    logger.info("Creating Google Calendar event");

    const calendar = getCalendarClient();

    const response = await calendar.events.insert({
      calendarId: "primary",
      requestBody: eventData as any,
    });

    if (!response.data.id) {
      throw new Error("Failed to get event ID from Google Calendar response");
    }

    logger.info(`Google Calendar event created: ${response.data.id}`);
    return response.data.id;
  } catch (error) {
    logger.error("Error creating Google Calendar event:", error);
    throw new ErrorHandler("Failed to create Google Calendar event", 500);
  }
};

/**
 * Delete a Google Calendar event
 */
export const deleteGEvent = async (eventId: string): Promise<void> => {
  try {
    logger.info(`Deleting Google Calendar event: ${eventId}`);

    const calendar = getCalendarClient();

    await calendar.events.delete({
      calendarId: "primary",
      eventId,
    });

    logger.info(`Google Calendar event deleted: ${eventId}`);
  } catch (error) {
    logger.error("Error deleting Google Calendar event:", error);
    throw new ErrorHandler("Failed to delete Google Calendar event", 500);
  }
};

/**
 * Update a Google Calendar event
 */
export const updateGEvent = async (
  eventId: string,
  eventData: any,
): Promise<string> => {
  try {
    logger.info(`Updating Google Calendar event: ${eventId}`);

    const calendar = getCalendarClient();

    const response = await calendar.events.update({
      calendarId: "primary",
      eventId,
      requestBody: eventData as any,
    });

    if (!response.data.id) {
      throw new Error("Failed to get event ID from Google Calendar response");
    }

    logger.info(`Google Calendar event updated: ${response.data.id}`);
    return response.data.id;
  } catch (error) {
    logger.error("Error updating Google Calendar event:", error);
    throw new ErrorHandler("Failed to update Google Calendar event", 500);
  }
};

/**
 * Get a Google Calendar event
 */
export const getGEvent = async (eventId: string): Promise<any> => {
  try {
    logger.info(`Fetching Google Calendar event: ${eventId}`);

    const calendar = getCalendarClient();

    const response = await calendar.events.get({
      calendarId: "primary",
      eventId,
    });

    logger.info(`Google Calendar event fetched: ${eventId}`);
    return response.data;
  } catch (error) {
    logger.error("Error fetching Google Calendar event:", error);
    throw new ErrorHandler("Failed to fetch Google Calendar event", 500);
  }
};

/**
 * Updates a Google Meet conference with specified features
 */
export async function updateMeetConference(
  meetLink: string,
  updates: MeetUpdateOptions = {},
) {
  try {
    if (!meetLink || typeof meetLink !== "string") {
      throw new ErrorHandler("A valid Google Meet link is required", 400);
    }

    logger.info(`Updating Google Meet conference: ${meetLink}`);

    const authClient: any = await getMeetAuthClient();
    const meetClient = new SpacesServiceClient({ authClient });

    // Extract the 10-character conference ID from the meetLink
    const meetIdMatch = meetLink.match(/\/([a-z]{3}-[a-z]{4}-[a-z]{3})$/);
    if (!meetIdMatch || meetIdMatch.length < 2) {
      throw new ErrorHandler(
        "Invalid Google Meet link format. Could not extract conference ID.",
        400,
      );
    }

    const spaceId = meetIdMatch[1];
    const spaceName = `spaces/${spaceId}`;

    const spaceToUpdate: {
      name: string;
      config?: {
        accessType?: "OPEN" | "TRUSTED" | "RESTRICTED";
        activeConference?: {
          conferenceFeatures?: {
            recordingFeatures?: { enabled: boolean };
            transcriptionFeatures?: {
              enabled: boolean;
              languageCode: string;
            };
            notesFeatures?: { enabled: boolean; languageCode: string };
          };
        };
      };
    } = {
      name: spaceName,
      config: {
        accessType: "RESTRICTED",
        activeConference: {
          conferenceFeatures: {},
        },
      },
    };

    const updateMaskParts = [];

    // --- Access Type ---
    if (updates.accessType) {
      if (!["OPEN", "TRUSTED", "RESTRICTED"].includes(updates.accessType)) {
        logger.warn(`Invalid accessType: ${updates.accessType}.`);
      } else {
        spaceToUpdate.config!.accessType = updates.accessType;
        updateMaskParts.push("config.accessType");
      }
    }

    // --- Recording ---
    if (typeof updates.record === "boolean") {
      spaceToUpdate.config!.activeConference!.conferenceFeatures!.recordingFeatures =
        {
          enabled: updates.record,
        };
      updateMaskParts.push(
        "config.activeConference.conferenceFeatures.recordingFeatures",
      );
    }

    // --- Transcription ---
    if (typeof updates.transcribe === "boolean") {
      const transcriptionLanguage = updates.transcriptionLanguage || "en-US";
      spaceToUpdate.config!.activeConference!.conferenceFeatures!.transcriptionFeatures =
        {
          enabled: updates.transcribe,
          languageCode: transcriptionLanguage,
        };
      updateMaskParts.push(
        "config.activeConference.conferenceFeatures.transcriptionFeatures",
      );
    } else if (updates.transcriptionLanguage) {
      spaceToUpdate.config!.activeConference!.conferenceFeatures!.transcriptionFeatures =
        {
          enabled: true,
          languageCode: updates.transcriptionLanguage,
        };
      updateMaskParts.push(
        "config.activeConference.conferenceFeatures.transcriptionFeatures",
      );
    }

    // --- Notes with Gemini ---
    if (typeof updates.takeNotes === "boolean") {
      const notesLanguage = updates.notesLanguage || "en-US";
      spaceToUpdate.config!.activeConference!.conferenceFeatures!.notesFeatures =
        {
          enabled: updates.takeNotes,
          languageCode: notesLanguage,
        };
      updateMaskParts.push(
        "config.activeConference.conferenceFeatures.notesFeatures",
      );
    } else if (updates.notesLanguage) {
      spaceToUpdate.config!.activeConference!.conferenceFeatures!.notesFeatures =
        {
          enabled: true,
          languageCode: updates.notesLanguage,
        };
      updateMaskParts.push(
        "config.activeConference.conferenceFeatures.notesFeatures",
      );
    }

    if (updateMaskParts.length === 0) {
      logger.warn(
        "No valid update parameters provided. No API call will be made.",
      );
      return null;
    }

    const [response] = await meetClient.updateSpace({
      space: spaceToUpdate,
      updateMask: { paths: updateMaskParts },
    });

    logger.info(`Successfully updated Google Meet conference: ${spaceName}`);
    return response;
  } catch (error: any) {
    logger.error("Error updating Google Meet conference:", error);
    if (error instanceof ErrorHandler) throw error;
    throw new ErrorHandler("Failed to update Google Meet conference", 500);
  }
}
