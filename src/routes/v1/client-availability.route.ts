import { Router } from "express";
import {
  getAllClientAvailabilities,
  acceptClientAvailability,
  declineClientAvailability,
} from "../../controllers/v1/client-availability.controller";
import { checkBlacklistedTokens } from "../../middlewares/checkBlacklistedToken";
import { isUserAuthenticated } from "../../middlewares/auth";

const clientAvailabilityRouterV1 = Router();

/**
 * @swagger
 * /v1/client-availabilities:
 *   get:
 *     summary: Get all active client availabilities
 *     tags:
 *       - Client Availabilities
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Client availabilities retrieved successfully
 *       401:
 *         description: Unauthorized
 */
clientAvailabilityRouterV1.get(
  "/",
  checkBlacklistedTokens,
  isUserAuthenticated,
  getAllClientAvailabilities,
);

/**
 * @swagger
 * /v1/client-availabilities/{id}/accept:
 *   post:
 *     summary: Coach accepts a client availability and schedules a session
 *     tags:
 *       - Client Availabilities
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Client availability ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               meetingLink:
 *                 type: string
 *                 description: Google Meet or other meeting link (falls back to default if omitted)
 *     responses:
 *       201:
 *         description: Availability accepted and session scheduled successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Client availability not found or already accepted
 */
clientAvailabilityRouterV1.post(
  "/:id/accept",
  checkBlacklistedTokens,
  isUserAuthenticated,
  acceptClientAvailability,
);

/**
 * @swagger
 * /v1/client-availabilities/{id}/decline:
 *   post:
 *     summary: Coach declines a client availability
 *     tags:
 *       - Client Availabilities
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Client availability ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 description: Optional reason for declining (included in client email and Slack alert)
 *     responses:
 *       200:
 *         description: Availability declined successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Client availability not found or already processed
 */
clientAvailabilityRouterV1.post(
  "/:id/decline",
  checkBlacklistedTokens,
  isUserAuthenticated,
  declineClientAvailability,
);

export default clientAvailabilityRouterV1;
