import { Request, Response } from "express";
import catchAsyncError from "../../utils/catchAsyncError";
import ErrorHandler from "../../utils/errorHandler";
import { CROptionsService } from "../../services/admin/cr-options.service";
import { getServiceLogger } from "../../utils/createLogger";

const logger = getServiceLogger("cr-options-controller");

/**
 * Get all CR Tracking options (dropdown values)
 */
export const getCROptions = catchAsyncError(async (req: Request, res: Response) => {
  try {
    const { type } = req.query;
    const options = await CROptionsService.getAllOptions(type as string);
    return res.apiSuccess(options, options.message, 200);

  } catch (error: any) {
    logger.error(`❌ Failed to get CR options: ${error.message}`);
    return res.apiError(new ErrorHandler(error.message || "Failed to retrieve CR options", 500));
  }
});

/**
 * Create new CR Option
 */
export const createCROption = catchAsyncError(async (req: any, res: Response) => {
  try {
    const { type } = req.query;
    const entry = await CROptionsService.createOption(req, type as string, req.body, req.user);
    return res.apiSuccess(entry, "CR Option created successfully", 201);
  } catch (error: any) {
    logger.error(`❌ Failed to create CR option: ${error.message}`);
    return res.apiError(new ErrorHandler(error.message || "Failed to create CR option", 500));
  }
});

/**
 * Update existing CR Option
 */
export const updateCROption = catchAsyncError(async (req: any, res: Response) => {
  try {
    const { type, id } = req.query;
    const entry = await CROptionsService.updateOption(req, type as string, id as string, req.body, req.user);
    return res.apiSuccess(entry, "CR Option updated successfully", 200);
  } catch (error: any) {
    logger.error(`❌ Failed to update CR option: ${error.message}`);
    return res.apiError(new ErrorHandler(error.message || "Failed to update CR option", 500));
  }
});

/**
 * Delete CR Option
 */
export const deleteCROption = catchAsyncError(async (req: any, res: Response) => {
  try {
    const { type, id } = req.query;
    await CROptionsService.deleteOption(req, type as string, id as string, req.user);
    return res.apiSuccess({}, "CR Option deleted successfully", 200);
  } catch (error: any) {
    logger.error(`❌ Failed to delete CR option: ${error.message}`);
    return res.apiError(new ErrorHandler(error.message || "Failed to delete CR option", 500));
  }
});
