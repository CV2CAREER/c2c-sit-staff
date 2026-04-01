import { Request, Response } from "express";
import { analyticsApplicationService } from "../../services/admin/analytics.application.service";
import { adminControlApplicationService } from "../../services/admin/admin-control.application.service";
import { inFlightAllocationApplicationService } from "../../services/admin/in-flight-allocation.application.service";
import { schemaManagementApplicationService } from "../../services/admin/schema-management.application.service";
import { throttleApplicationService } from "../../services/admin/throttle.application.service";
import { botWorkerIntegrationService } from "../../services/admin/bot-worker-integration.service";
import { tableMetadataApplicationService } from "../../services/admin/table-metadata.application.service";
import { adminUserApplicationService } from "../../services/admin/admin-user.application.service";
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

    // Integrate with BullMQ: pause/resume scraping queues immediately when botEnabled changes.
    if (typeof botEnabled === "boolean") {
      try {
        if (status.botEnabled) {
          await botWorkerIntegrationService.resumeScrapingQueues(
            `admin-toggle:${user.email}`,
          );
        } else {
          await botWorkerIntegrationService.pauseScrapingQueues(
            `admin-toggle:${user.email}`,
          );
        }
      } catch (error: any) {
        // Alert and surface an error so the admin sees the failure.
        await botWorkerIntegrationService.alertStatusUnavailable(
          {
            name: "scraping-queues",
            status: "unavailable",
            error: error?.message || String(error),
          },
          "admin-toggle",
        );
        throw new ErrorHandler(
          "Control updated, but worker queue sync failed. Check Redis/BullMQ.",
          503,
        );
      }
    }

    res.apiSuccess(status, "Admin control updated successfully");
  },
);

export const getAdminThrottle = catchAsyncError(async (req: Request, res: Response) => {
  ensureAdmin(req);

  const status = await throttleApplicationService.getThrottleStatus();
  res.apiSuccess(status, "Throttle configuration retrieved successfully");
});

export const patchAdminThrottle = catchAsyncError(
  async (req: Request, res: Response) => {
    const user = ensureAdmin(req);

    const config = typeof req.body?.config === "object" && req.body?.config
      ? req.body.config
      : req.body;

    const status = await throttleApplicationService.updateThrottle({
      config,
      updatedByUserId: user.id,
    });

    res.apiSuccess(status, "Throttle configuration updated successfully");
  },
);

export const getSchemaColumns = catchAsyncError(
  async (req: Request, res: Response) => {
    ensureAdmin(req);

    const tableName = req.params.tableName;
    const columns = await schemaManagementApplicationService.listColumns(tableName);

    res.apiSuccess(
      { tableName, columns, generatedAt: new Date().toISOString() },
      "Schema columns retrieved successfully",
    );
  },
);

export const postSchemaExpandColumn = catchAsyncError(
  async (req: Request, res: Response) => {
    const user = ensureAdmin(req);

    const tableName = String(req.body?.tableName || "").trim();
    const columnName = String(req.body?.columnName || "").trim();
    const type = String(req.body?.type || "").trim().toLowerCase();

    await schemaManagementApplicationService.expandColumn({
      tableName,
      columnName,
      type: type as any,
      updatedByUserId: user.id,
    });

    res.apiSuccess(
      { ok: true },
      "Schema column expanded successfully",
    );
  },
);

export const deleteSchemaColumn = catchAsyncError(
  async (req: Request, res: Response) => {
    const user = ensureAdmin(req);

    const tableName = req.params.tableName;
    const columnName = req.params.columnName;

    await schemaManagementApplicationService.deleteColumn({
      tableName,
      columnName,
      updatedByUserId: user.id,
    });

    res.apiSuccess(
      { ok: true },
      "Schema column deleted successfully",
    );
  },
);

export const getAdminTableMetadata = catchAsyncError(
  async (req: Request, res: Response) => {
    ensureAdmin(req);

    const tableName = req.params.tableName;
    const metadata = await tableMetadataApplicationService.getTableMetadata(tableName);

    res.apiSuccess(metadata, "Table metadata retrieved successfully");
  },
);

export const getAdminUsers = catchAsyncError(async (req: Request, res: Response) => {
  const user = ensureAdmin(req);

  const page = toOptionalNumber(req.query.page);
  const limit = toOptionalNumber(req.query.limit);
  const search =
    typeof req.query.search === "string" ? req.query.search : undefined;
  const role = typeof req.query.role === "string" ? req.query.role : undefined;

  logger.info(
    `Processing admin users request for admin ${user.email} (page=${page ?? "default"}, limit=${limit ?? "default"})`,
  );

  const payload = await adminUserApplicationService.getUsers({
    page,
    limit,
    search,
    role,
  });

  res.apiSuccess(payload, "Admin users retrieved successfully");
});

export const patchAdminUserPersona = catchAsyncError(
  async (req: Request, res: Response) => {
    const user = ensureAdmin(req);

    const assignments = Array.isArray(req.body?.assignments)
      ? req.body.assignments
      : req.body?.userId && req.body?.role
        ? [{ userId: req.body.userId, role: req.body.role }]
        : [];

    const reason = typeof req.body?.reason === "string" ? req.body.reason : undefined;

    const payload = await adminUserApplicationService.bulkAssignPersona({
      assignments,
      actorUserId: user.id,
      actorEmail: user.email,
      reason,
    });

    res.apiSuccess(payload, "User persona assignment updated successfully");
  },
);
