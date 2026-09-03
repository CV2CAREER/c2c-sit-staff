import { Request, Response } from "express";
import catchAsyncError from "../../utils/catchAsyncError";
import ErrorHandler from "../../utils/errorHandler";
import { CECIssueBurndownService } from "../../services/v1/cec-issue-burndown.service";

export const getCECIssueBurndowns = catchAsyncError(async (req: Request, res: Response) => {
  try {
    const result = await CECIssueBurndownService.getAll(req.query);
    res.apiSuccess(result, "Issue burndowns retrieved successfully");
  } catch (error: any) {
    return res.apiError(new ErrorHandler(error.message, 400));
  }
});

export const getCECClientsWithIssueBurndowns = catchAsyncError(async (req: Request, res: Response) => {
  try {
    const result = await CECIssueBurndownService.getClientsWithLogs(req.query);
    res.apiSuccess(result, "Clients with issue burndowns retrieved successfully");
  } catch (error: any) {
    console.error("[CEC getClientsWithIssueBurndowns] ERROR:", error.message);
    return res.apiError(new ErrorHandler(error.message, 400));
  }
});

export const getCECIssueBurndownById = catchAsyncError(async (req: Request, res: Response) => {
  try {
    const record = await CECIssueBurndownService.getById(req.params.id);
    res.apiSuccess(record, "Issue burndown retrieved successfully");
  } catch (error: any) {
    const statusCode = error.message === "Issue burndown not found" ? 404 : 400;
    return res.apiError(new ErrorHandler(error.message, statusCode));
  }
});

export const getCECIssueBurndownStats = catchAsyncError(async (req: Request, res: Response) => {
  try {
    const stats = await CECIssueBurndownService.getStats();
    res.apiSuccess(stats, "Stats retrieved successfully");
  } catch (error: any) {
    return res.apiError(new ErrorHandler(error.message, 400));
  }
});

export const createCECIssueBurndown = catchAsyncError(async (req: any, res: Response) => {
  try {
    const record = await CECIssueBurndownService.create(req.body, req.user);
    res.apiSuccess(record, "Issue burndown created successfully");
  } catch (error: any) {
    return res.apiError(new ErrorHandler(error.message, 400));
  }
});

export const updateCECIssueBurndown = catchAsyncError(async (req: any, res: Response) => {
  try {
    const record = await CECIssueBurndownService.update(req.params.id, req.body, req.user);
    res.apiSuccess(record, "Issue burndown updated successfully");
  } catch (error: any) {
    const statusCode = error.message === "Issue burndown not found" ? 404 : 400;
    return res.apiError(new ErrorHandler(error.message, statusCode));
  }
});

export const deleteCECIssueBurndown = catchAsyncError(async (req: any, res: Response) => {
  try {
    await CECIssueBurndownService.delete(req.params.id, req.user);
    res.apiSuccess(null, "Issue burndown deleted successfully");
  } catch (error: any) {
    const statusCode = error.message === "Issue burndown not found" ? 404 : 400;
    return res.apiError(new ErrorHandler(error.message, statusCode));
  }
});
