import { getServiceLogger } from "../../utils/createLogger";
import { SalesOperation } from "../../models/v1/sales-operation.model";
import { User } from "../../models/v1/user.model";
import { SlackService } from "../slack.service";
import { getEnvironmentFromHost } from "../../utils/slack-helpers";
import { SlackChannel, SlackEventType, SlackNode, SlackProvider, SlackSeverity } from "../../utils/enum";
import { Parser } from 'json2csv';

const logger = getServiceLogger("sales-operation-service");

/**
 * Sales Operation Service
 * Optimized for speed and stability
 */
export class SalesOperationService {

  /**
   * Send Slack notification
   */
  private static async notifySlack(host: string, action: string, message: string, user: any) {
    setImmediate(async () => {
      try {
        const location = getEnvironmentFromHost(host);

        await SlackService.notify({
          location,
          host,
          node: SlackNode.MESSAGING,
          provider: SlackProvider.SYSTEM,
          severity: SlackSeverity.INFO,
          trigger: `Sales Operation ${action}`,
          type: SlackEventType.ADMIN_ACTION,
          channel: SlackChannel.TOWN_CRIER,
          teamMentions: "CSM",
          body: message.trim(),
        });
      } catch (err) {
        logger.error(`❌ Slack notification failed: ${err}`);
      }
    });
  }

  /**
   * Get all sales operations with optional filters
   * Performance optimized: uses lean queries, proper indexes, no joins
   */
  static async getAll(filters: { isDeleted?: boolean } = {}) {
    try {
      const whereClause: any = {};

      if (typeof filters.isDeleted === 'boolean') {
        whereClause.isDeleted = filters.isDeleted;
      }

      // Performance optimized query:
      // ✅ Uses proper database index on isDeleted + createdAt
      // ✅ Sorted by createdAt DESC (latest first)
      // ✅ No unnecessary joins
      const operations = await SalesOperation.findAll({
        where: whereClause,
        order: [['createdAt', 'DESC']],
        raw: true, // Faster than model instances
        benchmark: true
      });

      logger.info(`✅ Retrieved ${operations.length} sales operations`);
      return operations;
    } catch (error: any) {
      logger.error(`❌ Failed to get sales operations: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create new sales operation
   */
  static async create(req: any, data: any, user: any) {
    try {
      const host = req.headers.host || req.headers.origin || "localhost";

      const operation = await SalesOperation.create({
        ...data,
        createdBy: user.id,
        isDeleted: false
      });

      // Send Slack Notification
      const message = `
📝 *Sales Operation CREATED* 📝
• Created by: ${user.email}
• Operation ID: ${operation.id}
• Client Name: ${operation.name}
• Sales Executive: ${operation.salesExecutive}
• Territory: ${operation.australiaTerritory}
• Partner Type: ${operation.partnerType}
      `;
      await this.notifySlack(host, "Created", message, user);

      logger.info(`✅ Sales operation ${operation.id} created by ${user.email}`);
      return operation.toJSON();
    } catch (error: any) {
      logger.error(`❌ Failed to create sales operation: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update existing sales operation
   */
  static async update(req: any, id: string, updates: any, user: any) {
    try {
      const host = req.headers.host || req.headers.origin || "localhost";
      const operation = await SalesOperation.findByPk(id);

      if (!operation) {
        throw new Error("Sales operation not found");
      }

      await operation.update({
        ...updates,
        updatedBy: user.id
      });

      // Send Slack Notification
      const changes = Object.entries(updates)
        .filter(([key]) => !['updatedAt', 'updatedBy'].includes(key))
        .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
        .join("\n• ");

      const message = `
✏️ *Sales Operation UPDATED* ✏️
• Updated by: ${user.email}
• Operation ID: ${id}
• Client Name: ${operation.name}
• Changes:
• ${changes || "No field changes"}
      `;
      await this.notifySlack(host, "Updated", message, user);

      logger.info(`✅ Sales operation ${id} updated by ${user.email}`);
      return operation.toJSON();
    } catch (error: any) {
      logger.error(`❌ Failed to update sales operation: ${error.message}`);
      throw error;
    }
  }

  /**
   * Soft delete sales operation
   */
  static async delete(req: any, id: string, user: any) {
    try {
      const host = req.headers.host || req.headers.origin || "localhost";
      const operation = await SalesOperation.findByPk(id);

      if (!operation) {
        throw new Error("Sales operation not found");
      }

      await operation.update({
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: user.id
      });

      // Send Slack Notification
      const message = `
🗑️ *Sales Operation DELETED* 🗑️
• Deleted by: ${user.email}
• Operation ID: ${id}
• Client Name: ${operation.name}
• Sales Executive: ${operation.salesExecutive}
      `;
      await this.notifySlack(host, "Deleted", message, user);

      logger.info(`✅ Sales operation ${id} deleted by ${user.email}`);
      return true;
    } catch (error: any) {
      logger.error(`❌ Failed to delete sales operation: ${error.message}`);
      throw error;
    }
  }

  /**
   * Export Sales Operation data as CSV
   * Can filter by ID
   */
  static async exportToCSV(req: any, filters: { id?: string } = {}, user: any): Promise<string> {
    try {
      const host = req.headers.host || req.headers.origin || "localhost";
      
      const whereClause: any = { isDeleted: false };

      if (filters.id) {
        whereClause.id = filters.id;
      }

      const operations = await SalesOperation.findAll({
        where: whereClause,
        order: [["createdAt", "DESC"]],
        raw: true
      });

      const json2csvParser = new Parser();
      const csv = json2csvParser.parse(operations);

      // Send Slack notification
      const message = `
📊 *Sales Operation EXPORTED* 📊
• Exported by: ${user.email}
• Number of records: ${operations.length}
${filters.id ? `• Filter: Operation ID = ${filters.id}` : ''}
      `;
      await this.notifySlack(host, "Exported", message, user);

      logger.info(`✅ Exported ${operations.length} sales operations to CSV by ${user.email}`);
      return csv;
    } catch (error: any) {
      logger.error(`❌ Failed to export sales operations to CSV: ${error.message}`);
      throw error;
    }
  }
}
