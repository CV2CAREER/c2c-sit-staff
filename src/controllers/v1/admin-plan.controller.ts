import { Request, Response } from "express";
import catchAsyncError from "../../utils/catchAsyncError";
import ErrorHandler from "../../utils/errorHandler";
import { getServiceLogger } from "../../utils/createLogger";
import { updateUserPlanByFeature } from "../../services/admin-plan.service";

const logger = getServiceLogger("admin-plan-controller");

/**
 * PATCH /api/v1/admin/users/:userId/plan
 *
 * Update a user's plan by specifying a feature (pricing plan) ID.
 * Body: { featureId: string }
 *
 * - If the feature's tier is "Free", the user's plan is removed.
 * - If the feature's tier is paid, a new Plan record is created and assigned.
 */
export const updateUserPlanByFeatureController = catchAsyncError(
  async (req: Request, res: Response) => {
    const { userId } = req.params;
    const { featureId } = req.body;

    logger.info(
      `Processing request to update plan for user ${userId} with feature ${featureId}`,
    );

    if (!featureId || typeof featureId !== "string") {
      return res.apiError(
        new ErrorHandler("featureId is required in the request body", 400),
      );
    }

    const plan = await updateUserPlanByFeature(userId, featureId);

    if (!plan) {
      return res.apiSuccess(
        { plan: null },
        "User plan set to Free — no active plan",
        200,
      );
    }

    return res.apiSuccess(
      { plan },
      `User plan updated to "${plan.title}" successfully`,
      200,
    );
  },
);