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
    const { stepKey, scheduledAt, note, mode } = req.body;

    if (!stepKey) {
      throw new ErrorHandler("stepKey is required", 400);
    }

    if (mode !== undefined && mode !== "scheduled" && mode !== "completed") {
      throw new ErrorHandler('mode must be "scheduled" or "completed"', 400);
    }

    // SPR-21-11-006 / 010 — optional attest details: the appointment's
    // date/time and an outcome note, both carried into the customer emails
    // and the #town-crier Slack post. A malformed date is rejected rather
    // than silently dropped — the customer email is the record.
    let details: { scheduledAt?: Date; note?: string; mode?: "scheduled" | "completed" } | undefined;
    if (scheduledAt !== undefined || note !== undefined || mode !== undefined) {
      details = {};
      if (scheduledAt !== undefined && scheduledAt !== null && scheduledAt !== "") {
        const parsed = new Date(scheduledAt);
        if (Number.isNaN(parsed.getTime())) {
          throw new ErrorHandler("scheduledAt must be a valid date/time", 400);
        }
        details.scheduledAt = parsed;
      }
      if (typeof note === "string" && note.trim()) {
        details.note = note.trim().slice(0, 1000);
      }
      if (mode) {
        details.mode = mode;
      }
    }

    logger.info(`Admin ${adminId} attesting step "${stepKey}" for client ${clientId}`);

    const step = await attestClientJourneyStepService(clientId, stepKey, adminId, details);

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
