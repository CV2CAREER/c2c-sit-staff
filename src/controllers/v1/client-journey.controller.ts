import { Request, Response } from "express";
import catchAsyncError from "../../utils/catchAsyncError";
import { getServiceLogger } from "../../utils/createLogger";
import ErrorHandler from "../../utils/errorHandler";
import {
  getClientJourney as getClientJourneyService,
  attestClientJourneyStep as attestClientJourneyStepService,
  reopenClientJourneyStep as reopenClientJourneyStepService,
} from "../../services/client-journey.service";

const logger = getServiceLogger("client-journey-controller");

export const getClientJourney = catchAsyncError(
  async (req: Request, res: Response) => {
    const adminId = (req as any).user?.id;

    if (!adminId) {
      throw new Error("User not authenticated");
    }

    const { clientId } = req.params;

    const journey = await getClientJourneyService(clientId);

    res.apiSuccess(journey, "Client journey retrieved successfully");
  },
);

export const attestClientJourneyStep = catchAsyncError(
  async (req: Request, res: Response) => {
    const adminId = (req as any).user?.id;

    if (!adminId) {
      throw new Error("User not authenticated");
    }

    const { clientId } = req.params;
    const { stepKey } = req.body;

    if (!stepKey) {
      throw new ErrorHandler("stepKey is required", 400);
    }

    logger.info(`Admin ${adminId} attesting step "${stepKey}" for client ${clientId}`);

    const step = await attestClientJourneyStepService(clientId, stepKey, adminId);

    res.apiSuccess(step, "Client journey step attested");
  },
);

export const reopenClientJourneyStep = catchAsyncError(
  async (req: Request, res: Response) => {
    const adminId = (req as any).user?.id;

    if (!adminId) {
      throw new Error("User not authenticated");
    }

    const { clientId } = req.params;
    const { stepKey } = req.body;

    if (!stepKey) {
      throw new ErrorHandler("stepKey is required", 400);
    }

    logger.info(`Admin ${adminId} reopening step "${stepKey}" for client ${clientId}`);

    await reopenClientJourneyStepService(clientId, stepKey, adminId);

    res.apiSuccess(null, "Client journey step reopened");
  },
);
