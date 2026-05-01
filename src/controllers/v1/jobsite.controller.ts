import { Request, Response } from "express";
import catchAsyncError from "../../utils/catchAsyncError";
import { getServiceLogger } from "../../utils/createLogger";
import ErrorHandler from "../../utils/errorHandler";
import { Role } from "../../utils/enum";
import { jobsiteService } from "../../services/admin/jobsite.service";

const logger = getServiceLogger("jobsite-controller");

const ensureAuthorized = (req: Request) => {
  const { user } = req;
  const allowedRoles = [Role.ADMIN, Role.ASSISTANT];
  if (!user || !allowedRoles.includes(user.role as Role)) {
    throw new ErrorHandler("Only admin and assistant users can access this endpoint.", 403);
  }
  return user;
};

/**
 * GET /jobsite?action=retrieve&userId=...
 * GET /jobsite?action=trigger&userId=...&aggId=...
 */
export const getJobsite = catchAsyncError(async (req: Request, res: Response) => {
  ensureAuthorized(req);
  const { action, userId, aggId } = req.query as Record<string, string>;

  if (!userId) throw new ErrorHandler("userId query param is required.", 400);

  if (action === "trigger") {
    if (!aggId) throw new ErrorHandler("aggId query param is required for trigger.", 400);
    const host = req.headers.host || req.headers.origin || "localhost";

    logger.info(`Triggering jobsite for user ${userId}, aggId ${aggId}`);
    const result = await jobsiteService.triggerJobsite(userId, aggId, host);
    return res.apiSuccess(result, result.message);
  }

  // default: retrieve
  logger.info(`Retrieving jobsites for user ${userId}`);
  const result = await jobsiteService.getUserJobsites(userId);
  return res.apiSuccess(result, "Jobsites retrieved successfully");
});

/**
 * POST /jobsite — auto-assign jobsites based on user's country
 * Body: { userId }
 */
export const upsertJobsite = catchAsyncError(async (req: Request, res: Response) => {
  ensureAuthorized(req);
  const { userId } = req.body;

  if (!userId) throw new ErrorHandler("userId is required.", 400);

  const host = req.headers.host || req.headers.origin || "localhost";

  logger.info(`Assigning jobsites for user ${userId}`);
  const result = await jobsiteService.assignUserJobsites(userId, host);
  return res.apiSuccess(result, result.message);
});

/**
 * PUT /jobsite — update fields on an existing jobsite link
 * Body: { userId, aggId, ...updates }
 */
export const updateJobsite = catchAsyncError(async (req: Request, res: Response) => {
  ensureAuthorized(req);
  const { userId, aggId, ...updates } = req.body;

  if (!userId) throw new ErrorHandler("userId is required.", 400);
  if (!aggId) throw new ErrorHandler("aggId is required.", 400);

  logger.info(`Updating jobsite for user ${userId}, aggId ${aggId}`);
  const result = await jobsiteService.updateUserJobsite(userId, aggId, updates);
  return res.apiSuccess(result, "Jobsite updated");
});

/**
 * DELETE /jobsite?userId=...&aggId=...&aggIds=...
 * aggIds accepts a comma-separated list
 */
export const deleteJobsite = catchAsyncError(async (req: Request, res: Response) => {
  ensureAuthorized(req);
  const { userId, aggId, aggIds } = req.query as Record<string, string>;

  if (!userId) throw new ErrorHandler("userId query param is required.", 400);

  const parsedAggIds = aggIds
    ? aggIds.split(",").map((id) => id.trim()).filter(Boolean)
    : undefined;

  logger.info(`Deleting jobsite(s) for user ${userId}`);
  const result = await jobsiteService.deleteUserJobsites(userId, aggId, parsedAggIds);
  return res.apiSuccess(result, "Deleted successfully");
});
