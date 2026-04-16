import { Request, Response } from "express";
import {
  getSchedulesByCoach as getSchedulesByCoachService,
  createSchedule as createScheduleService,
  updateSchedule as updateScheduleService,
  deleteSchedule as deleteScheduleService,
} from "../../services/schedule";
import catchAsyncError from "../../utils/catchAsyncError";
import { getServiceLogger } from "../../utils/createLogger";

const logger = getServiceLogger("schedule-controller");

/**
 * Get schedules by coach ID
 */
export const getSchedules = catchAsyncError(
  async (req: Request, res: Response) => {
    const { coachId } = req.query;
    const userId = (req as any).user?.id;

    logger.info(`Fetching schedules for coach: ${coachId || userId}`);

    const schedules = await getSchedulesByCoachService(
      userId,
      coachId as string,
    );

    res.apiSuccess(schedules, "Schedules retrieved successfully");
  },
);

/**
 * Create a new schedule
 */
export const createSchedule = catchAsyncError(
  async (req: Request, res: Response) => {
    const userId = (req as any).user?.id;
    const payload = req.body;

    if (!userId) {
      throw new Error("User not authenticated");
    }

    logger.info(`Creating schedule for user: ${userId}`);

    const newSchedule = await createScheduleService(userId, payload);

    res.apiSuccess(newSchedule, "Schedule created successfully", 201);
  },
);

/**
 * Update an existing schedule
 */
export const updateSchedule = catchAsyncError(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = (req as any).user?.id;
    const payload = req.body;

    if (!userId) {
      throw new Error("User not authenticated");
    }

    logger.info(`Updating schedule: ${id}`);

    const updatedSchedule = await updateScheduleService(userId, id, payload);

    res.apiSuccess(updatedSchedule, "Schedule updated successfully");
  },
);

/**
 * Delete a schedule
 */
export const deleteSchedule = catchAsyncError(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = (req as any).user?.id;

    if (!userId) {
      throw new Error("User not authenticated");
    }

    logger.info(`Deleting schedule: ${id}`);

    await deleteScheduleService(userId, id);

    res.apiSuccess(null, "Schedule deleted successfully");
  },
);
