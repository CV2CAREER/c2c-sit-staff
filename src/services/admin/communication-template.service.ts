import crypto from "crypto";
import path from "path";
import ErrorHandler from "@/utils/errorHandler";
import { CommunicationTemplate } from "@/models/v1/communication-template.model";
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
import { CLIENT_APP_DOMAIN, TEAM_EMAIL } from "@/config/env";

const mailDirectory = path.resolve(__dirname, "../../views/emails");

const logger = getServiceLogger("communication-template-service");

type TemplatePayload = {
  id?: string;
  templateName: string;
  persona: string;
  subject: string;
  body: string;
};

const normalize = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

const serialize = (template: CommunicationTemplate) => ({
  _id: template.id,
  id: template.id,
  templateName: template.templateName,
  persona: template.persona,
  subject: template.subject,
  body: template.body,
  isDeleted: template.isDeleted,
  createdAt: template.createdAt,
  updatedAt: template.updatedAt,
});

const isValidUUID = (str: string) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

const resolveTemplate = async (idOrName: string) => {
  if (!idOrName) {
    throw new ErrorHandler("template identifier is required", 400);
  }

  // Only try findByPk if the identifier looks like a UUID
  if (isValidUUID(idOrName)) {
    const byId = await CommunicationTemplate.findByPk(idOrName);
    if (byId) return byId;
  }

  // Otherwise, search by template name
  const byName = await CommunicationTemplate.findOne({
    where: { templateName: idOrName },
    order: [["updatedAt", "DESC"]],
  });

  if (!byName) {
    throw new ErrorHandler("Template not found", 404);
  }

  return byName;
};

export class CommunicationTemplateService {
  static async listTemplates(type?: string) {
    const onlyDeleted = type?.toLowerCase() === "deleted";
    logger.info(`Listing templates (type: ${type || "all"})`);
    const templates = await CommunicationTemplate.findAll({
      where: { isDeleted: onlyDeleted },
      order: [["updatedAt", "DESC"]],
    });

    logger.info(`Found ${templates.length} templates`);
    return templates.map(serialize);
  }

  static async createTemplate(payload: TemplatePayload) {
    const templateName = normalize(payload.templateName);
    const persona = normalize(payload.persona);
    const subject = normalize(payload.subject);
    const body = normalize(payload.body);

    if (!templateName || !persona || !subject || !body) {
      throw new ErrorHandler(
        "templateName, persona, subject and body are required",
        400,
      );
    }

    const template = await CommunicationTemplate.create({
      templateName,
      persona,
      subject,
      body,
    });

    logger.info(`Template created: ${template.id} (${templateName})`);
    return serialize(template);
  }

  static async updateTemplate(payload: TemplatePayload) {
    const id = normalize(payload.id);
    if (!id) {
      throw new ErrorHandler("id is required", 400);
    }

    const template = await CommunicationTemplate.findByPk(id);
    if (!template) {
      throw new ErrorHandler("Template not found", 404);
    }

    const templateName = normalize(payload.templateName);
    const persona = normalize(payload.persona);
    const subject = normalize(payload.subject);
    const body = normalize(payload.body);

    if (!templateName || !persona || !subject || !body) {
      throw new ErrorHandler(
        "templateName, persona, subject and body are required",
        400,
      );
    }

    await template.update({
      templateName,
      persona,
      subject,
      body,
    });

    logger.info(`Template updated: ${id} (${templateName})`);
    return serialize(template);
  }

  static async softDelete(idOrName: string) {
    logger.info(`Soft-deleting template: ${idOrName}`);
    const template = await resolveTemplate(idOrName);
    await template.update({ isDeleted: true });
    logger.info(`Template soft-deleted: ${template.id}`);
    return serialize(template);
  }

  static async restore(idOrName: string) {
    logger.info(`Restoring template: ${idOrName}`);
    const template = await resolveTemplate(idOrName);
    await template.update({ isDeleted: false });
    logger.info(`Template restored: ${template.id}`);
    return serialize(template);
  }

  static async duplicate(idOrName: string) {
    logger.info(`Duplicating template: ${idOrName}`);
    const template = await resolveTemplate(idOrName);
    const duplicateName = `${template.templateName} Copy ${Date.now()}`;

    const duplicate = await CommunicationTemplate.create({
      templateName: duplicateName,
      persona: template.persona,
      subject: template.subject,
      body: template.body,
      isDeleted: false,
    });

    logger.info(`Template duplicated: ${duplicate.id} (${duplicateName})`);
    return serialize(duplicate);
  }

  static async hardDelete(idOrName: string) {
    logger.info(`Hard-deleting template: ${idOrName}`);
    const template = await resolveTemplate(idOrName);
    await template.destroy();
    logger.info(`Template permanently deleted: ${idOrName}`);
    return { success: true };
  }

  static async notifyMissingInfo(
    payload: {
      userId: string;
      missingInfoType: string;
      missingInfoUrl: string | string[] | { url: string } | unknown;
      mode?: "email" | "whatsapp";
    },
    requestingUser: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
    },
  ) {
    const MISSING_INFO_LABELS: Record<string, string> = {
      Date_of_birth: "Date of birth",
      your_address: "Your Address",
      preferred_personal_pronouns: "Preferred Personal Pronouns",
      referral_information: "Referrals Information",
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

    if (mode === "email") {
      // Send client and admin emails in parallel; log but don't throw on partial failure
      const [clientResult, adminResult] = await Promise.allSettled([
        sendMail({
          email: user.email,
          subject: "You have missing profile information",
          templateName: "client-missing-info.ejs",
          templateDir: mailDirectory,
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
          templateDir: mailDirectory,
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

      // Fire Slack notification without blocking the response
      setImmediate(() => {
        SlackService.notify({
          node: SlackNode.USER_MANAGEMENT,
          provider: SlackProvider.SENDGRID,
          severity: SlackSeverity.INFO,
          type: SlackEventType.MISSING_INFO,
          channel: SlackChannel.TOWN_CRIER,
          teamMentions: "CSM",
          trigger: triggeredBy,
          body: [
            `Client Missing Information Notification Sent Through Email`,
            `Client: ${clientName} (${user.email})`,
            `Missing: ${missingFieldLabel}`,
            `Job URL: ${missingInfoUrl}`,
            `Action Link: ${updateMissingInfoUrl}`,
            `Triggered by: ${triggeredBy}`,
          ].join("\n"),
        });
      });

      return {
        userId: user.id,
        email: user.email,
        mode,
        missingInfoType,
        missingFieldLabel,
        updateMissingInfoUrl,
        notifiedAt: new Date().toISOString(),
      };
    }

    if (mode === "whatsapp") {
      await JustCallTriggerService.sendMsg({
        action: "notify-missing-info",
        payload: {
          name: user.firstName,
          phone: (user.whatsappNumber ?? "").replace("+", ""),
        },
      });

      // Fire Slack notification without blocking the response
      setImmediate(() => {
        SlackService.notify({
          node: SlackNode.USER_MANAGEMENT,
          provider: SlackProvider.SENDGRID,
          severity: SlackSeverity.INFO,
          type: SlackEventType.MISSING_INFO,
          channel: SlackChannel.TOWN_CRIER,
          teamMentions: "CSM",
          trigger: triggeredBy,
          body: [
            `Client Missing Information Notification Sent Through WhatsApp`,
            `Client: ${clientName} (${user.email})`,
            `Missing: ${missingFieldLabel}`,
            `Job URL: ${missingInfoUrl}`,
            `Action Link: ${updateMissingInfoUrl}`,
            `Triggered by: ${triggeredBy}`,
          ].join("\n"),
        });
      });

      return {
        userId: user.id,
        email: user.email,
        mode,
        missingInfoType,
        missingFieldLabel,
        notifiedAt: new Date().toISOString(),
      };
    }

    throw new ErrorHandler("Invalid mode. Must be 'email' or 'whatsapp'.", 400);
  }

  static async ensureTemplatesTable() {
    logger.info("Ensuring communication_templates table exists");
    await CommunicationTemplate.sync({ force: false });
    logger.info("Communication_templates table ensured");
  }
}
