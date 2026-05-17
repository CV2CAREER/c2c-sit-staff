import { Request, Response } from "express";
import catchAsyncError from "../../utils/catchAsyncError";
import { getServiceLogger } from "../../utils/createLogger";
import {
  getAllClientAvailabilities as getAllClientAvailabilitiesService,
  acceptClientAvailability as acceptClientAvailabilityService,
  declineClientAvailability as declineClientAvailabilityService,
} from "../../services/client-availability.service";

const logger = getServiceLogger("client-availability-controller");

export const getAllClientAvailabilities = catchAsyncError(
  async (req: Request, res: Response) => {
    const userId = (req as any).user?.id;

    if (!userId) {
      throw new Error("User not authenticated");
    }

    logger.info(`Fetching all client availabilities, requested by: ${userId}`);

    const availabilities = await getAllClientAvailabilitiesService();

    res.apiSuccess(
      availabilities,
      "Client availabilities retrieved successfully",
    );
  },
);

export const declineClientAvailability = catchAsyncError(
  async (req: Request, res: Response) => {
    const coachId = (req as any).user?.id;

    if (!coachId) {
      throw new Error("User not authenticated");
    }

    const { id } = req.params;
    const { reason } = req.body;

    logger.info(`Coach ${coachId} declining client availability: ${id}`);

    await declineClientAvailabilityService(id, coachId, reason);

    res.apiSuccess(null, "Availability declined successfully");
  },
);

export const acceptClientAvailability = catchAsyncError(
  async (req: Request, res: Response) => {
    const coachId = (req as any).user?.id;

    if (!coachId) {
      throw new Error("User not authenticated");
    }

    const { id } = req.params;
    const { meetingLink } = req.body;

    logger.info(`Coach ${coachId} accepting client availability: ${id}`);

    const session = await acceptClientAvailabilityService(
      id,
      coachId,
      meetingLink,
    );

    res.apiSuccess(
      session,
      "Availability accepted and session scheduled successfully",
      201,
    );
  },
);
