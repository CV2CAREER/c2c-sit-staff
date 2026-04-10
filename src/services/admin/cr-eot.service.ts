import { getServiceLogger } from "../../utils/createLogger";
import { CREOT } from "../../models/v1/cr-eot.model";
import { CROwner } from "../../models/v1/cr/owner.model";
import { CRTracking } from "../../models/v1/cr-tracking.model";
import { SlackService } from "../slack.service";
import { getEnvironmentFromHost } from "../../utils/slack-helpers";
import { SlackChannel, SlackEventType, SlackNode, SlackProvider, SlackSeverity } from "../../utils/enum";

const logger = getServiceLogger("cr-eot-service");

/**
 * CR EOT Request Service
 * Handles Extension of Time requests for CR Tracking
 */
export class CREOTService {

  /**
   * Get EOT related options (CRs and Owners)
   */
  static async getEOCOptions(variance: string) {
    try {
      if (variance === 'CRs') {
        const crs = await CRTracking.findAll({
          attributes: ['id', 'CRID', 'description'],
          where: { status: 'ACTIVE' },
          raw: true,
          order: [['CRID', 'ASC']]
        });

        logger.info(`✅ EOT CR options loaded successfully`);
        return crs;
      }

      if (variance === 'owners') {
        const owners = await CROwner.findAll({
          attributes: ['id', 'name', 'email', 'slackId', 'role'],
          where: { active: true },
          raw: true,
          order: [['name', 'ASC']]
        });

        logger.info(`✅ EOT Owners options loaded successfully`);
        return owners;
      }

      throw new Error(`Invalid variance parameter: ${variance}`);

    } catch (error: any) {
      logger.error(`❌ Failed to get EOT options: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create new EOT Request and send Slack notification
   */
  static async createEOTRequest(req: any, data: any, user: any) {
    try {
      const host = req.headers.host || req.headers.origin || "localhost";
      
      // Create EOT record
      const eotRequest = await CREOT.create({
        crId: data.CR,
        developerId: data.developer,
        nilId: data.NIL,
        numberOfHours: parseFloat(data.numberOfHours),
        durationStart: data.duration.start,
        durationEnd: data.duration.end,
        note: data.note
      });

      // Fetch related data for notification
      const [cr, developer, nil] = await Promise.all([
        CRTracking.findByPk(data.CR, { raw: true }),
        CROwner.findByPk(data.developer, { raw: true }),
        CROwner.findByPk(data.NIL, { raw: true })
      ]);

      // Send Slack notification
      await this.notifySlack(host, eotRequest, cr, developer, nil, user);

      logger.info(`✅ EOT Request ${eotRequest.id} created by ${user.email}`);
      
      return {
        message: "EOT Request created successfully",
        data: eotRequest.toJSON()
      };

    } catch (error: any) {
      logger.error(`❌ Failed to create EOT Request: ${error.message}`);
      throw error;
    }
  }

  /**
   * Send Slack notification for new EOT Request
   */
  private static async notifySlack(host: string, eot: any, cr: any, developer: any, nil: any, user: any) {
    setImmediate(async () => {
      try {
        const location = getEnvironmentFromHost(host);

        await SlackService.notify({
          location,
          host,
          node: SlackNode.MESSAGING,
          provider: SlackProvider.SYSTEM,
          severity: SlackSeverity.INFO,
          trigger: "EOT Request Created",
          type: SlackEventType.ADMIN_ACTION,
          channel: SlackChannel.CHANGE_REQUESTS,
          teamMentions: "CSM",
          body: `⏱️ *EXTENSION OF TIME REQUEST* ⏱️
• Created by: ${user.email}
• CR: ${cr?.CRID || 'N/A'} - ${cr?.description || 'N/A'}
• Developer: ${developer?.name || 'N/A'}
• Requested Hours: ${eot.numberOfHours} hours
• NIL: ${nil?.name || 'N/A'}
• Period: ${new Date(eot.durationStart).toLocaleString('en-NG', { timeZone: 'Africa/Lagos' })} → ${new Date(eot.durationEnd).toLocaleString('en-NG', { timeZone: 'Africa/Lagos' })}
${eot.note ? `• Note: ${eot.note}` : ''}`.trim(),
        });
      } catch (err) {
        logger.error(`❌ Slack notification failed: ${err}`);
      }
    });
  }
}