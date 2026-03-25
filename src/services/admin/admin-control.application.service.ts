import { getConnectedRedis } from "../../config/redis";
import { AdminControl, QuestionAnswerMode } from "../../models/v1/admin-control.model";
import { getServiceLogger } from "../../utils/createLogger";
import ErrorHandler from "../../utils/errorHandler";
import { isRedisUsable } from "../../utils/helpers";

export interface AdminControlStatus {
  botEnabled: boolean;
  questionAnswerMode: QuestionAnswerMode;
  updatedByUserId: string | null;
  updatedAt: string;
}

export interface UpdateAdminControlInput {
  botEnabled?: boolean;
  questionAnswerMode?: QuestionAnswerMode;
  updatedByUserId: string;
}

const logger = getServiceLogger("admin-control-service");

const ADMIN_CONTROL_CACHE_KEY = "admin:control:v1";
const ADMIN_CONTROL_CACHE_TTL_SECONDS = 60;

const toStatus = (row: AdminControl): AdminControlStatus => ({
  botEnabled: Boolean(row.botEnabled),
  questionAnswerMode: row.questionAnswerMode,
  updatedByUserId: row.updatedByUserId ?? null,
  updatedAt: row.updatedAt.toISOString(),
});

class AdminControlApplicationService {
  private async ensureSingleton(): Promise<AdminControl> {
    const existing = await AdminControl.findOne({ order: [["id", "ASC"]] });
    if (existing) {
      return existing;
    }

    logger.warn("Admin control row missing; creating default singleton.");
    return AdminControl.create({
      botEnabled: true,
      questionAnswerMode: "db",
    });
  }

  private async readCached(redis: any): Promise<AdminControlStatus | null> {
    if (!redis) return null;
    const raw = await redis.get(ADMIN_CONTROL_CACHE_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AdminControlStatus;
    } catch {
      return null;
    }
  }

  private async writeCached(redis: any, status: AdminControlStatus) {
    if (!redis) return;
    await redis.set(
      ADMIN_CONTROL_CACHE_KEY,
      JSON.stringify(status),
      "EX",
      ADMIN_CONTROL_CACHE_TTL_SECONDS,
    );
  }

  async getStatus(bypassCache = false): Promise<AdminControlStatus> {
    const redis = bypassCache ? null : await getConnectedRedis();
    if (!bypassCache && isRedisUsable(redis)) {
      const cached = await this.readCached(redis);
      if (cached) {
        return cached;
      }
    }

    const row = await this.ensureSingleton();
    const status = toStatus(row);

    if (!bypassCache && isRedisUsable(redis)) {
      await this.writeCached(redis, status);
    }

    return status;
  }

  async updateControl(input: UpdateAdminControlInput): Promise<AdminControlStatus> {
    if (
      typeof input.botEnabled !== "boolean" &&
      typeof input.questionAnswerMode !== "string"
    ) {
      throw new ErrorHandler(
        "Provide at least one field to update: botEnabled or questionAnswerMode.",
        400,
      );
    }

    const row = await this.ensureSingleton();

    if (typeof input.botEnabled === "boolean") {
      row.botEnabled = input.botEnabled;
    }
    if (typeof input.questionAnswerMode === "string") {
      row.questionAnswerMode = input.questionAnswerMode;
    }

    row.updatedByUserId = input.updatedByUserId;
    await row.save();

    const status = toStatus(row);

    const redis = await getConnectedRedis();
    if (isRedisUsable(redis)) {
      await this.writeCached(redis, status);
    }

    return status;
  }
}

export const adminControlApplicationService = new AdminControlApplicationService();

