import { Request, Response } from "express";
import catchAsyncError from "../../utils/catchAsyncError";
import { getServiceLogger } from "../../utils/createLogger";
import { getCoachSessionsData, completeSession, cancelSession, getSessionById, gradeSession } from "../../services/coach-session.service";

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

/**
 * Get single session by ID
 */
export const getCoachSessionById = catchAsyncError(
  async (req: Request, res: Response) => {
    const coachId = req.user.id;
    const { sessionId } = req.params;

    logger.info(`Retrieving session: ${sessionId} | Coach: ${coachId}`);

    const session = await getSessionById(coachId, sessionId);

    res.apiSuccess(
      session,
      "Session retrieved successfully"
    );
  }
);

/**
 * Mark session as completed
 */
export const markSessionCompleted = catchAsyncError(
  async (req: Request, res: Response) => {
    const coachId = req.user.id;
    const { sessionId } = req.params;

    logger.info(`Marking session as completed: ${sessionId} | Coach: ${coachId}`);

    const session = await completeSession(coachId, sessionId);

    res.apiSuccess(
      session,
      "Session marked as completed successfully"
    );
  }
);

/**
 * Cancel session
 */
export const cancelSessionHandler = catchAsyncError(
  async (req: Request, res: Response) => {
    const coachId = req.user.id;
    const { sessionId } = req.params;

    logger.info(`Cancelling session: ${sessionId} | Coach: ${coachId}`);

    const session = await cancelSession(coachId, sessionId);

    res.apiSuccess(
      session,
      "Session cancelled successfully"
    );
  }
);

/**
 * Grade session
 */
export const gradeSessionHandler = catchAsyncError(
  async (req: Request, res: Response) => {
    const coachId = req.user.id;
    const { sessionId } = req.params;
    const grading = req.body;

    logger.info(`Grading session: ${sessionId} | Coach: ${coachId}`);

    const session = await gradeSession(coachId, sessionId, grading);

    res.apiSuccess(
      session,
      "Session graded successfully"
    );
  }
);
