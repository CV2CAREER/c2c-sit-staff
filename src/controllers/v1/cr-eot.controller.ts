import { Request, Response } from "express";
import catchAsyncError from "../../utils/catchAsyncError";
import ErrorHandler from "../../utils/errorHandler";
import { CREOTService } from "../../services/admin/cr-eot.service";
import { getServiceLogger } from "../../utils/createLogger";

const logger = getServiceLogger("cr-eot-controller");

/**
 * Get EOT options (CRs or Owners)
 */
export const getEOTOptions = catchAsyncError(async (req: Request, res: Response) => {
  try {
    const { variance } = req.query;
    if (variance) {
      const options = await CREOTService.getEOCOptions(variance as string);
      return res.apiSuccess(options, "EOT options retrieved successfully", 200);
    }

    const active = req.query.active === "true";
    const recycle = req.query.recycle === "true";
    const requests = await CREOTService.getEOTRequests({ active, recycle });
    return res.apiSuccess(requests, "EOT requests retrieved successfully", 200);

  } catch (error: any) {
    logger.error(`❌ Failed to get EOT options: ${error.message}`);
    return res.apiError(new ErrorHandler(error.message || "Failed to retrieve EOT options", 500));
  }
});

/**
 * Create new EOT Request
 */
export const createEOTRequest = catchAsyncError(async (req: any, res: Response) => {
  try {
    const result = await CREOTService.createEOTRequest(req, req.body, req.user);
    return res.apiSuccess(result.data, result.message, 201);

  } catch (error: any) {
    logger.error(`❌ Failed to create EOT Request: ${error.message}`);
    return res.apiError(new ErrorHandler(error.message || "Failed to create EOT Request", 500));
  }
});
