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
    sortDirection: string = 'DESC'
  ) {
    try {
      // Input Validation & Sanitization
      limit = Math.min(Math.max(1, Number(limit) || this.DEFAULT_LIMIT), this.MAX_LIMIT);
      page = Math.max(1, Number(page) || 1);
      
      // Safe sort column (prevent SQL injection)
      const column = this.ALLOWED_SORT_COLUMNS.includes(sortColumn) ? sortColumn : 'id';
      const direction = sortDirection?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

      const offset = (page - 1) * limit;

      // Single database query
      const { rows: result, count } = await Log.findAndCountAll({
        offset,
        limit,
        order: [[column, direction]],
        raw: true
      });

      logger.info(`✅ Logs retrieved: page ${page}, ${result.length} records`);

      return {
        result,
        count: count - 1
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
  static async exportToCSV(req: any, filters: { startDate?: string, endDate?: string, type?: string } = {}, user: any): Promise<string> {
    try {
      const host = req.headers.host || req.headers.origin || "localhost";
      
      const whereClause: any = {};

      if (filters.startDate || filters.endDate) {
        whereClause.createdAt = {};
        if (filters.startDate) whereClause.createdAt[Op.gte] = new Date(filters.startDate);
        if (filters.endDate) whereClause.createdAt[Op.lte] = new Date(filters.endDate);
      }

      if (filters.type) {
        whereClause.type = filters.type;
      }

      const logs = await Log.findAll({
        where: whereClause,
        order: [["createdAt", "DESC"]],
        raw: true
      });

      const fields = [
        { label: "Log ID", value: "id" },
        { label: "Origin", value: "origin" },
        { label: "Title", value: "title" },
        { label: "Type", value: "type" },
        { label: "Summary", value: (row: any) => row.summary ? row.summary.replace(/(\r\n|\n|\r)/gm, " ") : "" },
        { label: "Created At", value: (row: any) => row.createdAt.toISOString() },
        { label: "Updated At", value: (row: any) => row.updatedAt.toISOString() }
      ];

      const json2csvParser = new Parser({ fields });
      const csv = json2csvParser.parse(logs);

      logger.info(`✅ Exported ${logs.length} logs to CSV by ${user.email}`);
      return csv;
    } catch (error: any) {
      logger.error(`❌ Failed to export logs to CSV: ${error.message}`);
      throw error;
    }
  }
}
