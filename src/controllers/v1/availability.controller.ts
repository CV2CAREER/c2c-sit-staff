import { Request, Response } from "express";
import {
  getAvailabilities as getAvailabilitiesService,
  createAvailability as createAvailabilityService,
  deleteAvailability as deleteAvailabilityService,
} from "../../services/availability.service";
import catchAsyncError from "../../utils/catchAsyncError";
import { getServiceLogger } from "../../utils/createLogger";

const logger = getServiceLogger("availability-controller");

/**
 * Get availabilities based on user role
 */
export const getAvailabilities = catchAsyncError(
  async (req: Request, res: Response) => {
    const userId = (req as any).user?.id;
    const userRole = (req as any).user?.role;

    if (!userId) {
      throw new Error("User not authenticated");
    }

    logger.info(
      `Fetching availabilities for user: ${userId}, role: ${userRole}`,
    );

    const availabilities = await getAvailabilitiesService(userId, userRole);

    res.apiSuccess(availabilities, "Availabilities retrieved successfully");
  },
);

/**
 * Create a new availability
 */
export const createAvailability = catchAsyncError(
  async (req: Request, res: Response) => {
    const userId = (req as any).user?.id;
    const payload = req.body;

    if (!userId) {
      throw new Error("User not authenticated");
    }

    logger.info(`Creating availability for user: ${userId}`);

    const newAvailability = await createAvailabilityService(userId, payload);

    res.apiSuccess(newAvailability, "Availability created successfully", 201);
  },
);

/**
 * Delete/decline an availability
 */
export const deleteAvailability = catchAsyncError(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = (req as any).user?.id;
    const { removeAvailability } = req.query;

    if (!userId) {
      throw new Error("User not authenticated");
    }

    logger.info(`Deleting availability: ${id}`);

    await deleteAvailabilityService(id, userId, removeAvailability === "true");

    res.apiSuccess(null, "Availability deleted successfully");
  },
);
