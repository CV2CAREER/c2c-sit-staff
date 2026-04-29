import { ViewAsRule } from "../../models/v1/view-as-rule.model";
import { getServiceLogger } from "../../utils/createLogger";
import { SlackService } from "../slack.service";
import { getEnvironmentFromHost } from "../../utils/slack-helpers";
import { SlackChannel, SlackEventType, SlackNode, SlackProvider, SlackSeverity } from "../../utils/enum";

const logger = getServiceLogger("view-as-rule-service");

export class ViewAsRuleService {

  /**
   * Send Slack notification (non-blocking)
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
          trigger: `View As Rule ${action}`,
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
   * Get all view as rules
   * Optimized with raw query and proper indexing
   */
  static async getAll(): Promise<ViewAsRule[]> {
    try {
      const rules = await ViewAsRule.findAll({
        attributes: ['id', 'persona', 'allowedTargets', 'createdAt', 'updatedAt'],
        order: [['persona', 'ASC']],
        raw: true
      });

      logger.info(`✅ Fetched ${rules.length} view as rules`);
      return rules;
    } catch (error: any) {
      logger.error(`❌ Failed to fetch view as rules: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get view as rule by persona
   */
  static async getByPersona(persona: string): Promise<ViewAsRule | null> {
    try {
      const rule = await ViewAsRule.findOne({
        where: { persona },
        raw: true
      });

      return rule;
    } catch (error: any) {
      logger.error(`❌ Failed to fetch view as rule for persona ${persona}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create new view as rule
   */
  static async create(data: { persona: string; allowedTargets: string[] }, req: any, user: any): Promise<ViewAsRule> {
    try {
      const existingRule = await ViewAsRule.findOne({ where: { persona: data.persona } });
      
      if (existingRule) {
        throw new Error("View as rule for this persona already exists");
      }

      const rule = await ViewAsRule.create(data);
      const host = req.headers.host || req.headers.origin || "localhost";

      // Send Slack notification
      const message = `
👁️ *VIEW AS RULE CREATED* 👁️
• Persona: ${data.persona}
• Allowed Targets: ${data.allowedTargets.join(', ')}
• Created by: ${user.email}
• IP Address: ${req.ip}
• Timestamp: ${new Date().toISOString()}
      `;
      
      setImmediate(async () => {
        try {
          await this.notifySlack(host, "Created", message, user);
        } catch (err) {
          logger.warn(`Could not send Slack notification: ${err}`);
        }
      });
      
      logger.info(`✅ Created view as rule for persona: ${data.persona}`);
      return rule.toJSON();
    } catch (error: any) {
      logger.error(`❌ Failed to create view as rule: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update existing view as rule
   */
  static async update(id: string, data: { persona?: string; allowedTargets?: string[] }, req: any, user: any): Promise<ViewAsRule> {
    try {
      const rule = await ViewAsRule.findByPk(id);
      
      if (!rule) {
        throw new Error("View as rule not found");
      }

      await rule.update(data);
      const host = req.headers.host || req.headers.origin || "localhost";

      // Send Slack notification
      const message = `
👁️ *VIEW AS RULE UPDATED* 👁️
• Persona: ${data.persona || rule.persona}
• Allowed Targets: ${data.allowedTargets ? data.allowedTargets.join(', ') : rule.allowedTargets.join(', ')}
• Updated by: ${user.email}
• IP Address: ${req.ip}
• Timestamp: ${new Date().toISOString()}
      `;
      
      setImmediate(async () => {
        try {
          await this.notifySlack(host, "Updated", message, user);
        } catch (err) {
          logger.warn(`Could not send Slack notification: ${err}`);
        }
      });
      
      logger.info(`✅ Updated view as rule: ${id}`);
      return rule.toJSON();
    } catch (error: any) {
      logger.error(`❌ Failed to update view as rule ${id}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Upsert a rule using persona as the stable key.
   * This matches the admin persona-settings UI, which saves by persona
   * instead of tracking rule ids in local state.
   */
  static async upsertByPersona(
    data: { persona: string; allowedTargets: string[] },
    req: any,
    user: any,
  ): Promise<ViewAsRule> {
    const existingRule = await ViewAsRule.findOne({
      where: { persona: data.persona },
    });

    if (!existingRule) {
      return this.create(data, req, user);
    }

    return this.update(
      existingRule.id,
      { allowedTargets: data.allowedTargets },
      req,
      user,
    );
  }

  /**
   * Check if staff can view as target user
   * Optimized database query with index
   */
  static async canViewAs(staffPersona: string, targetRole: string): Promise<boolean> {
    try {
      const rule = await this.getByPersona(staffPersona);
      
      if (!rule) {
        return false;
      }

      return rule.allowedTargets.includes(targetRole);
    } catch (error: any) {
      logger.error(`❌ Error checking view as permission: ${error.message}`);
      return false;
    }
  }
}
