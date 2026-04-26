import db from "@/database/postgres";
import ErrorHandler from "@/utils/errorHandler";
import { getServiceLogger } from "@/utils/createLogger";

const logger = getServiceLogger("CoachService");

const normalizeCoachUser = (user: any) => ({
  ...user,
  _id: user?.id || user?._id,
});

const buildCoachFallback = (user: any) => ({
  id: user?.id || user?._id,
  user: normalizeCoachUser(user),
  isAccredited: Boolean(user?.isAccredited),
});

const getCoachModel = () => {
  const model = (db as any).coach;
  if (!model || typeof model.findAll !== "function") {
    return null;
  }
  return model;
};

const getCoachUsers = async () => {
  const users = await db.user.findAll({
    where: { role: "coach" },
    raw: true,
  });
  return users.map(normalizeCoachUser);
};

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
    const coachUsers = await getCoachUsers();
    const coachModel = getCoachModel();

    if (!coachModel || coachUsers.length === 0) {
      logger.info("Coaches retrieved from users table fallback");
      return coachUsers.map(buildCoachFallback);
    }

    const coachIds = coachUsers
      .map((coach: any) => coach.id)
      .filter((id: string | undefined) => Boolean(id));

    let coachData: any[] = [];
    try {
      coachData = await coachModel.findAll({
        where: { user: coachIds },
      });
    } catch (error) {
      logger.warn("Coach model query failed, using users table fallback", error);
      return coachUsers.map(buildCoachFallback);
    }

    const coachesByUserId = new Map<string, any>();

    for (const row of coachData) {
      const coach =
        typeof row?.toJSON === "function" ? row.toJSON() : row;
      const coachUserId = coach?.user?._id || coach?.user?.id || coach?.user;
      const user = coachUsers.find((candidate: any) => candidate.id === coachUserId);

      if (!user) {
        continue;
      }

      coachesByUserId.set(user.id, {
        ...coach,
        user: normalizeCoachUser(user),
      });
    }

    const data = coachUsers.map(
      (user: any) => coachesByUserId.get(user.id) || buildCoachFallback(user),
    );

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
    const coachModel = getCoachModel();
    if (!coachModel) {
      logger.info("Coach model unavailable, returning user-role coaches");
      const coachUsers = await getCoachUsers();
      return coachUsers.map(buildCoachFallback);
    }

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
    const coachModel = getCoachModel();
    if (!coachModel) {
      const user = await db.user.findOne({
        where: { id: userId, role: "coach" },
        raw: true,
      });

      if (!user) {
        throw new ErrorHandler("You are not a coach", 404);
      }

      logger.info(`Coach data retrieved from user table for user: ${userId}`);
      return buildCoachFallback(user);
    }

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
