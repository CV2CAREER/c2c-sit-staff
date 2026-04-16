import { QueryTypes } from "sequelize";
import { validate as isUuid } from "uuid";
import { Plan } from "../../models/v1/plan.model";
import { SubscriptionAllocation } from "../../models/v1/subscription-allocation.model";
import { User } from "../../models/v1/user.model";
import { getServiceLogger } from "../../utils/createLogger";
import { Role } from "../../utils/enum";
import ErrorHandler from "../../utils/errorHandler";
import { getSequelize } from "../../utils/sequelize";

interface GetInFlightInput {
  page?: number;
  limit?: number;
  search?: string;
  staffUserId?: string;
  assigned?: boolean;
}

interface PlacementControllersInput {
  page?: number;
  limit?: number;
  search?: string;
}

interface AssignPlacementControllerInput {
  planId: string;
  staffUserId: string;
  assignedByUserId: string;
  notes?: string;
}

interface UnassignPlacementControllerInput {
  planId: string;
  unassignedByUserId: string;
  notes?: string;
}

interface InFlightRow {
  planId: string;
  subscriptionTitle: string;
  subscriberId: string;
  subscriberFirstName: string;
  subscriberLastName: string;
  subscriberEmail: string;
  paymentStatus: string;
  hasExpired: boolean;
  expiresAt: string | null;
  paymentAmount: string | number | null;
  paymentCurrency: string | null;
  subscriptionCreatedAt: string;
  subscriptionUpdatedAt: string;
  allocationId: string | null;
  staffUserId: string | null;
  assignedByUserId: string | null;
  assignedAt: string | null;
  allocationNotes: string | null;
  staffFirstName: string | null;
  staffLastName: string | null;
  staffEmail: string | null;
  staffRole: string | null;
  totalCount: string | number;
}

interface PlacementControllerRow {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  activeAllocations: string | number;
  totalCount: string | number;
}

interface InFlightItem {
  subscription: {
    id: string;
    title: string;
    paymentStatus: string;
    paymentAmount: number;
    paymentCurrency: string | null;
    hasExpired: boolean;
    expiresAt: string | null;
    createdAt: string;
    updatedAt: string;
  };
  subscriber: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  allocation: {
    isAssigned: boolean;
    allocationId: string | null;
    assignedAt: string | null;
    assignedByUserId: string | null;
    notes: string | null;
    placementController: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
      role: string;
    } | null;
  };
}

interface InFlightResponse {
  items: InFlightItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  generatedAt: string;
}

interface PlacementControllerItem {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  activeAllocations: number;
}

interface PlacementControllerResponse {
  items: PlacementControllerItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  generatedAt: string;
}

interface AssignmentResponse {
  planId: string;
  allocationId: string | null;
  staffUserId: string | null;
  assignedByUserId: string | null;
  assignedAt: string | null;
  endedAt: string | null;
  isActive: boolean;
  notes: string | null;
  updatedAt: string;
}

const logger = getServiceLogger("in-flight-allocation-service");

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 200;

const PLACEMENT_CONTROLLER_ROLES = [Role.ADMIN, Role.COACH, Role.ASSISTANT];

const toInteger = (value: number | undefined, fallback: number) =>
  Number.isFinite(value) && value && value > 0 ? Math.floor(value) : fallback;

const toNumber = (value: string | number | null): number => {
  if (value === null || value === undefined) {
    return 0;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const validateUuidOrThrow = (value: string, field: string) => {
  if (!isUuid(value)) {
    throw new ErrorHandler(`Invalid ${field}.`, 400);
  }
};

const isPlacementControllerRole = (role: string) =>
  PLACEMENT_CONTROLLER_ROLES.includes(role as Role);

const ensureActivePlanForAllocation = async (
  planId: string,
  transaction: any,
) => {
  const plan = await Plan.findByPk(planId, { transaction });
  if (!plan) {
    throw new ErrorHandler("Subscription not found.", 404);
  }

  const expiresAt = plan.expiresAt ? new Date(plan.expiresAt) : null;
  const isExpiredByDate = expiresAt ? expiresAt < new Date() : false;

  if (
    plan.paymentStatus !== "completed" ||
    plan.hasExpired ||
    isExpiredByDate
  ) {
    throw new ErrorHandler(
      "Only active completed subscriptions can be allocated.",
      400,
    );
  }

  return plan;
};

class InFlightAllocationApplicationService {
  async getInFlightSubscriptions(input: GetInFlightInput): Promise<InFlightResponse> {
    const page = toInteger(input.page, DEFAULT_PAGE);
    const unsafeLimit = toInteger(input.limit, DEFAULT_LIMIT);
    const limit = Math.min(unsafeLimit, MAX_LIMIT);
    const offset = (page - 1) * limit;
    const trimmedSearch = input.search?.trim();
    const search = trimmedSearch ? `%${trimmedSearch}%` : null;

    const sequelize = getSequelize();

    try {
      const rows = await sequelize.query<InFlightRow>(
        `
          WITH active_subscriptions AS (
            SELECT
              p.id AS "planId",
              p.title AS "subscriptionTitle",
              p."userId" AS "subscriberUserId",
              p."paymentStatus" AS "paymentStatus",
              p."hasExpired" AS "hasExpired",
              p."expiresAt" AS "expiresAt",
              p."paymentAmount" AS "paymentAmount",
              p."paymentCurrency" AS "paymentCurrency",
              p."createdAt" AS "subscriptionCreatedAt",
              p."updatedAt" AS "subscriptionUpdatedAt"
            FROM plans p
            WHERE p."deletedAt" IS NULL
              AND p."paymentStatus" = 'completed'
              AND p."hasExpired" IS FALSE
              AND (p."expiresAt" IS NULL OR p."expiresAt" >= CURRENT_DATE)
          ),
          in_flight_scope AS (
            SELECT
              a.*,
              su.id AS "subscriberId",
              su."firstName" AS "subscriberFirstName",
              su."lastName" AS "subscriberLastName",
              su.email AS "subscriberEmail",
              sa.id AS "allocationId",
              sa."staffUserId" AS "staffUserId",
              sa."assignedByUserId" AS "assignedByUserId",
              sa."assignedAt" AS "assignedAt",
              sa.notes AS "allocationNotes",
              st."firstName" AS "staffFirstName",
              st."lastName" AS "staffLastName",
              st.email AS "staffEmail",
              st.role AS "staffRole"
            FROM active_subscriptions a
            INNER JOIN users su
              ON su.id::text = a."subscriberUserId"::text
              AND su."deletedAt" IS NULL
            LEFT JOIN subscription_allocations sa
              ON sa."planId" = a."planId"::text
              AND sa."isActive" IS TRUE
              AND sa."deletedAt" IS NULL
            LEFT JOIN users st
              ON st.id::text = sa."staffUserId"
              AND st."deletedAt" IS NULL
            WHERE (
              :search::text IS NULL
              OR su.email ILIKE :search
              OR su."firstName" ILIKE :search
              OR su."lastName" ILIKE :search
              OR a."subscriptionTitle" ILIKE :search
            )
            AND (:staffUserId::text IS NULL OR sa."staffUserId" = :staffUserId::text)
            AND (
              :assigned::boolean IS NULL
              OR (:assigned::boolean IS TRUE AND sa.id IS NOT NULL)
              OR (:assigned::boolean IS FALSE AND sa.id IS NULL)
            )
          )
          SELECT
            in_flight_scope.*,
            COUNT(*) OVER()::bigint AS "totalCount"
          FROM in_flight_scope
          ORDER BY "subscriptionCreatedAt" DESC
          LIMIT :limit OFFSET :offset;
        `,
        {
          type: QueryTypes.SELECT,
          replacements: {
            search,
            staffUserId: input.staffUserId || null,
            assigned: typeof input.assigned === "boolean" ? input.assigned : null,
            limit,
            offset,
          },
        },
      );

      const total = rows.length ? Number(rows[0].totalCount) : 0;
      const items: InFlightItem[] = rows.map((row) => ({
        subscription: {
          id: row.planId,
          title: row.subscriptionTitle,
          paymentStatus: row.paymentStatus,
          paymentAmount: toNumber(row.paymentAmount),
          paymentCurrency: row.paymentCurrency,
          hasExpired: row.hasExpired,
          expiresAt: row.expiresAt,
          createdAt: row.subscriptionCreatedAt,
          updatedAt: row.subscriptionUpdatedAt,
        },
        subscriber: {
          id: row.subscriberId,
          firstName: row.subscriberFirstName,
          lastName: row.subscriberLastName,
          email: row.subscriberEmail,
        },
        allocation: {
          isAssigned: Boolean(row.allocationId),
          allocationId: row.allocationId,
          assignedAt: row.assignedAt,
          assignedByUserId: row.assignedByUserId,
          notes: row.allocationNotes,
          placementController: row.staffUserId
            ? {
                id: row.staffUserId,
                firstName: row.staffFirstName || "",
                lastName: row.staffLastName || "",
                email: row.staffEmail || "",
                role: row.staffRole || "",
              }
            : null,
        },
      }));

      return {
        items,
        pagination: {
          page,
          limit,
          total,
          totalPages: total > 0 ? Math.ceil(total / limit) : 0,
        },
        generatedAt: new Date().toISOString(),
      };
    } catch (error: any) {
      if (error?.original?.code === "42P01") {
        throw new ErrorHandler(
          "In-flight allocation table is not available yet. Please initialize subscription allocations.",
          503,
        );
      }

      logger.error(`Failed to fetch in-flight subscriptions: ${error}`);
      throw error;
    }
  }

  async getPlacementControllers(
    input: PlacementControllersInput,
  ): Promise<PlacementControllerResponse> {
    const page = toInteger(input.page, DEFAULT_PAGE);
    const unsafeLimit = toInteger(input.limit, DEFAULT_LIMIT);
    const limit = Math.min(unsafeLimit, MAX_LIMIT);
    const offset = (page - 1) * limit;
    const trimmedSearch = input.search?.trim();
    const search = trimmedSearch ? `%${trimmedSearch}%` : null;

    const sequelize = getSequelize();
    const rows = await sequelize.query<PlacementControllerRow>(
      `
        WITH controller_scope AS (
          SELECT
            u.id,
            u."firstName" AS "firstName",
            u."lastName" AS "lastName",
            u.email AS email,
            u.role AS role,
            COUNT(sa.id)::bigint AS "activeAllocations"
          FROM users u
          LEFT JOIN subscription_allocations sa
            ON sa."staffUserId" = u.id::text
            AND sa."isActive" IS TRUE
            AND sa."deletedAt" IS NULL
          WHERE u."deletedAt" IS NULL
            AND u.role IN (:roles)
            AND (
              :search::text IS NULL
              OR u.email ILIKE :search
              OR u."firstName" ILIKE :search
              OR u."lastName" ILIKE :search
            )
          GROUP BY u.id, u."firstName", u."lastName", u.email, u.role
        )
        SELECT
          controller_scope.*,
          COUNT(*) OVER()::bigint AS "totalCount"
        FROM controller_scope
        ORDER BY "activeAllocations" DESC, "firstName" ASC
        LIMIT :limit OFFSET :offset;
      `,
      {
        type: QueryTypes.SELECT,
        replacements: {
          roles: PLACEMENT_CONTROLLER_ROLES,
          search,
          limit,
          offset,
        },
      },
    );

    const total = rows.length ? Number(rows[0].totalCount) : 0;
    const items: PlacementControllerItem[] = rows.map((row) => ({
      id: row.id,
      firstName: row.firstName,
      lastName: row.lastName,
      email: row.email,
      role: row.role,
      activeAllocations: Number(row.activeAllocations) || 0,
    }));

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: total > 0 ? Math.ceil(total / limit) : 0,
      },
      generatedAt: new Date().toISOString(),
    };
  }

  async assignPlacementController(
    input: AssignPlacementControllerInput,
  ): Promise<AssignmentResponse> {
    validateUuidOrThrow(input.planId, "planId");
    validateUuidOrThrow(input.staffUserId, "staffUserId");
    validateUuidOrThrow(input.assignedByUserId, "assignedByUserId");

    const sequelize = getSequelize();
    const now = new Date();
    const sanitizedNotes = input.notes?.trim() || null;

    try {
      return await sequelize.transaction(async (transaction) => {
        await ensureActivePlanForAllocation(input.planId, transaction);

        const staffUser = await User.findByPk(input.staffUserId, { transaction });
        if (!staffUser) {
          throw new ErrorHandler("Placement controller not found.", 404);
        }

        if (!isPlacementControllerRole(staffUser.role)) {
          throw new ErrorHandler(
            "Selected user is not an eligible placement controller.",
            400,
          );
        }

        const activeAllocation = await SubscriptionAllocation.findOne({
          where: {
            planId: input.planId,
            isActive: true,
          },
          transaction,
          order: [["assignedAt", "DESC"]],
        });

        if (activeAllocation && activeAllocation.staffUserId === input.staffUserId) {
          return {
            planId: input.planId,
            allocationId: activeAllocation.id,
            staffUserId: activeAllocation.staffUserId,
            assignedByUserId: activeAllocation.assignedByUserId || null,
            assignedAt: activeAllocation.assignedAt.toISOString(),
            endedAt: activeAllocation.endedAt
              ? activeAllocation.endedAt.toISOString()
              : null,
            isActive: activeAllocation.isActive,
            notes: activeAllocation.notes || null,
            updatedAt: new Date().toISOString(),
          };
        }

        if (activeAllocation) {
          activeAllocation.isActive = false;
          activeAllocation.endedAt = now;
          await activeAllocation.save({ transaction });
        }

        const allocation = await SubscriptionAllocation.create(
          {
            planId: input.planId,
            staffUserId: input.staffUserId,
            assignedByUserId: input.assignedByUserId,
            assignedAt: now,
            isActive: true,
            notes: sanitizedNotes,
          },
          { transaction },
        );

        return {
          planId: input.planId,
          allocationId: allocation.id,
          staffUserId: allocation.staffUserId,
          assignedByUserId: allocation.assignedByUserId || null,
          assignedAt: allocation.assignedAt.toISOString(),
          endedAt: allocation.endedAt ? allocation.endedAt.toISOString() : null,
          isActive: allocation.isActive,
          notes: allocation.notes || null,
          updatedAt: new Date().toISOString(),
        };
      });
    } catch (error: any) {
      if (error?.original?.code === "23505") {
        throw new ErrorHandler(
          "Subscription already has an active allocation. Please retry.",
          409,
        );
      }

      throw error;
    }
  }

  async unassignPlacementController(
    input: UnassignPlacementControllerInput,
  ): Promise<AssignmentResponse> {
    validateUuidOrThrow(input.planId, "planId");
    validateUuidOrThrow(input.unassignedByUserId, "unassignedByUserId");

    const sequelize = getSequelize();
    const now = new Date();
    const sanitizedNotes = input.notes?.trim() || null;

    return sequelize.transaction(async (transaction) => {
      await ensureActivePlanForAllocation(input.planId, transaction);

      const activeAllocation = await SubscriptionAllocation.findOne({
        where: {
          planId: input.planId,
          isActive: true,
        },
        transaction,
        order: [["assignedAt", "DESC"]],
      });

      if (!activeAllocation) {
        return {
          planId: input.planId,
          allocationId: null,
          staffUserId: null,
          assignedByUserId: null,
          assignedAt: null,
          endedAt: now.toISOString(),
          isActive: false,
          notes: sanitizedNotes,
          updatedAt: now.toISOString(),
        };
      }

      activeAllocation.isActive = false;
      activeAllocation.endedAt = now;
      if (sanitizedNotes) {
        activeAllocation.notes = sanitizedNotes;
      }
      await activeAllocation.save({ transaction });

      return {
        planId: activeAllocation.planId,
        allocationId: activeAllocation.id,
        staffUserId: activeAllocation.staffUserId,
        assignedByUserId: activeAllocation.assignedByUserId || null,
        assignedAt: activeAllocation.assignedAt.toISOString(),
        endedAt: activeAllocation.endedAt
          ? activeAllocation.endedAt.toISOString()
          : now.toISOString(),
        isActive: false,
        notes: activeAllocation.notes || null,
        updatedAt: new Date().toISOString(),
      };
    });
  }
}

export const inFlightAllocationApplicationService =
  new InFlightAllocationApplicationService();
