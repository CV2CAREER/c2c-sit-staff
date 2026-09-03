import { Response } from "express";
import catchAsyncError from "@/utils/catchAsyncError";
import { MissingInfoRequestStaffService } from "@/services/admin/missing-info-request-staff.service";
import { getServiceLogger } from "@/utils/createLogger";

const logger = getServiceLogger("missing-info-request-staff-controller");

export const sendMissingInfoRequest = catchAsyncError(async (req: any, res: Response) => {
  logger.info(`Sending missing info request — triggered by: ${req.user?.email ?? "unknown"}`);
  const host = req.headers.host || req.headers.origin || "localhost";
  const protocol = req.headers["x-forwarded-proto"] || req.protocol || "https";
  const result = await MissingInfoRequestStaffService.sendRequest(req.body, req.user, host, protocol);
  return res.apiSuccess(result, "Request sent successfully", 201);
});

export const getOutstandingRequests = catchAsyncError(async (req: any, res: Response) => {
  const filters = {
    status: typeof req.query.status === "string" ? req.query.status : undefined,
    age: typeof req.query.age === "string" ? req.query.age : undefined,
    page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
    limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 50,
  };
  logger.info(`Fetching outstanding requests (status: ${filters.status || "all"}, age: ${filters.age || "all"})`);
  const result = await MissingInfoRequestStaffService.getOutstandingRequests(filters);
  return res.apiSuccess(result, "Outstanding requests fetched", 200);
});

export const getRequestStats = catchAsyncError(async (req: any, res: Response) => {
  logger.info("Fetching request stats");
  const stats = await MissingInfoRequestStaffService.getRequestStats();
  return res.apiSuccess(stats, "Stats fetched", 200);
});

export const getRequestResponses = catchAsyncError(async (req: any, res: Response) => {
  const { id } = req.params;
  logger.info(`Fetching responses for request ${id}`);
  const result = await MissingInfoRequestStaffService.getRequestResponses(id);
  return res.apiSuccess(result, "Request responses fetched", 200);
});

export const bulkSendReminder = catchAsyncError(async (req: any, res: Response) => {
  const { requestIds } = req.body;
  logger.info(`Bulk reminder triggered by: ${req.user?.email ?? "unknown"}, count: ${requestIds?.length ?? 0}`);
  const host = req.headers.host || req.headers.origin || "localhost";
  const protocol = req.headers["x-forwarded-proto"] || req.protocol || "https";
  const result = await MissingInfoRequestStaffService.bulkSendReminder(requestIds, req.user, host, protocol);
  return res.apiSuccess(result, "Reminders queued for delivery", 200);
});

export const getClientRequests = catchAsyncError(async (req: any, res: Response) => {
  const { targetUserId } = req.params;
  logger.info(`Fetching missing info requests for client ${targetUserId}`);
  const result = await MissingInfoRequestStaffService.getClientRequests(targetUserId);
  return res.apiSuccess(result, "Client requests fetched", 200);
});

export const sendSingleReminder = catchAsyncError(async (req: any, res: Response) => {
  const { id } = req.params;
  logger.info(`Single reminder triggered by: ${req.user?.email ?? "unknown"}, request: ${id}`);
  const host = req.headers.host || req.headers.origin || "localhost";
  const protocol = req.headers["x-forwarded-proto"] || req.protocol || "https";
  const result = await MissingInfoRequestStaffService.sendSingleReminder(id, req.user, host, protocol);
  return res.apiSuccess(result, "Reminder queued for delivery", 200);
});

export const cancelRequest = catchAsyncError(async (req: any, res: Response) => {
  const { id } = req.params;
  logger.info(`Cancel request triggered by: ${req.user?.email ?? "unknown"}, request: ${id}`);
  const host = req.headers.host || req.headers.origin || "localhost";
  const protocol = req.headers["x-forwarded-proto"] || req.protocol || "https";
  const result = await MissingInfoRequestStaffService.cancelRequest(id, req.user, host, protocol);
  return res.apiSuccess(result, "Request cancelled", 200);
});

export const declineRequest = catchAsyncError(async (req: any, res: Response) => {
  const { id } = req.params;
  logger.info(`Decline request triggered by: ${req.user?.email ?? "unknown"}, request: ${id}`);
  const host = req.headers.host || req.headers.origin || "localhost";
  const protocol = req.headers["x-forwarded-proto"] || req.protocol || "https";
  const result = await MissingInfoRequestStaffService.declineRequest(id, req.user, host, protocol);
  return res.apiSuccess(result, "Request declined", 200);
});

export const reusePriorSubmission = catchAsyncError(async (req: any, res: Response) => {
  const { id } = req.params;
  const { clientId } = req.body;
  logger.info(`Reuse prior submission triggered by: ${req.user?.email ?? "unknown"}, request: ${id}, client: ${clientId}`);
  const host = req.headers.host || req.headers.origin || "localhost";
  const protocol = req.headers["x-forwarded-proto"] || req.protocol || "https";
  const result = await MissingInfoRequestStaffService.reusePriorSubmission(id, clientId, req.user, host, protocol);
  return res.apiSuccess(result, "Prior submission reused", 201);
});

export const logCopyAudit = catchAsyncError(async (req: any, res: Response) => {
  const { id } = req.params;
  logger.info(`Copy audit triggered by: ${req.user?.email ?? "unknown"}, request: ${id}`);
  const result = await MissingInfoRequestStaffService.logCopyAudit(id, req.user);
  return res.apiSuccess(result, "Audit entry logged", 200);
});
