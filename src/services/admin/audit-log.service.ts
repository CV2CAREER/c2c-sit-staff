import { getServiceLogger } from "../../utils/createLogger";
import { AuditLog } from "../../models/v1/audit-log.model";
import { fieldEncryption } from "../../utils/field-encryption";

const logger = getServiceLogger("audit-log-service");

/**
 * Audit Log Service
 * Non-blocking async logging using setImmediate
 */
export class AuditLogService {

  private static readonly ALLOWED_SORT_COLUMNS = ['id', 'userId', 'method', 'url', 'createdAt'];
  private static readonly DEFAULT_LIMIT = 50;
  private static readonly MAX_LIMIT = 200;

  /**
   * ✅ NON-BLOCKING LOG WRITER
   * Uses setImmediate to avoid delaying request responses
   * EXACT SAME PATTERN AS LOGS SERVICE
   */
  static log(data: {
    userId: string;
    userFullName: string;
    userRole: string;
    method: string;
    url: string;
    deviceUsed?: string;
    dataEntry?: any;
    description?: string;
  }) {
    setImmediate(async () => {
      try {
        await AuditLog.create({
          userId: data.userId,
          userFullName: data.userFullName,
          userRole: data.userRole,
          method: data.method,
          url: data.url,
          deviceUsed: data.deviceUsed,
          dataEntry: data.dataEntry,
          description: data.description
        });

        logger.debug(`📝 Audit Logged: ${data.method} ${data.url}`);
      } catch (error: any) {
        logger.warn(`⚠️ Audit log write failed: ${error.message}`);
      }
    });
  }

  /**
   * Get paginated audit logs with search
   */
  static async getAuditLogs(page: number = 1, pageSize: number = 50, search?: string) {
    try {
      const limit = Math.min(Math.max(1, Number(pageSize) || this.DEFAULT_LIMIT), this.MAX_LIMIT);
      page = Math.max(1, Number(page) || 1);
      const offset = (page - 1) * limit;
      const where: any = {};

      if (search) {
        const [matchedUserId] = await fieldEncryption.findUsersByEmailPartial(search, 1);
        if (matchedUserId) {
          where.userId = matchedUserId;
        }
      }

      const { rows: data, count } = await AuditLog.findAndCountAll({
        where,
        order: [['createdAt', 'DESC']],
        offset,
        limit,
        raw: true
      });

      return {
        data,
        pagination: {
          totalTrails: count,
          totalPages: Math.ceil(count / limit),
          currentPage: page
        }
      };

    } catch (error: any) {
      logger.error(`❌ Failed to fetch audit logs: ${error.message}`);
      throw error;
    }
  }
}