import ErrorHandler from "@/utils/errorHandler";
import { CommunicationTemplate } from "@/models/v1/communication-template.model";
import { User } from "@/models/v1/user.model";

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
    const templates = await CommunicationTemplate.findAll({
      where: { isDeleted: onlyDeleted },
      order: [["updatedAt", "DESC"]],
    });

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

    return serialize(template);
  }

  static async softDelete(idOrName: string) {
    const template = await resolveTemplate(idOrName);
    await template.update({ isDeleted: true });
    return serialize(template);
  }

  static async restore(idOrName: string) {
    const template = await resolveTemplate(idOrName);
    await template.update({ isDeleted: false });
    return serialize(template);
  }

  static async duplicate(idOrName: string) {
    const template = await resolveTemplate(idOrName);
    const duplicateName = `${template.templateName} Copy ${Date.now()}`;

    const duplicate = await CommunicationTemplate.create({
      templateName: duplicateName,
      persona: template.persona,
      subject: template.subject,
      body: template.body,
      isDeleted: false,
    });

    return serialize(duplicate);
  }

  static async hardDelete(idOrName: string) {
    const template = await resolveTemplate(idOrName);
    await template.destroy();
    return { success: true };
  }

  static async notifyMissingInfo(payload: {
    userId: string;
    missingInfoType: string;
    missingInfoUrl: string;
    mode?: "email" | "whatsapp";
  }) {
    const userId = normalize(payload.userId);
    const missingInfoType = normalize(payload.missingInfoType);
    const missingInfoUrl = normalize(payload.missingInfoUrl);
    const mode = payload.mode === "whatsapp" ? "whatsapp" : "email";

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

    return {
      userId: user.id,
      email: user.email,
      mode,
      missingInfoType,
      missingInfoUrl,
      notifiedAt: new Date().toISOString(),
    };
  }

  static async ensureTemplatesTable() {
    await CommunicationTemplate.sync({ force: false });
  }
}
