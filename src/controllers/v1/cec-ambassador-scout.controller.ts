import { Request, Response } from "express";
import catchAsyncError from "../../utils/catchAsyncError";
import ErrorHandler from "../../utils/errorHandler";
import { CECAmbassadorScoutService } from "../../services/v1/cec-ambassador-scout.service";

export const getCECAmbassadorScouts = catchAsyncError(async (req: Request, res: Response) => {
  try {
    const result = await CECAmbassadorScoutService.getAll(req.query);
    res.apiSuccess(result, "Ambassador scouts retrieved successfully");
  } catch (error: any) {
    return res.apiError(new ErrorHandler(error.message, 400));
  }
});

export const getCECClientsWithAmbassadorScouts = catchAsyncError(async (req: Request, res: Response) => {
  try {
    const result = await CECAmbassadorScoutService.getClientsWithLogs(req.query);
    res.apiSuccess(result, "Clients with ambassador scouts retrieved successfully");
  } catch (error: any) {
    console.error("[CEC getClientsWithAmbassadorScouts] ERROR:", error.message);
    return res.apiError(new ErrorHandler(error.message, 400));
  }
});

export const getCECAmbassadorScoutById = catchAsyncError(async (req: Request, res: Response) => {
  try {
    const record = await CECAmbassadorScoutService.getById(req.params.id);
    res.apiSuccess(record, "Ambassador scout retrieved successfully");
  } catch (error: any) {
    const statusCode = error.message === "Ambassador scout not found" ? 404 : 400;
    return res.apiError(new ErrorHandler(error.message, statusCode));
  }
});

export const getCECAmbassadorScoutStats = catchAsyncError(async (req: Request, res: Response) => {
  try {
    const stats = await CECAmbassadorScoutService.getStats();
    res.apiSuccess(stats, "Stats retrieved successfully");
  } catch (error: any) {
    return res.apiError(new ErrorHandler(error.message, 400));
  }
});

export const createCECAmbassadorScout = catchAsyncError(async (req: any, res: Response) => {
  try {
    const record = await CECAmbassadorScoutService.create(req.body, req.user);
    res.apiSuccess(record, "Ambassador scout created successfully");
  } catch (error: any) {
    return res.apiError(new ErrorHandler(error.message, 400));
  }
});

export const updateCECAmbassadorScout = catchAsyncError(async (req: any, res: Response) => {
  try {
    const record = await CECAmbassadorScoutService.update(req.params.id, req.body, req.user);
    res.apiSuccess(record, "Ambassador scout updated successfully");
  } catch (error: any) {
    const statusCode = error.message === "Ambassador scout not found" ? 404 : 400;
    return res.apiError(new ErrorHandler(error.message, statusCode));
  }
});

export const deleteCECAmbassadorScout = catchAsyncError(async (req: any, res: Response) => {
  try {
    await CECAmbassadorScoutService.delete(req.params.id, req.user);
    res.apiSuccess(null, "Ambassador scout deleted successfully");
  } catch (error: any) {
    const statusCode = error.message === "Ambassador scout not found" ? 404 : 400;
    return res.apiError(new ErrorHandler(error.message, statusCode));
  }
});
