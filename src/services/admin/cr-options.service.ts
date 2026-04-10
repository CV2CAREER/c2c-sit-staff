import { getServiceLogger } from "../../utils/createLogger";
import { CROwner } from "../../models/v1/cr/owner.model";
import { CRChange } from "../../models/v1/cr/change.model";
import { CRSeverity } from "../../models/v1/cr/severity.model";
import { CRFamily } from "../../models/v1/cr/family.model";
import { CRStage } from "../../models/v1/cr/stage.model";
import { CRType } from "../../models/v1/cr/type.model";
import { CRPersona } from "../../models/v1/cr/persona.model";
import { CRProvider } from "../../models/v1/cr/provider.model";
import { CRNode } from "../../models/v1/cr/node.model";
import { SlackService } from "../slack.service";
import { getEnvironmentFromHost } from "../../utils/slack-helpers";
import { SlackChannel, SlackEventType, SlackNode, SlackProvider, SlackSeverity } from "../../utils/enum";

const logger = getServiceLogger("cr-options-service");

/**
 * CR Options Service
 * Returns all dropdown select options for CR Tracking
 */
export class CROptionsService {

  /**
   * Get all CR options in single consolidated response
   */
  static async getAllOptions(type?: string) {
    try {
      if (type && type !== 'all') {
        // Single type request - return only requested type
        const Model = this.getModelByType(type);
        if (!Model) {
          throw new Error(`Invalid option type: ${type}`);
        }

        const nameField = type === 'persona' ? 'label' : 'name';
        const data = await Model.findAll({ raw: true, order: [[nameField, 'ASC']] });
        
        logger.info(`✅ CR ${type} options loaded successfully`);
        return {
          message: `CR ${type} options retrieved successfully`,
          data: data
        };
      }

      // All types request - return everything
      const [
        owners,
        changes,
        severities,
        families,
        stages,
        types,
        personas,
        providers,
        nodes
      ] = await Promise.all([
        CROwner.findAll({ raw: true, order: [['name', 'ASC']] }),
        CRChange.findAll({ raw: true, order: [['name', 'ASC']] }),
        CRSeverity.findAll({ raw: true, order: [['name', 'ASC']] }),
        CRFamily.findAll({ raw: true, order: [['name', 'ASC']] }),
        CRStage.findAll({ raw: true, order: [['name', 'ASC']] }),
        CRType.findAll({ raw: true, order: [['name', 'ASC']] }),
        CRPersona.findAll({ raw: true, order: [['label', 'ASC']] }),
        CRProvider.findAll({ raw: true, order: [['name', 'ASC']] }),
        CRNode.findAll({ raw: true, order: [['name', 'ASC']] })
      ]);

      logger.info(`✅ All CR Options loaded successfully`);

      return {
        message: "All CR Options retrieved successfully",
        allCROwnersData: owners,
        allCRChangesData: changes,
        allCRSeveritiesData: severities,
        allCRFamiliesData: families,
        allCRStagesData: stages,
        allCRTypesData: types,
        allCRImpactedPersonasData: personas,
        allCRImpactedProvidersData: providers,
        allCRImpactedNodesData: nodes
      };

    } catch (error: any) {
      logger.error(`❌ Failed to get CR options: ${error.message}`);
      throw error;
    }
  }

  /**
   * Send Slack notification for CR Option changes
   */
  private static async notifySlack(host: string, action: string, itemType: string, itemName: string, user: any) {
    setImmediate(async () => {
      try {
        const location = getEnvironmentFromHost(host);

        await SlackService.notify({
          location,
          host,
          node: SlackNode.MESSAGING,
          provider: SlackProvider.SYSTEM,
          severity: SlackSeverity.INFO,
          trigger: `CR Option ${action}`,
          type: SlackEventType.ADMIN_ACTION,
          channel: SlackChannel.CHANGE_REQUESTS,
          teamMentions: "CSM",
          body: `🔧 *CR OPTION ${action.toUpperCase()}* 🔧
• Action by: ${user.email}
• Type: ${itemType}
• Name: ${itemName}`.trim(),
        });
      } catch (err) {
        logger.error(`❌ Slack notification failed: ${err}`);
      }
    });
  }

  /**
   * Get model class by type string
   */
  private static getModelByType(type: string): any {
    const models: Record<string, any> = {
      owner: CROwner,
      change: CRChange,
      severity: CRSeverity,
      family: CRFamily,
      stage: CRStage,
      type: CRType,
      persona: CRPersona,
      provider: CRProvider,
      node: CRNode
    };
    return models[type];
  }

  /**
   * Create new CR Option
   */
  static async createOption(req: any, type: string, data: any, user: any) {
    try {
      const host = req.headers.host || req.headers.origin || "localhost";
      const Model = this.getModelByType(type);

      if (!Model) {
        throw new Error(`Invalid option type: ${type}`);
      }

      const item = await Model.create(data);

      const nameField = type === 'persona' ? 'label' : 'name';
      await this.notifySlack(host, "Created", type, item[nameField], user);

      logger.info(`✅ CR ${type} option ${item.id} created by ${user.email}`);
      return item.toJSON();
    } catch (error: any) {
      logger.error(`❌ Failed to create CR ${type} option: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update existing CR Option
   */
  static async updateOption(req: any, type: string, id: string, data: any, user: any) {
    try {
      const host = req.headers.host || req.headers.origin || "localhost";
      const Model = this.getModelByType(type);

      if (!Model) {
        throw new Error(`Invalid option type: ${type}`);
      }

      const item = await Model.findByPk(id);
      if (!item) {
        throw new Error(`CR ${type} option not found`);
      }

      await item.update(data);

      const nameField = type === 'persona' ? 'label' : 'name';
      await this.notifySlack(host, "Updated", type, item[nameField], user);

      logger.info(`✅ CR ${type} option ${id} updated by ${user.email}`);
      return item.toJSON();
    } catch (error: any) {
      logger.error(`❌ Failed to update CR ${type} option: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete CR Option
   */
  static async deleteOption(req: any, type: string, id: string, user: any) {
    try {
      const host = req.headers.host || req.headers.origin || "localhost";
      const Model = this.getModelByType(type);

      if (!Model) {
        throw new Error(`Invalid option type: ${type}`);
      }

      const item = await Model.findByPk(id);
      if (!item) {
        throw new Error(`CR ${type} option not found`);
      }

      await item.destroy();

      const nameField = type === 'persona' ? 'label' : 'name';
      await this.notifySlack(host, "Deleted", type, item[nameField], user);

      logger.info(`✅ CR ${type} option ${id} deleted by ${user.email}`);
      return true;
    } catch (error: any) {
      logger.error(`❌ Failed to delete CR ${type} option: ${error.message}`);
      throw error;
    }
  }
}
