import { Request, Response } from "express";
import {
  createSession as createSessionService,
  getSessionById as getSessionByIdService,
  getSessionsByRole as getSessionsByRoleService,
  getClientSessions as getClientSessionsService,
  getCoachSessions as getCoachSessionsService,
  updateSession as updateSessionService,
  cancelSession as cancelSessionService,
} from "../../services/sessions";
import { rescheduleSession as rescheduleSessionService } from "../../services/client-availability.service";
import catchAsyncError from "../../utils/catchAsyncError";
import { getServiceLogger } from "../../utils/createLogger";

const logger = getServiceLogger("sessions-controller");

/**
 * Create a new session
 */
export const createSession = catchAsyncError(
  async (req: Request, res: Response) => {
    const userId = (req as any).user?.id;
    const userRole = (req as any).user?.role;
    const payload = req.body;

    if (!userId) {
      throw new Error("User not authenticated");
    }

    logger.info(`Creating session for user: ${userId}, role: ${userRole}`);

    const newSession = await createSessionService(userId, userRole, payload);

    res.apiSuccess(newSession, "Session created successfully", 201);
  },
);

/**
 * Get session by ID
 */
export const getSessionById = catchAsyncError(
  async (req: Request, res: Response) => {
    const { sessionId } = req.params;
    const userId = (req as any).user?.id;
    const userRole = (req as any).user?.role;

    if (!userId) {
      throw new Error("User not authenticated");
    }

    logger.info(`Fetching session: ${sessionId}`);

    const session = await getSessionByIdService(sessionId, userRole);

    res.apiSuccess(session, "Session retrieved successfully");
  },
);

/**
 * Get sessions by role
 */
export const getSessionsByRole = catchAsyncError(
  async (req: Request, res: Response) => {
    const userId = (req as any).user?.id;
    const userRole = (req as any).user?.role;
    const { status, type } = req.query;

    if (!userId) {
      throw new Error("User not authenticated");
    }

    logger.info(`Fetching ${userRole} sessions for user: ${userId}`);

    const sessions = await getSessionsByRoleService(
      userId,
      userRole,
      status as string,
      type as string,
    );

    res.apiSuccess(sessions, "Sessions retrieved successfully");
  },
);

/**
 * Get client sessions
 */
export const getClientSessions = catchAsyncError(
  async (req: Request, res: Response) => {
    const userId = (req as any).user?.id;
    const { status, type } = req.query;

    if (!userId) {
      throw new Error("User not authenticated");
    }

    logger.info(`Fetching client sessions for user: ${userId}`);

    const sessions = await getClientSessionsService(
      userId,
      status as string,
      type as string,
    );

    res.apiSuccess(sessions, "Client sessions retrieved successfully");
  },
);

/**
 * Get coach sessions
 */
export const getCoachSessions = catchAsyncError(
  async (req: Request, res: Response) => {
    const userId = (req as any).user?.id;
    const { status, type } = req.query;

    if (!userId) {
      throw new Error("User not authenticated");
    }

    logger.info(`Fetching coach sessions for user: ${userId}`);

    const sessions = await getCoachSessionsService(
      userId,
      status as string,
      type as string,
    );

    res.apiSuccess(sessions, "Coach sessions retrieved successfully");
  },
);

/**
 * Update session
 */
export const updateSession = catchAsyncError(
  async (req: Request, res: Response) => {
    const { sessionId } = req.params;
    const userId = (req as any).user?.id;
    const updateData = req.body;
    const { isGrading } = req.query;

    if (!userId) {
      throw new Error("User not authenticated");
    }

    logger.info(`Updating session: ${sessionId}`);

    const updatedSession = await updateSessionService(
      sessionId,
      updateData,
      isGrading === "true",
    );

    res.apiSuccess(updatedSession, "Session updated successfully");
  },
);

/**
 * Reschedule a session (coach only)
 */
export const rescheduleSession = catchAsyncError(
  async (req: Request, res: Response) => {
    const { sessionId } = req.params;
    const coachId = (req as any).user?.id;

    if (!coachId) {
      throw new Error("User not authenticated");
    }

    const { startTime, endTime, date, timezone, meetingLink } = req.body;

    logger.info(`Coach ${coachId} rescheduling session: ${sessionId}`);

    const updated = await rescheduleSessionService(sessionId, coachId, {
      startTime,
      endTime,
      date,
      timezone,
      meetingLink,
    });

    res.apiSuccess(updated, "Session rescheduled successfully");
  },
);

/**
 * Cancel session
 */
export const cancelSession = catchAsyncError(
  async (req: Request, res: Response) => {
    const { sessionId } = req.params;
    const userId = (req as any).user?.id;

    if (!userId) {
      throw new Error("User not authenticated");
    }

    logger.info(`Canceling session: ${sessionId}`);

    await cancelSessionService(sessionId);

    res.apiSuccess(null, "Session canceled successfully");
  },
);
