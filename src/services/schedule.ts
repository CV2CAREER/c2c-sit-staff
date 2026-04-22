import { User } from "@/models/v1/user.model";
import { Schedule } from "@/models/v1/schedule.model";
import ErrorHandler from "@/utils/errorHandler";
import { getServiceLogger } from "@/utils/createLogger";
import { Role } from "@/utils/enum";

const logger = getServiceLogger("ScheduleService");

/**
 * Get schedules by coach ID
 */
export async function getSchedulesByCoach(
  userId?: string,
  coachId?: string,
): Promise<any[]> {
  try {
  // If coachId is provided as parameter, use it directly
    if (coachId) {
      // Verify user exists and is coach
      const user = await User.findOne({
        where: { id: coachId },
        attributes: ['id', 'role']
      });

      if (!user || user.role !== Role.COACH) {
        throw new ErrorHandler("Invalid coach ID", 404);
      }

      const schedules = await Schedule.findAll({
        where: { coachId: coachId },
      });

      logger.info("Coach schedules retrieved successfully");
      return schedules;
    }

    // If no coachId provided, get schedules for the authenticated user
    if (!userId) {
      throw new ErrorHandler("User not authenticated", 401);
    }

    const authCoachId = await getAuthCoachId(userId);

    const schedules = await Schedule.findAll({
      where: { coachId: authCoachId },
    });

    logger.info("Coach schedules retrieved successfully");
    return schedules;
  } catch (error: any) {
    logger.error("Failed to retrieve schedules data:", error);
    if (error instanceof ErrorHandler) throw error;
    throw new ErrorHandler("Failed to retrieve schedules data", 500);
  }
}

/**
 * Create a new schedule
 */
export async function createSchedule(
  userId: string,
  payload: any,
): Promise<any> {
  try {
    if (!userId) {
      throw new ErrorHandler("User not authenticated", 400);
    }

    const authCoachId = await getAuthCoachId(userId);
    // ✅ FIX: Database column name is coachId NOT coach
    payload.coachId = authCoachId;

    // ✅ FIX: Map incoming day date to proper columns
    if (payload.day) {
      // Store actual date in date column
      payload.date = payload.day;
      
      // Also calculate weekday name for enum column
      const date = new Date(payload.day);
      const dayIndex = date.getDay();
      const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      payload.day = days[dayIndex];
    }

    // Format time slots from interval format to hourly slots
    const timeSlots: any[] = [];

    if (payload.time && Array.isArray(payload.time)) {
      payload.time.forEach((timeInterval: any) => {
        const startTime = timeInterval.startTime;
        const endTime = timeInterval.endTime;

        const startHours = parseInt(startTime.split(":")[0]);
        const endHours = parseInt(endTime.split(":")[0]);

        for (let hour = startHours; hour < endHours; hour++) {
          const start = `${String(hour).padStart(2, "0")}:00`;
          const end = `${String(hour + 1).padStart(2, "0")}:00`;
          timeSlots.push({ startTime: start, endTime: end });
        }
      });
    }

    const formattedPayload = {
      ...payload,
      time: timeSlots,
    };

    const newSchedule = await Schedule.create(formattedPayload);
    logger.info(`Schedule created: ${newSchedule.id}`);
    return newSchedule;
  } catch (error: any) {
    logger.error("Error creating schedule:", error);
    if (error instanceof ErrorHandler) throw error;
    throw new ErrorHandler("Failed to create a schedule", 500);
  }
}

/**
 * Update an existing schedule
 */
export async function updateSchedule(
  userId: string,
  scheduleId: string,
  payload: any,
): Promise<any> {
  try {
    if (!userId) {
      throw new ErrorHandler("User not authenticated", 400);
    }

    if (!scheduleId) {
      throw new ErrorHandler("Schedule ID is required", 400);
    }

    const schedule = await Schedule.findByPk(scheduleId);

    if (!schedule) {
      throw new ErrorHandler("Schedule not found", 404);
    }

    const updatedSchedule = await schedule.update(payload);

    logger.info(`Schedule updated: ${scheduleId}`);
    return updatedSchedule;
  } catch (error: any) {
    logger.error("Error updating schedule:", error);
    if (error instanceof ErrorHandler) throw error;
    throw new ErrorHandler("Failed to update schedule", 500);
  }
}

/**
 * Delete a schedule
 */
export async function deleteSchedule(
  userId: string,
  scheduleId: string,
): Promise<void> {
  try {
    if (!userId) {
      throw new ErrorHandler("User not authenticated", 400);
    }

    if (!scheduleId) {
      throw new ErrorHandler("Schedule ID is required", 400);
    }

    const schedule = await Schedule.findByPk(scheduleId);

    if (!schedule) {
      throw new ErrorHandler("Schedule not found", 404);
    }

    await schedule.destroy();

    logger.info(`Schedule deleted: ${scheduleId}`);
  } catch (error: any) {
    logger.error("Error deleting schedule:", error);
    if (error instanceof ErrorHandler) throw error;
    throw new ErrorHandler("Failed to delete schedule", 500);
  }
}

/**
 * Get authenticated coach ID from user ID
 */
async function getAuthCoachId(userId: string): Promise<string> {
  try {
    if (!userId) {
      throw new ErrorHandler("User ID is required", 400);
    }

    // Check user role directly on User model
    const user = await User.findOne({
      where: { id: userId },
      attributes: ['id', 'role']
    });

    if (!user) {
      throw new ErrorHandler("User not found", 404);
    }

    // Validate user is actually a coach
    if (user.role !== Role.COACH) {
      throw new ErrorHandler("Only coaches can create schedules", 403);
    }

    // Return the user ID directly as coach ID
    // This matches your existing structure where coach accounts are inside user model
    return userId;

  } catch (error: any) {
    logger.error("Error getting auth coach ID:", error);
    
    if (error instanceof ErrorHandler) throw error;
    
    // Return actual error instead of generic authentication error
    throw new ErrorHandler(`Server error: ${error.message}`, 500);
  }
}