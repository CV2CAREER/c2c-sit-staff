import { Request, Response } from "express";
import { randomBytes } from "crypto";
import catchAsyncError from "../../utils/catchAsyncError";
import ErrorHandler from "../../utils/errorHandler";
import { getServiceLogger } from "../../utils/createLogger";
import { updateUserPlanByFeature, confirmUserProgress, activateCoralPlan, deactivateCoralPlan, extendUserPlan, getUserPlanSummary } from "../../services/admin-plan.service";
import { Progress } from "../../utils/enum";
import { User } from "../../models/v1/user.model";
import { Plan } from "../../models/v1/plan.model";
import { getFrontendUrl } from "../../utils/helpers";

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
    const { featureId, reason, notifyClient } = req.body;
    const host = req.headers.host || req.headers.origin || "localhost";
    const reqUser = req.user as any;

    logger.info(
      `Processing request to update plan for user ${userId} with feature ${featureId}`,
    );

    if (!featureId || typeof featureId !== "string") {
      return res.apiError(
        new ErrorHandler("featureId is required in the request body", 400),
      );
    }

    // `reason` is optional here since this endpoint is also used by the
    // legacy "Payment Confirmed" progress-tracking flow, which doesn't
    // collect one. The Change Plan modal enforces it as required client-side.
    const plan = await updateUserPlanByFeature(host, userId, featureId, {
      reason: typeof reason === "string" ? reason : undefined,
      notifyClient: notifyClient === true,
      adminUser: reqUser
        ? {
            id: reqUser.id,
            firstName: reqUser.firstName,
            lastName: reqUser.lastName,
            role: reqUser.role,
          }
        : undefined,
    });

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

/**
 * GET /api/v1/admin/users/:userId/plan
 *
 * Get a summary of the user's current active plan (title, expiry, days left)
 * for display in the Change Plan / Add Days modal header.
 */
export const getUserPlanSummaryController = catchAsyncError(
  async (req: Request, res: Response) => {
    const { userId } = req.params;

    const summary = await getUserPlanSummary(userId);

    return res.apiSuccess(summary, "User plan summary retrieved successfully", 200);
  },
);

/**
 * PATCH /api/v1/admin/users/:userId/plan/extend
 *
 * Extend a user's active plan by a number of days.
 * Body: { days: number, reason?: string, notifyClient?: boolean }
 */
export const extendUserPlanController = catchAsyncError(
  async (req: Request, res: Response) => {
    const { userId } = req.params;
    const { days, reason, notifyClient } = req.body;
    const host = req.headers.host || req.headers.origin || "localhost";
    const reqUser = req.user as any;

    const parsedDays = Number(days);
    if (!Number.isFinite(parsedDays) || !Number.isInteger(parsedDays) || parsedDays <= 0) {
      return res.apiError(
        new ErrorHandler("days is required and must be a positive integer", 400),
      );
    }

    if (!reason || typeof reason !== "string" || !reason.trim()) {
      return res.apiError(
        new ErrorHandler("reason is required in the request body", 400),
      );
    }

    const plan = await extendUserPlan(host, userId, parsedDays, {
      reason,
      notifyClient: notifyClient === true,
      adminUser: reqUser
        ? {
            id: reqUser.id,
            firstName: reqUser.firstName,
            lastName: reqUser.lastName,
            role: reqUser.role,
          }
        : undefined,
    });

    return res.apiSuccess(
      { plan },
      `Plan extended by ${parsedDays} day(s) successfully`,
      200,
    );
  },
);

/**
 * POST /api/v1/admin/users/:userId/activate-coral
 *
 * Activate a free 30-day Coral plan for an ambassador.
 * Fires SG-CORAL-ACTIVE email and creates Campaign Mgt row.
 */
export const activateCoralPlanController = catchAsyncError(
  async (req: Request, res: Response) => {
    const { userId } = req.params;
    const host = req.headers.host || req.headers.origin || "localhost";

    logger.info(`Processing Coral activation request for user ${userId}`);

    const plan = await activateCoralPlan(host, userId, req.user as any);

    return res.apiSuccess(
      { plan },
      "Coral plan activated successfully",
      200,
    );
  },
);

/**
 * DELETE /api/v1/admin/users/:userId/activate-coral
 *
 * Deactivate an ambassador's active Coral plan.
 */
export const deactivateCoralPlanController = catchAsyncError(
  async (req: Request, res: Response) => {
    const { userId } = req.params;
    const host = req.headers.host || req.headers.origin || "localhost";

    logger.info(`Processing Coral deactivation request for user ${userId}`);

    await deactivateCoralPlan(host, userId);

    return res.apiSuccess({}, "Coral plan deactivated successfully", 200);
  },
);

/**
 * PATCH /api/v1/admin/users/:userId/progress
 *
 * Confirm / advance a user's progress milestone.
 * Optionally confirm payment and capitalise revenue.
 *
 * Body: {
 *   progress: "Payment Confirmed" | "Login Credentials Verified" | ...,
 *   confirmPayment?: boolean,
 *   amount?: number
 * }
 */
export const confirmUserProgressController = catchAsyncError(
  async (req: Request, res: Response) => {
    const { userId } = req.params;
    const { progress, confirmPayment, amount } = req.body;

    logger.info(
      `Processing request to confirm progress for user ${userId}: ${progress}`,
    );

    if (!progress || typeof progress !== "string") {
      return res.apiError(
        new ErrorHandler("progress is required in the request body", 400),
      );
    }

    // Validate progress value
    const validProgress = Object.values(Progress);
    if (!validProgress.includes(progress as Progress)) {
      return res.apiError(
        new ErrorHandler(
          `Invalid progress value. Must be one of: ${validProgress.join(", ")}`,
          400,
        ),
      );
    }

    const user = await confirmUserProgress(
      userId,
      progress as Progress,
      confirmPayment === true,
      amount !== undefined ? Number(amount) : undefined,
    );

    return res.apiSuccess(
      { user },
      `User progress updated to "${progress}" successfully`,
      200,
    );
  },
);

/**
 * GET /api/v1/admin/ambassador/generate-link/:userId
 *
 * Generate (or return existing) ambassador invite link for the given user.
 * Creates a unique token on first call; subsequent calls reuse it.
 */
export const generateAmbassadorLinkController = catchAsyncError(
  async (req: Request, res: Response) => {
    const { userId } = req.params;

    const ambassador = await User.findOne({
      where: { id: userId, isAmbassador: true },
    });

    if (!ambassador) {
      return res.apiError(
        new ErrorHandler("Ambassador user not found", 404),
      );
    }

    const activeCoral = await Plan.findOne({
      where: { userId, title: "Coral", hasExpired: false },
    });

    if (!activeCoral) {
      return res.apiError(
        new ErrorHandler("Ambassador does not have an active Coral plan", 400),
      );
    }

    let token = ambassador.ambassadorToken;
    if (!token || token.length !== 16) {
      token = randomBytes(8).toString("hex");
      await ambassador.update({ ambassadorToken: token });
    }

    const link = `${getFrontendUrl()}/register?ref=${token}`;

    return res.apiSuccess(
      { link, token },
      "Ambassador link generated",
      200,
    );
  },
);
