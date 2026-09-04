import { Request, Response } from "express";
import { analyticsApplicationService } from "../../services/admin/analytics.application.service";
import { adminControlApplicationService } from "../../services/admin/admin-control.application.service";
import { inFlightAllocationApplicationService } from "../../services/admin/in-flight-allocation.application.service";
import { schemaManagementApplicationService } from "../../services/admin/schema-management.application.service";
import { throttleApplicationService } from "../../services/admin/throttle.application.service";
import { botWorkerIntegrationService } from "../../services/admin/bot-worker-integration.service";
import { tableMetadataApplicationService } from "../../services/admin/table-metadata.application.service";
import { adminUserApplicationService } from "../../services/admin/admin-user.application.service";
import { adminUserExportApplicationService } from "../../services/admin/admin-user-export.application.service";
import { subscriptionTierAggregatorApplicationService } from "../../services/admin/subscription-tier-aggregator.application.service";
import { pipelineStatsService, isPipelineRangeKey } from "../../services/admin/pipeline-stats.service";
import { pipelineListsService } from "../../services/admin/pipeline-lists.service";
import { placementAssignmentsService, AssignmentRoleKey } from "../../services/admin/placement-assignments.service";
import { placementCommentsService } from "../../services/admin/placement-comments.service";
import { userSegmentFilterService } from "../../services/admin/user-segment-filter.service";
import { placementExceptionsService } from "../../services/admin/placement-exceptions.service";
import { placementPerformanceService, PerformanceRange } from "../../services/admin/placement-performance.service";
import { placementOverviewService } from "../../services/admin/placement-overview.service";
import { FeatureService } from "../../services/feature.service";
import { Location } from "../../models/v1/location.model";
import { Feature } from "../../models/v1/feature.model";
import catchAsyncError from "../../utils/catchAsyncError";
import { getServiceLogger } from "../../utils/createLogger";
import ErrorHandler from "../../utils/errorHandler";
import { Role } from "../../utils/enum";
import { Op } from "sequelize";
import { getAllUsers as getAllUsersService } from "../../services/user.service";

const logger = getServiceLogger("admin-controller");

const ensureAdmin = (req: Request) => {
  const { user } = req;

  if (!user || (user.role !== Role.ADMIN && user.role !== Role.ASSISTANT)) {
    throw new ErrorHandler("Only Admin or Placement Controller users can access this endpoint.", 403);
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

const currencySymbolsByCode: Record<string, string> = {
  USD: "$",
  AUD: "$",
  CAD: "$",
  NZD: "$",
  SGD: "$",
  EUR: "EUR",
  GBP: "GBP",
  NGN: "NGN",
  INR: "INR",
  JPY: "JPY",
};

const getRecordTimestamp = (record: { updatedAt?: Date; createdAt?: Date }) =>
  record.updatedAt?.getTime?.() ?? record.createdAt?.getTime?.() ?? 0;

const getLocationFeatureCounts = (plans: Feature[]) => {
  const counts = new Map<string, number>();

  for (const plan of plans) {
    for (const locationId of plan.locationIds ?? []) {
      counts.set(locationId, (counts.get(locationId) ?? 0) + 1);
    }
  }

  return counts;
};

const selectCanonicalLocations = (
  locations: Location[],
  locationFeatureCounts: Map<string, number>,
) => {
  const preferredByCurrency = new Map<string, Location>();
  const locationsWithoutCurrency: Location[] = [];

  for (const location of locations) {
    const normalizedCurrencyCode = location.currencyCode?.trim().toUpperCase();

    if (!normalizedCurrencyCode) {
      locationsWithoutCurrency.push(location);
      continue;
    }

    const existing = preferredByCurrency.get(normalizedCurrencyCode);
    if (!existing) {
      preferredByCurrency.set(normalizedCurrencyCode, location);
      continue;
    }

    const currentFeatureCount = locationFeatureCounts.get(location.id) ?? 0;
    const existingFeatureCount = locationFeatureCounts.get(existing.id) ?? 0;

    if (currentFeatureCount !== existingFeatureCount) {
      if (currentFeatureCount > existingFeatureCount) {
        preferredByCurrency.set(normalizedCurrencyCode, location);
      }
      continue;
    }

    if (getRecordTimestamp(location) > getRecordTimestamp(existing)) {
      preferredByCurrency.set(normalizedCurrencyCode, location);
    }
  }

  return [...preferredByCurrency.values(), ...locationsWithoutCurrency].sort(
    (left, right) => getRecordTimestamp(right) - getRecordTimestamp(left),
  );
};

const selectPreferredPricingPlans = (plans: Feature[], locationId: string) => {
  const preferredByTitle = new Map<string, Feature>();

  for (const plan of plans) {
    const titleKey = plan.title.trim().toLowerCase();
    const existing = preferredByTitle.get(titleKey);

    if (!existing) {
      preferredByTitle.set(titleKey, plan);
      continue;
    }

    const currentExactMatch =
      Array.isArray(plan.locationIds) &&
      plan.locationIds.length === 1 &&
      plan.locationIds[0] === locationId;
    const existingExactMatch =
      Array.isArray(existing.locationIds) &&
      existing.locationIds.length === 1 &&
      existing.locationIds[0] === locationId;

    if (currentExactMatch && !existingExactMatch) {
      preferredByTitle.set(titleKey, plan);
      continue;
    }

    if (currentExactMatch === existingExactMatch) {
      const currentStamp = plan.updatedAt?.getTime?.() ?? plan.createdAt?.getTime?.() ?? 0;
      const existingStamp =
        existing.updatedAt?.getTime?.() ?? existing.createdAt?.getTime?.() ?? 0;
      if (currentStamp > existingStamp) {
        preferredByTitle.set(titleKey, plan);
      }
    }
  }

  return [...preferredByTitle.values()];
};

export const getAdminLocations = catchAsyncError(
  async (req: Request, res: Response) => {
    ensureAdmin(req);

    const [locations, plans] = await Promise.all([
      Location.findAll({
        order: [["createdAt", "DESC"]],
      }),
      Feature.findAll({
        attributes: ["id", "locationIds", "createdAt", "updatedAt"],
      }),
    ]);

    const canonicalLocations = selectCanonicalLocations(
      locations,
      getLocationFeatureCounts(plans),
    );

    const payload = canonicalLocations.map((location) => {
      const currencyCode = location.currencyCode ?? null;
      const mappedSymbol =
        currencyCode && currencySymbolsByCode[currencyCode]
          ? currencySymbolsByCode[currencyCode]
          : null;

      return {
        _id: location.id,
        currencyCode,
        currencySymbol: mappedSymbol,
        multiplier: location.multiplier ?? null,
        createdAt: location.createdAt,
        updatedAt: location.updatedAt,
      };
    });

    res.apiSuccess(payload, "Locations fetched successfully");
  },
);

export const getAdminPricingPlans = catchAsyncError(
  async (req: Request, res: Response) => {
    ensureAdmin(req);

    const locationId =
      typeof req.query.locationId === "string" ? req.query.locationId.trim() : "";

    if (!locationId) {
      throw new ErrorHandler("locationId query parameter is required.", 400);
    }

    const plans = await Feature.findAll({
      where: {
        locationIds: {
          [Op.contains]: [locationId],
        },
      } as any,
      order: [["createdAt", "DESC"]],
    });

    const preferredPlans = selectPreferredPricingPlans(plans, locationId);

    const payload = preferredPlans.map((plan) => ({
      _id: plan.id,
      title: plan.title,
      tier: String(plan.tier).toLowerCase(),
      price: Number(plan.price),
      jobApplications: plan.jobApplications,
      cvResumeRequests: plan.cvResumeRequests,
      validityPeriod: plan.validityPeriod,
      subscriptionBreak: plan.subscriptionBreak,
      profileLimit: plan.profileLimit,
      isActive: plan.isActive,
      locationIds: plan.locationIds || [],
      description: plan.description ?? null,
      extra: plan.extra ?? null,
      styleData: null,
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt,
    }));

    res.apiSuccess(payload, "Pricing plans fetched successfully");
  },
);

export const patchAdminLocationMultiplier = catchAsyncError(
  async (req: Request, res: Response) => {
    ensureAdmin(req);

    const locationId =
      typeof req.body?.locationId === "string"
        ? req.body.locationId.trim()
        : typeof req.body?.activeLocationID === "string"
          ? req.body.activeLocationID.trim()
          : "";

    const multiplierValue = req.body?.multiplier ?? req.body?.payload?.multiplier;
    const multiplier =
      typeof multiplierValue === "string"
        ? multiplierValue.trim()
        : typeof multiplierValue === "number"
          ? String(multiplierValue)
          : "";

    if (!locationId) {
      throw new ErrorHandler("locationId is required.", 400);
    }

    if (!multiplier) {
      throw new ErrorHandler("multiplier is required.", 400);
    }

    const parsedMultiplier = Number(multiplier);
    if (!Number.isFinite(parsedMultiplier) || parsedMultiplier <= 0) {
      throw new ErrorHandler("multiplier must be a valid number greater than 0.", 400);
    }

    const location = await Location.findByPk(locationId);

    if (!location) {
      throw new ErrorHandler("Location not found.", 404);
    }

    await location.update({ multiplier });

    const currencyCode = location.currencyCode ?? null;
    const mappedSymbol =
      currencyCode && currencySymbolsByCode[currencyCode]
        ? currencySymbolsByCode[currencyCode]
        : null;

    res.apiSuccess(
      {
        _id: location.id,
        currencyCode,
        currencySymbol: mappedSymbol,
        multiplier: location.multiplier ?? null,
        createdAt: location.createdAt,
        updatedAt: location.updatedAt,
      },
      "Location multiplier updated successfully",
    );
  },
);

export const patchAdminPricingPlan = catchAsyncError(
  async (req: Request, res: Response) => {
    ensureAdmin(req);

    const planId =
      typeof req.body?.planId === "string"
        ? req.body.planId.trim()
        : typeof req.body?.id === "string"
          ? req.body.id.trim()
          : "";

    const updates =
      typeof req.body?.updates === "object" && req.body.updates
        ? req.body.updates
        : typeof req.body?.feature === "object" && req.body.feature
          ? req.body.feature
          : null;

    if (!planId) {
      throw new ErrorHandler("planId is required.", 400);
    }

    if (!updates || Object.keys(updates).length === 0) {
      throw new ErrorHandler("updates payload is required.", 400);
    }

    const updatedFeature = await FeatureService.updateFeature(
      req,
      planId,
      updates,
      req.user?.id || null,
      req.user?.email || "System",
    );

    res.apiSuccess(updatedFeature, "Pricing plan updated successfully");
  },
);

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

    const bypassCache = req.query.bypassCache === "true" || req.query.bypassCache === "1";

    logger.info(
      `Processing analytics request for admin ${user.email} (from=${from ?? "default"}, to=${to ?? "default"}, bypassCache=${bypassCache})`,
    );

    const [analytics, subscriptionTiers, userRoleCounts, userReturnCounts] = await Promise.all([
      analyticsApplicationService.getSuccessfulVsFailedMetrics({ from, to, bypassCache }),
      subscriptionTierAggregatorApplicationService.getRealtimeTierAnalytics(false),
      analyticsApplicationService.getUserRoleCounts(),
      analyticsApplicationService.getUserReturnCounts(),
    ]);

    res.apiSuccess(
      {
        ...analytics,
        subscriptionTiers,
        userRoleCounts,
        loyalists: userReturnCounts.loyalists,
        returnees: userReturnCounts.returnees,
      },
      "Admin analytics retrieved successfully",
    );
  },
);

export const getAdminPipelineStats = catchAsyncError(
  async (req: Request, res: Response) => {
    const user = ensureAdmin(req);

    const rawRange = req.query.range;
    const range = isPipelineRangeKey(rawRange) ? rawRange : "all";

    logger.info(
      `Processing pipeline-stats request for admin ${user.email} (range=${range})`,
    );

    const stats = await pipelineStatsService.getPipelineStats(range);

    res.apiSuccess(stats, "Admin pipeline stats retrieved successfully");
  },
);

export const getAdminPipelineLists = catchAsyncError(
  async (req: Request, res: Response) => {
    const user = ensureAdmin(req);

    logger.info(`Processing pipeline-lists request for admin ${user.email}`);

    const lists = await pipelineListsService.getPipelineLists();

    res.apiSuccess(lists, "Admin pipeline lists retrieved successfully");
  },
);

export const getPlacementAssignments = catchAsyncError(
  async (req: Request, res: Response) => {
    const user = ensureAdmin(req);

    logger.info(`Processing placement-assignments request for admin ${user.email}`);

    const assignments = await placementAssignmentsService.getAssignments();

    res.apiSuccess(assignments, "Placement assignments retrieved successfully");
  },
);

const VALID_ROLE_KEYS: AssignmentRoleKey[] = ["dpc", "vpc", "spc"];

export const bulkAssignPlacement = catchAsyncError(
  async (req: Request, res: Response) => {
    const user = ensureAdmin(req);

    const { credIds, role, controllerName, controllerEmail } = req.body;

    if (!Array.isArray(credIds) || credIds.length === 0) {
      throw new ErrorHandler("credIds must be a non-empty array", 400);
    }
    if (!VALID_ROLE_KEYS.includes(role)) {
      throw new ErrorHandler("role must be one of dpc, vpc, spc", 400);
    }

    logger.info(
      `Processing bulk placement assignment for admin ${user.email} (role=${role}, count=${credIds.length})`,
    );

    const result = await placementAssignmentsService.bulkAssign({
      credIds,
      role,
      controllerName: controllerName || null,
      controllerEmail: controllerEmail || null,
      host: req.get("host") || "",
      triggeredBy: `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email,
    });

    res.apiSuccess(result, "Bulk assignment applied successfully");
  },
);

export const getPlacementAssignmentDetail = catchAsyncError(
  async (req: Request, res: Response) => {
    ensureAdmin(req);

    const { credId } = req.params;
    if (!credId) {
      throw new ErrorHandler("credId is required", 400);
    }

    const detail = await placementAssignmentsService.getAssignmentDetail(credId);
    if (!detail) {
      throw new ErrorHandler("Client not found", 404);
    }

    res.apiSuccess(detail, "Assignment detail retrieved successfully");
  },
);

export const getPlacementExceptions = catchAsyncError(
  async (req: Request, res: Response) => {
    const user = ensureAdmin(req);

    logger.info(`Processing placement-exceptions request for admin ${user.email}`);

    const exceptions = await placementExceptionsService.getExceptions();

    res.apiSuccess(exceptions, "Placement exceptions retrieved successfully");
  },
);

const VALID_RANGES: PerformanceRange[] = ["1d", "5d"];

export const getPlacementPerformance = catchAsyncError(
  async (req: Request, res: Response) => {
    const user = ensureAdmin(req);

    const range = (req.query.range as string) || "1d";
    if (!VALID_RANGES.includes(range as PerformanceRange)) {
      throw new ErrorHandler("range must be one of 1d, 5d", 400);
    }

    logger.info(`Processing placement-performance request for admin ${user.email} (range=${range})`);

    const performance = await placementPerformanceService.getPerformance(range as PerformanceRange);

    res.apiSuccess(performance, "Placement performance retrieved successfully");
  },
);

export const getPlacementOverview = catchAsyncError(
  async (req: Request, res: Response) => {
    const user = ensureAdmin(req);

    const range = (req.query.range as string) || "1d";
    if (!VALID_RANGES.includes(range as PerformanceRange)) {
      throw new ErrorHandler("range must be one of 1d, 5d", 400);
    }

    logger.info(`Processing placement-overview request for admin ${user.email} (range=${range})`);

    const overview = await placementOverviewService.getOverview(range as PerformanceRange);

    res.apiSuccess(overview, "Placement overview retrieved successfully");
  },
);

export const getClientComments = catchAsyncError(
  async (req: Request, res: Response) => {
    ensureAdmin(req);

    const { credId } = req.params;
    if (!credId) {
      throw new ErrorHandler("credId is required", 400);
    }

    const comments = await placementCommentsService.list(credId);

    res.apiSuccess(comments, "Client comments retrieved successfully");
  },
);

export const addClientComment = catchAsyncError(
  async (req: Request, res: Response) => {
    const user = ensureAdmin(req);

    const { credId } = req.params;
    const { comment } = req.body;
    if (!credId) {
      throw new ErrorHandler("credId is required", 400);
    }
    if (!comment || typeof comment !== "string" || !comment.trim()) {
      throw new ErrorHandler("comment is required", 400);
    }

    const authorName = `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email;
    const created = await placementCommentsService.add(credId, user.id, authorName, comment);

    res.apiSuccess(created, "Comment added successfully");
  },
);

export const getUserSegments = catchAsyncError(
  async (req: Request, res: Response) => {
    const user = ensureAdmin(req);

    const segments = await userSegmentFilterService.list(user.id);

    res.apiSuccess(segments, "Segments retrieved successfully");
  },
);

export const createUserSegment = catchAsyncError(
  async (req: Request, res: Response) => {
    const user = ensureAdmin(req);

    const { name, filters } = req.body;
    if (!name || typeof name !== "string" || !name.trim()) {
      throw new ErrorHandler("name is required", 400);
    }
    if (!filters || typeof filters !== "object" || Array.isArray(filters)) {
      throw new ErrorHandler("filters is required", 400);
    }

    const created = await userSegmentFilterService.create(user.id, name, filters);

    res.apiSuccess(created, "Segment saved successfully");
  },
);

export const deleteUserSegment = catchAsyncError(
  async (req: Request, res: Response) => {
    const user = ensureAdmin(req);

    const { id } = req.params;
    if (!id) {
      throw new ErrorHandler("id is required", 400);
    }

    const removed = await userSegmentFilterService.remove(user.id, id);
    if (!removed) {
      throw new ErrorHandler("Segment not found", 404);
    }

    res.apiSuccess(null, "Segment deleted successfully");
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

export const deleteAdminThrottle = catchAsyncError(
  async (req: Request, res: Response) => {
    const user = ensureAdmin(req);

    const aggregator = req.body?.aggregator ?? req.query?.aggregator;
    if (!aggregator || typeof aggregator !== "string") {
      throw new ErrorHandler("Aggregator name is required.", 400);
    }

    const status = await throttleApplicationService.deletePerAggregatorThrottle(
      aggregator,
      user.id,
    );

    res.apiSuccess(status, `Throttle for "${aggregator}" deleted successfully`);
  },
);

export const getAdminSchemaTables = catchAsyncError(
  async (req: Request, res: Response) => {
    ensureAdmin(req);
    const tables = await schemaManagementApplicationService.listManagedTables();
    res.apiSuccess({ tables }, "Schema tables retrieved successfully");
  },
);

export const postAdminSchemaTable = catchAsyncError(
  async (req: Request, res: Response) => {
    const user = ensureAdmin(req);
    const tableName = String(req.body?.name || "").trim();
    if (!tableName) throw new ErrorHandler("Table name is required.", 400);
    await schemaManagementApplicationService.createCustomTable(tableName, user.id);
    res.apiSuccess({ ok: true }, `Table '${tableName}' created successfully`);
  },
);

export const deleteAdminSchemaTable = catchAsyncError(
  async (req: Request, res: Response) => {
    const user = ensureAdmin(req);
    const tableName = req.params.table;
    await schemaManagementApplicationService.deleteCustomTable(tableName, user.id);
    res.apiSuccess({ ok: true }, `Table '${tableName}' deleted successfully`);
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

  const variant =
    typeof req.query.variant === "string" ? req.query.variant.trim() : "";

  const page = toOptionalNumber(req.query.page);
  const limit = toOptionalNumber(req.query.limit);
  const search =
    typeof req.query.search === "string" ? req.query.search : undefined;
  const role = typeof req.query.role === "string" ? req.query.role : undefined;
  const q = typeof req.query.q === "string" ? req.query.q : undefined;
  const userType =
    typeof req.query.userType === "string" ? req.query.userType : undefined;
  const plan = typeof req.query.plan === "string" ? req.query.plan : undefined;
  const active = toOptionalBoolean(req.query.active);
  const recycle = toOptionalBoolean(req.query.recycle);
  const startDate =
    typeof req.query.startDate === "string"
      ? req.query.startDate
      : typeof req.query.from === "string"
        ? req.query.from
        : undefined;
  const endDate =
    typeof req.query.endDate === "string"
      ? req.query.endDate
      : typeof req.query.to === "string"
        ? req.query.to
        : undefined;

  // Handle variant=all: return ALL users without pagination
  if (variant === "all") {
    const users = await getAllUsersService({});
    res.apiSuccess(
      {
        users,
        count: users.length,
      },
      "All users retrieved successfully",
    );
    return;
  }

  const hasTableFilters =
    q !== undefined ||
    userType !== undefined ||
    plan !== undefined ||
    active !== undefined ||
    recycle !== undefined ||
    startDate !== undefined ||
    endDate !== undefined;

  logger.info(
    `Processing admin users request for admin ${user.email} (page=${page ?? "default"}, limit=${limit ?? "default"})`,
  );

  if (hasTableFilters) {
    const users = await getAllUsersService({
      page,
      limit,
      active,
      recycle,
      q: q ?? search,
      userType: userType ?? role,
      plan,
      startDate,
      endDate,
    });

    res.apiSuccess(
      {
        users,
        count: users.length,
      },
      "Admin users retrieved successfully",
    );
    return;
  }

  const payload = await adminUserApplicationService.getUsers({
    page,
    limit,
    search,
    role,
  });

  res.apiSuccess(payload, "Admin users retrieved successfully");
});

export const postAdminUsers = catchAsyncError(
  async (req: Request, res: Response) => {
    const user = ensureAdmin(req);

    const users = Array.isArray(req.body?.users)
      ? req.body.users
      : req.body?.email
        ? [req.body]
        : [];

    const reason = typeof req.body?.reason === "string" ? req.body.reason : undefined;

    const host = req.headers.host || (req.headers.origin as string) || "localhost";

    const payload = await adminUserApplicationService.bulkAddUsers({
      users,
      actorUserId: user.id,
      actorEmail: user.email,
      reason,
      host,
    });

    res.apiSuccess(payload, "Admin users added successfully");
  },
);

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

export const postAdminPrecheckEmail = catchAsyncError(
  async (req: Request, res: Response) => {
    ensureAdmin(req);
    const email = typeof req.body?.email === "string" ? req.body.email : "";
    if (!email.trim()) throw new ErrorHandler("email is required.", 400);
    const payload = await adminUserApplicationService.precheckEmail(email);
    res.apiSuccess(payload, "Email precheck completed");
  },
);

export const postAdminSendUserOtp = catchAsyncError(
  async (req: Request, res: Response) => {
    ensureAdmin(req);
    const { userId } = req.params;
    if (!userId) throw new ErrorHandler("userId is required.", 400);
    const payload = await adminUserApplicationService.sendUserVerificationOtp(userId);
    res.apiSuccess(payload, "OTP sent successfully");
  },
);

export const postAdminVerifyUserOtp = catchAsyncError(
  async (req: Request, res: Response) => {
    ensureAdmin(req);
    const { userId } = req.params;
    const otp = typeof req.body?.otp === "string" ? req.body.otp.trim() : "";
    if (!userId) throw new ErrorHandler("userId is required.", 400);
    if (!otp) throw new ErrorHandler("otp is required.", 400);
    const payload = await adminUserApplicationService.verifyUserOtp(userId, otp);
    res.apiSuccess(payload, "Email verified successfully");
  },
);

export const postAdminUsersExport = catchAsyncError(
  async (req: Request, res: Response) => {
    const user = ensureAdmin(req);

    const format =
      typeof req.body?.format === "string" ? req.body.format : undefined;
    const search =
      typeof req.body?.search === "string"
        ? req.body.search
        : typeof req.body?.filters?.search === "string"
          ? req.body.filters.search
          : undefined;
    const role =
      typeof req.body?.role === "string"
        ? req.body.role
        : typeof req.body?.filters?.role === "string"
          ? req.body.filters.role
          : undefined;

    const payload = await adminUserExportApplicationService.createExportTask({
      format,
      filters: { search, role },
      actorUserId: user.id,
      actorEmail: user.email,
    });

    res.apiSuccess(payload, "Admin user export queued successfully");
  },
);

export const getAdminUsersExportStatus = catchAsyncError(
  async (req: Request, res: Response) => {
    ensureAdmin(req);

    const taskId = req.params.taskId;
    const payload = await adminUserExportApplicationService.getTaskStatus(taskId);

    res.apiSuccess(payload, "Admin user export status retrieved successfully");
  },
);

export const downloadAdminUsersExport = catchAsyncError(
  async (req: Request, res: Response) => {
    ensureAdmin(req);

    const taskId = req.params.taskId;
    const download = await adminUserExportApplicationService.getDownloadInfo(taskId);

    res.setHeader("Content-Type", download.mimeType);
    res.download(download.filePath, download.fileName);
  },
);
