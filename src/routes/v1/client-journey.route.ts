import { Router } from "express";
import {
  getClientJourney,
  attestClientJourneyStep,
  reopenClientJourneyStep,
} from "../../controllers/v1/client-journey.controller";
import { checkBlacklistedTokens } from "../../middlewares/checkBlacklistedToken";
import { isUserAuthenticated } from "../../middlewares/auth";
import { authorizeRoles } from "../../middlewares/authorizeRoles";

const staffOnly = authorizeRoles("admin", "assistant");
const adminOnly = authorizeRoles("admin");

const clientJourneyRouterV1 = Router();

/**
 * @swagger
 * /v1/client-journey/client/{clientId}:
 *   get:
 *     summary: Staff fetches one client's journey — raw completed-step rows, current/awaiting derived by the frontend
 *     tags:
 *       - Client Journey
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: clientId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Client journey retrieved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Client not found
 */
clientJourneyRouterV1.get(
  "/client/:clientId",
  checkBlacklistedTokens,
  isUserAuthenticated,
  staffOnly,
  getClientJourney,
);

/**
 * @swagger
 * /v1/client-journey/client/{clientId}/attest:
 *   post:
 *     summary: Admin manually marks a client journey step complete — idempotent, no-op if already done
 *     tags:
 *       - Client Journey
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: clientId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - stepKey
 *             properties:
 *               stepKey:
 *                 type: string
 *     responses:
 *       200:
 *         description: Client journey step attested
 *       400:
 *         description: Unknown stepKey, or a tour-scoped step with no resolvable active tour
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Client not found
 */
clientJourneyRouterV1.post(
  "/client/:clientId/attest",
  checkBlacklistedTokens,
  isUserAuthenticated,
  adminOnly,
  attestClientJourneyStep,
);

/**
 * @swagger
 * /v1/client-journey/client/{clientId}/reopen:
 *   post:
 *     summary: Admin reverses a mistaken attestation — soft-deletes the completion row
 *     tags:
 *       - Client Journey
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: clientId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - stepKey
 *             properties:
 *               stepKey:
 *                 type: string
 *     responses:
 *       200:
 *         description: Client journey step reopened
 *       400:
 *         description: Unknown stepKey, or a tour-scoped step with no resolvable active tour
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: No completed step found to reopen
 */
clientJourneyRouterV1.post(
  "/client/:clientId/reopen",
  checkBlacklistedTokens,
  isUserAuthenticated,
  adminOnly,
  reopenClientJourneyStep,
);

export default clientJourneyRouterV1;
