import { Router } from "express";
import {
  createSession,
  getSessionById,
  getSessionsByRole,
  getClientSessions,
  getCoachSessions,
  updateSession,
  cancelSession,
  rescheduleSession,
} from "../../controllers/v1/sessions.controller";
import { checkBlacklistedTokens } from "../../middlewares/checkBlacklistedToken";
import { isUserAuthenticated } from "../../middlewares/auth";

const sessionsRouterV1 = Router();

/**
 * @swagger
 * /v1/sessions:
 *   post:
 *     summary: Create a new session
 *     tags:
 *       - Sessions
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sessionType
 *               - proposedTime
 *               - clientAvailabilityId
 *             properties:
 *               sessionType:
 *                 type: string
 *                 enum: [screening, interview, consultation]
 *               proposedTime:
 *                 type: object
 *                 properties:
 *                   startTime:
 *                     type: string
 *                   endTime:
 *                     type: string
 *               clientAvailabilityId:
 *                 type: string
 *               timezone:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Session created successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
sessionsRouterV1.post(
  "/",
  checkBlacklistedTokens,
  isUserAuthenticated,
  createSession,
);

/**
 * @swagger
 * /v1/sessions/{sessionId}:
 *   get:
 *     summary: Get session by ID
 *     tags:
 *       - Sessions
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *         description: Session ID
 *     responses:
 *       200:
 *         description: Session retrieved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Session not found
 */
sessionsRouterV1.get(
  "/:sessionId",
  checkBlacklistedTokens,
  isUserAuthenticated,
  getSessionById,
);

/**
 * @swagger
 * /v1/sessions/list/by-role:
 *   get:
 *     summary: Get sessions by user role
 *     tags:
 *       - Sessions
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by session status
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         description: Filter by session type
 *     responses:
 *       200:
 *         description: Sessions retrieved successfully
 *       401:
 *         description: Unauthorized
 */
sessionsRouterV1.get(
  "/list/by-role",
  checkBlacklistedTokens,
  isUserAuthenticated,
  getSessionsByRole,
);

/**
 * @swagger
 * /v1/sessions/client/sessions:
 *   get:
 *     summary: Get client sessions
 *     tags:
 *       - Sessions
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by session status
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         description: Filter by session type
 *     responses:
 *       200:
 *         description: Client sessions retrieved successfully
 *       401:
 *         description: Unauthorized
 */
sessionsRouterV1.get(
  "/client/sessions",
  checkBlacklistedTokens,
  isUserAuthenticated,
  getClientSessions,
);

/**
 * @swagger
 * /v1/sessions/coach/sessions:
 *   get:
 *     summary: Get coach sessions
 *     tags:
 *       - Sessions
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by session status
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         description: Filter by session type
 *     responses:
 *       200:
 *         description: Coach sessions retrieved successfully
 *       401:
 *         description: Unauthorized
 */
sessionsRouterV1.get(
  "/coach/sessions",
  checkBlacklistedTokens,
  isUserAuthenticated,
  getCoachSessions,
);

/**
 * @swagger
 * /v1/sessions/{sessionId}:
 *   patch:
 *     summary: Update session
 *     tags:
 *       - Sessions
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *         description: Session ID
 *       - in: query
 *         name: isGrading
 *         schema:
 *           type: boolean
 *         description: If true, this is a grading update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Session updated successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Session not found
 */
sessionsRouterV1.patch(
  "/:sessionId",
  checkBlacklistedTokens,
  isUserAuthenticated,
  updateSession,
);

/**
 * @swagger
 * /v1/sessions/{sessionId}/reschedule:
 *   patch:
 *     summary: Reschedule a session (coach only)
 *     tags:
 *       - Sessions
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *         description: Session ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - startTime
 *               - endTime
 *             properties:
 *               startTime:
 *                 type: string
 *                 description: New start time (HH:mm or h:mm A)
 *                 example: "10:00"
 *               endTime:
 *                 type: string
 *                 description: New end time (HH:mm or h:mm A)
 *                 example: "11:30"
 *               date:
 *                 type: string
 *                 format: date
 *                 description: New date (optional, keeps existing if omitted)
 *                 example: "2026-06-15"
 *               timezone:
 *                 type: string
 *                 description: New timezone (optional, keeps existing if omitted)
 *                 example: "Australia/Sydney"
 *               meetingLink:
 *                 type: string
 *                 description: New meeting link (optional, keeps existing if omitted)
 *                 example: "https://meet.google.com/new-link"
 *     responses:
 *       200:
 *         description: Session rescheduled successfully
 *       400:
 *         description: Cannot reschedule a completed or canceled session, or missing required fields
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Session not found or coach not assigned
 */
sessionsRouterV1.patch(
  "/:sessionId/reschedule",
  checkBlacklistedTokens,
  isUserAuthenticated,
  rescheduleSession,
);

/**
 * @swagger
 * /v1/sessions/{sessionId}/cancel:
 *   post:
 *     summary: Cancel a session
 *     tags:
 *       - Sessions
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *         description: Session ID
 *     responses:
 *       200:
 *         description: Session canceled successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Session not found
 */
sessionsRouterV1.post(
  "/:sessionId/cancel",
  checkBlacklistedTokens,
  isUserAuthenticated,
  cancelSession,
);

export default sessionsRouterV1;
