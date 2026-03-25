import { Request, Response } from "express";
import { analyticsApplicationService } from "../../services/admin/analytics.application.service";
import { adminControlApplicationService } from "../../services/admin/admin-control.application.service";
import { inFlightAllocationApplicationService } from "../../services/admin/in-flight-allocation.application.service";
import catchAsyncError from "../../utils/catchAsyncError";
import { getServiceLogger } from "../../utils/createLogger";
import ErrorHandler from "../../utils/errorHandler";
import { Role } from "../../utils/enum";

const logger = getServiceLogger("admin-controller");

const ensureAdmin = (req: Request) => {
  const { user } = req;

  if (!user || user.role !== Role.ADMIN) {
    throw new ErrorHandler("Only admin users can access this endpoint.", 403);
  }

  return user;
};

const toOptionalNumber = (value: unknown): number | undefined => {
  if (typeof value !== "string" || value.trim().length === 0) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const toOptionalBoolean = (value: unknown): boolean | undefined => {
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

export const getAdminAnalytics = catchAsyncError(
  async (req: Request, res: Response) => {
    const user = ensureAdmin(req);

    const from =
      typeof req.query.from === "string"
        ? req.query.from
        : typeof (req.query as any).startDate === "string"
          ? (req.query as any).startDate
          : undefined;

    const to =
      typeof req.query.to === "string"
        ? req.query.to
        : typeof (req.query as any).endDate === "string"
          ? (req.query as any).endDate
          : undefined;

    logger.info(
      `Processing analytics request for admin ${user.email} (from=${from ?? "default"}, to=${to ?? "default"})`,
    );

    const analytics = await analyticsApplicationService.getSuccessfulVsFailedMetrics(
      { from, to },
    );

    res.apiSuccess(analytics, "Admin analytics retrieved successfully");
  },
);

export const getInFlightSubscriptions = catchAsyncError(
  async (req: Request, res: Response) => {
    const user = ensureAdmin(req);

    const page = toOptionalNumber(req.query.page);
    const limit = toOptionalNumber(req.query.limit);
    const search =
      typeof req.query.search === "string" ? req.query.search : undefined;
    const staffUserId =
      typeof req.query.staffUserId === "string"
        ? req.query.staffUserId
        : undefined;
    const assigned = toOptionalBoolean(req.query.assigned);

    logger.info(
      `Processing in-flight subscriptions request for admin ${user.email} (page=${page ?? "default"}, limit=${limit ?? "default"})`,
    );

    const payload =
      await inFlightAllocationApplicationService.getInFlightSubscriptions({
        page,
        limit,
        search,
        staffUserId,
        assigned,
      });

    res.apiSuccess(payload, "In-flight subscriptions retrieved successfully");
  },
);

export const getPlacementControllers = catchAsyncError(
  async (req: Request, res: Response) => {
    const user = ensureAdmin(req);

    const page = toOptionalNumber(req.query.page);
    const limit = toOptionalNumber(req.query.limit);
    const search =
      typeof req.query.search === "string" ? req.query.search : undefined;

    logger.info(
      `Processing placement-controller list request for admin ${user.email} (page=${page ?? "default"}, limit=${limit ?? "default"})`,
    );

    const payload =
      await inFlightAllocationApplicationService.getPlacementControllers({
        page,
        limit,
        search,
      });

    res.apiSuccess(payload, "Placement controllers retrieved successfully");
  },
);

export const assignPlacementController = catchAsyncError(
  async (req: Request, res: Response) => {
    const user = ensureAdmin(req);

    const planId = typeof req.body?.planId === "string" ? req.body.planId : "";
    const staffUserId =
      typeof req.body?.staffUserId === "string" ? req.body.staffUserId : "";
    const notes = typeof req.body?.notes === "string" ? req.body.notes : undefined;

    const payload =
      await inFlightAllocationApplicationService.assignPlacementController({
        planId,
        staffUserId,
        assignedByUserId: user.id,
        notes,
      });

    res.apiSuccess(payload, "Placement controller assigned successfully");
  },
);

export const unassignPlacementController = catchAsyncError(
  async (req: Request, res: Response) => {
    const user = ensureAdmin(req);

    const planId = req.params.planId;
    const notes = typeof req.body?.notes === "string" ? req.body.notes : undefined;

    const payload =
      await inFlightAllocationApplicationService.unassignPlacementController({
        planId,
        unassignedByUserId: user.id,
        notes,
      });

    res.apiSuccess(payload, "Placement controller unassigned successfully");
  },
);

export const getAdminStatus = catchAsyncError(async (req: Request, res: Response) => {
  ensureAdmin(req);

  const status = await adminControlApplicationService.getStatus(false);
  res.apiSuccess(status, "Admin status retrieved successfully");
});

export const patchAdminBotToggle = catchAsyncError(
  async (req: Request, res: Response) => {
    const user = ensureAdmin(req);

    const botEnabled =
      typeof req.body?.botEnabled === "boolean"
        ? (req.body.botEnabled as boolean)
        : undefined;

    const rawMode =
      typeof req.body?.questionAnswerMode === "string"
        ? String(req.body.questionAnswerMode).trim().toLowerCase()
        : typeof req.body?.mode === "string"
          ? String(req.body.mode).trim().toLowerCase()
          : undefined;

    const questionAnswerMode =
      rawMode === "db" || rawMode === "ai" ? (rawMode as "db" | "ai") : undefined;

    if (rawMode && !questionAnswerMode) {
      throw new ErrorHandler("questionAnswerMode must be 'db' or 'ai'.", 400);
    }

    const status = await adminControlApplicationService.updateControl({
      botEnabled,
      questionAnswerMode,
      updatedByUserId: user.id,
    });

    res.apiSuccess(status, "Admin control updated successfully");
  },
);
