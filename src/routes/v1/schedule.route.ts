import { Router } from "express";
import {
  getSchedules,
  createSchedule,
  updateSchedule,
  deleteSchedule,
} from "../../controllers/v1/schedule.controller";
import { checkBlacklistedTokens } from "../../middlewares/checkBlacklistedToken";
import { isUserAuthenticated } from "../../middlewares/auth";

const scheduleRouterV1 = Router();

/**
 * @swagger
 * /v1/schedules:
 *   get:
 *     summary: Get schedules by coach ID
 *     tags:
 *       - Schedules
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: coachId
 *         schema:
 *           type: string
 *         description: Coach ID (optional, uses authenticated user if not provided)
 *     responses:
 *       200:
 *         description: Schedules retrieved successfully
 *       401:
 *         description: Unauthorized
 */
scheduleRouterV1.get(
  "/",
  checkBlacklistedTokens,
  isUserAuthenticated,
  getSchedules,
);

/**
 * @swagger
 * /v1/schedules:
 *   post:
 *     summary: Create a new schedule
 *     tags:
 *       - Schedules
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               day:
 *                 type: string
 *                 format: date
 *               timezone:
 *                 type: string
 *               time:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     startTime:
 *                       type: string
 *                     endTime:
 *                       type: string
 *     responses:
 *       201:
 *         description: Schedule created successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
scheduleRouterV1.post(
  "/",
  checkBlacklistedTokens,
  isUserAuthenticated,
  createSchedule,
);

/**
 * @swagger
 * /v1/schedules/{id}:
 *   patch:
 *     summary: Update an existing schedule
 *     tags:
 *       - Schedules
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Schedule ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Schedule updated successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Schedule not found
 */
scheduleRouterV1.patch(
  "/:id",
  checkBlacklistedTokens,
  isUserAuthenticated,
  updateSchedule,
);

/**
 * @swagger
 * /v1/schedules/{id}:
 *   delete:
 *     summary: Delete a schedule
 *     tags:
 *       - Schedules
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Schedule ID
 *     responses:
 *       200:
 *         description: Schedule deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Schedule not found
 */
scheduleRouterV1.delete(
  "/:id",
  checkBlacklistedTokens,
  isUserAuthenticated,
  deleteSchedule,
);

export default scheduleRouterV1;
