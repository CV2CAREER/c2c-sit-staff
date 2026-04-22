import { Router } from "express";
import {
  getCoaches,
  getCoachesPublic,
  getAllCoaches,
  getMyCoachProfile,
} from "../../controllers/v1/coach.controller";
import { getCoachSessions, markSessionCompleted, cancelSessionHandler, getCoachSessionById } from "../../controllers/v1/coach-session.controller";
import { checkBlacklistedTokens } from "../../middlewares/checkBlacklistedToken";
import { isUserAuthenticated } from "../../middlewares/auth";
import { authorizeRoles } from "../../middlewares/authorizeRoles";
import { Role } from "../../utils/enum";

const coachRouterV1 = Router();

/**
 * @swagger
 * /v1/coaches:
 *   get:
 *     summary: Get coaches based on query parameters
 *     tags:
 *       - Coaches
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [all]
 *         description: Get all coaches with populated data
 *       - in: query
 *         name: variance
 *         schema:
 *           type: string
 *           enum: [coaches]
 *         description: Get coaches with user data
 *     responses:
 *       200:
 *         description: Coaches retrieved successfully
 */
coachRouterV1.get("/", getCoaches);

/**
 * @swagger
 * /v1/coaches/public:
 *   get:
 *     summary: Get all coaches with user data (public endpoint)
 *     tags:
 *       - Coaches
 *     responses:
 *       200:
 *         description: Coaches retrieved successfully
 */
coachRouterV1.get("/public", getCoachesPublic);

/**
 * @swagger
 * /v1/coaches/all:
 *   get:
 *     summary: Get all coaches with full details (admin only)
 *     tags:
 *       - Coaches
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All coaches retrieved successfully
 *       401:
 *         description: Unauthorized
 */
coachRouterV1.get(
  "/all",
  checkBlacklistedTokens,
  isUserAuthenticated,
  authorizeRoles("admin"),
  getAllCoaches,
);

/**
 * Coach protected routes
 * Only users with COACH role can access these endpoints
 */
coachRouterV1.get("/sessions", checkBlacklistedTokens, isUserAuthenticated, getCoachSessions);
coachRouterV1.get("/sessions/:sessionId", checkBlacklistedTokens, isUserAuthenticated, getCoachSessionById);
coachRouterV1.patch("/sessions/:sessionId/complete", checkBlacklistedTokens, isUserAuthenticated, markSessionCompleted);
coachRouterV1.patch("/sessions/:sessionId/cancel", checkBlacklistedTokens, isUserAuthenticated, cancelSessionHandler);

/**
 * @swagger
 * /v1/coaches/me:
 *   get:
 *     summary: Get current user's coach profile
 *     tags:
 *       - Coaches
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Coach profile retrieved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Coach profile not found
 */
coachRouterV1.get(
  "/me",
  checkBlacklistedTokens,
  isUserAuthenticated,
  getMyCoachProfile,
);

export default coachRouterV1;
