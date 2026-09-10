import { fn, col, literal } from "sequelize";
import { getServiceLogger } from "../utils/createLogger";
import { VCSPromptUsageLog } from "../models/v1/vcs-prompt-usage-log.model";

const logger = getServiceLogger("vcs-prompt-usage-service");

export interface RecordUsageInput {
  key: string;
  vcsId?: string | null;
  promptId?: string | null;
  version?: string | null;
  promptLength: number;
  responseLength?: number | null;
  durationMs: number;
  success: boolean;
  errorMessage?: string | null;
  model?: string | null;
}

const serializeLog = (row: VCSPromptUsageLog) => ({
  id: row.id,
  key: row.key,
  vcsId: row.vcsId ?? null,
  promptId: row.promptId ?? null,
  version: row.version ?? null,
  promptLength: row.promptLength,
  responseLength: row.responseLength ?? null,
  durationMs: row.durationMs,
  success: row.success,
  errorMessage: row.errorMessage ?? null,
  model: row.model ?? null,
  createdAt: row.createdAt,
});

export class VcsPromptUsageService {
  // Fire-and-forget: deferred to setImmediate so logging a call never adds
  // latency to (or can ever fail) the request/response cycle it's reporting
  // on. Call sites just fire this without awaiting.
  static record(input: RecordUsageInput): void {
    setImmediate(async () => {
      try {
        await VCSPromptUsageLog.create({
          key: input.key,
          vcsId: input.vcsId ?? null,
          promptId: input.promptId ?? null,
          version: input.version ?? null,
          promptLength: input.promptLength,
          responseLength: input.responseLength ?? null,
          durationMs: input.durationMs,
          success: input.success,
          errorMessage: input.errorMessage ? input.errorMessage.slice(0, 1024) : null,
          model: input.model ?? null,
        });
      } catch (error: any) {
        logger.error(`Failed to record prompt usage for "${input.key}": ${error.message}`);
      }
    });
  }

  static async listLogs(filters: { key?: string; page?: number; limit?: number } = {}) {
    try {
      const page = Math.max(1, filters.page || 1);
      const limit = Math.min(200, Math.max(1, filters.limit || 50));
      const where = filters.key ? { key: filters.key } : {};

      const { rows, count } = await VCSPromptUsageLog.findAndCountAll({
        where,
        order: [["createdAt", "DESC"]],
        limit,
        offset: (page - 1) * limit,
      });

      return {
        rows: rows.map(serializeLog),
        count,
        page,
        limit,
      };
    } catch (error: any) {
      logger.error(`Failed to list prompt usage logs: ${error.message}`);
      throw error;
    }
  }

  // Last-used timestamp per key, collapsed across every version — this is
  // what the main prompts grid shows ("Last used"), as opposed to listSummary()
  // below which breaks performance stats out per (key, version) for the
  // dedicated analytics tab.
  static async listLastUsedByKey() {
    try {
      const rows = (await VCSPromptUsageLog.findAll({
        attributes: [
          "key",
          [fn("MAX", col("createdAt")), "lastUsedAt"],
          [fn("COUNT", col("id")), "totalCalls"],
        ],
        group: ["key"],
        raw: true,
      })) as unknown as Array<{ key: string; lastUsedAt: string; totalCalls: string }>;

      return rows.map((row) => ({
        key: row.key,
        lastUsedAt: row.lastUsedAt ?? null,
        totalCalls: Number(row.totalCalls) || 0,
      }));
    } catch (error: any) {
      logger.error(`Failed to list last-used prompt usage: ${error.message}`);
      throw error;
    }
  }

  // Aggregated per-key performance snapshot — the "how fast is the AI" view.
  static async listSummary() {
    try {
      const rows = (await VCSPromptUsageLog.findAll({
        attributes: [
          "key",
          "version",
          [fn("COUNT", col("id")), "totalCalls"],
          [fn("AVG", col("durationMs")), "avgDurationMs"],
          [fn("MIN", col("durationMs")), "minDurationMs"],
          [fn("MAX", col("durationMs")), "maxDurationMs"],
          [fn("AVG", col("promptLength")), "avgPromptLength"],
          [fn("AVG", col("responseLength")), "avgResponseLength"],
          [fn("MAX", col("createdAt")), "lastRunAt"],
          [
            fn("SUM", literal(`CASE WHEN "success" THEN 1 ELSE 0 END`)),
            "successCount",
          ],
        ],
        group: ["key", "version"],
        order: [
          ["key", "ASC"],
          ["version", "ASC"],
        ],
        raw: true,
      })) as unknown as Array<{
        key: string;
        version: string | null;
        totalCalls: string;
        avgDurationMs: string | null;
        minDurationMs: string | null;
        maxDurationMs: string | null;
        avgPromptLength: string | null;
        avgResponseLength: string | null;
        lastRunAt: string;
        successCount: string;
      }>;

      return rows.map((row) => {
        const totalCalls = Number(row.totalCalls) || 0;
        const successCount = Number(row.successCount) || 0;
        return {
          key: row.key,
          version: row.version ?? null,
          totalCalls,
          avgDurationMs: row.avgDurationMs ? Math.round(Number(row.avgDurationMs)) : 0,
          minDurationMs: row.minDurationMs ? Math.round(Number(row.minDurationMs)) : 0,
          maxDurationMs: row.maxDurationMs ? Math.round(Number(row.maxDurationMs)) : 0,
          avgPromptLength: row.avgPromptLength ? Math.round(Number(row.avgPromptLength)) : 0,
          avgResponseLength: row.avgResponseLength
            ? Math.round(Number(row.avgResponseLength))
            : 0,
          successRate: totalCalls > 0 ? Math.round((successCount / totalCalls) * 100) : 100,
          lastRunAt: row.lastRunAt,
        };
      });
    } catch (error: any) {
      logger.error(`Failed to summarize prompt usage: ${error.message}`);
      throw error;
    }
  }
}
