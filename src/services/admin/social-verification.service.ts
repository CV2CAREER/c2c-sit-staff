import { Op } from "sequelize";
import ErrorHandler from "@/utils/errorHandler";
import { getServiceLogger } from "@/utils/createLogger";
import {
  SocialVerification,
  SOCIAL_PLATFORM_SLUGS,
  SocialPlatformSlug,
} from "@/models/v1/social-verification.model";
import { User } from "@/models/v1/user.model";

const logger = getServiceLogger("admin-social-verification-service");

type ListOpts = {
  q?: string;
  status?: "pending" | "approved" | "all";
  page?: number;
  limit?: number;
};

const normalize = (v: unknown) => (typeof v === "string" ? v.trim() : "");

// One record per user summarising their submission set. The admin surface
// works user-by-user (each user has up to 7 rows), so this shape saves the
// admin from stitching rows together on the FE.
export type SocialVerificationUserSummary = {
  userId: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  role: string | null;
  socialVerificationExempt: boolean;
  capturedCount: number;
  approvedCount: number;
  pendingCount: number;
  requiredCount: number;
  complete: boolean;
  lastCapturedAt: Date | null;
  rows: SocialVerification[];
};

const summariseUser = (
  user: User,
  rows: SocialVerification[],
): SocialVerificationUserSummary => {
  const approved = rows.filter((r) => !!r.verifiedAt);
  const lastCapturedAt = rows.reduce<Date | null>((acc, r) => {
    const t = r.updatedAt ? new Date(r.updatedAt).getTime() : 0;
    if (!acc) return r.updatedAt ?? null;
    return t > acc.getTime() ? r.updatedAt : acc;
  }, null);
  return {
    userId: user.id,
    firstName: (user as any).firstName ?? null,
    lastName: (user as any).lastName ?? null,
    email: (user as any).email ?? null,
    role: (user as any).role ?? null,
    socialVerificationExempt: !!(user as any).socialVerificationExempt,
    capturedCount: rows.length,
    approvedCount: approved.length,
    pendingCount: rows.length - approved.length,
    requiredCount: SOCIAL_PLATFORM_SLUGS.length,
    complete:
      !!(user as any).socialVerificationExempt ||
      SOCIAL_PLATFORM_SLUGS.every((p) => rows.some((r) => r.platform === p)),
    lastCapturedAt,
    rows,
  };
};

export class AdminSocialVerificationService {
  // Queue view — paginated list of users who have submitted at least one
  // social handle. `status=pending` filters to users with any un-approved
  // row; `approved` to fully approved users; `all` (default) returns every
  // user with a submission plus exempted users.
  static async listQueue(opts: ListOpts = {}) {
    const page = Math.max(1, opts.page ?? 1);
    const limit = Math.min(100, Math.max(1, opts.limit ?? 25));
    const status = opts.status ?? "all";
    const q = normalize(opts.q);

    // Collect distinct userIds that have any social row, then join with User
    // for filtering + pagination. Doing it in two steps keeps the pagination
    // math on the User side, where the search filter also lives.
    const userIdRows = await SocialVerification.findAll({
      attributes: ["userId"],
      group: ["userId"],
      raw: true,
    });
    const userIds = new Set<string>(userIdRows.map((r: any) => r.userId));

    // Exempted users appear in the queue even without submissions so admin
    // can see (and un-exempt) them.
    const exemptedUsers = await User.findAll({
      where: { socialVerificationExempt: true } as any,
      attributes: ["id"],
      raw: true,
    });
    exemptedUsers.forEach((u: any) => userIds.add(u.id));

    if (userIds.size === 0) {
      return { items: [], total: 0, page, limit };
    }

    const where: Record<string, unknown> = { id: { [Op.in]: Array.from(userIds) } };
    if (q) {
      (where as any)[Op.or] = [
        { firstName: { [Op.iLike]: `%${q}%` } },
        { lastName: { [Op.iLike]: `%${q}%` } },
        { email: { [Op.iLike]: `%${q}%` } },
      ];
    }

    const { rows: users, count } = await User.findAndCountAll({
      where,
      attributes: [
        "id",
        "firstName",
        "lastName",
        "email",
        "role",
        "socialVerificationExempt",
      ],
      order: [["createdAt", "DESC"]],
      limit,
      offset: (page - 1) * limit,
    });

    const socialRows = await SocialVerification.findAll({
      where: { userId: { [Op.in]: users.map((u) => u.id) } },
      order: [["platform", "ASC"]],
    });
    const rowsByUser = new Map<string, SocialVerification[]>();
    for (const r of socialRows) {
      const list = rowsByUser.get(r.userId) ?? [];
      list.push(r);
      rowsByUser.set(r.userId, list);
    }

    const summaries = users.map((u) =>
      summariseUser(u, rowsByUser.get(u.id) ?? []),
    );

    let filtered = summaries;
    if (status === "pending") {
      filtered = summaries.filter(
        (s) => !s.socialVerificationExempt && s.pendingCount > 0,
      );
    } else if (status === "approved") {
      filtered = summaries.filter(
        (s) =>
          !s.socialVerificationExempt &&
          s.pendingCount === 0 &&
          s.capturedCount > 0,
      );
    }

    return { items: filtered, total: count, page, limit };
  }

  static async getUserSubmissions(userId: string): Promise<SocialVerificationUserSummary> {
    const user = await User.findByPk(userId, {
      attributes: [
        "id",
        "firstName",
        "lastName",
        "email",
        "role",
        "socialVerificationExempt",
      ],
    });
    if (!user) throw new ErrorHandler("User not found", 404);
    const rows = await SocialVerification.findAll({
      where: { userId },
      order: [["platform", "ASC"]],
    });
    return summariseUser(user, rows);
  }

  static async approveRow(rowId: string, adminId?: string) {
    const row = await SocialVerification.findByPk(rowId);
    if (!row) throw new ErrorHandler("Social verification row not found", 404);
    if (row.verifiedAt) {
      return row; // idempotent — already approved
    }
    await row.update({ verifiedAt: new Date(), lastCheckedAt: new Date() });
    logger.info(
      `SocialVerification approved: rowId=${rowId} platform=${row.platform} userId=${row.userId} by=${adminId ?? "unknown"}`,
    );
    return row;
  }

  // Reject = delete the row. User must resubmit for that platform. Cleaner
  // than a soft "rejected" state — the gate simply reverts to needing the
  // platform captured again.
  static async rejectRow(rowId: string, adminId?: string) {
    const row = await SocialVerification.findByPk(rowId);
    if (!row) throw new ErrorHandler("Social verification row not found", 404);
    const { platform, userId } = row;
    await row.destroy();
    logger.info(
      `SocialVerification rejected/deleted: rowId=${rowId} platform=${platform} userId=${userId} by=${adminId ?? "unknown"}`,
    );
    return { id: rowId, platform, userId };
  }

  static async exemptUser(userId: string, adminId?: string) {
    const user = await User.findByPk(userId);
    if (!user) throw new ErrorHandler("User not found", 404);
    await user.update({ socialVerificationExempt: true } as any);
    logger.info(
      `User exempted from social verification: userId=${userId} by=${adminId ?? "unknown"}`,
    );
    return { userId, socialVerificationExempt: true };
  }

  static async unExemptUser(userId: string, adminId?: string) {
    const user = await User.findByPk(userId);
    if (!user) throw new ErrorHandler("User not found", 404);
    await user.update({ socialVerificationExempt: false } as any);
    logger.info(
      `User un-exempted from social verification: userId=${userId} by=${adminId ?? "unknown"}`,
    );
    return { userId, socialVerificationExempt: false };
  }

  static validatePlatform(platform: string): SocialPlatformSlug {
    if (!SOCIAL_PLATFORM_SLUGS.includes(platform as SocialPlatformSlug)) {
      throw new ErrorHandler(
        `Unsupported platform. Expected one of: ${SOCIAL_PLATFORM_SLUGS.join(", ")}`,
        400,
      );
    }
    return platform as SocialPlatformSlug;
  }
}
