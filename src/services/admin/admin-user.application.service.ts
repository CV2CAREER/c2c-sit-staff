import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { Op, QueryTypes } from "sequelize";
import { validate as isUuid } from "uuid";
import { BCRYPT_SALT_ROUNDS } from "../../config/env";
import { AuditTrail } from "../../models/v1/audit-trail.model";
import { User } from "../../models/v1/user.model";
import { getServiceLogger } from "../../utils/createLogger";
import ErrorHandler from "../../utils/errorHandler";
import { getSequelize } from "../../utils/sequelize";
import { Role } from "../../utils/enum";

export interface GetAdminUsersInput {
  page?: number;
  limit?: number;
  search?: string;
  q?: string;
  role?: string;
  userType?: string;
  active?: boolean;
  recycle?: boolean;
  plan?: string;
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

interface AddUserInputItem {
  firstName: string;
  lastName: string;
  email: string;
  role?: "guest" | "coach" | "admin";
  country?: string;
  password?: string;
  isActive?: boolean;
  isEmailVerified?: boolean;
}

interface NormalizedAddUserInputItem {
  firstName: string;
  lastName: string;
  email: string;
  role: "guest" | "coach" | "admin";
  country: string;
  password?: string;
  isActive: boolean;
  isEmailVerified: boolean;
}

interface BulkAddUsersInput {
  users: AddUserInputItem[];
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

export interface AdminUserExportItem {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  country: string;
  isActive: boolean;
  isEmailVerified: boolean;
  createdAt: string;
  updatedAt: string;
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

interface CreatedAdminUserResult {
  userId: string;
  email: string;
  role: string;
  firstName: string;
  lastName: string;
  createdAt: string;
  temporaryPassword?: string;
}

interface BulkAddUsersResponse {
  created: CreatedAdminUserResult[];
  skipped: Array<{ email: string; reason: string }>;
  summary: {
    requested: number;
    created: number;
    skipped: number;
  };
  generatedAt: string;
}

const logger = getServiceLogger("admin-user-service");

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 200;
const MAX_BULK_ASSIGNMENTS = 200;
const MAX_BULK_CREATE_USERS = 200;
const PERSONA_ROLES = [Role.GUEST, Role.COACH, Role.ADMIN] as const;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DEFAULT_COUNTRY = "Unknown";
const BCRYPT_ROUNDS =
  Number.isFinite(BCRYPT_SALT_ROUNDS) && BCRYPT_SALT_ROUNDS > 4
    ? BCRYPT_SALT_ROUNDS
    : 12;

const toInteger = (value: number | undefined, fallback: number) =>
  Number.isFinite(value) && value && value > 0 ? Math.floor(value) : fallback;

const normalizeRole = (value?: string): string | undefined => {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 ? normalized : undefined;
};

const isPersonaRole = (value: string): value is "guest" | "coach" | "admin" =>
  PERSONA_ROLES.includes(value as any);

const sanitizeString = (value: unknown): string =>
  typeof value === "string" ? value.trim() : "";

const normalizeEmail = (value: unknown): string => sanitizeString(value).toLowerCase();

const buildUserWhereClause = (input: {
  search?: string;
  q?: string;
  role?: string;
  userType?: string;
  active?: boolean;
  recycle?: boolean;
  plan?: string;
}) => {
  const trimmedSearch = sanitizeString(input.search || input.q);
  const roleFilter = normalizeRole(input.role || input.userType);
  if (roleFilter && !Object.values(Role).includes(roleFilter as Role)) {
    throw new ErrorHandler("Invalid role filter.", 400);
  }

  const where: any = {};
  
  // Search filter (supports both 'search' and 'q' parameters)
  if (trimmedSearch) {
    where[Op.or] = [
      { email: { [Op.iLike]: `%${trimmedSearch}%` } },
      { firstName: { [Op.iLike]: `%${trimmedSearch}%` } },
      { lastName: { [Op.iLike]: `%${trimmedSearch}%` } },
    ];
  }
  
  // Role/UserType filter
  if (roleFilter) {
    where.role = roleFilter;
  }
  
  // Active status filter
  if (typeof input.active === 'boolean') {
    where.isActive = input.active;
  }
  
  // Recycle bin filter (show deleted users)
  if (input.recycle === true) {
    where.deletedAt = { [Op.not]: null };
  } else {
    where.deletedAt = null;
  }
  
  // Plan filter
  if (input.plan) {
    where.planId = input.plan;
  }

  return where;
};

class AdminUserApplicationService {
  private generateTemporaryPassword(): string {
    return `Tmp-${randomBytes(8).toString("hex")}!`;
  }

  private validateUsersForAdd(
    users: AddUserInputItem[],
  ): NormalizedAddUserInputItem[] {
    if (!Array.isArray(users) || users.length === 0) {
      throw new ErrorHandler("users must be a non-empty array.", 400);
    }

    if (users.length > MAX_BULK_CREATE_USERS) {
      throw new ErrorHandler(
        `Maximum ${MAX_BULK_CREATE_USERS} users can be added per request.`,
        400,
      );
    }

    const seenEmails = new Set<string>();
    const normalized: NormalizedAddUserInputItem[] = [];
    for (const item of users) {
      const firstName = sanitizeString(item?.firstName);
      const lastName = sanitizeString(item?.lastName);
      const email = normalizeEmail(item?.email);
      const role = normalizeRole(item?.role) || Role.GUEST;
      const country = sanitizeString(item?.country) || DEFAULT_COUNTRY;
      const password = sanitizeString(item?.password);

      if (!firstName) {
        throw new ErrorHandler("Each user must include firstName.", 400);
      }
      if (!lastName) {
        throw new ErrorHandler("Each user must include lastName.", 400);
      }
      if (!EMAIL_REGEX.test(email)) {
        throw new ErrorHandler("Each user must include a valid email.", 400);
      }
      if (!isPersonaRole(role)) {
        throw new ErrorHandler(
          "Each user role must be one of: guest, coach, admin.",
          400,
        );
      }
      if (password && password.length < 8) {
        throw new ErrorHandler(
          "Provided password must be at least 8 characters long.",
          400,
        );
      }
      if (seenEmails.has(email)) {
        throw new ErrorHandler(`Duplicate email in request payload: ${email}`, 400);
      }

      seenEmails.add(email);
      normalized.push({
        firstName,
        lastName,
        email,
        role,
        country,
        password: password || undefined,
        isActive: typeof item?.isActive === "boolean" ? item.isActive : true,
        isEmailVerified:
          typeof item?.isEmailVerified === "boolean" ? item.isEmailVerified : true,
      });
    }

    return normalized;
  }

  async getUsers(input: GetAdminUsersInput): Promise<AdminUserListResponse> {
    const page = toInteger(input.page, DEFAULT_PAGE);
    const limit = Math.min(toInteger(input.limit, DEFAULT_LIMIT), MAX_LIMIT);
    const offset = (page - 1) * limit;
    const where = buildUserWhereClause(input);

    const result = await User.findAndCountAll({
      where,
      attributes: {
        exclude: ["password"]
      },
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

  async listUsersForExportBatch(input: {
    search?: string;
    role?: string;
    offset: number;
    limit: number;
  }): Promise<AdminUserExportItem[]> {
    const where = buildUserWhereClause(input);
    const limit = Math.min(Math.max(1, Math.floor(input.limit || 1)), 5000);
    const offset = Math.max(0, Math.floor(input.offset || 0));

    const rows = await User.findAll({
      where,
      attributes: [
        "id",
        "firstName",
        "lastName",
        "email",
        "role",
        "country",
        "isActive",
        "isEmailVerified",
        "createdAt",
        "updatedAt",
      ],
      order: [["createdAt", "DESC"]],
      offset,
      limit,
    });

    return rows.map((user) => ({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      country: user.country,
      isActive: Boolean(user.isActive),
      isEmailVerified: Boolean(user.isEmailVerified),
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    }));
  }

  async bulkAddUsers(input: BulkAddUsersInput): Promise<BulkAddUsersResponse> {
    const users = this.validateUsersForAdd(input.users);

    const actorUserId = String(input.actorUserId || "");
    if (!isUuid(actorUserId)) {
      throw new ErrorHandler("Invalid actor user ID.", 400);
    }

    const sequelize = getSequelize();
    const existingRows = await sequelize.query<{ email: string }>(
      `
        SELECT LOWER(email) AS email
        FROM users
        WHERE LOWER(email) = ANY(:emails)
          AND "deletedAt" IS NULL;
      `,
      {
        type: QueryTypes.SELECT,
        replacements: {
          emails: users.map((user) => user.email),
        },
      },
    );
    const existingEmails = new Set(existingRows.map((row) => row.email));

    const created: CreatedAdminUserResult[] = [];
    const skipped: Array<{ email: string; reason: string }> = [];
    await sequelize.transaction(async (transaction) => {
      for (const userInput of users) {
        if (existingEmails.has(userInput.email)) {
          skipped.push({
            email: userInput.email,
            reason: "Email already exists",
          });
          continue;
        }

        const temporaryPassword = userInput.password || this.generateTemporaryPassword();
        const hashedPassword = await bcrypt.hash(temporaryPassword, BCRYPT_ROUNDS);

        const createdUser = await User.create(
          {
            firstName: userInput.firstName,
            lastName: userInput.lastName,
            email: userInput.email,
            password: hashedPassword,
            role: userInput.role as Role,
            country: userInput.country,
            isActive: userInput.isActive,
            isEmailVerified: userInput.isEmailVerified,
            updatedBy: input.actorEmail || actorUserId,
            agreeToTerms: true,
          } as any,
          { transaction },
        );

        await AuditTrail.create(
          {
            action: "ADMIN_USER_ADD",
            actorUserId,
            actorEmail: input.actorEmail || null,
            targetType: "User",
            targetKey: createdUser.id,
            before: null,
            after: {
              email: createdUser.email,
              role: createdUser.role,
            },
            metadata: {
              reason: input.reason || null,
              mode: "bulk-add",
            },
          },
          { transaction },
        );

        created.push({
          userId: createdUser.id,
          email: createdUser.email,
          role: createdUser.role,
          firstName: createdUser.firstName,
          lastName: createdUser.lastName,
          createdAt: createdUser.createdAt.toISOString(),
          ...(userInput.password ? {} : { temporaryPassword }),
        });
      }
    });

    logger.info(
      `Bulk add users done by ${actorUserId}: requested=${users.length}, created=${created.length}, skipped=${skipped.length}`,
    );

    return {
      created,
      skipped,
      summary: {
        requested: users.length,
        created: created.length,
        skipped: skipped.length,
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
