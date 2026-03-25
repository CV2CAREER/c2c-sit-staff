import { getConnectedRedis } from "../../config/redis";
import { AdminControl, QuestionAnswerMode } from "../../models/v1/admin-control.model";
import { getServiceLogger } from "../../utils/createLogger";
import ErrorHandler from "../../utils/errorHandler";
import { isRedisUsable } from "../../utils/helpers";
import { auditTrailApplicationService } from "./audit-trail.application.service";
import { systemConfigApplicationService } from "./system-config.application.service";

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
const SYSTEM_CONFIG_KEY = "admin.control";

const toStatus = (row: AdminControl): AdminControlStatus => ({
  botEnabled: Boolean(row.botEnabled),
  questionAnswerMode: row.questionAnswerMode,
  updatedByUserId: row.updatedByUserId ?? null,
  updatedAt: row.updatedAt.toISOString(),
});

const toStatusFromSystemConfig = (record: {
  value: any;
  updatedByUserId: string | null;
  updatedAt: string;
}): AdminControlStatus => ({
  botEnabled: Boolean(record.value?.botEnabled),
  questionAnswerMode: (record.value?.questionAnswerMode || "db") as QuestionAnswerMode,
  updatedByUserId: record.updatedByUserId ?? null,
  updatedAt: record.updatedAt,
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

    // Prefer SystemConfig as the source of truth.
    const systemRecord = await systemConfigApplicationService.getOrCreate(
      SYSTEM_CONFIG_KEY,
      { botEnabled: true, questionAnswerMode: "db" },
    );

    // One-time backfill from legacy AdminControl row if SystemConfig is still defaulted.
    if (
      systemRecord.updatedByUserId === null &&
      Boolean(systemRecord.value?.botEnabled) === true &&
      String(systemRecord.value?.questionAnswerMode || "db") === "db"
    ) {
      const legacyRow = await this.ensureSingleton();
      const legacyStatus = toStatus(legacyRow);
      if (
        legacyStatus.botEnabled !== true ||
        legacyStatus.questionAnswerMode !== "db"
      ) {
        await systemConfigApplicationService.set({
          key: SYSTEM_CONFIG_KEY,
          value: {
            botEnabled: legacyStatus.botEnabled,
            questionAnswerMode: legacyStatus.questionAnswerMode,
          },
          updatedByUserId: legacyStatus.updatedByUserId,
        });
      }
    }

    const freshRecord = await systemConfigApplicationService.getOrCreate(
      SYSTEM_CONFIG_KEY,
      { botEnabled: true, questionAnswerMode: "db" },
    );
    const status = toStatusFromSystemConfig(freshRecord);

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

    const before = await this.getStatus(true);

    const merged = {
      botEnabled:
        typeof input.botEnabled === "boolean" ? input.botEnabled : before.botEnabled,
      questionAnswerMode:
        typeof input.questionAnswerMode === "string"
          ? input.questionAnswerMode
          : before.questionAnswerMode,
    };

    const saved = await systemConfigApplicationService.set({
      key: SYSTEM_CONFIG_KEY,
      value: merged,
      updatedByUserId: input.updatedByUserId,
    });

    const status = toStatusFromSystemConfig(saved);

    const redis = await getConnectedRedis();
    if (isRedisUsable(redis)) {
      await this.writeCached(redis, status);
    }

    await auditTrailApplicationService.log({
      action: "ADMIN_CONTROL_UPDATE",
      actorUserId: input.updatedByUserId,
      targetType: "SystemConfig",
      targetKey: SYSTEM_CONFIG_KEY,
      before,
      after: status,
    });

    return status;
  }
}

export const adminControlApplicationService = new AdminControlApplicationService();
