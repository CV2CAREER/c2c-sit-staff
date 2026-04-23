import { Request, Response } from "express";
import { FeatureService } from "../../services/feature.service";
import catchAsyncError from "../../utils/catchAsyncError";
import ErrorHandler from "../../utils/errorHandler";
import { getServiceLogger } from "../../utils/createLogger";
import { Role } from "../../utils/enum";

const logger = getServiceLogger("feature-controller");

const toOptionalBoolean = (value: unknown): boolean | undefined => {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === "true") {
    return true;
  }
  if (normalized === "false") {
    return false;
  }

  return undefined;
};

export const getAllFeatures = catchAsyncError(
  async (req: Request, res: Response) => {
    try {
      const locationId =
        typeof req.query.locationId === "string" ? req.query.locationId.trim() : undefined;
      const tier =
        typeof req.query.tier === "string" ? req.query.tier.trim() : undefined;
      const isActive = toOptionalBoolean(req.query.isActive);

      const features = await FeatureService.getAllFeatures({
        locationId,
        tier,
        isActive,
      });

      res.apiSuccess(features, "Features retrieved successfully");
    } catch (error: any) {
      logger.error(`Failed to retrieve features: ${error.message}`);
      return res.apiError(
        error instanceof ErrorHandler
          ? error
          : new ErrorHandler(error.message || "Failed to retrieve features", 500),
      );
    }
  },
);

export const getFeatureById = catchAsyncError(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
      const feature = await FeatureService.getFeatureById(id);
      res.apiSuccess(feature, "Feature retrieved successfully");
    } catch (error: any) {
      logger.error(`Failed to retrieve feature ${id}: ${error.message}`);
      return res.apiError(
        error instanceof ErrorHandler
          ? error
          : new ErrorHandler(error.message || "Feature not found", 404),
      );
    }
  },
);

export const updateFeature = catchAsyncError(
  async (req: Request, res: Response) => {
    const body = req.body ?? {};
    const id =
      typeof body.id === "string"
        ? body.id.trim()
        : typeof body.featureId === "string"
          ? body.featureId.trim()
          : typeof body.planId === "string"
            ? body.planId.trim()
            : "";

    const updates =
      typeof body.updates === "object" && body.updates
        ? body.updates
        : typeof body.feature === "object" && body.feature
          ? body.feature
          : null;

    if (!id) {
      return res.apiError(new ErrorHandler("Feature ID is required", 400));
    }

    if (!updates || Object.keys(updates).length === 0) {
      return res.apiError(
        new ErrorHandler("At least one update field is required", 400),
      );
    }

    const userRole = req.user?.role;
    if (userRole !== Role.ADMIN && userRole !== Role.ASSISTANT) {
      return res.apiError(
        new ErrorHandler(
          "Unauthorized: Only admins and assistants can update features",
          403,
        ),
      );
    }

    try {
      const updatedFeature = await FeatureService.updateFeature(
        req,
        id,
        updates as Record<string, unknown>,
        req.user?.id || null,
        req.user?.email || "System",
      );

      res.apiSuccess(updatedFeature, "Feature updated successfully");

      logger.info(`Feature ${id} updated by ${req.user?.email || "System"}`);
    } catch (error: any) {
      logger.error(`Failed to update feature ${id}: ${error.message}`);
      return res.apiError(
        error instanceof ErrorHandler
          ? error
          : new ErrorHandler(error.message || "Failed to update feature", 500),
      );
    }
  },
);
