import db from "@/database/postgres";
import ErrorHandler from "@/utils/errorHandler";
import { getServiceLogger } from "@/utils/createLogger";

const logger = getServiceLogger("CoachService");

/**
 * Get coaches based on query parameters
 */
export async function getCoaches(
  userId?: string,
  type?: string,
  variance?: string,
): Promise<any[]> {
  try {
    // Get all coaches with user data (public access)
    if (variance === "coaches") {
      return await getCoachesWithUserData();
    }

    // Check authentication for other endpoints
    if (!userId) {
      throw new ErrorHandler("User not authenticated", 401);
    }

    // Get all coaches with populated user data
    if (type === "all") {
      return await getAllCoachesPopulated();
    }

    // Get current user's coach data
    return await getCurrentUserCoachData(userId);
  } catch (error: any) {
    logger.error("Error retrieving coaches:", error);
    if (error instanceof ErrorHandler) throw error;
    throw new ErrorHandler("Unable to retrieve coaches", 500);
  }
}

/**
 * Get coaches with user data
 */
export async function getCoachesWithUserData(): Promise<any[]> {
  try {
    const coaches = await db.user.findAll({
      where: { role: "coach" },
      raw: true,
    });

    const coachIds = coaches.map((coach: any) => coach.id);

    const coachData = await db.coach.findAll({
      where: { user: coachIds },
    });

    const data = coachData.map((coach: any) => {
      const user = coaches.find((c: any) => c.id === coach.user);
      return {
        ...coach,
        user,
      };
    });

    logger.info("Coaches with user data retrieved successfully");
    return data;
  } catch (error: any) {
    logger.error("Error retrieving coaches with user data:", error);
    throw new ErrorHandler("Unable to retrieve coaches with user data", 500);
  }
}

/**
 * Get all coaches with populated user data
 */
export async function getAllCoachesPopulated(): Promise<any[]> {
  try {
    const coaches = await db.coach.findAll({
      include: [
        {
          association: "user",
          required: true,
          attributes: [
            "id",
            "firstName",
            "lastName",
            "middleName",
            "businessName",
            "email",
            "phoneNumber",
            "profilePicture",
            "country",
            "createdAt",
            "isAccredited",
          ],
        },
      ],
    });

    logger.info("All coaches retrieved successfully");
    return coaches;
  } catch (error: any) {
    logger.error("Error retrieving all coaches:", error);
    throw new ErrorHandler("Unable to retrieve all coaches", 500);
  }
}

/**
 * Get current user's coach data
 */
export async function getCurrentUserCoachData(userId: string): Promise<any> {
  try {
    const coachData = await db.coach.findOne({
      where: { user: userId },
      include: [
        {
          association: "user",
          required: true,
          attributes: [
            "id",
            "firstName",
            "lastName",
            "middleName",
            "businessName",
            "email",
            "phoneNumber",
            "profilePicture",
            "country",
            "createdAt",
            "isAccredited",
          ],
        },
      ],
    });

    if (!coachData) {
      throw new ErrorHandler("You are not a coach", 404);
    }

    logger.info(`Coach data retrieved for user: ${userId}`);
    return coachData;
  } catch (error: any) {
    logger.error("Error retrieving current user coach data:", error);
    if (error instanceof ErrorHandler) throw error;
    throw new ErrorHandler("Unable to retrieve coach data", 500);
  }
}
