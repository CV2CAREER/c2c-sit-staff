import { TrainingTracker } from "../models/v1/training-tracker.model";
import { Session } from "../models/v1/session.model";
import { getServiceLogger } from "../utils/createLogger";
import { SlackService } from "./slack.service";
import { getEnvironmentFromHost } from "../utils/slack-helpers";
import { SlackChannel, SlackEventType, SlackNode, SlackProvider, SlackSeverity } from "../utils/enum";
import { Parser } from 'json2csv';

const logger = getServiceLogger("training-tracker-service");

export class TrainingTrackerService {
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
          trigger: `Training Tracker ${action}`,
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
   * Calculate main assessment score automatically
   */
  static calculateAssessmentScore(data: any): number {
    const fields = [
      "wmtycDecomposition",
      "smeTechnicalDepth",
      "deliverablesQuantification",
      "locationYearroleInTimeExample",
      "selfPronounUsage",
      "businessDeliverables",
      "grammardictioncommunication",
      "personabilitylikeabilityhumor",
      "respectcurtesy",
      "appearance",
    ];

    return fields.reduce((sum, field) => sum + parseInt(data[field] || 0, 10), 0);
  }

  /**
   * Calculate PC assessment score automatically
   */
  static calculatePcAssessmentScore(data: any): number {
    const fields = [
      "pleasantriessmallTalk",
      "sessionObjectives",
      "professionIntroduction",
      "kpiDescriptionWithExamples",
      "cvresumeRendition",
      "respectcourtesyempathyhumility",
      "kpiCollaborativeScoring",
      "recordingAvailabilitySurvey",
      "maximumNumberOfQuestions",
      "complementingpositiveFeedback",
      "clientMultipleGosOnAllQs",
      "timeUtilization",
      "clientStoryResponses",
      "partingQuestions",
      "timeKeeping",
      "fillerPhrases",
      "intermittentClarificationRequest",
      "perfectAlternateResponses",
      "audiovisualRoomLighteningSetup",
    ];

    return fields.reduce((sum, field) => sum + parseInt(data[field] || 0, 10), 0);
  }

  /**
   * Get training trackers with filters
   */
  static async getAll(filters: { sessionId?: string; sessionNumber?: number; isDeleted?: boolean } = {}) {
    try {
      const whereClause: any = {};

      if (filters.sessionId) {
        whereClause.sessionId = filters.sessionId;
      }

      if (typeof filters.sessionNumber === "number") {
        whereClause.sessionNumber = filters.sessionNumber;
      }

      if (typeof filters.isDeleted === 'boolean') {
        whereClause.isDeleted = filters.isDeleted;
      }

      const trackers = await TrainingTracker.findAll({
        where: whereClause,
        include: [
          { association: "user", attributes: ["id", "email", "firstName", "lastName"] },
          { association: "session", attributes: ["id", "number", "name"] },
          { association: "pc", attributes: ["id", "email", "firstName", "lastName"] }
        ],
        order: [["createdAt", "DESC"]],
        raw: false
      });

      logger.info(`✅ Retrieved ${trackers.length} training trackers`);
      return trackers;
    } catch (error: any) {
      logger.error(`❌ Failed to get training trackers: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get single training tracker by ID
   */
  static async getById(id: string) {
    try {
      const tracker = await TrainingTracker.findByPk(id, {
        include: [
          { association: "user", attributes: ["id", "email", "firstName", "lastName"] },
          { association: "session", attributes: ["id", "number", "name"] },
          { association: "pc", attributes: ["id", "email", "firstName", "lastName"] }
        ]
      });

      if (!tracker) {
        throw new Error("Training tracker not found");
      }

      logger.info(`✅ Retrieved training tracker ${id}`);
      return tracker;
    } catch (error: any) {
      logger.error(`❌ Failed to get training tracker: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create new training tracker
   */
  static async create(req: any, data: any, user: any) {
    const host = req.headers.host || req.headers.origin || "localhost";

    try {
      // Check for existing tracker
      const existing = await TrainingTracker.findOne({
        where: {
          fullName: data.fullName,
          ...(typeof data.sessionNumber === "number"
            ? { sessionNumber: data.sessionNumber }
            : data.sessionId
              ? { sessionId: data.sessionId }
              : {}),
        }
      });

      if (existing) {
        throw new Error("Training tracker for this user and session already exists");
      }

      // Auto calculate scores
      data.assessment = this.calculateAssessmentScore(data);
      data.pcAssessment = this.calculatePcAssessmentScore(data);

      const tracker = await TrainingTracker.create({
        ...data,
        createdBy: user.id
      });

      // Send Slack Notification
      const message = `
📝 **Training Tracker Created** 📝
• Created by: ${user.email}
• Candidate: ${tracker.fullName}
• Session: ${tracker.sessionNumber || tracker.sessionId || "N/A"}
• Assessment Score: ${data.assessment}
• PC Assessment Score: ${data.pcAssessment}
      `;
      await this.notifySlack(host, "Created", message, user);

      logger.info(`✅ Training tracker ${tracker.id} created by ${user.email}`);
      return tracker;
    } catch (error: any) {
      logger.error(`❌ Failed to create training tracker: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update training tracker
   */
  static async update(req: any, id: string, updates: any, user: any) {
    const host = req.headers.host || req.headers.origin || "localhost";

    try {
      const tracker = await TrainingTracker.findByPk(id);

      if (!tracker) {
        throw new Error("Training tracker not found");
      }

      // Preserve userId - never allow changing
      updates.userId = tracker.userId;

      // Auto recalculate scores
      updates.assessment = this.calculateAssessmentScore({ ...tracker.toJSON(), ...updates });
      updates.pcAssessment = this.calculatePcAssessmentScore({ ...tracker.toJSON(), ...updates });

      await tracker.update(updates);
      const updatedTracker = await TrainingTracker.findByPk(id);

      // Send Slack Notification
      const changes = Object.entries(updates)
        .filter(([key]) => !['updatedAt', 'assessment', 'pcAssessment'].includes(key))
        .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
        .join("\n• ");

      const message = `
✏️ **Training Tracker Updated** ✏️
• Updated by: ${user.email}
• Tracker ID: ${id}
• Candidate: ${updatedTracker?.fullName}
• New Assessment Score: ${updates.assessment}
• Changes:
• ${changes || "No field changes"}
      `;
      await this.notifySlack(host, "Updated", message, user);

      logger.info(`✅ Training tracker ${id} updated by ${user.email}`);
      return updatedTracker;
    } catch (error: any) {
      logger.error(`❌ Failed to update training tracker: ${error.message}`);
      throw error;
    }
  }

  /**
   * Soft delete training tracker
   */
  static async softDelete(req: any, id: string, user: any) {
    const host = req.headers.host || req.headers.origin || "localhost";

    try {
      const tracker = await TrainingTracker.findByPk(id);

      if (!tracker) {
        throw new Error("Training tracker not found");
      }

      if (tracker.isDeleted) {
        throw new Error("Training tracker is already deleted");
      }

      await tracker.update({
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: user.id
      });

      // Send Slack Notification
      const message = `
🗑️ **Training Tracker Soft Deleted** 🗑️
• Deleted by: ${user.email}
• Tracker ID: ${id}
• Candidate: ${tracker.fullName}
      `;
      await this.notifySlack(host, "Soft Deleted", message, user);

      logger.info(`✅ Training tracker ${id} soft deleted by ${user.email}`);
      return true;
    } catch (error: any) {
      logger.error(`❌ Failed to soft delete training tracker: ${error.message}`);
      throw error;
    }
  }

  /**
   * Restore soft deleted training tracker
   */
  static async restore(req: any, id: string, user: any) {
    const host = req.headers.host || req.headers.origin || "localhost";

    try {
      const tracker = await TrainingTracker.findOne({
        where: { id, isDeleted: true }
      });

      if (!tracker) {
        throw new Error("Deleted training tracker not found");
      }

      await tracker.update({
        isDeleted: false,
        deletedAt: null,
        deletedBy: null
      });

      // Send Slack Notification
      const message = `
🔄 **Training Tracker Restored** 🔄
• Restored by: ${user.email}
• Tracker ID: ${id}
• Candidate: ${tracker.fullName}
      `;
      await this.notifySlack(host, "Restored", message, user);

      logger.info(`✅ Training tracker ${id} restored by ${user.email}`);
      return tracker;
    } catch (error: any) {
      logger.error(`❌ Failed to restore training tracker: ${error.message}`);
      throw error;
    }
  }

  /**
   * Hard delete training tracker
   */
  static async delete(req: any, id: string, user: any) {
    const host = req.headers.host || req.headers.origin || "localhost";

    try {
      const tracker = await TrainingTracker.findByPk(id);

      if (!tracker) {
        throw new Error("Training tracker not found");
      }

      await tracker.destroy();

      // Send Slack Notification
      const message = `
⚠️ **Training Tracker PERMANENTLY Deleted** ⚠️
• Deleted by: ${user.email}
• Tracker ID: ${id}
• Candidate: ${tracker.fullName}
      `;
      await this.notifySlack(host, "Permanently Deleted", message, user);

      logger.info(`✅ Training tracker ${id} permanently deleted by ${user.email}`);
      return true;
    } catch (error: any) {
      logger.error(`❌ Failed to delete training tracker: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get all sessions with client and coach details
   */
  static async getAllSessions(filters: { coachId?: string; clientId?: string; sessionStatus?: string } = {}) {
    try {
      const whereClause: any = {};

      if (filters.coachId) {
        whereClause.coachId = filters.coachId;
      }

      if (filters.clientId) {
        whereClause.clientId = filters.clientId;
      }

      if (filters.sessionStatus) {
        whereClause.sessionStatus = filters.sessionStatus;
      }

      const sessions = await Session.findAll({
        where: whereClause,
        include: [
          { association: "client", attributes: ["id", "email", "firstName", "lastName", "country"] },
          { association: "coach", attributes: ["id", "email", "firstName", "lastName"] }
        ],
        order: [["createdAt", "DESC"]]
      });

      logger.info(`✅ Retrieved ${sessions.length} sessions`);
      return sessions;
    } catch (error: any) {
      logger.error(`❌ Failed to get sessions: ${error.message}`);
      throw error;
    }
  }

  /**
   * Export Training Tracker data as CSV
   * Can filter by sessionId or trackerId
   */
  static async exportToCSV(
    req: any,
    filters: { sessionId?: string; sessionNumber?: number; trackerId?: string } = {},
    user: any
  ): Promise<string> {
    try {
      const host = req.headers.host || req.headers.origin || "localhost";
      
      const whereClause: any = { isDeleted: false };

      if (filters.trackerId) {
        whereClause.id = filters.trackerId;
      }
      if (filters.sessionId) {
        whereClause.sessionId = filters.sessionId;
      }
      if (typeof filters.sessionNumber === "number") {
        whereClause.sessionNumber = filters.sessionNumber;
      }

      const trackers = await TrainingTracker.findAll({
        where: whereClause,
        include: [
          { association: "user", attributes: ["email", "firstName", "lastName"] },
          { association: "session", attributes: ["id", "number", "name"] },
          { association: "pc", attributes: ["email", "firstName", "lastName"] }
        ],
        order: [["createdAt", "DESC"]],
        raw: true,
        nest: true
      });

      // Flatten nested objects for CSV
      const flatData = trackers.map(tracker => ({
        id: tracker.id,
        fullName: tracker.fullName,
        userEmail: tracker.user?.email,
        userFirstName: tracker.user?.firstName,
        userLastName: tracker.user?.lastName,
        sessionId: tracker.session?.id,
        sessionNumber: tracker.sessionNumber ?? (tracker.session as any)?.number,
        sessionName: (tracker.session as any)?.name,
        pcEmail: tracker.pc?.email,
        pcFirstName: tracker.pc?.firstName,
        pcLastName: tracker.pc?.lastName,
        wmtycDecomposition: tracker.wmtycDecomposition,
        smeTechnicalDepth: tracker.smeTechnicalDepth,
        deliverablesQuantification: tracker.deliverablesQuantification,
        locationYearroleInTimeExample: tracker.locationYearroleInTimeExample,
        selfPronounUsage: tracker.selfPronounUsage,
        businessDeliverables: tracker.businessDeliverables,
        grammardictioncommunication: tracker.grammardictioncommunication,
        personabilitylikeabilityhumor: tracker.personabilitylikeabilityhumor,
        respectcurtesy: tracker.respectcurtesy,
        appearance: tracker.appearance,
        assessment: tracker.assessment,
        pleasantriessmallTalk: tracker.pleasantriessmallTalk,
        sessionObjectives: tracker.sessionObjectives,
        professionIntroduction: tracker.professionIntroduction,
        kpiDescriptionWithExamples: tracker.kpiDescriptionWithExamples,
        cvresumeRendition: tracker.cvresumeRendition,
        respectcourtesyempathyhumility: tracker.respectcourtesyempathyhumility,
        kpiCollaborativeScoring: tracker.kpiCollaborativeScoring,
        recordingAvailabilitySurvey: tracker.recordingAvailabilitySurvey,
        maximumNumberOfQuestions: tracker.maximumNumberOfQuestions,
        complementingpositiveFeedback: tracker.complementingpositiveFeedback,
        clientMultipleGosOnAllQs: tracker.clientMultipleGosOnAllQs,
        timeUtilization: tracker.timeUtilization,
        clientStoryResponses: tracker.clientStoryResponses,
        partingQuestions: tracker.partingQuestions,
        timeKeeping: tracker.timeKeeping,
        fillerPhrases: tracker.fillerPhrases,
        intermittentClarificationRequest: tracker.intermittentClarificationRequest,
        perfectAlternateResponses: tracker.perfectAlternateResponses,
        audiovisualRoomLighteningSetup: tracker.audiovisualRoomLighteningSetup,
        pcAssessment: tracker.pcAssessment,
        createdAt: tracker.createdAt,
        updatedAt: tracker.updatedAt
      }));

      const json2csvParser = new Parser();
      const csv = json2csvParser.parse(flatData);

      // Send Slack notification
      const message = `
📊 **Training Tracker EXPORTED** 📊
• Exported by: ${user.email}
• Number of records: ${trackers.length}
${filters.sessionId ? `• Filter: Session ID = ${filters.sessionId}` : ''}
${typeof filters.sessionNumber === "number" ? `• Filter: Session Number = ${filters.sessionNumber}` : ""}
${filters.trackerId ? `• Filter: Tracker ID = ${filters.trackerId}` : ''}
      `;
      await this.notifySlack(host, "Exported", message, user);

      logger.info(`✅ Exported ${trackers.length} training trackers to CSV by ${user.email}`);
      return csv;
    } catch (error: any) {
      logger.error(`❌ Failed to export training trackers to CSV: ${error.message}`);
      throw error;
    }
  }
}
