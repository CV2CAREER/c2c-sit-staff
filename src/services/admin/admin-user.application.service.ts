import { Op } from "sequelize";
import { validate as isUuid } from "uuid";
import { AuditTrail } from "../../models/v1/audit-trail.model";
import { User } from "../../models/v1/user.model";
import { getServiceLogger } from "../../utils/createLogger";
import ErrorHandler from "../../utils/errorHandler";
import { getSequelize } from "../../utils/sequelize";
import { Role } from "../../utils/enum";

interface GetAdminUsersInput {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
}

interface PersonaAssignmentItem {
  userId: string;
  role: "guest" | "coach" | "admin";
}

interface BulkPersonaAssignmentInput {
  assignments: PersonaAssignmentItem[];
  actorUserId: string;
  actorEmail?: string;
  reason?: string;
}

interface AdminUserItem {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  isActive: boolean;
  isEmailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

interface AdminUserListResponse {
  items: AdminUserItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  generatedAt: string;
}

interface PersonaAssignmentResult {
  userId: string;
  email: string;
  previousRole: string;
  newRole: string;
  updatedAt: string;
}

interface BulkPersonaAssignmentResponse {
  updated: PersonaAssignmentResult[];
  skipped: Array<{ userId: string; email: string; reason: string }>;
  summary: {
    requested: number;
    updated: number;
    skipped: number;
  };
  generatedAt: string;
}

const logger = getServiceLogger("admin-user-service");

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 200;
const MAX_BULK_ASSIGNMENTS = 200;
const PERSONA_ROLES = [Role.GUEST, Role.COACH, Role.ADMIN] as const;

const toInteger = (value: number | undefined, fallback: number) =>
  Number.isFinite(value) && value && value > 0 ? Math.floor(value) : fallback;

const normalizeRole = (value?: string): string | undefined => {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 ? normalized : undefined;
};

const isPersonaRole = (value: string): value is "guest" | "coach" | "admin" =>
  PERSONA_ROLES.includes(value as any);

class AdminUserApplicationService {
  async getUsers(input: GetAdminUsersInput): Promise<AdminUserListResponse> {
    const page = toInteger(input.page, DEFAULT_PAGE);
    const limit = Math.min(toInteger(input.limit, DEFAULT_LIMIT), MAX_LIMIT);
    const offset = (page - 1) * limit;

    const trimmedSearch = input.search?.trim();
    const roleFilter = normalizeRole(input.role);
    if (roleFilter && !Object.values(Role).includes(roleFilter as Role)) {
      throw new ErrorHandler("Invalid role filter.", 400);
    }

    const where: any = {};
    if (trimmedSearch) {
      where[Op.or] = [
        { email: { [Op.iLike]: `%${trimmedSearch}%` } },
        { firstName: { [Op.iLike]: `%${trimmedSearch}%` } },
        { lastName: { [Op.iLike]: `%${trimmedSearch}%` } },
      ];
    }
    if (roleFilter) {
      where.role = roleFilter;
    }

    const result = await User.findAndCountAll({
      where,
      attributes: [
        "id",
        "firstName",
        "lastName",
        "email",
        "role",
        "isActive",
        "isEmailVerified",
        "createdAt",
        "updatedAt",
      ],
      order: [["createdAt", "DESC"]],
      offset,
      limit,
    });

    const items: AdminUserItem[] = result.rows.map((user) => ({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      isActive: Boolean(user.isActive),
      isEmailVerified: Boolean(user.isEmailVerified),
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    }));

    return {
      items,
      pagination: {
        page,
        limit,
        total: result.count,
        totalPages: result.count > 0 ? Math.ceil(result.count / limit) : 0,
      },
      generatedAt: new Date().toISOString(),
    };
  }

  private validateAssignments(
    assignments: PersonaAssignmentItem[],
  ): PersonaAssignmentItem[] {
    if (!Array.isArray(assignments) || assignments.length === 0) {
      throw new ErrorHandler("assignments must be a non-empty array.", 400);
    }

    if (assignments.length > MAX_BULK_ASSIGNMENTS) {
      throw new ErrorHandler(
        `Maximum ${MAX_BULK_ASSIGNMENTS} persona assignments per request.`,
        400,
      );
    }

    const normalizedAssignments: PersonaAssignmentItem[] = [];
    const seen = new Set<string>();
    for (const assignment of assignments) {
      if (!assignment || !isUuid(String(assignment.userId || ""))) {
        throw new ErrorHandler("Each assignment must include a valid userId.", 400);
      }
      const role = normalizeRole(assignment.role);
      if (!role || !isPersonaRole(role)) {
        throw new ErrorHandler(
          "Each assignment role must be one of: guest, coach, admin.",
          400,
        );
      }
      if (seen.has(assignment.userId)) {
        throw new ErrorHandler("Duplicate userId in assignments.", 400);
      }
      seen.add(assignment.userId);
      normalizedAssignments.push({
        userId: assignment.userId,
        role,
      });
    }

    return normalizedAssignments;
  }

  async bulkAssignPersona(
    input: BulkPersonaAssignmentInput,
  ): Promise<BulkPersonaAssignmentResponse> {
    const assignments = this.validateAssignments(input.assignments);

    const actorUserId = String(input.actorUserId || "");
    if (!isUuid(actorUserId)) {
      throw new ErrorHandler("Invalid actor user ID.", 400);
    }

    const selfTarget = assignments.find((item) => item.userId === actorUserId);
    if (selfTarget) {
      throw new ErrorHandler("You cannot update your own role in bulk assignment.", 400);
    }

    const targetIds = assignments.map((item) => item.userId);
    const sequelize = getSequelize();
    const updated: PersonaAssignmentResult[] = [];
    const skipped: Array<{ userId: string; email: string; reason: string }> = [];

    await sequelize.transaction(async (transaction) => {
      const users = await User.findAll({
        where: { id: { [Op.in]: targetIds } },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (users.length !== targetIds.length) {
        const found = new Set(users.map((user) => user.id));
        const missing = targetIds.filter((id) => !found.has(id));
        throw new ErrorHandler(`Some users were not found: ${missing.join(", ")}`, 404);
      }

      const byId = new Map(users.map((user) => [user.id, user]));

      const adminRows = await User.findAll({
        where: { role: Role.ADMIN },
        attributes: ["id"],
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      const currentAdminCount = adminRows.length;
      const adminsLeaving = assignments.filter((item) => {
        const user = byId.get(item.userId)!;
        return user.role === Role.ADMIN && item.role !== Role.ADMIN;
      }).length;
      const adminsJoining = assignments.filter((item) => {
        const user = byId.get(item.userId)!;
        return user.role !== Role.ADMIN && item.role === Role.ADMIN;
      }).length;
      const resultingAdminCount = currentAdminCount - adminsLeaving + adminsJoining;
      if (resultingAdminCount < 1) {
        throw new ErrorHandler(
          "Operation would remove the last admin. Keep at least one admin user.",
          400,
        );
      }

      for (const assignment of assignments) {
        const user = byId.get(assignment.userId)!;
        const previousRole = user.role;
        const newRole = assignment.role;

        if (previousRole === newRole) {
          skipped.push({
            userId: user.id,
            email: user.email,
            reason: "Role already set",
          });
          continue;
        }

        user.role = newRole as Role;
        user.updatedBy = input.actorEmail || actorUserId;
        await user.save({ transaction });

        await AuditTrail.create(
          {
            action: "PERSONA_ASSIGNMENT_UPDATE",
            actorUserId,
            actorEmail: input.actorEmail || null,
            targetType: "User",
            targetKey: user.id,
            before: { role: previousRole },
            after: { role: newRole },
            metadata: {
              reason: input.reason || null,
              mode: "bulk",
            },
          },
          { transaction },
        );

        updated.push({
          userId: user.id,
          email: user.email,
          previousRole,
          newRole,
          updatedAt: user.updatedAt.toISOString(),
        });
      }
    });

    logger.info(
      `Bulk persona assignment done by ${actorUserId}: requested=${assignments.length}, updated=${updated.length}, skipped=${skipped.length}`,
    );

    return {
      updated,
      skipped,
      summary: {
        requested: assignments.length,
        updated: updated.length,
        skipped: skipped.length,
      },
      generatedAt: new Date().toISOString(),
    };
  }
}

export const adminUserApplicationService = new AdminUserApplicationService();
