import { Request, Response } from "express";
import { FeatureService } from "../../services/feature.service";
import catchAsyncError from "../../utils/catchAsyncError";
import ErrorHandler from "../../utils/errorHandler";
import { getServiceLogger } from "../../utils/createLogger";
import { Role } from "../../utils/enum";

const logger = getServiceLogger("feature-controller");

// Get all features
export const getAllFeatures = catchAsyncError(
  async (req: Request, res: Response) => {
    try {
      const features = await FeatureService.getAllFeatures();
      res.apiSuccess(features, "Features retrieved successfully");
    } catch (error: any) {
      logger.error(`Failed to retrieve features: ${error.message}`);
      return res.apiError(new ErrorHandler(error.message, 500));
    }
  }
);

// Get feature by ID
export const getFeatureById = catchAsyncError(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
      const feature = await FeatureService.getFeatureById(id);
      res.apiSuccess(feature, "Feature retrieved successfully");
    } catch (error: any) {
      logger.error(`Failed to retrieve feature ${id}: ${error.message}`);
      return res.apiError(new ErrorHandler(error.message, 404));
    }
  }
);

// Update feature settings and send Slack notification
export const updateFeature = catchAsyncError(
  async (req: Request, res: Response) => {
    const { id, updates }: { id: string; updates: Partial<any> } = req.body;

    // Validate required parameters
    if (!id) {
      return res.apiError(new ErrorHandler("Feature ID is required", 400));
    }

    if (!updates || Object.keys(updates).length === 0) {
      return res.apiError(new ErrorHandler("At least one update field is required", 400));
    }

    // Check if user has permission (ADMIN or ASSISTANT)
    const userRole = req.user?.role;
    if (userRole !== Role.ADMIN && userRole !== Role.ASSISTANT) {
      return res.apiError(new ErrorHandler("Unauthorized: Only admins and PC can update features", 403));
    }

try {
      
      // Update the feature (Slack notification is sent internally in the service)
      const updatedFeature = await FeatureService.updateFeature(
        req,
        id, 
        updates, 
        req.user?.id || null,
        req.user?.email || 'System'
      );

      res.apiSuccess(
        updatedFeature,
        "Feature updated successfully and Slack notification sent"
      );

      logger.info(`Feature ${id} updated by ${req.user?.email || 'System'}`);
    } catch (error: any) {
      logger.error(`Failed to update feature ${id}: ${error.message}`);
      return res.apiError(new ErrorHandler(error.message, 500));
    }
  }
);