import { google } from "googleapis";
import { GoogleAuth } from "google-auth-library";
import credentials from "../../config/cvtocareer-394713-cefc518e6714.json";
import { getServiceLogger } from "../../utils/createLogger";
import ErrorHandler from "../../utils/errorHandler";

const logger = getServiceLogger("GoogleAuth");

/**
 * Get Google Calendar client for calendar operations
 */
export async function getGoogleCalendarClient() {
  try {
    const client = new google.auth.JWT({
      email: credentials.client_email,
      key: credentials.private_key,
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
        client_email: credentials.client_email,
        private_key: credentials.private_key,
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
