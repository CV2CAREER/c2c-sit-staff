import { systemConfigApplicationService } from "./system-config.application.service";
import { auditTrailApplicationService } from "./audit-trail.application.service";
import { getServiceLogger } from "../../utils/createLogger";
import ErrorHandler from "../../utils/errorHandler";

const logger = getServiceLogger("ai-vetting-config-service");

export const AI_VETTING_CONFIG_KEY = "ai-vetting-enabled";

export interface AiVettingConfig {
  enabled: boolean;
  learningMonth: boolean;
  mqaLiveFromDayOne: boolean;
  hqaAutoSubmit: boolean;
  lqaAutoSkip: boolean;
}

export const DEFAULT_AI_VETTING_CONFIG: AiVettingConfig = {
  enabled: true,
  learningMonth: true,
  mqaLiveFromDayOne: true,
  hqaAutoSubmit: false,
  lqaAutoSkip: false,
};

class AiVettingConfigApplicationService {
  async getConfig(): Promise<AiVettingConfig> {
    const record = await systemConfigApplicationService.getOrCreate<Partial<AiVettingConfig>>(
      AI_VETTING_CONFIG_KEY,
      DEFAULT_AI_VETTING_CONFIG,
    );

    return {
      ...DEFAULT_AI_VETTING_CONFIG,
      ...(record.value || {}),
    };
  }

  async updateConfig(
    input: Partial<AiVettingConfig>,
    updatedByUserId?: string | null,
  ): Promise<AiVettingConfig> {
    if (input == null || Object.keys(input).length === 0) {
      throw new ErrorHandler(
        "Provide at least one field to update: enabled, learningMonth, mqaLiveFromDayOne, hqaAutoSubmit, or lqaAutoSkip.",
        400,
      );
    }

    const before = await this.getConfig();

    const merged: AiVettingConfig = {
      enabled: typeof input.enabled === "boolean" ? input.enabled : before.enabled,
      learningMonth:
        typeof input.learningMonth === "boolean"
          ? input.learningMonth
          : before.learningMonth,
      mqaLiveFromDayOne:
        typeof input.mqaLiveFromDayOne === "boolean"
          ? input.mqaLiveFromDayOne
          : before.mqaLiveFromDayOne,
      hqaAutoSubmit:
        typeof input.hqaAutoSubmit === "boolean"
          ? input.hqaAutoSubmit
          : before.hqaAutoSubmit,
      lqaAutoSkip:
        typeof input.lqaAutoSkip === "boolean" ? input.lqaAutoSkip : before.lqaAutoSkip,
    };

    const saved = await systemConfigApplicationService.set<AiVettingConfig>({
      key: AI_VETTING_CONFIG_KEY,
      value: merged,
      updatedByUserId: updatedByUserId ?? null,
    });

    const after = {
      ...DEFAULT_AI_VETTING_CONFIG,
      ...(saved.value || {}),
    };

    await auditTrailApplicationService.log({
      action: "AI_VETTING_CONFIG_UPDATE",
      actorUserId: updatedByUserId ?? "system",
      targetType: "SystemConfig",
      targetKey: AI_VETTING_CONFIG_KEY,
      before,
      after,
    });

    logger.info("AI vetting config updated", after);

    return after;
  }
}

export const aiVettingConfigApplicationService =
  new AiVettingConfigApplicationService();
