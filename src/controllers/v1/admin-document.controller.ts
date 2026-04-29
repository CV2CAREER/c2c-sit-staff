import { Request, Response } from "express";
import catchAsyncError from "../../utils/catchAsyncError";
import { getServiceLogger } from "../../utils/createLogger";
import ErrorHandler from "../../utils/errorHandler";
import { AdminDocumentService } from "../../services/admin-document.service";
import ApiResponse from "../../utils/apiResponse";

const logger = getServiceLogger("upload-controller");

/**
 * Extract CV data points from an uploaded document
 * @route POST /api/v1/documents/extract-cv-data-points
 */
export const extractCvDataPoints = catchAsyncError(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const { id } = req.body;

    if (!userId) {
      throw new ErrorHandler("User not authenticated", 401);
    }

    if (!id) {
      throw new ErrorHandler("Upload ID is required", 400);
    }

    // Use service to extract CV data points
    const result = await AdminDocumentService.extractCvDataPoints(userId, { id });

    res.status(200).json(ApiResponse.success({
      message: "CV data points extracted successfully",
      data: { upload: result.upload, cvDataPoints: result.cvDataPoints },
    }));
    logger.info(`[ExtractCvDataPoints] User ${userId} extracted data points from upload ${id}`);
  }
);

/**
 * Generate Keywords & Role Titles - EXACT match with c2c-customer-v2 endpoint
 * @route POST /api/v1/uploads/generate-keywords
 */
export const generateKeywords = catchAsyncError(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const { id, keywords, roleTitles, increment } = req.body;

    if (!userId) throw new ErrorHandler("User not authenticated", 401);
    if (!id) throw new ErrorHandler("Upload ID (id) is required", 400);
    if (!keywords && !roleTitles) throw new ErrorHandler('Either "keywords" or "roleTitles" must be true', 400);

    logger.info(`[GenerateKeywords] Starting for upload ${id} - User: ${userId}`);
    

    const contentType = keywords ? "keywords" : "roleTitles";
    logger.info(`[GenerateKeywords] Generating ${contentType} for upload ${id}`);

    // Generate content using service method
    const result = await AdminDocumentService.generateKeywords(userId, id, !!keywords, !!roleTitles, !!increment);

    // Fire background operations (non-blocking)
    setImmediate(async () => {
      try {
        await Promise.allSettled([
          AdminDocumentService.sendGenerationNotification(req.user!, contentType)
        ]);
      } catch (e) {
        logger.debug(`Background operation failed: ${e}`);
      }
    });

    // EXACT same response format as v2 - root level fields
    return res.status(200).json({
      message: `${contentType === "keywords" ? "Keywords" : "Role titles"} generated successfully`,
      ...result
    });
  }
);