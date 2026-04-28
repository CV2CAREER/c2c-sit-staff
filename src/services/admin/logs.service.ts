import { getServiceLogger } from "../../utils/createLogger";
import { Log } from "../../models/v1/log.model";
import { Op } from "sequelize";
import { Parser } from 'json2csv';

const logger = getServiceLogger("logs-service");

/**
 * Logs Service
 * Non-blocking async logging using setImmediate
 */
export class LogsService {

  // Allowed log types
  private static readonly VALID_TYPES = [
    'bot_log',
    'ai_log', 
    'cv_ai_log',
    'reed_logs',
    'jora_log',
    'aq_ai_log',
    'cv_auto_accept_reject_log',
    'keyword_log',
    'interview_prep_log',
    'regression_bot_log',
    'digital-traceability-logs',
    'adzuna-logs',
    'seek-logs',
    'careerone-logs'
  ];

  // Allowed sort columns (SQL injection protection)
  private static readonly ALLOWED_SORT_COLUMNS = ['id', 'origin', 'title', 'type', 'createdAt'];
  private static readonly DEFAULT_LIMIT = 20;
  private static readonly MAX_LIMIT = 100;
  private static readonly SCRAPER_TYPES = new Set([
    "reed_logs",
    "jora_log",
    "digital-traceability-logs",
    "adzuna-logs",
    "seek-logs",
    "careerone-logs",
  ]);
  private static readonly PARSER_TYPES = new Set([
    "ai_log",
    "cv_ai_log",
    "aq_ai_log",
    "keyword_log",
    "interview_prep_log",
    "cv_auto_accept_reject_log",
  ]);

  private static getCategoryFromType(type?: string) {
    if (!type) return "system";
    if (this.SCRAPER_TYPES.has(type)) return "scraper";
    if (this.PARSER_TYPES.has(type)) return "parser";
    return "system";
  }

  private static getLevelFromRow(row: { title?: string; summary?: string }) {
    const haystack = `${row.title ?? ""} ${row.summary ?? ""}`.toLowerCase();
    if (/(error|failed|exception|fatal|invalid|timeout)/i.test(haystack)) {
      return "error";
    }
    return "info";
  }

  private static getMessageFromRow(row: { title?: string; summary?: string }) {
    const title = (row.title ?? "").trim();
    const summary = (row.summary ?? "").trim();

    if (title && summary) {
      return `${title}: ${summary}`;
    }

    return summary || title || "-";
  }

  private static buildWhereClause(filters: {
    search?: string;
    type?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const whereClause: any = {};
    const andConditions: any[] = [];

    if (filters.startDate || filters.endDate) {
      whereClause.createdAt = {};
      if (filters.startDate) {
        whereClause.createdAt[Op.gte] = new Date(filters.startDate);
      }
      if (filters.endDate) {
        whereClause.createdAt[Op.lte] = new Date(filters.endDate);
      }
    }

    if (filters.search?.trim()) {
      const term = `%${filters.search.trim()}%`;
      andConditions.push({
        [Op.or]: [
          { origin: { [Op.iLike]: term } },
          { title: { [Op.iLike]: term } },
          { summary: { [Op.iLike]: term } },
        ],
      });
    }

    if (filters.type && filters.type !== "all") {
      const requested = filters.type.trim().toLowerCase();

      // Check if it's a direct log type value (e.g. "bot_log", "ai_log")
      if (this.VALID_TYPES.includes(requested)) {
        andConditions.push({ type: requested });
      } else {
        // Treat as a category (scraper, parser, system)
        const matchingTypes = this.VALID_TYPES.filter(
          (type) => this.getCategoryFromType(type) === requested,
        );

        if (matchingTypes.length > 0) {
          andConditions.push({
            type: {
              [Op.in]: matchingTypes,
            },
          });
        }
      }
    }

    if (andConditions.length > 0) {
      whereClause[Op.and] = andConditions;
    }

    return whereClause;
  }

  private static mapRow(row: any) {
    return {
      id: row.id,
      _id: row.id,
      origin: row.origin,
      title: row.title,
      rawType: row.type,
      type: this.getCategoryFromType(row.type),
      level: this.getLevelFromRow(row),
      message: this.getMessageFromRow(row),
      timestamp: row.createdAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  /**
   * ✅ NON-BLOCKING LOG WRITER
   * Uses setImmediate to avoid delaying request responses
   */
  static log(data: { origin: string; title: string; type?: string; summary?: string }) {
    setImmediate(async () => {
      try {
        // Use default type if not provided or invalid
        const type = this.VALID_TYPES.includes(data.type || '') ? data.type : 'bot_log';

        await Log.create({
          origin: data.origin,
          title: data.title,
          type: type,
          summary: data.summary
        });

        logger.debug(`📝 Logged: ${data.title}`);
      } catch (error: any) {
        logger.warn(`⚠️ Log write failed: ${error.message}`);
      }
    });
  }

  /**
   * Get paginated logs with sorting
   */
  static async getLogs(
    page: number = 1, 
    limit: number = this.DEFAULT_LIMIT, 
    sortColumn: string = 'id', 
    sortDirection: string = 'DESC',
    filters: {
      search?: string;
      type?: string;
      startDate?: string;
      endDate?: string;
    } = {},
  ) {
    try {
      // Input Validation & Sanitization
      limit = Math.min(Math.max(1, Number(limit) || this.DEFAULT_LIMIT), this.MAX_LIMIT);
      page = Math.max(1, Number(page) || 1);
      
      // Safe sort column (prevent SQL injection)
      const column = this.ALLOWED_SORT_COLUMNS.includes(sortColumn) ? sortColumn : 'id';
      const direction = sortDirection?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

      const offset = (page - 1) * limit;
      const where = this.buildWhereClause(filters);

      // Single database query
      const { rows: result, count } = await Log.findAndCountAll({
        where,
        offset,
        limit,
        order: [[column, direction]],
        raw: true
      });

      logger.info(`✅ Logs retrieved: page ${page}, ${result.length} records`);

      return {
        result: result.map((row) => this.mapRow(row)),
        total: count
      };

    } catch (error: any) {
      logger.error(`❌ Failed to fetch logs: ${error.message}`);
      throw error;
    }
  }

  /**
   * Export Logs data as CSV
   * Can filter by date range and type
   */
  static async exportToCSV(
    req: any,
    filters: {
      startDate?: string;
      endDate?: string;
      type?: string;
      search?: string;
    } = {},
    user: any,
  ): Promise<string> {
    try {
      const host = req.headers.host || req.headers.origin || "localhost";
      const whereClause = this.buildWhereClause(filters);

      const logs = await Log.findAll({
        where: whereClause,
        order: [["createdAt", "DESC"]],
        raw: true
      });

      const normalizedLogs = logs.map((row) => this.mapRow(row));

      const fields = [
        { label: "Log ID", value: "id" },
        { label: "Origin", value: "origin" },
        { label: "Category", value: "type" },
        { label: "Raw Type", value: "rawType" },
        { label: "Level", value: "level" },
        {
          label: "Message",
          value: (row: any) => row.message.replace(/(\r\n|\n|\r)/gm, " "),
        },
        { label: "Created At", value: (row: any) => new Date(row.createdAt).toISOString() },
        { label: "Updated At", value: (row: any) => new Date(row.updatedAt).toISOString() }
      ];

      const json2csvParser = new Parser({ fields });
      const csv = json2csvParser.parse(normalizedLogs);

      logger.info(`✅ Exported ${logs.length} logs to CSV by ${user.email}`);
      return csv;
    } catch (error: any) {
      logger.error(`❌ Failed to export logs to CSV: ${error.message}`);
      throw error;
    }
  }
}
