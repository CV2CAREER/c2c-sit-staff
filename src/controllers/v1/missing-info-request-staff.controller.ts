import { Response } from "express";
import catchAsyncError from "@/utils/catchAsyncError";
import { MissingInfoRequestStaffService } from "@/services/admin/missing-info-request-staff.service";
import { getServiceLogger } from "@/utils/createLogger";

const logger = getServiceLogger("missing-info-request-staff-controller");

export const sendMissingInfoRequest = catchAsyncError(async (req: any, res: Response) => {
  logger.info(`Sending missing info request — triggered by: ${req.user?.email ?? "unknown"}`);
  const result = await MissingInfoRequestStaffService.sendRequest(req.body, req.user);
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
  const result = await MissingInfoRequestStaffService.bulkSendReminder(requestIds, req.user);
  return res.apiSuccess(result, "Reminders queued for delivery", 200);
});

export const getRequestResponses = catchAsyncError(async (req: any, res: Response) => {
  const { requestId } = req.params;
  logger.info(`Fetching responses for request ${requestId} — triggered by: ${req.user?.email ?? "unknown"}`);
  const result = await MissingInfoRequestStaffService.getRequestResponses(requestId);
  return res.apiSuccess(result, "Request responses fetched", 200);
});
