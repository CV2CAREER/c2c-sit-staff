import crypto from "crypto";
import ErrorHandler from "@/utils/errorHandler";
import { CommunicationTemplate } from "@/models/v1/communication-template.model";
import {
  EmailTemplate,
  EmailTemplateType,
  EMAIL_TEMPLATE_TYPES,
} from "@/models/v1/email-template.model";
import { MissingInfoRequest } from "@/models/v1/missing-info-request.model";
import { User } from "@/models/v1/user.model";
import { getServiceLogger } from "@/utils/createLogger";
import { sendMail } from "@/config/sendGrid";
import { SlackService } from "@/services/slack.service";
import { JustCallTriggerService } from "@/services/justcall.service";
import {
  SlackNode,
  SlackProvider,
  SlackSeverity,
  SlackEventType,
  SlackChannel,
} from "@/utils/enum";
import { getEnvironmentFromHost } from "../../utils/slack-helpers";
import { CLIENT_APP_DOMAIN, TEAM_EMAIL } from "@/config/env";

const logger = getServiceLogger("communication-template-service");

type TemplatePayload = {
  id?: string;
  key: string;
  name: string;
  type?: string;
  body: string;
  variables?: unknown;
  updatedBy?: string;
};

const normalize = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

const normalizeVariables = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  for (const entry of value) {
    const name = normalize(entry);
    if (name) seen.add(name);
  }
  return Array.from(seen);
};

const serialize = (template: EmailTemplate) => ({
  id: template.id,
  key: template.key,
  name: template.name,
  type: template.type,
  body: template.body,
  variables: template.variables ?? [],
  updatedBy: template.updatedBy,
  createdAt: template.createdAt,
  updatedAt: template.updatedAt,
});

const isValidUUID = (str: string) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

const resolveTemplate = async (idOrKey: string, options: { paranoid?: boolean } = {}) => {
  if (!idOrKey) {
    throw new ErrorHandler("Template identifier is required", 400);
  }

  // Only try findByPk if the identifier looks like a UUID
  if (isValidUUID(idOrKey)) {
    const byId = await EmailTemplate.findByPk(idOrKey, { paranoid: options.paranoid });
    if (byId) return byId;
  }

  // Otherwise, search by template key
  const byKey = await EmailTemplate.findOne({
    where: { key: idOrKey },
    paranoid: options.paranoid,
  });

  if (!byKey) {
    throw new ErrorHandler("Template not found", 404);
  }

  return byKey;
};

const validateType = (type: string) => {
  if (!EMAIL_TEMPLATE_TYPES.includes(type as EmailTemplateType)) {
    throw new ErrorHandler(`type must be one of: ${EMAIL_TEMPLATE_TYPES.join(", ")}`, 400);
  }
};

export class CommunicationTemplateService {
  static async listTemplates(filters: { category?: string; status?: string } = {}) {
    const showDeleted = filters.status?.toLowerCase() === "deleted";
    const where: Record<string, unknown> = {};

    if (filters.category) {
      const category = filters.category.trim().toLowerCase();
      validateType(category);
      where.type = category;
    }

    logger.info(
      `Listing email templates (category: ${filters.category || "all"}, status: ${filters.status || "active"})`,
    );

    const templates = await EmailTemplate.findAll({
      where,
      paranoid: !showDeleted,
      order: [["updatedAt", "DESC"]],
    });

    const results = showDeleted ? templates.filter((t) => t.deletedAt) : templates;
    logger.info(`Found ${results.length} templates`);
    return results.map(serialize);
  }

  static async getTemplate(idOrKey: string) {
    logger.info(`Fetching template: ${idOrKey}`);
    const template = await resolveTemplate(idOrKey, { paranoid: false });
    return serialize(template);
  }

  static async createTemplate(payload: TemplatePayload) {
    const key = normalize(payload.key);
    const name = normalize(payload.name);
    const body = normalize(payload.body);
    const type = normalize(payload.type).toLowerCase() || EmailTemplateType.CUSTOMER;

    if (!key || !name || !body) {
      throw new ErrorHandler("key, name and body are required", 400);
    }
    validateType(type);

    const existing = await EmailTemplate.findOne({ where: { key }, paranoid: false });
    if (existing) {
      throw new ErrorHandler(
        existing.deletedAt
          ? `A deleted template with key "${key}" already exists — restore it instead of creating a new one`
          : `A template with key "${key}" already exists`,
        409,
      );
    }

    const template = await EmailTemplate.create({
      key,
      name,
      type: type as EmailTemplateType,
      body,
      variables: normalizeVariables(payload.variables),
      updatedBy: normalize(payload.updatedBy) || "System",
    });

    logger.info(`Template created: ${template.id} (${key})`);
    return serialize(template);
  }

  static async updateTemplate(payload: TemplatePayload) {
    const id = normalize(payload.id);
    if (!id) {
      throw new ErrorHandler("id is required", 400);
    }

    const template = await EmailTemplate.findByPk(id);
    if (!template) {
      throw new ErrorHandler("Template not found", 404);
    }

    if (payload.key !== undefined && normalize(payload.key) !== template.key) {
      throw new ErrorHandler(
        "key cannot be changed — application code sends emails by looking up this exact key",
        400,
      );
    }

    const updates: { name?: string; body?: string; type?: EmailTemplateType; variables?: string[] } = {};

    if (payload.name !== undefined) {
      const name = normalize(payload.name);
      if (!name) throw new ErrorHandler("name cannot be empty", 400);
      updates.name = name;
    }
    if (payload.body !== undefined) {
      const body = normalize(payload.body);
      if (!body) throw new ErrorHandler("body cannot be empty", 400);
      updates.body = body;
    }
    if (payload.type !== undefined) {
      const type = normalize(payload.type).toLowerCase();
      validateType(type);
      updates.type = type as EmailTemplateType;
    }
    if (payload.variables !== undefined) {
      updates.variables = normalizeVariables(payload.variables);
    }

    await template.update({
      ...updates,
      updatedBy: normalize(payload.updatedBy) || template.updatedBy,
    });

    logger.info(`Template updated: ${id} (${template.key})`);
    return serialize(template);
  }

  static async softDelete(idOrKey: string, deletedBy?: string) {
    logger.info(`Soft-deleting template: ${idOrKey}`);
    const template = await resolveTemplate(idOrKey);
    await template.update({ deletedBy: deletedBy || "System" });
    await template.destroy();
    logger.info(`Template soft-deleted: ${template.id}`);
    return serialize(template);
  }

  static async restore(idOrKey: string, updatedBy?: string) {
    logger.info(`Restoring template: ${idOrKey}`);
    const template = await resolveTemplate(idOrKey, { paranoid: false });
    await template.restore();
    await template.update({ updatedBy: updatedBy || template.updatedBy });
    logger.info(`Template restored: ${template.id}`);
    return serialize(template);
  }

  static async hardDelete(idOrKey: string) {
    logger.info(`Hard-deleting template: ${idOrKey}`);
    const template = await resolveTemplate(idOrKey, { paranoid: false });
    await template.destroy({ force: true });
    logger.info(`Template permanently deleted: ${idOrKey}`);
    return { success: true };
  }

  static async notifyMissingInfo(
    payload: {
      userId: string;
      missingInfoType: string;
      missingInfoUrl: string | string[] | { url: string } | unknown;
      mode?: "email" | "whatsapp";
    },
    host: string,
    requestingUser: Pick<User, "id" | "firstName" | "lastName" | "email">,
  ) {
    const location = getEnvironmentFromHost(host);
    const MISSING_INFO_LABELS: Record<string, string> = {
      Date_of_birth: "Date of birth",
      your_address: "Your Address",
      preferred_personal_pronouns: "Preferred Personal Pronouns",
      referral_information: "Referral Information",
    };

    const userId = normalize(payload.userId);
    const missingInfoType = normalize(payload.missingInfoType);
    const mode = payload.mode === "whatsapp" ? "whatsapp" : "email";

    // Normalise missingInfoUrl — handles string, array, or object shapes
    const rawUrl = payload.missingInfoUrl;
    const missingInfoUrl: string = Array.isArray(rawUrl)
      ? String(rawUrl[0] ?? "")
      : rawUrl !== null && typeof rawUrl === "object" && "url" in (rawUrl as object)
        ? String((rawUrl as { url: string }).url)
        : normalize(rawUrl as string);

    if (!userId || !missingInfoType || !missingInfoUrl) {
      throw new ErrorHandler(
        "userId, missingInfoType and missingInfoUrl are required",
        400,
      );
    }

    const user = await User.findByPk(userId);
    if (!user || user.deletedAt) {
      throw new ErrorHandler("User not found", 404);
    }

    const missingFieldLabel =
      MISSING_INFO_LABELS[missingInfoType] ?? missingInfoType;
    const requestId = crypto.randomUUID();
    const updateMissingInfoUrl = `${CLIENT_APP_DOMAIN}/missing-info/${requestId}`;
    const triggeredBy = `${requestingUser.firstName} ${requestingUser.lastName}`;
    const clientName = `${user.firstName} ${user.lastName}`;

    logger.info(
      `Missing info notification — user: ${userId}, type: ${missingInfoType}, mode: ${mode}, triggered by: ${triggeredBy}`,
    );

    // Persist the request and send the notification concurrently.
    // DB write is awaited so the record exists before we return; notifications
    // are fire-and-forget so the endpoint responds immediately after the write.
    const [record] = await Promise.all([
      MissingInfoRequest.create({
        id: requestId,
        targetUserId: user.id,
        requestedById: requestingUser.id,
        missingInfoType,
        missingInfoUrl: updateMissingInfoUrl,
        jobURL: rawUrl
      }),
      // Kick off delivery without blocking the response
      new Promise<void>((resolve) => {
        setImmediate(async () => {
          try {
            if (mode === "email") {
              const [clientResult, adminResult] = await Promise.allSettled([
                sendMail({
                  email: user.email,
                  subject: "Action Required: Missing Profile Information",
                  templateName: "client-missing-info.ejs",
                  templateData: {
                    name: clientName,
                    missingField: missingFieldLabel,
                    jobUrl: missingInfoUrl,
                    updateMissingInfoUrl,
                    currentYear: new Date().getFullYear(),
                  },
                }),
                sendMail({
                  email: TEAM_EMAIL,
                  subject: "New Missing Info Request Created",
                  templateName: "admin-missing-info.ejs",
                  templateData: {
                    clientName,
                    clientEmail: user.email,
                    missingField: missingFieldLabel,
                    jobUrl: missingInfoUrl,
                    updateMissingInfoUrl,
                    triggeredBy,
                    channel: mode,
                    currentYear: new Date().getFullYear(),
                  },
                }),
              ]);

              if (clientResult.status === "rejected") {
                logger.error(`Client missing-info email failed for ${user.email}:`, clientResult.reason);
              }
              if (adminResult.status === "rejected") {
                logger.error(`Admin missing-info email failed:`, adminResult.reason);
              }
            }

            if (mode === "whatsapp") {
              await JustCallTriggerService.sendMsg({
                action: "notify-missing-info",
                payload: {
                  name: user.firstName,
                  phone: (user.whatsappNumber ?? "").replace("+", ""),
                },
              });
            }

            await SlackService.notify({
              location,
              host,
              node: SlackNode.USER_MANAGEMENT,
              provider: SlackProvider.SENDGRID,
              severity: SlackSeverity.INFO,
              type: SlackEventType.MISSING_INFO,
              channel: SlackChannel.TOWN_CRIER,
              teamMentions: "CSM",
              trigger: triggeredBy,
              body: [
                `Client Missing Information Notification Sent Through ${mode === "whatsapp" ? "WhatsApp" : "Email"}`,
                `Client: ${clientName} (${user.email})`,
                `Missing: ${missingFieldLabel}`,
                `Job URL: ${missingInfoUrl}`,
                `Action Link: ${updateMissingInfoUrl}`,
                `Triggered by: ${triggeredBy}`,
                `Request ID: ${requestId}`,
              ].join("\n"),
            });
          } catch (err: any) {
            logger.error(`Background notification failed for request ${requestId}:`, err.message);
          }
          resolve();
        });
      }),
    ]);

    return {
      id: record.id,
      requestId,
      userId: user.id,
      email: user.email,
      mode,
      missingInfoType,
      missingFieldLabel,
      updateMissingInfoUrl,
      notifiedAt: new Date().toISOString(),
    };
  }

  static async ensureTemplatesTable() {
    logger.info("Ensuring communication_templates table exists");
    await CommunicationTemplate.sync({ force: false });
    logger.info("Communication_templates table ensured");
  }
}
