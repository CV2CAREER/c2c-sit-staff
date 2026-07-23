import ErrorHandler from "@/utils/errorHandler";
import { MissingInfoTemplate } from "@/models/v1/missing-info-template.model";
import { MissingInfoTemplateField } from "@/models/v1/missing-info-template-field.model";
import { getServiceLogger } from "@/utils/createLogger";
import { auditTrailApplicationService } from "./audit-trail.application.service";
import { SlackService } from "@/services/slack.service";
import {
  SlackChannel,
  SlackEventType,
  SlackNode,
  SlackProvider,
  SlackSeverity,
} from "@/utils/enum";

const logger = getServiceLogger("missing-info-template-service");

export class MissingInfoTemplateService {
  static async listTemplates(category?: string, status?: string) {
    const where: any = {};
    if (category) where.category = category;
    if (status) where.status = status;

    const templates = await MissingInfoTemplate.findAll({
      where,
      order: [["createdAt", "DESC"]],
    });

    return templates;
  }

  static async getTemplate(id: string) {
    const template = await MissingInfoTemplate.findByPk(id, {
      include: [{ model: MissingInfoTemplateField, as: "fields" }],
    });

    if (!template) {
      throw new ErrorHandler("Template not found", 404);
    }

    return template;
  }

  static async createTemplate(data: {
    name: string;
    category: string;
    type: string;
    createdById: string;
    fields?: any[];
  }) {
    const existing = await MissingInfoTemplate.findOne({
      where: { name: data.name },
    });

    if (existing) {
      throw new ErrorHandler("A template with this name already exists", 409);
    }

    const template = await MissingInfoTemplate.create({
      name: data.name,
      category: data.category,
      type: data.type,
      createdById: data.createdById,
    });

    if (data.fields && data.fields.length > 0) {
      const fieldData = data.fields.map((field, idx) => ({
        templateId: template.id,
        fieldName: field.fieldName,
        fieldLabel: field.fieldLabel,
        fieldType: field.fieldType,
        isRequired: field.isRequired ?? false,
        isVisible: field.isVisible ?? true,
        options: field.options ?? null,
        helpText: field.helpText ?? null,
        sortOrder: field.sortOrder ?? idx,
        isRefereeBlock: field.isRefereeBlock ?? false,
        refereeBlockIndex: field.refereeBlockIndex ?? null,
      }));

      await MissingInfoTemplateField.bulkCreate(fieldData);
    }

    return MissingInfoTemplate.findByPk(template.id, {
      include: [{ model: MissingInfoTemplateField }],
    });
  }

  static async updateTemplate(
    id: string,
    data: {
      name?: string;
      category?: string;
      type?: string;
      fields?: any[];
    },
  ) {
    const template = await MissingInfoTemplate.findByPk(id);

    if (!template) {
      throw new ErrorHandler("Template not found", 404);
    }

    if (data.name && data.name !== template.name) {
      const existing = await MissingInfoTemplate.findOne({
        where: { name: data.name },
      });
      if (existing) {
        throw new ErrorHandler("A template with this name already exists", 409);
      }
    }

    const updateData: Record<string, any> = {
      ...(data.name && { name: data.name }),
      ...(data.category && { category: data.category }),
      ...(data.type && { type: data.type }),
    };

    if (template.status === "published") {
      updateData.status = "draft";
    }

    await template.update(updateData);

    if (data.fields) {
      await MissingInfoTemplateField.destroy({
        where: { templateId: id },
      });

      const fieldData = data.fields.map((field, idx) => ({
        templateId: id,
        fieldName: field.fieldName,
        fieldLabel: field.fieldLabel,
        fieldType: field.fieldType,
        isRequired: field.isRequired ?? false,
        isVisible: field.isVisible ?? true,
        options: field.options ?? null,
        helpText: field.helpText ?? null,
        sortOrder: field.sortOrder ?? idx,
        isRefereeBlock: field.isRefereeBlock ?? false,
        refereeBlockIndex: field.refereeBlockIndex ?? null,
      }));

      await MissingInfoTemplateField.bulkCreate(fieldData);
    }

    return MissingInfoTemplate.findByPk(id, {
      include: [{ model: MissingInfoTemplateField }],
    });
  }

  static async deleteTemplate(id: string) {
    const template = await MissingInfoTemplate.findByPk(id);

    if (!template) {
      throw new ErrorHandler("Template not found", 404);
    }

    await template.destroy();
    return { id };
  }

  static async publishTemplate(id: string, user?: any) {
    const template = await MissingInfoTemplate.findByPk(id, {
      include: [{ model: MissingInfoTemplateField, as: "fields" }],
    });

    if (!template) {
      throw new ErrorHandler("Template not found", 404);
    }

    if (template.status === "published") {
      throw new ErrorHandler("Template is already published", 400);
    }

    const fields = (template as any).fields;
    if (!fields || fields.length === 0) {
      throw new ErrorHandler("Cannot publish an empty template", 400);
    }

    const priorStatus = template.status;
    await template.update({
      status: "published",
      publishCount: template.publishCount + 1,
    });

    const updatedTemplate = await MissingInfoTemplate.findByPk(id, {
      include: [{ model: MissingInfoTemplateField, as: "fields" }],
    });

    const actorUserId = user?.id || user?.userId || "unknown";
    const staffName = user?.firstName
      ? `${user.firstName} ${user.lastName || ""}`.trim()
      : "Unknown";

    setImmediate(async () => {
      try {
        await auditTrailApplicationService.log({
          action: "template.published",
          actorUserId,
          targetType: "MissingInfoTemplate",
          targetKey: template.id,
          before: { status: priorStatus },
          after: { status: "published" },
          metadata: {
            category: template.category,
            fieldCount: fields.length,
            templateName: template.name,
          },
        });
      } catch (err) {
        logger.error("Audit trail write failed for template.published:", err);
      }

      try {
        await SlackService.notify({
          node: SlackNode.USER_MANAGEMENT,
          provider: SlackProvider.SENDGRID,
          severity: SlackSeverity.INFO,
          type: SlackEventType.MISSING_INFO_TEMPLATE_PUBLISHED,
          channel: SlackChannel.TOWN_CRIER,
          teamMentions: "CSM",
          trigger: staffName,
          body: [
            `Template published — "${template.name}" is now live and selectable in Send Request.`,
            `Published by: ${staffName}`,
            `Category: ${template.category.replace(/_/g, " ")} · Fields: ${fields.length} per ${template.type === "referee_block" ? "referee" : "section"}`,
          ].join("\n"),
        });
      } catch (err) {
        logger.error("Slack notification failed for template.published:", err);
      }
    });

    return updatedTemplate;
  }
}
