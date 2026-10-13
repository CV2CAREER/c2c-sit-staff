import {
  SCHEMA_TABLE_USAGE,
  SCHEMA_TABLE_USAGE_GENERATED_AT,
} from "../../config/schema-table-usage.generated";
import { getServiceLogger } from "../../utils/createLogger";
import ErrorHandler from "../../utils/errorHandler";
import { getSequelize } from "../../utils/sequelize";
import { auditTrailApplicationService } from "./audit-trail.application.service";
import { systemConfigApplicationService } from "./system-config.application.service";

// Decides whether a table is used by the application, for Admin > Schema
// Compare. UAT and PROD carry tables migrated from the old platform (cities,
// cvprompts, zohobooks_*, *-LOG-BATCH, ...) that nothing reads any more;
// differences on them are noise. A table counts as USED when any of these
// say so, in priority order:
//   1. an admin override ("used" / "unused"), stored in system config;
//   2. a live Sequelize model of this (staff) backend;
//   3. the generated scan of both backends' models + raw SQL
//      (src/config/schema-table-usage.generated.ts, `npm run schema-usage:scan`).
// Anything else is treated as migrated/unused.

const logger = getServiceLogger("schema-table-usage");

const OVERRIDES_KEY = "schema_compare.table_usage_overrides";
const TABLE_NAME_REGEX = /^[A-Za-z_][A-Za-z0-9_$ -]{0,62}$/;

export type UsageOverride = "used" | "unused";

// Name shapes that are backups/archives/migration leftovers — only used to
// phrase the reason; usage signals above always win.
const BACKUP_NAME = /^zzz_|_bak(_|$)|backup|archive|^_|-log-batch$/i;

export interface UsageContext {
  legacyReason: (table: string, schema: string) => string | null;
  overrides: Record<string, UsageOverride>;
  scanGeneratedAt: string;
}

const liveModelTables = (): Set<string> => {
  const names = new Set<string>();
  try {
    for (const model of Object.values(getSequelize().models)) {
      const t = (model as any).getTableName();
      names.add(String(typeof t === "string" ? t : t?.tableName).toLowerCase());
    }
  } catch (err: any) {
    logger.warn(`Could not read live model tables: ${err?.message}`);
  }
  return names;
};

class SchemaTableUsageService {
  async getOverrides(): Promise<Record<string, UsageOverride>> {
    try {
      const config = await systemConfigApplicationService.getOrCreate<Record<string, UsageOverride>>(
        OVERRIDES_KEY,
        {},
      );
      return config.value && typeof config.value === "object" ? config.value : {};
    } catch (err: any) {
      logger.warn(`Could not load table usage overrides: ${err?.message}`);
      return {};
    }
  }

  async getContext(): Promise<UsageContext> {
    const overrides = await this.getOverrides();
    const models = liveModelTables();

    const legacyReason = (table: string): string | null => {
      const key = table.toLowerCase();
      const override = overrides[key];
      if (override === "used") return null;
      if (override === "unused") return "Marked as unused by an admin";
      if (models.has(key) || SCHEMA_TABLE_USAGE[key]) return null;
      return BACKUP_NAME.test(table)
        ? "Backup / archive / migration leftover — not referenced by the app"
        : "Not referenced by any model or SQL query in the staff or customer backend (likely migrated from the old platform)";
    };

    return { legacyReason, overrides, scanGeneratedAt: SCHEMA_TABLE_USAGE_GENERATED_AT };
  }

  async setOverride(table: string, usage: UsageOverride | null, actorUserId: string) {
    const name = String(table || "").trim();
    if (!TABLE_NAME_REGEX.test(name)) throw new ErrorHandler("Invalid table name.", 400);
    if (usage !== null && usage !== "used" && usage !== "unused") {
      throw new ErrorHandler('usage must be "used", "unused" or null (automatic).', 400);
    }

    const overrides = await this.getOverrides();
    const key = name.toLowerCase();
    const before = overrides[key] ?? null;
    const next = { ...overrides };
    if (usage) next[key] = usage;
    else delete next[key];

    await systemConfigApplicationService.set({ key: OVERRIDES_KEY, value: next, updatedByUserId: actorUserId });
    await auditTrailApplicationService
      .log({
        action: "SCHEMA_COMPARE_TABLE_USAGE",
        actorUserId,
        targetType: "Schema",
        targetKey: name,
        before: { usage: before },
        after: { usage },
      })
      .catch((err) => logger.warn(`Audit log failed: ${err?.message}`));

    return { table: name, usage };
  }
}

export const schemaTableUsageService = new SchemaTableUsageService();
