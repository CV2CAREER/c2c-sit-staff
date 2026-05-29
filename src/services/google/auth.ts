import { google } from "googleapis";
import { GoogleAuth } from "google-auth-library";
import {
  GOOGLE_DRIVE_CLIENT_EMAIL,
  GOOGLE_DRIVE_PRIVATE_KEY,
} from '../../config/env';
import { getServiceLogger } from "../../utils/createLogger";
import ErrorHandler from "../../utils/errorHandler";

const logger = getServiceLogger("GoogleAuth");

/**
 * Get Google Calendar client for calendar operations
 */
export async function getGoogleCalendarClient() {
  try {
    const client = new google.auth.JWT({
      email: GOOGLE_DRIVE_CLIENT_EMAIL,
      key: GOOGLE_DRIVE_PRIVATE_KEY,
      scopes: [
        "https://www.googleapis.com/auth/calendar",
        "https://www.googleapis.com/auth/calendar.events",
      ],
      subject: "deliveryteam@cvtocareer.com",
    });

    await client.authorize();
    logger.info("Google Calendar client authorized");
    return client;
  } catch (error: any) {
    logger.error("Failed to authorize Google Calendar client:", error);
    throw new ErrorHandler("Google Calendar authorization failed", 500);
  }
}

/**
 * Get Google Meet authentication client
 */
export async function getMeetAuthClient(): Promise<GoogleAuth> {
  try {
    const authClient = new GoogleAuth({
      credentials: {
        client_email: GOOGLE_DRIVE_CLIENT_EMAIL,
        private_key: GOOGLE_DRIVE_PRIVATE_KEY,
      },
      scopes: [
        "https://www.googleapis.com/auth/calendar",
        "https://www.googleapis.com/auth/meetings.space.created",
        "https://www.googleapis.com/auth/calendar.events",
      ],
      clientOptions: {
        subject: "deliveryteam@cvtocareer.com",
      },
    });

    logger.info("Google Meet client authorized");
    return authClient;
  } catch (error: any) {
    logger.error("Failed to authorize Google Meet client:", error);
    throw new ErrorHandler("Google Meet authorization failed", 500);
  }
}
