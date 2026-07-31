// services/vcs-prompt-usage.service.ts
//
// Records and reports on every AI call made with a VCS-backed prompt (see
// vcs-prompt.service.ts) — latency, prompt/response size, success — so the
// admin panel can show how fast/reliable the AI actually is per prompt key.
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

  // Aggregated per-key performance snapshot — the "how fast is the AI" view.
  static async listSummary() {
    try {
      const rows = (await VCSPromptUsageLog.findAll({
        attributes: [
          "key",
          [fn("COUNT", col("id")), "totalCalls"],
          [fn("AVG", col("durationMs")), "avgDurationMs"],
          [fn("MIN", col("durationMs")), "minDurationMs"],
          [fn("MAX", col("durationMs")), "maxDurationMs"],
          [fn("AVG", col("promptLength")), "avgPromptLength"],
          [fn("AVG", col("responseLength")), "avgResponseLength"],
          [fn("MAX", col("createdAt")), "lastUsedAt"],
          [
            fn("SUM", literal(`CASE WHEN "success" THEN 1 ELSE 0 END`)),
            "successCount",
          ],
        ],
        group: ["key"],
        order: [["key", "ASC"]],
        raw: true,
      })) as unknown as Array<{
        key: string;
        totalCalls: string;
        avgDurationMs: string | null;
        minDurationMs: string | null;
        maxDurationMs: string | null;
        avgPromptLength: string | null;
        avgResponseLength: string | null;
        lastUsedAt: string;
        successCount: string;
      }>;

      return rows.map((row) => {
        const totalCalls = Number(row.totalCalls) || 0;
        const successCount = Number(row.successCount) || 0;
        return {
          key: row.key,
          totalCalls,
          avgDurationMs: row.avgDurationMs ? Math.round(Number(row.avgDurationMs)) : 0,
          minDurationMs: row.minDurationMs ? Math.round(Number(row.minDurationMs)) : 0,
          maxDurationMs: row.maxDurationMs ? Math.round(Number(row.maxDurationMs)) : 0,
          avgPromptLength: row.avgPromptLength ? Math.round(Number(row.avgPromptLength)) : 0,
          avgResponseLength: row.avgResponseLength
            ? Math.round(Number(row.avgResponseLength))
            : 0,
          successRate: totalCalls > 0 ? Math.round((successCount / totalCalls) * 100) : 100,
          lastUsedAt: row.lastUsedAt,
        };
      });
    } catch (error: any) {
      logger.error(`Failed to summarize prompt usage: ${error.message}`);
      throw error;
    }
  }
}
