import crypto from "crypto";
import { Op } from "sequelize";
import ErrorHandler from "@/utils/errorHandler";
import { MissingInfoRequest } from "@/models/v1/missing-info-request.model";
import { MissingInfoResponse } from "@/models/v1/missing-info-response.model";
import { MissingInfoTemplate } from "@/models/v1/missing-info-template.model";
import { MissingInfoTemplateField } from "@/models/v1/missing-info-template-field.model";
import { User } from "@/models/v1/user.model";
import { getServiceLogger } from "@/utils/createLogger";
import { sendMail } from "@/config/sendGrid";
import { CLIENT_APP_DOMAIN, TEAM_EMAIL } from "@/config/env";
import { JustCallTriggerService } from "@/services/justcall.service";
import { SlackService } from "@/services/slack.service";
import { fieldEncryption } from "@/utils/field-encryption";
import { composeExternalActionEmailBody, getExternalActionConfig } from "@/utils/external-action";
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
    host?: string,
    protocol?: string,
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

    // SPR-21-52: an External Action block supplies the email subject and body. Everything
    // else about the email (the existing client-missing-info-v2 template) is unchanged.
    const externalAction = getExternalActionConfig(fields);

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
      // The form's "Linked to job application" value is a URL and is kept in full in
      // jobURL (text). jobApplicationId is varchar(255) and nothing reads it, so a
      // long link must not be copied there (SPR-21-58-002: "value too long").
      jobApplicationId: null,
    });

    setImmediate(async () => {
      try {
        if (data.channel === "email") {
          let clientEmail = client.email as string | null | undefined;

          if (!clientEmail) {
            try {
              const decrypted = await fieldEncryption.getDecryptedUsersBatch([data.clientId]);
              const contact = decrypted.get(data.clientId);
              if (contact?.email) {
                clientEmail = contact.email;
                logger.info(`Initial send: resolved email via field_encryption fallback for ${data.clientId}`);
              }
            } catch (decErr: any) {
              logger.warn(`Initial send: field_encryption fallback failed for ${data.clientId}: ${decErr?.message || decErr}`);
            }
          }

          if (!clientEmail) {
            logger.error(
              `Initial send email skipped for client ${data.clientId} — no resolvable email found`,
            );
          } else {
            const fieldLabels = fields
              .filter((f: any) => f.isVisible)
              .map((f: any) => f.fieldLabel)
              .join(", ");

            await Promise.allSettled([
              sendMail({
                email: clientEmail,
                subject:
                  externalAction?.emailSubject ||
                  `Action Required: Information needed for your application`,
                templateName: "client-missing-info-v2.ejs",
                templateData: {
                  name: client.firstName || "there",
                  templateName: template.name,
                  fieldLabels,
                  refereeCount: template.type === "referee_block"
                    ? Math.max(...fields.map((f: any) => f.refereeBlockIndex || 0))
                    : null,
                  personalMessage: data.personalMessage || (externalAction ? composeExternalActionEmailBody(externalAction) : null) || null,
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
                  clientEmail: clientEmail,
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
          ...(host ? { host } : {}),
          ...(protocol ? { protocol } : {}),
          body: [
            `CSC follow-up — ${client.firstName} ${client.lastName || ""} was sent "${template.name}" via ${data.channel === "whatsapp" ? "WhatsApp" : "Email"} by ${staffName}.`,
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
        { model: User, as: "targetUser", attributes: ["id", "firstName", "lastName", "email"] },
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

  static async getRequestResponses(requestId: string) {
    const request = await MissingInfoRequest.findByPk(requestId, {
      include: [
        { model: User, as: "targetUser", attributes: ["id", "firstName", "lastName", "email"] },
        { model: MissingInfoTemplate, attributes: ["id", "name", "type"],
          include: [{ model: MissingInfoTemplateField, as: "fields" }] },
      ],
    });

    if (!request) {
      throw new ErrorHandler("Request not found", 404);
    }

    const responses = await MissingInfoResponse.findAll({
      where: { requestId },
      order: [["createdAt", "ASC"]],
    });

    const template = (request as any).template;
    const templateFields = template?.fields || [];

    const fieldMap = new Map<string, { fieldLabel: string; fieldType: string; isRefereeBlock: boolean; refereeBlockIndex: number | null }>();
    for (const f of templateFields) {
      fieldMap.set(f.id, {
        fieldLabel: f.fieldLabel,
        fieldType: f.fieldType,
        isRefereeBlock: f.isRefereeBlock ?? false,
        refereeBlockIndex: f.refereeBlockIndex ?? null,
      });
    }

    const formattedResponses = responses.map((r: any) => {
      const fieldInfo = fieldMap.get(r.fieldId) || { fieldLabel: r.fieldLabel || r.fieldName || "Unknown", fieldType: "text", isRefereeBlock: false, refereeBlockIndex: null };
      return {
        id: r.id,
        fieldId: r.fieldId,
        fieldName: r.fieldName,
        fieldLabel: fieldInfo.fieldLabel,
        fieldType: fieldInfo.fieldType,
        isRefereeBlock: fieldInfo.isRefereeBlock,
        refereeBlockIndex: fieldInfo.refereeBlockIndex,
        fieldValue: r.fieldValue,
        createdAt: r.createdAt,
      };
    });

    return {
      request: {
        id: request.id,
        token: request.token,
        status: request.status,
        channel: request.channel,
        personalMessage: request.personalMessage,
        requestedAt: request.requestedAt,
        requestedByName: request.requestedByName,
        template: template ? { id: template.id, name: template.name, type: template.type } : null,
        client: (request as any).targetUser
          ? {
              id: (request as any).targetUser.id,
              name: `${(request as any).targetUser.firstName || ""} ${(request as any).targetUser.lastName || ""}`.trim(),
              email: (request as any).targetUser.email,
            }
          : null,
      },
      responses: formattedResponses,
    };
  }

  static async bulkSendReminder(requestIds: string[], user: any, host?: string, protocol?: string) {
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

    // SPR-21-52: templates with an External Action block remind with that block's subject/body.
    // Selected by template id and filtered in memory, so it is safe on a database that does not
    // know the 'external_action' enum value yet.
    const externalActionByTemplate = new Map<string, ReturnType<typeof getExternalActionConfig>>();
    try {
      const templateIds = [...new Set(requests.map((r: any) => r.templateId).filter(Boolean))] as string[];
      if (templateIds.length > 0) {
        const templateFields = await MissingInfoTemplateField.findAll({
          where: { templateId: templateIds },
          attributes: ["templateId", "fieldType", "options"],
          raw: true,
        });
        for (const templateId of templateIds) {
          const cfg = getExternalActionConfig(
            (templateFields as any[]).filter((f) => f.templateId === templateId),
          );
          if (cfg) externalActionByTemplate.set(templateId, cfg);
        }
      }
    } catch (cfgErr: any) {
      logger.warn(`Bulk reminder: could not load External Action settings: ${cfgErr?.message || cfgErr}`);
    }

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

            let bulkEmail = req.targetUser?.email as string | null | undefined;

            if (req.channel === "email" && !bulkEmail) {
              try {
                const decrypted = await fieldEncryption.getDecryptedUsersBatch([req.targetUserId]);
                const contact = decrypted.get(req.targetUserId);
                if (contact?.email) {
                  bulkEmail = contact.email;
                  logger.info(`Bulk reminder: resolved email via field_encryption fallback for ${req.targetUserId}`);
                }
              } catch (decErr: any) {
                logger.warn(`Bulk reminder: field_encryption fallback failed for ${req.targetUserId}: ${decErr?.message || decErr}`);
              }
            }

            if (req.channel === "email" && bulkEmail) {
              const externalAction = externalActionByTemplate.get(req.templateId);
              await sendMail({
                email: bulkEmail,
                subject: externalAction?.emailSubject
                  ? `Reminder: ${externalAction.emailSubject}`
                  : `Reminder: Information needed for your application`,
                templateName: "client-missing-info-v2.ejs",
                templateData: {
                  name: req.targetUser?.firstName || "there",
                  templateName: req.template?.name || "Missing Information",
                  fieldLabels: "",
                  refereeCount: null,
                  personalMessage: (externalAction ? composeExternalActionEmailBody(externalAction) : null) || null,
                  updateMissingInfoUrl: req.missingInfoUrl,
                  currentYear: new Date().getFullYear(),
                },
              });
            } else if (req.channel === "email" && !bulkEmail) {
              logger.warn(
                `Bulk reminder email skipped for request ${req.id} — target user ${req.targetUserId} has no resolvable email`,
              );
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
          ...(host ? { host } : {}),
          ...(protocol ? { protocol } : {}),
          body: [
            `CSC follow-up — Reminder sent to ${clientSummaries.join(", ")} by ${staffName}.`,
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

  static async getClientRequests(targetUserId: string) {
    const { rows } = await MissingInfoRequest.findAndCountAll({
      where: { targetUserId },
      include: [
        { model: MissingInfoTemplate, attributes: ["id", "name", "category", "type"] },
      ],
      order: [["createdAt", "DESC"]],
      limit: 500,
    });

    const requestIds = rows.map((r) => r.id);
    const counts: Record<string, number> = {};
    if (requestIds.length > 0) {
      const responseRows = await MissingInfoResponse.findAll({
        where: { requestId: requestIds },
        attributes: ["requestId"],
      });
      for (const rr of responseRows) {
        counts[rr.requestId] = (counts[rr.requestId] || 0) + 1;
      }
    }

    const now = new Date();
    return rows.map((req: any) => {
      const createdAt = new Date(req.createdAt);
      const ageDays = Math.max(0, Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)));
      return {
        id: req.id,
        token: req.token,
        missingInfoType: req.missingInfoType,
        templateId: req.templateId,
        templateName: req.template?.name ?? null,
        templateCategory: req.template?.category ?? null,
        templateType: req.template?.type ?? null,
        status: req.status,
        channel: req.channel,
        requestedById: req.requestedById,
        requestedByName: req.requestedByName,
        requestedAt: req.requestedAt,
        createdAt: req.createdAt,
        fulfilledAt: req.fulfilledAt ?? null,
        ageDays,
        reminderCount: req.reminderCount ?? 0,
        lastReminderAt: req.lastReminderAt ?? null,
        reusedFromRequestId: req.reusedFromRequestId ?? null,
        responseCount: counts[req.id] || 0,
      };
    });
  }

  static async cancelRequest(id: string, user: any, host?: string, protocol?: string) {
    const request = await MissingInfoRequest.findByPk(id, {
      include: [
        { model: User, as: "targetUser", attributes: ["id", "firstName", "lastName", "email"] },
        { model: MissingInfoTemplate, attributes: ["id", "name"] },
      ],
    });

    if (!request) {
      throw new ErrorHandler("Request not found", 404);
    }

    if (!["pending", "viewed", "in_progress"].includes(request.status)) {
      throw new ErrorHandler("Only open requests can be cancelled", 409);
    }

    await request.update({ status: "cancelled" });

    const staffName = user?.firstName ? `${user.firstName} ${user.lastName || ""}`.trim() : "Unknown";
    const clientName = `${(request as any).targetUser?.firstName || ""} ${(request as any).targetUser?.lastName || ""}`.trim();
    const templateName = (request as any).template?.name ?? null;

    setImmediate(async () => {
      try {
        await SlackService.notify({
          node: SlackNode.USER_MANAGEMENT,
          provider: SlackProvider.SYSTEM,
          severity: SlackSeverity.INFO,
          type: SlackEventType.MISSING_INFO_CANCELLED,
          channel: SlackChannel.TOWN_CRIER,
          teamMentions: "CSM",
          trigger: staffName,
          ...(host ? { host } : {}),
          ...(protocol ? { protocol } : {}),
          body: [
            `Missing info request cancelled — ${clientName} (${templateName || request.missingInfoType}).`,
            `Cancelled by ${staffName}. No further action needed.`,
          ].join("\n"),
        });

        await auditTrailApplicationService.log({
          action: "missing_info_request.cancelled",
          actorUserId: user?.id || user?.userId || "unknown",
          targetType: "MissingInfoRequest",
          targetKey: request.id,
          after: { status: "cancelled" },
          metadata: { clientName, templateName, cancelledBy: staffName },
        });
      } catch (err) {
        logger.error("Background notification failed for cancelRequest:", err);
      }
    });

    return { id: request.id, status: "cancelled" };
  }

  static async declineRequest(id: string, user: any, host?: string, protocol?: string) {
    const request = await MissingInfoRequest.findByPk(id, {
      include: [
        { model: User, as: "targetUser", attributes: ["id", "firstName", "lastName", "email"] },
        { model: MissingInfoTemplate, attributes: ["id", "name", "category"] },
      ],
    });

    if (!request) {
      throw new ErrorHandler("Request not found", 404);
    }

    if (!["pending", "viewed", "in_progress"].includes(request.status)) {
      throw new ErrorHandler("Only open requests can be declined", 409);
    }

    await request.update({ status: "declined" });

    const staffName = user?.firstName ? `${user.firstName} ${user.lastName || ""}`.trim() : "Unknown";
    const clientName = `${(request as any).targetUser?.firstName || ""} ${(request as any).targetUser?.lastName || ""}`.trim();
    const templateName = (request as any).template?.name ?? null;
    const clientEmail = (request as any).targetUser?.email ?? null;

    setImmediate(async () => {
      try {
        await SlackService.notify({
          node: SlackNode.USER_MANAGEMENT,
          provider: SlackProvider.SYSTEM,
          severity: SlackSeverity.INFO,
          type: SlackEventType.MISSING_INFO_DECLINED,
          channel: SlackChannel.TOWN_CRIER,
          teamMentions: "CSM",
          trigger: staffName,
          ...(host ? { host } : {}),
          ...(protocol ? { protocol } : {}),
          body: [
            `Missing info request declined — ${clientName} (${templateName || request.missingInfoType}).`,
            `The client chose not to provide this. Staff have been notified.`,
          ].join("\n"),
        });

        if (TEAM_EMAIL) {
          await sendMail({
            email: TEAM_EMAIL,
            subject: `Client declined a missing info request — ${clientName}`,
            templateName: "admin-missing-info-v2.ejs",
            templateData: {
              clientName,
              clientEmail: clientEmail || "—",
              templateName: templateName || "Missing Information",
              category: (request as any).template?.category?.replace(/_/g, " ") || "—",
              fieldCount: 0,
              updateMissingInfoUrl: request.missingInfoUrl || "—",
              triggeredBy: staffName,
              channel: "declined",
              currentYear: new Date().getFullYear(),
            },
          });
        }

        await auditTrailApplicationService.log({
          action: "missing_info_request.declined",
          actorUserId: user?.id || user?.userId || "unknown",
          targetType: "MissingInfoRequest",
          targetKey: request.id,
          after: { status: "declined" },
          metadata: { clientName, templateName, declinedBy: staffName },
        });
      } catch (err) {
        logger.error("Background notification failed for declineRequest:", err);
      }
    });

    return { id: request.id, status: "declined" };
  }

  static async reusePriorSubmission(requestId: string, clientId: string, user: any, host?: string, protocol?: string) {
    const source = await MissingInfoRequest.findByPk(requestId, {
      include: [
        { model: User, as: "targetUser", attributes: ["id", "firstName", "lastName", "email"] },
        { model: MissingInfoTemplate, attributes: ["id", "name", "type"] },
      ],
    });

    if (!source) {
      throw new ErrorHandler("Source request not found", 404);
    }

    if (source.status !== "submitted") {
      throw new ErrorHandler("Only submitted requests can be reused", 409);
    }

    if (source.targetUserId !== clientId) {
      throw new ErrorHandler("Source request does not belong to this client", 409);
    }

    const sourceResponses = await MissingInfoResponse.findAll({ where: { requestId } });
    const staffName = user?.firstName ? `${user.firstName} ${user.lastName || ""}`.trim() : "Unknown";
    const clientName = `${(source as any).targetUser?.firstName || ""} ${(source as any).targetUser?.lastName || ""}`.trim();
    const templateName = (source as any).template?.name ?? null;
    const token = crypto.randomUUID();

    const newRequest = await MissingInfoRequest.create({
      targetUserId: clientId,
      requestedById: user?.id || user?.userId || "unknown",
      requestedByName: staffName,
      missingInfoType: source.missingInfoType,
      missingInfoUrl: `${CLIENT_APP_DOMAIN}/missing-info/${token}/disclaimer`,
      jobURL: null,
      jobApplicationId: null,
      templateId: source.templateId,
      token,
      status: "submitted",
      channel: source.channel,
      fulfilledAt: new Date(),
      reusedFromRequestId: requestId,
      personalMessage: null,
    });

    for (const r of sourceResponses) {
      await MissingInfoResponse.create({
        requestId: newRequest.id,
        fieldId: r.fieldId,
        fieldName: r.fieldName,
        fieldLabel: r.fieldLabel,
        fieldValue: r.fieldValue,
      });
    }

    setImmediate(async () => {
      try {
        await SlackService.notify({
          node: SlackNode.USER_MANAGEMENT,
          provider: SlackProvider.SYSTEM,
          severity: SlackSeverity.INFO,
          type: SlackEventType.MISSING_INFO_REUSE,
          channel: SlackChannel.TOWN_CRIER,
          teamMentions: "CSM",
          trigger: staffName,
          ...(host ? { host } : {}),
          ...(protocol ? { protocol } : {}),
          body: [
            `Missing info reused — ${clientName}: "${templateName || source.missingInfoType}" reused from a prior submission (${requestId}).`,
            `Reused by ${staffName}. New request is pre-filled as submitted.`,
          ].join("\n"),
        });

        await auditTrailApplicationService.log({
          action: "missing_info_request.reused",
          actorUserId: user?.id || user?.userId || "unknown",
          targetType: "MissingInfoRequest",
          targetKey: newRequest.id,
          after: { status: "submitted", reusedFromRequestId: requestId },
          metadata: {
            clientName,
            templateName,
            sourceRequestId: requestId,
            copiedResponses: sourceResponses.length,
            reusedBy: staffName,
          },
        });
      } catch (err) {
        logger.error("Background notification failed for reusePriorSubmission:", err);
      }
    });

    return {
      id: newRequest.id,
      status: "submitted",
      sourceRequestId: requestId,
      copiedResponses: sourceResponses.length,
    };
  }

  static async sendSingleReminder(id: string, user: any, host?: string, protocol?: string) {
    const request = await MissingInfoRequest.findByPk(id, {
      include: [
        { model: User, as: "targetUser", attributes: ["id", "firstName", "lastName", "email", "whatsappNumber"] },
        { model: MissingInfoTemplate, attributes: ["id", "name"] },
      ],
    });

    if (!request) {
      throw new ErrorHandler("Request not found", 404);
    }

    if (!["pending", "viewed", "in_progress"].includes(request.status)) {
      throw new ErrorHandler("Only open requests can be reminded", 409);
    }

    let fieldLabels = "";
    let externalAction: ReturnType<typeof getExternalActionConfig> = null;
    if (request.templateId) {
      const fields = await MissingInfoTemplateField.findAll({
        where: { templateId: request.templateId, isVisible: true },
        order: [["sortOrder", "ASC"]],
      });
      fieldLabels = fields.map((f: any) => f.fieldLabel).join(", ");
      // SPR-21-52: reminders for an External Action template reuse that block's subject/body.
      externalAction = getExternalActionConfig(fields as any[]);
    }

    const newCount = (request.reminderCount || 0) + 1;
    await request.update({ reminderCount: newCount, lastReminderAt: new Date() });

    const staffName = user?.firstName ? `${user.firstName} ${user.lastName || ""}`.trim() : "Unknown";
    const clientName = `${(request as any).targetUser?.firstName || ""} ${(request as any).targetUser?.lastName || ""}`.trim();
    const templateName = (request as any).template?.name ?? null;

    setImmediate(async () => {
      try {
        if (request.channel === "whatsapp" && (request as any).targetUser?.whatsappNumber) {
          await JustCallTriggerService.sendMsg({
            action: "notify-missing-info",
            payload: {
              name: (request as any).targetUser.firstName,
              phone: ((request as any).targetUser.whatsappNumber ?? "").replace("+", ""),
            },
          });
        }

        let clientEmail = (request as any).targetUser?.email as string | null | undefined;

        if (request.channel === "email" && !clientEmail) {
          try {
            const decrypted = await fieldEncryption.getDecryptedUsersBatch([request.targetUserId]);
            const contact = decrypted.get(request.targetUserId);
            if (contact?.email) {
              clientEmail = contact.email;
              logger.info(`Resolved target user email via field_encryption fallback: ${request.targetUserId}`);
            }
          } catch (decErr: any) {
            logger.warn(`field_encryption fallback failed for ${request.targetUserId}: ${decErr?.message || decErr}`);
          }
        }

        if (request.channel === "email" && clientEmail) {
          await sendMail({
            email: clientEmail,
            subject: externalAction?.emailSubject
              ? `Reminder: ${externalAction.emailSubject}`
              : `Reminder: Information needed for your application`,
            templateName: "client-missing-info-v2.ejs",
            templateData: {
              name: (request as any).targetUser?.firstName || "there",
              templateName: templateName || "Missing Information",
              fieldLabels,
              refereeCount: null,
              personalMessage: (request as any).personalMessage || (externalAction ? composeExternalActionEmailBody(externalAction) : null) || null,
              updateMissingInfoUrl: request.missingInfoUrl,
              currentYear: new Date().getFullYear(),
            },
          });
        } else if (request.channel === "email" && !clientEmail) {
          logger.warn(
            `Reminder email skipped for request ${request.id} — target user ${request.targetUserId} has no resolvable email (channel=${request.channel})`,
          );
        }

        await SlackService.notify({
          node: SlackNode.USER_MANAGEMENT,
          provider: SlackProvider.SENDGRID,
          severity: SlackSeverity.INFO,
          type: SlackEventType.MISSING_INFO_SENT,
          channel: SlackChannel.TOWN_CRIER,
          teamMentions: "CSM",
          trigger: staffName,
          ...(host ? { host } : {}),
          ...(protocol ? { protocol } : {}),
          body: [
            `CSC follow-up — Reminder sent to ${clientName} for "${templateName || request.missingInfoType}" by ${staffName}.`,
            `${newCount} reminder${newCount > 1 ? "s" : ""} sent in total. Please confirm delivery.`,
          ].join("\n"),
        });

        await auditTrailApplicationService.log({
          action: "missing_info_request.reminder_sent",
          actorUserId: user?.id || user?.userId || "unknown",
          targetType: "MissingInfoRequest",
          targetKey: request.id,
          after: { reminderCount: newCount },
          metadata: { clientName, templateName, sentBy: staffName },
        });
      } catch (err) {
        logger.error("Background notification failed for sendSingleReminder:", err);
      }
    });

    return { id: request.id, reminderCount: newCount, message: "Reminder queued for delivery" };
  }

  static async logCopyAudit(id: string, user: any) {
    const request = await MissingInfoRequest.findByPk(id);

    if (!request) {
      throw new ErrorHandler("Request not found", 404);
    }

    await auditTrailApplicationService.log({
      action: "missing_info_request.copied",
      actorUserId: user?.id || user?.userId || "unknown",
      targetType: "MissingInfoRequest",
      targetKey: request.id,
      metadata: {
        copiedAt: new Date().toISOString(),
        copiedBy: user?.firstName ? `${user.firstName} ${user.lastName || ""}`.trim() : "Unknown",
      },
    });

    return { id: request.id, logged: true };
  }
}
