import { SystemConfig } from "../../models/v1/system-config.model";
import { getServiceLogger } from "../../utils/createLogger";

const logger = getServiceLogger("system-config-service");

export interface SystemConfigRecord<T = any> {
  key: string;
  value: T;
  updatedByUserId: string | null;
  updatedAt: string;
}

const toRecord = <T>(row: SystemConfig): SystemConfigRecord<T> => ({
  key: row.key,
  value: row.value as T,
  updatedByUserId: row.updatedByUserId ?? null,
  updatedAt: row.updatedAt.toISOString(),
});

class SystemConfigApplicationService {
  async get<T = any>(key: string): Promise<SystemConfigRecord<T> | null> {
    const row = await SystemConfig.findOne({ where: { key } });
    return row ? toRecord<T>(row) : null;
  }

  async getOrCreate<T = any>(
    key: string,
    defaultValue: T,
  ): Promise<SystemConfigRecord<T>> {
    const existing = await this.get<T>(key);
    if (existing) return existing;

    logger.warn(`SystemConfig missing for key=${key}; creating default.`);
    const created = await SystemConfig.create({
      key,
      value: defaultValue as any,
    });
    return toRecord<T>(created);
  }

  async set<T = any>(input: {
    key: string;
    value: T;
    updatedByUserId?: string | null;
  }): Promise<SystemConfigRecord<T>> {
    const row =
      (await SystemConfig.findOne({ where: { key: input.key } })) ||
      (await SystemConfig.create({ key: input.key, value: {} }));

    row.value = input.value as any;
    row.updatedByUserId = input.updatedByUserId ?? null;
    await row.save();

    return toRecord<T>(row);
  }
}

export const systemConfigApplicationService =
  new SystemConfigApplicationService();

