import { Router } from "express";
import {
  getAvailabilities,
  createAvailability,
  deleteAvailability,
} from "../../controllers/v1/availability.controller";
import { checkBlacklistedTokens } from "../../middlewares/checkBlacklistedToken";
import { isUserAuthenticated } from "../../middlewares/auth";

const availabilityRouterV1 = Router();

/**
 * @swagger
 * /v1/availabilities:
 *   get:
 *     summary: Get availabilities based on user role
 *     tags:
 *       - Availabilities
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Availabilities retrieved successfully
 *       401:
 *         description: Unauthorized
 */
availabilityRouterV1.get(
  "/",
  checkBlacklistedTokens,
  isUserAuthenticated,
  getAvailabilities,
);

/**
 * @swagger
 * /v1/availabilities:
 *   post:
 *     summary: Create a new availability
 *     tags:
 *       - Availabilities
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - day
 *               - timezone
 *               - from
 *               - to
 *               - sessionType
 *             properties:
 *               day:
 *                 type: string
 *                 format: date
 *               timezone:
 *                 type: string
 *               from:
 *                 type: string
 *               to:
 *                 type: string
 *               sessionType:
 *                 type: string
 *     responses:
 *       201:
 *         description: Availability created successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
availabilityRouterV1.post(
  "/",
  checkBlacklistedTokens,
  isUserAuthenticated,
  createAvailability,
);

/**
 * @swagger
 * /v1/availabilities/{id}:
 *   delete:
 *     summary: Delete/decline an availability
 *     tags:
 *       - Availabilities
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Availability ID
 *       - in: query
 *         name: removeAvailability
 *         schema:
 *           type: boolean
 *         description: If true, only remove without notification
 *     responses:
 *       200:
 *         description: Availability deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Availability not found
 */
availabilityRouterV1.delete(
  "/:id",
  checkBlacklistedTokens,
  isUserAuthenticated,
  deleteAvailability,
);

export default availabilityRouterV1;
