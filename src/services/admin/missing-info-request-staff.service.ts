import crypto from "crypto";
import { Op } from "sequelize";
import ErrorHandler from "@/utils/errorHandler";
import { MissingInfoRequest } from "@/models/v1/missing-info-request.model";
import { MissingInfoTemplate } from "@/models/v1/missing-info-template.model";
import { MissingInfoTemplateField } from "@/models/v1/missing-info-template-field.model";
import { User } from "@/models/v1/user.model";
import { getServiceLogger } from "@/utils/createLogger";
import { sendMail } from "@/config/sendGrid";
import { CLIENT_APP_DOMAIN, TEAM_EMAIL } from "@/config/env";
import { JustCallTriggerService } from "@/services/justcall.service";
import { SlackService } from "@/services/slack.service";
import { auditTrailApplicationService } from "./audit-trail.application.service";
import {
  SlackChannel,
  SlackEventType,
  SlackNode,
  SlackProvider,
  SlackSeverity,
} from "@/utils/enum";
import path from "path";

const logger = getServiceLogger("missing-info-request-staff-service");
const mailDirectory = path.resolve(__dirname, "../../views/emails");

export class MissingInfoRequestStaffService {
  static async sendRequest(
    data: {
      clientId: string;
      templateId: string;
      jobApplicationId?: string;
      personalMessage?: string;
      channel: "email" | "whatsapp";
    },
    user: any,
  ) {
    const template = await MissingInfoTemplate.findByPk(data.templateId, {
      include: [{ model: MissingInfoTemplateField, as: "fields" }],
    });

    if (!template) {
      throw new ErrorHandler("Template not found", 404);
    }

    if (template.status !== "published") {
      throw new ErrorHandler("Only published templates can be sent", 409);
    }

    const fields = (template as any).fields;
    if (!fields || fields.length === 0) {
      throw new ErrorHandler("Template has no fields", 400);
    }

    const client = await User.findByPk(data.clientId);
    if (!client) {
      throw new ErrorHandler("Client not found", 404);
    }

    if (data.channel === "whatsapp" && !client.whatsappNumber) {
      throw new ErrorHandler("Client has no WhatsApp number on file", 400);
    }

    const token = crypto.randomUUID();
    const updateMissingInfoUrl = `${CLIENT_APP_DOMAIN}/missing-info/${token}/disclaimer`;
    const staffName = user?.firstName
      ? `${user.firstName} ${user.lastName || ""}`.trim()
      : "Unknown";

    const request = await MissingInfoRequest.create({
      targetUserId: data.clientId,
      requestedById: user?.id || user?.userId || "unknown",
      requestedByName: staffName,
      missingInfoType: "referral_information",
      missingInfoUrl: updateMissingInfoUrl,
      jobURL: data.jobApplicationId || null,
      templateId: data.templateId,
      token,
      status: "pending",
      channel: data.channel,
      personalMessage: data.personalMessage || null,
      jobApplicationId: data.jobApplicationId || null,
    });

    setImmediate(async () => {
      try {
        if (data.channel === "email") {
          const fieldLabels = fields
            .filter((f: any) => f.isVisible)
            .map((f: any) => f.fieldLabel)
            .join(", ");

          await Promise.allSettled([
            sendMail({
              email: client.email,
              subject: `Action Required: Information needed for your application`,
              templateName: "client-missing-info-v2.ejs",
              templateData: {
                name: client.firstName || "there",
                templateName: template.name,
                fieldLabels,
                refereeCount: template.type === "referee_block"
                  ? Math.max(...fields.map((f: any) => f.refereeBlockIndex || 0))
                  : null,
                personalMessage: data.personalMessage || null,
                updateMissingInfoUrl,
                currentYear: new Date().getFullYear(),
              },
            }),
            sendMail({
              email: TEAM_EMAIL,
              subject: `Missing Info Request Sent — ${client.firstName} ${client.lastName || ""}`,
              templateName: "admin-missing-info-v2.ejs",
              templateData: {
                clientName: `${client.firstName || ""} ${client.lastName || ""}`.trim(),
                clientEmail: client.email,
                templateName: template.name,
                category: template.category.replace(/_/g, " "),
                fieldCount: fields.length,
                updateMissingInfoUrl,
                triggeredBy: staffName,
                channel: "email",
                currentYear: new Date().getFullYear(),
              },
            }),
          ]);
        }

        if (data.channel === "whatsapp") {
          await JustCallTriggerService.sendMsg({
            action: "notify-missing-info",
            payload: {
              name: client.firstName,
              phone: (client.whatsappNumber ?? "").replace("+", ""),
            },
          });
        }

        await SlackService.notify({
          node: SlackNode.USER_MANAGEMENT,
          provider: SlackProvider.SENDGRID,
          severity: SlackSeverity.INFO,
          type: SlackEventType.MISSING_INFO_SENT,
          channel: SlackChannel.TOWN_CRIER,
          teamMentions: "CSM",
          trigger: staffName,
          body: [
            `RC follow-up — ${client.firstName} ${client.lastName || ""} was sent "${template.name}" via ${data.channel === "whatsapp" ? "WhatsApp" : "Email"}.`,
            `Please confirm delivery and follow up if unopened after 48h.`,
          ].join("\n"),
        });

        await auditTrailApplicationService.log({
          action: "missing_info_request.sent",
          actorUserId: user?.id || user?.userId || "unknown",
          targetType: "MissingInfoRequest",
          targetKey: request.id,
          after: {
            clientId: data.clientId,
            templateId: data.templateId,
            channel: data.channel,
          },
          metadata: {
            templateName: template.name,
            clientName: `${client.firstName || ""} ${client.lastName || ""}`.trim(),
          },
        });

        if (TEAM_EMAIL) {
          const fieldCount = fields.filter((f: any) => f.isVisible).length;
          await sendMail({
            email: TEAM_EMAIL,
            subject: `Delivery confirmed: Missing info request sent to ${client.firstName || ""} ${client.lastName || ""}`,
            templateName: "missing-info-delivery-report.ejs",
            templateData: {
              clientName: `${client.firstName || ""} ${client.lastName || ""}`.trim(),
              channel: data.channel === "whatsapp" ? "WhatsApp" : "Email",
              templateName: template.name,
              fieldCount,
              sentAt: new Date().toLocaleString("en-AU", { dateStyle: "medium", timeStyle: "short" }),
              sentBy: staffName,
              requestUrl: updateMissingInfoUrl,
              currentYear: new Date().getFullYear(),
            },
          });
        }
      } catch (err) {
        logger.error("Background notification failed for sendRequest:", err);
      }
    });

    return {
      id: request.id,
      token,
      clientId: data.clientId,
      templateId: data.templateId,
      channel: data.channel,
      updateMissingInfoUrl,
      notifiedAt: new Date().toISOString(),
    };
  }

  static async getOutstandingRequests(filters?: {
    status?: string;
    age?: string;
    page?: number;
    limit?: number;
  }) {
    const where: any = {};
    if (filters?.status) {
      where.status = filters.status;
    } else {
      where.status = { [Op.in]: ["pending", "viewed", "in_progress"] };
    }

    const page = filters?.page || 1;
    const limit = filters?.limit || 50;
    const offset = (page - 1) * limit;

    const { rows, count } = await MissingInfoRequest.findAndCountAll({
      where,
      include: [
        { model: User, as: "targetUser", attributes: ["id", "firstName", "lastName", "email", "whatsappNumber"] },
        { model: MissingInfoTemplate, attributes: ["id", "name"] },
      ],
      order: [["createdAt", "DESC"]],
      limit,
      offset,
    });

    const requests = rows.map((req: any) => {
      const createdAt = new Date(req.createdAt);
      const now = new Date();
      const ageDays = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));

      return {
        id: req.id,
        clientName: `${req.targetUser?.firstName || ""} ${req.targetUser?.lastName || ""}`.trim(),
        clientEmail: req.targetUser?.email,
        channel: req.channel,
        templateId: req.templateId,
        templateName: req.template?.name,
        status: req.status,
        reminderCount: req.reminderCount,
        createdAt: req.createdAt,
        ageDays,
        requestedByName: req.requestedByName,
      };
    });

    return {
      requests,
      pagination: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit),
      },
    };
  }

  static async getRequestStats() {
    const [all, templateCount] = await Promise.all([
      MissingInfoRequest.findAll({
        attributes: ["status"],
      }),
      MissingInfoTemplate.count({ where: { status: "published" } }),
    ]);

    const stats = {
      pending: 0,
      viewed: 0,
      in_progress: 0,
      submitted: 0,
      total: all.length,
      templateCount,
    };

    all.forEach((req: any) => {
      if (req.status in stats) {
        (stats as any)[req.status]++;
      }
    });

    return stats;
  }

  static async bulkSendReminder(requestIds: string[], user: any) {
    if (!requestIds || requestIds.length === 0) {
      throw new ErrorHandler("No request IDs provided", 400);
    }

    const requests = await MissingInfoRequest.findAll({
      where: { id: requestIds },
      include: [
        { model: User, as: "targetUser", attributes: ["id", "firstName", "lastName", "email", "whatsappNumber"] },
        { model: MissingInfoTemplate, as: "template", attributes: ["id", "name"] },
      ],
    });

    if (requests.length === 0) {
      throw new ErrorHandler("No valid requests found", 404);
    }

    const BATCH_SIZE = 50;
    const BATCH_DELAY_MS = 2000;
    const batches: any[][] = [];
    for (let i = 0; i < requests.length; i += BATCH_SIZE) {
      batches.push(requests.slice(i, i + BATCH_SIZE));
    }

    const staffName = user?.firstName
      ? `${user.firstName} ${user.lastName || ""}`.trim()
      : "Unknown";

    let totalProcessed = 0;

    setImmediate(async () => {
      for (const batch of batches) {
        const results = await Promise.allSettled(
          batch.map(async (req: any) => {
            await req.update({
              reminderCount: req.reminderCount + 1,
              lastReminderAt: new Date(),
            });

            if (req.channel === "whatsapp" && req.targetUser?.whatsappNumber) {
              await JustCallTriggerService.sendMsg({
                action: "notify-missing-info",
                payload: {
                  name: req.targetUser.firstName,
                  phone: (req.targetUser.whatsappNumber ?? "").replace("+", ""),
                },
              });
            }

            if (req.channel === "email" && req.targetUser?.email) {
              await sendMail({
                email: req.targetUser.email,
                subject: `Reminder: Information needed for your application`,
                templateName: "client-missing-info-v2.ejs",
                templateData: {
                  name: req.targetUser.firstName || "there",
                  templateName: req.template?.name || "Missing Information",
                  fieldLabels: "",
                  refereeCount: null,
                  personalMessage: null,
                  updateMissingInfoUrl: req.missingInfoUrl,
                  currentYear: new Date().getFullYear(),
                },
              });
            }

            totalProcessed++;
          }),
        );

        const failed = results.filter((r) => r.status === "rejected");
        if (failed.length > 0) {
          logger.error(`Batch reminder: ${failed.length} failed`, failed);
        }

        if (batches.indexOf(batch) < batches.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS));
        }
      }

      const clientSummaries = requests.map((req: any) => {
        const name = `${req.targetUser?.firstName || ""} ${req.targetUser?.lastName || ""}`.trim();
        const channels = [req.channel];
        return `${name} (${channels.join(" + ")})`;
      });

      try {
        await SlackService.notify({
          node: SlackNode.USER_MANAGEMENT,
          provider: SlackProvider.SENDGRID,
          severity: SlackSeverity.INFO,
          type: SlackEventType.MISSING_INFO_BULK_REMINDER,
          channel: SlackChannel.TOWN_CRIER,
          teamMentions: "CSM",
          trigger: staffName,
          body: [
            `RC follow-up — Reminder sent to ${clientSummaries.join(", ")}.`,
            `${totalProcessed} clients, ${totalProcessed} templates. Please confirm delivery.`,
          ].join("\n"),
        });

        await auditTrailApplicationService.log({
          action: "missing_info_request.bulk_reminder_sent",
          actorUserId: user?.id || user?.userId || "unknown",
          targetType: "MissingInfoRequest",
          metadata: {
            requestIds,
            totalProcessed,
            clientNames: clientSummaries,
          },
        });
      } catch (err) {
        logger.error("Background notification failed for bulk reminder:", err);
      }
    });

    return {
      totalRequested: requestIds.length,
      totalProcessing: requests.length,
      message: "Reminders are being processed in the background.",
    };
  }
}
