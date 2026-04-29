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
          attributes: ['id', 'changeRequestId', 'description'],
          where: { isDeleted: false },
          raw: true,
          order: [['createdAt', 'DESC']]
        });

        logger.info(`✅ EOT CR options loaded successfully`);
        return crs.map((row: any) => ({
          _id: row.id,
          id: row.changeRequestId || row.id,
          description: row.description || "",
        }));
      }

      if (variance === 'owners') {
        const owners = await CROwner.findAll({
          attributes: ['id', 'name', 'email', 'slackId', 'role'],
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
   * Get EOT requests list
   */
  static async getEOTRequests(filters: { active?: boolean; recycle?: boolean } = {}) {
    try {
      const requests = await CREOT.findAll({
        order: [["createdAt", "DESC"]],
        raw: true,
      });

      if (!requests.length) {
        return [];
      }

      const crIds = [...new Set(requests.map((row: any) => row.crId).filter(Boolean))];
      const ownerIds = [
        ...new Set(
          requests
            .flatMap((row: any) => [row.developerId, row.nilId])
            .filter(Boolean),
        ),
      ];

      const [crRows, ownerRows] = await Promise.all([
        CRTracking.findAll({
          where: { id: crIds },
          attributes: ["id", "changeRequestId", "description", "isDeleted"],
          raw: true,
        }),
        CROwner.findAll({
          where: { id: ownerIds },
          attributes: ["id", "name", "email", "role", "slackId"],
          raw: true,
        }),
      ]);

      const crMap = new Map(crRows.map((row: any) => [row.id, row]));
      const ownerMap = new Map(ownerRows.map((row: any) => [row.id, row]));

      const rows = requests
        .map((request: any) => {
          const cr = crMap.get(request.crId);
          if (filters.active && cr?.isDeleted) return null;
          if (filters.recycle && !cr?.isDeleted) return null;

          const developer = ownerMap.get(request.developerId);
          const nil = ownerMap.get(request.nilId);

          return {
            _id: request.id,
            numberOfHours: Number(request.numberOfHours),
            duration: {
              start: request.durationStart,
              end: request.durationEnd,
            },
            note: request.note,
            createdAt: request.createdAt,
            updatedAt: request.updatedAt,
            CR: cr
              ? {
                  _id: cr.id,
                  id: cr.changeRequestId || cr.id,
                  description: cr.description,
                }
              : null,
            developer: developer ? { _id: developer.id, ...developer } : null,
            NIL: nil ? { _id: nil.id, ...nil } : null,
          };
        })
        .filter(Boolean);

      logger.info(`âœ… EOT requests loaded successfully (${rows.length})`);
      return rows;
    } catch (error: any) {
      logger.error(`âŒ Failed to get EOT requests: ${error.message}`);
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
• CR: ${cr?.changeRequestId || cr?.id || 'N/A'} - ${cr?.description || 'N/A'}
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
