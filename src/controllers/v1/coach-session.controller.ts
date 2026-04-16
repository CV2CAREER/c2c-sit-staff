import { Request, Response } from "express";
import catchAsyncError from "../../utils/catchAsyncError";
import { getServiceLogger } from "../../utils/createLogger";
import { getCoachSessionsData } from "../../services/coach-session.service";

const logger = getServiceLogger("coach-session-controller");

/**
 * Coach Endpoint to get session statistics and bookings
 * Returns:
 * - Completed Sessions count & list
 * - Pending Sessions count & list
 * - All non-completed booking sessions
 */
export const getCoachSessions = catchAsyncError(
  async (req: Request, res: Response) => {
    const coachId = req.user.id;
    const bypassCache = req.query.bypassCache === 'true';

    logger.info(`Retrieving sessions for coach ID: ${coachId} ${bypassCache ? '(cache bypassed)' : ''}`);

    const sessionData = await getCoachSessionsData(coachId, bypassCache);

    res.apiSuccess(
      sessionData,
      "Coach sessions retrieved successfully"
    );
  }
);
