import { Request, Response } from "express";
import {
  getCoaches as getCoachesService,
  getCoachesWithUserData as getCoachesWithUserDataService,
  getAllCoachesPopulated as getAllCoachesPopulatedService,
  getCurrentUserCoachData as getCurrentUserCoachDataService,
} from "../../services/coach.service";
import catchAsyncError from "../../utils/catchAsyncError";
import { getServiceLogger } from "../../utils/createLogger";

const logger = getServiceLogger("coach-controller");

/**
 * Get coaches based on query parameters
 * Query params: type (all), variance (coaches)
 */
export const getCoaches = catchAsyncError(
  async (req: Request, res: Response) => {
    const { type, variance } = req.query;
    const userId = (req as any).user?.id;

    logger.info(`Fetching coaches with type: ${type}, variance: ${variance}`);

    const coaches = await getCoachesService(
      userId,
      type as string,
      variance as string,
    );

    res.apiSuccess(coaches, "Coaches retrieved successfully");
  },
);

/**
 * Get all coaches with user data (public endpoint)
 */
export const getCoachesPublic = catchAsyncError(
  async (req: Request, res: Response) => {
    logger.info("Fetching coaches with user data (public)");

    const coaches = await getCoachesWithUserDataService();

    res.apiSuccess(coaches, "Coaches retrieved successfully");
  },
);

/**
 * Get all coaches with full details (admin only)
 */
export const getAllCoaches = catchAsyncError(
  async (req: Request, res: Response) => {
    logger.info("Fetching all coaches with populated user data");

    const coaches = await getAllCoachesPopulatedService();

    res.apiSuccess(coaches, "All coaches retrieved successfully");
  },
);

/**
 * Get current user's coach profile
 */
export const getMyCoachProfile = catchAsyncError(
  async (req: Request, res: Response) => {
    const userId = (req as any).user?.id;

    if (!userId) {
      throw new Error("User not authenticated");
    }

    logger.info(`Fetching coach profile for user: ${userId}`);

    const coachData = await getCurrentUserCoachDataService(userId);

    res.apiSuccess(coachData, "Coach profile retrieved successfully");
  },
);
