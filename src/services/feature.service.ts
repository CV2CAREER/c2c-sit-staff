import { Feature } from "../models/v1/feature.model";
import { AdminControl } from "../models/v1/admin-control.model";
import { SlackService } from "./slack.service";
import { getServiceLogger } from "../utils/createLogger";
import { SlackChannel, SlackEventType, SlackNode, SlackProvider, SlackSeverity } from "../utils/enum";
import { getEnvironmentFromHost } from "../utils/slack-helpers";

const logger = getServiceLogger("feature-service");

export class FeatureService {
  // Get all features
  static async getAllFeatures() {
    try {
      const features = await Feature.findAll({
        order: [['createdAt', 'DESC']]
      });
      
      logger.info(`Retrieved ${features.length} features from database`);
      return features;
    } catch (error: any) {
      logger.error(`Failed to retrieve features: ${error.message}`);
      throw error;
    }
  }

  // Get feature by ID
  static async getFeatureById(id: string) {
    try {
      const feature = await Feature.findByPk(id);

      if (!feature) {
        logger.warn(`Feature with ID ${id} not found`);
        throw new Error(`Feature with ID ${id} not found`);
      }

      logger.info(`Retrieved feature ${id}`);
      return feature;
    } catch (error: any) {
      logger.error(`Failed to retrieve feature ${id}: ${error.message}`);
      throw error;
    }
  }

  // Update feature settings
  static async updateFeature(req: any, id: string, updates: Partial<any>, userId: string | null, userEmail: string) {
    const host = req.headers.host || req.headers.origin || "localhost";
    const location = getEnvironmentFromHost(host);
    
    // Find the feature by ID
    const feature = await Feature.findByPk(id);

    if (!feature) {
      throw new Error(`Feature with ID ${id} not found`);
    }

    // Update the feature with provided fields
    await feature.update(updates);

  
    
    // Get the updated feature record
    const updatedFeature = await Feature.findByPk(id);

    // Also update the admin control record to track who made the change
    // if (userId) {
    //   await AdminControl.update(
    //     { updatedByUserId: userId },
    //     { where: { id: feature.id } }
    //   );
    // }
    
    // Send Slack notification asynchronously (non-blocking)
    setImmediate(async () => {
      try {

        const updateSummary = Object.entries(updates)
          .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
          .join("\n• ");

        const message = `
✅ **Feature Updated** ✅
• Feature ID: ${id}
• Updated by: ${userEmail}
• Changes made:
• ${updateSummary}

**Feature Details:**
• Title: ${feature.title}
• Tier: ${feature.tier}
• Price: $${feature.price}
• Job Applications: ${feature.jobApplications}
• CV/Resume Requests: ${feature.cvResumeRequests}
• Validity Period: ${feature.validityPeriod}
        `;

        await SlackService.notify({
          location,
          host,
          node: SlackNode.MESSAGING,
          provider: SlackProvider.SYSTEM,
          severity: SlackSeverity.INFO,
          trigger: "Feature Settings Updated",
          type: SlackEventType.ADMIN_ACTION,
          channel: SlackChannel.TOWN_CRIER,
          teamMentions: "CSM",
          body: message.trim(),
        });
        
        logger.info(`✅ Slack notification sent for feature ${id} update`);
      } catch (err) {
        logger.error(`❌ Slack notification failed for feature ${id}: ${err}`);
      }
    });

    logger.info(`Feature ${id} updated successfully by ${userEmail}`);
    return updatedFeature;
  }
}