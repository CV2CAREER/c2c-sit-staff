import { SupportSession } from "../../models/v1/support-session.model";
import { SupportConversation } from "../../models/v1/chat-message.model";
import { getServiceLogger } from "../../utils/createLogger";
import { SlackService } from "../slack.service";
import { getEnvironmentFromHost } from "../../utils/slack-helpers";
import { SlackChannel, SlackEventType, SlackNode, SlackProvider, SlackSeverity } from "../../utils/enum";
import { User } from "../../models/v1/user.model";
import { Message } from "../../models/v1/message.model";
import { fieldEncryption } from "../../utils/field-encryption";
import { literal, QueryTypes } from "sequelize";

const logger = getServiceLogger("support-service");

export class SupportService {

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
          trigger: `Support ${action}`,
          type: SlackEventType.SUPPORT_MESSAGE,
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
   * Create new support session
   */
  static async createSession(data: { customerId?: string; subject?: string }, req: any, user: any): Promise<SupportSession> {
    try {
      const session = await SupportSession.create({
        customerId: data.customerId || user?.id,
        subject: data.subject,
        startedAt: new Date(),
        status: "open"
      });

      logger.info(`✅ Created support session: ${session.id}`);
      return session.toJSON();
    } catch (error: any) {
      logger.error(`❌ Failed to create support session: ${error.message}`);
      throw error;
    }
  }

  /**
   * Send message in support session
   */
  static async sendMessage(
    sessionId: string,
    data: { message: string; feedback?: string },
    req: any,
    user: any
  ): Promise<SupportConversation> {
    try {
      const session = await SupportSession.findByPk(sessionId);

      if (!session) {
        throw new Error("Support session not found");
      }

      const text = typeof data.message === "string" ? data.message.trim() : "";
      if (!text) {
        throw new Error("Message cannot be empty");
      }

      // This is the staff API, so every message here is a staff reply —
      // the sender type is never taken from the request body.
      const message = await SupportConversation.create({
        supportSessionId: sessionId,
        message: text,
        senderType: "staff",
        senderId: user?.id,
        feedback: data.feedback as any
      });

      // Also land the reply in the client's Inbox, so a client who has left
      // the chat still sees it (S.ADM.12.03.IN19.UA02).
      if (session.customerId) {
        try {
          await Message.create({
            userId: session.customerId,
            title: "CVtoCAREER Support replied to your question",
            body: text,
            class: "alert",
          });
        } catch (inboxErr: any) {
          logger.warn(`Support reply saved but Inbox message failed for ${session.customerId}: ${inboxErr.message}`);
        }
      }

      // Send Slack notification
      const host = req.headers.host || req.headers.origin || "localhost";
      const userInfo = user ? `${user.email} (${user.firstName} ${user.lastName})` : 'Anonymous';

      const slackMessage = `
💬 **NEW SUPPORT MESSAGE** 💬
• Session ID: ${sessionId}
• Sender: STAFF - ${userInfo}
• Message: ${text.substring(0, 200)}${text.length > 200 ? '...' : ''}
${data.feedback ? `• Customer Feedback: ${data.feedback}` : ''}
• Timestamp: ${new Date().toISOString()}
      `;
      
      setImmediate(async () => {
        try {
          await this.notifySlack(host, "Message Received", slackMessage, user);
        } catch (err) {
          logger.warn(`Could not send Slack notification: ${err}`);
        }
      });

      // Update session status to active
      if (session.status === "open") {
        await session.update({ status: "active" });
      }

      logger.info(`✅ Message sent to support session: ${sessionId}`);
      return message.toJSON();
    } catch (error: any) {
      logger.error(`❌ Failed to send support message: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get all messages for a session
   */
  static async getSessionMessages(sessionId: string): Promise<SupportConversation[]> {
    try {
      const messages = await SupportConversation.findAll({
        where: { supportSessionId: sessionId },
        include: [{
          model: User,
          as: 'sender',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }],
        order: [['createdAt', 'ASC']],
        raw: true,
        nest: true
      });

      return messages;
    } catch (error: any) {
      logger.error(`❌ Failed to get session messages: ${error.message}`);
      throw error;
    }
  }

  /**
   * Submit customer feedback
   */
  static async submitFeedback(
    sessionId: string,
    feedback: "satisfied" | "not_satisfied" | "neutral",
    comment?: string,
    req?: any,
    user?: any
  ): Promise<SupportSession> {
    try {
      const session = await SupportSession.findByPk(sessionId);
      
      if (!session) {
        throw new Error("Support session not found");
      }

      await session.update({
        feedback,
        feedbackComment: comment,
        status: "resolved",
        closedAt: new Date()
      });

      // Send Slack notification
      if (req) {
        const host = req.headers.host || req.headers.origin || "localhost";
        const userInfo = user ? `${user.email} (${user.firstName} ${user.lastName})` : 'Customer';
        const feedbackEmoji = feedback === "satisfied" ? "✅" : feedback === "not_satisfied" ? "❌" : "⚪";
        
        const slackMessage = `
📝 **CUSTOMER FEEDBACK SUBMITTED** 📝
• Session ID: ${sessionId}
• User: ${userInfo}
• Feedback: ${feedbackEmoji} ${feedback.toUpperCase()}
${comment ? `• Comment: ${comment}` : ''}
• Status: Session RESOLVED
• Timestamp: ${new Date().toISOString()}
        `;
        
        setImmediate(async () => {
          try {
            await this.notifySlack(host, "Feedback Received", slackMessage, user);
          } catch (err) {
            logger.warn(`Could not send Slack notification: ${err}`);
          }
        });
      }

      logger.info(`✅ Feedback submitted for session: ${sessionId}`);
      return session.toJSON();
    } catch (error: any) {
      logger.error(`❌ Failed to submit feedback: ${error.message}`);
      throw error;
    }
  }

  /**
   * Assign staff to session
   */
  static async assignStaff(sessionId: string, staffId: string, req?: any, user?: any): Promise<SupportSession> {
    try {
      const session = await SupportSession.findByPk(sessionId);
      
      if (!session) {
        throw new Error("Support session not found");
      }

      await session.update({
        assignedStaffId: staffId,
        status: "active"
      });

      // Send Slack notification
      if (req) {
        const host = req.headers.host || req.headers.origin || "localhost";
        const assignedBy = user ? `${user.email} (${user.firstName} ${user.lastName})` : 'System';
        
        
        
        setImmediate(async () => {
          try {
            const staffUser = await User.findByPk(staffId, { attributes: ['firstName', 'lastName', 'email'] });
            const staffInfo = staffUser ? `${staffUser.email} (${staffUser.firstName} ${staffUser.lastName})` : staffId;

            const slackMessage = `
👤 **STAFF ASSIGNED TO SUPPORT SESSION** 👤
• Session ID: ${sessionId}
• Assigned By: ${assignedBy}
• Assigned Staff: ${staffInfo}
• Status: Session ACTIVATED
• Timestamp: ${new Date().toISOString()}
            `;

            await this.notifySlack(host, "Staff Assigned", slackMessage, user);
          } catch (err) {
            logger.warn(`Could not send Slack notification: ${err}`);
          }
        });
      }

      logger.info(`✅ Staff ${staffId} assigned to session: ${sessionId}`);
      return session.toJSON();
    } catch (error: any) {
      logger.error(`❌ Failed to assign staff: ${error.message}`);
      throw error;
    }
  }

  /**
   * End/Close support session
   */
  static async endSession(sessionId: string, req?: any, user?: any): Promise<SupportSession> {
    try {
      const session = await SupportSession.findByPk(sessionId);
      
      if (!session) {
        throw new Error("Support session not found");
      }

      await session.update({
        status: "closed",
        closedAt: new Date()
      });

      // Send Slack notification
      if (req) {
        const host = req.headers.host || req.headers.origin || "localhost";
        const closedBy = user ? `${user.email} (${user.firstName} ${user.lastName})` : 'System';
        
        const slackMessage = `
🔒 **SUPPORT SESSION CLOSED** 🔒
• Session ID: ${sessionId}
• Closed By: ${closedBy}
• Status: Session CLOSED
• Timestamp: ${new Date().toISOString()}
        `;
        
        setImmediate(async () => {
          try {
            await this.notifySlack(host, "Session Closed", slackMessage, user);
          } catch (err) {
            logger.warn(`Could not send Slack notification: ${err}`);
          }
        });
      }

      logger.info(`✅ Support session closed: ${sessionId}`);
      return session.toJSON();
    } catch (error: any) {
      logger.error(`❌ Failed to close session: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get all support sessions
   */
  static async getAllSessions(page: number = 1, limit: number = 20): Promise<{ data: any[]; total: number }> {
    try {
      const offset = (page - 1) * limit;

      // Latest activity first — the newest message, falling back to when the
      // session was opened for sessions with no messages yet.
      const lastActivity = literal(`COALESCE(
        (SELECT MAX(c."createdAt") FROM support_conversations c WHERE c."supportSessionId" = "SupportSession"."id"),
        "SupportSession"."createdAt"
      )`);

      const { rows, count } = await SupportSession.findAndCountAll({
        include: [
          { model: User, as: 'customer', attributes: ['id', 'firstName', 'lastName'] },
          { model: User, as: 'assignedStaff', attributes: ['id', 'firstName', 'lastName'] }
        ],
        order: [[lastActivity, 'DESC']],
        limit,
        offset,
        raw: true,
        nest: true
      });

      const sessionIds = rows.map((row: any) => row.id);
      const customerIds = [...new Set(rows.map((row: any) => row.customerId).filter(Boolean))] as string[];

      // Last message per session (preview + whether the client is waiting on us).
      const [lastMessages, emails] = await Promise.all([
        sessionIds.length
          ? (SupportConversation.sequelize!.query(
              `SELECT DISTINCT ON ("supportSessionId") "supportSessionId", message, "senderType", "createdAt"
                 FROM support_conversations
                WHERE "supportSessionId" IN (:sessionIds)
                ORDER BY "supportSessionId", "createdAt" DESC`,
              { replacements: { sessionIds }, type: QueryTypes.SELECT },
            ) as Promise<any[]>)
          : Promise.resolve([] as any[]),
        // Email is encrypted at rest; raw includes don't run the decrypt hook.
        customerIds.length
          ? fieldEncryption.getDecryptedUsersBatch(customerIds).catch(() => new Map())
          : Promise.resolve(new Map()),
      ]);

      const lastBySession = new Map(lastMessages.map((m: any) => [m.supportSessionId, m]));

      const data = rows.map((row: any) => {
        const last = lastBySession.get(row.id);
        return {
          ...row,
          customer: row.customer?.id
            ? { ...row.customer, email: emails.get(row.customer.id)?.email ?? null }
            : null,
          lastMessage: last
            ? { message: last.message, senderType: last.senderType, createdAt: last.createdAt }
            : null,
        };
      });

      return { data, total: count };
    } catch (error: any) {
      logger.error(`❌ Failed to get sessions: ${error.message}`);
      throw error;
    }
  }
}