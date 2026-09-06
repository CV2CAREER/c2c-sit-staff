import crypto from "crypto";
import ejs from "ejs";
import ErrorHandler from "@/utils/errorHandler";
import { CommunicationTemplate } from "@/models/v1/communication-template.model";
import {
  EmailTemplate,
  EmailTemplateType,
  EMAIL_TEMPLATE_TYPES,
} from "@/models/v1/email-template.model";
import { EmailTemplateTrigger } from "@/models/v1/email-template-trigger.model";
import { EmailTestSendLog, EmailTestSendStatus } from "@/models/v1/email-test-send-log.model";
import { MissingInfoRequest } from "@/models/v1/missing-info-request.model";
import { User } from "@/models/v1/user.model";
import { getServiceLogger } from "@/utils/createLogger";
import { sendMail, sendRawTestEmail } from "@/config/sendGrid";
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
import { CLIENT_APP_DOMAIN, TEAM_EMAIL, LOCAL_FRONTEND_URL, EMAIL_TEST_RECIPIENT } from "@/config/env";
import { EMAIL_TRIGGERS, findTriggerDefinition } from "@/constants/email-triggers";

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

/**
 * Real-data resolvers for test-send, keyed by trigger. Only implemented for
 * a handful of proven-reconstructable triggers (v1) — everything else falls
 * back to placeholder values per template.variables. Deliberately reads
 * only the acting admin's OWN account; never touches another user's data.
 */
const TEST_DATA_RESOLVERS: Record<string, (admin: Pick<User, "firstName" | "email">) => Record<string, unknown>> = {
  "welcome-email.ejs": (admin) => ({
    name: admin.firstName,
    email: admin.email,
    frontendUrl: LOCAL_FRONTEND_URL,
    currentYear: new Date().getFullYear(),
  }),
  "session-confirmed.ejs": (admin) => ({
    // Most admins have no real confirmed session to source from — only
    // `name` is genuinely the admin's own data, the rest are placeholders.
    name: admin.firstName,
    coachName: "Sample Coach",
    date: "Sample date",
    time: "Sample time",
    timezone: "UTC",
    sessionType: "Sample session",
    meetingLink: "https://example.com",
    duration: 30,
    frontendUrl: LOCAL_FRONTEND_URL,
    currentYear: new Date().getFullYear(),
  }),
  "referral-claimed.ejs": (admin) => ({
    name: admin.firstName,
    email: admin.email,
    claimedUserName: "Sample User",
    frontendUrl: LOCAL_FRONTEND_URL,
    currentYear: new Date().getFullYear(),
  }),
};

/** Which trigger (if any) currently resolves to this template — a custom
 * binding first, else the implicit default (its own key matching a known
 * trigger). Used to pick a real-data resolver for test-send previews. */
const resolveTriggerKeyForTemplate = async (template: EmailTemplate): Promise<string | undefined> => {
  const binding = await EmailTemplateTrigger.findOne({ where: { templateId: template.id } });
  if (binding) return binding.triggerKey;
  return findTriggerDefinition(template.key) ? template.key : undefined;
};

const EJS_RESERVED_WORDS = new Set([
  "if", "else", "for", "while", "do", "function", "return", "var", "let", "const",
  "true", "false", "null", "undefined", "typeof", "new", "this", "in", "of", "break",
  "continue", "switch", "case", "default", "try", "catch", "finally", "throw", "include",
  "locals", // EJS's own name for the data object passed to render — not a real variable
]);

/**
 * template.variables is manually maintained metadata (for the admin's
 * click-to-insert picker) — it's documentation, not a guarantee of what the
 * raw EJS body actually references. Scanning the body directly catches
 * variables that were used but never declared, so test-send can surface
 * them as editable instead of crashing on render.
 */
const extractEjsVariableNames = (body: string): string[] => {
  const names = new Set<string>();
  const tagRegex = /<%[-=]?\s*([a-zA-Z_$][\w$]*)/g;
  let match: RegExpExecArray | null;
  while ((match = tagRegex.exec(body))) {
    if (!EJS_RESERVED_WORDS.has(match[1])) names.add(match[1]);
  }
  return Array.from(names);
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

  static async listTriggers() {
    const bindings = await EmailTemplateTrigger.findAll();
    const bindingByTriggerKey = new Map(bindings.map((b) => [b.triggerKey, b]));

    const results = [];
    for (const definition of EMAIL_TRIGGERS) {
      const binding = bindingByTriggerKey.get(definition.key);
      const disabled = !!binding && binding.templateId === null;
      const template = disabled
        ? null
        : binding
          ? await EmailTemplate.findByPk(binding.templateId as string)
          : await EmailTemplate.findOne({ where: { key: definition.key } });

      results.push({
        triggerKey: definition.key,
        label: definition.label,
        reassignable: definition.reassignable,
        isBound: !!binding,
        disabled,
        resolvedTemplate: template ? serialize(template) : null,
      });
    }
    return results;
  }

  /** `templateId: null` disables the trigger — it sends nothing at all. */
  static async rebindTrigger(triggerKey: string, templateId: string | null, adminUserId?: string) {
    const definition = findTriggerDefinition(triggerKey);
    if (!definition) {
      throw new ErrorHandler(`Unknown trigger "${triggerKey}"`, 404);
    }
    // Server-side gate — the real enforcement point, independent of the UI
    // hiding the picker for these. Covers disabling too: a trigger that
    // can't be reassigned also can't be silently turned off.
    if (!definition.reassignable) {
      throw new ErrorHandler(`"${definition.label}" cannot be reassigned`, 400);
    }

    let target: EmailTemplate | null = null;
    if (templateId !== null) {
      target = await EmailTemplate.findByPk(templateId);
      if (!target) {
        throw new ErrorHandler("Template not found", 404);
      }
    }

    const existing = await EmailTemplateTrigger.findOne({ where: { triggerKey } });
    if (existing) {
      await existing.update({ templateId, updatedBy: adminUserId });
    } else {
      await EmailTemplateTrigger.create({ triggerKey, templateId, updatedBy: adminUserId });
    }

    logger.info(
      templateId === null
        ? `Trigger "${triggerKey}" disabled (send nothing) by ${adminUserId ?? "unknown"}`
        : `Trigger "${triggerKey}" rebound to template ${templateId} by ${adminUserId ?? "unknown"}`,
    );
    return {
      triggerKey,
      label: definition.label,
      reassignable: true,
      isBound: true,
      disabled: templateId === null,
      resolvedTemplate: target ? serialize(target) : null,
    };
  }

  static async resetTrigger(triggerKey: string) {
    await EmailTemplateTrigger.destroy({ where: { triggerKey } });
    logger.info(`Trigger "${triggerKey}" reset to default`);
    return { success: true };
  }

  static async resolveTestSendData(templateId: string, adminUser: Pick<User, "firstName" | "email">) {
    const template = await EmailTemplate.findByPk(templateId);
    if (!template) {
      throw new ErrorHandler("Template not found", 404);
    }

    const triggerKeyUsed = await resolveTriggerKeyForTemplate(template);
    const resolver = triggerKeyUsed ? TEST_DATA_RESOLVERS[triggerKeyUsed] : undefined;
    const resolvedFromRealData = resolver ? resolver(adminUser) : {};

    // Union of the declared list, whatever the resolver knows about, and
    // what's actually referenced in the body — the declared list alone can
    // be stale/incomplete relative to the real template content.
    const variableNames = Array.from(
      new Set([
        ...(template.variables ?? []),
        ...Object.keys(resolvedFromRealData),
        ...extractEjsVariableNames(template.body),
      ]),
    );
    const values: Record<string, string> = {};
    for (const name of variableNames) {
      values[name] =
        resolvedFromRealData[name] !== undefined ? String(resolvedFromRealData[name]) : `Sample ${name}`;
    }

    return { templateId: template.id, triggerKeyUsed: triggerKeyUsed ?? null, variables: values };
  }

  static async sendTestEmail(
    templateId: string,
    values: Record<string, unknown>,
    adminUser: Pick<User, "id" | "firstName" | "lastName" | "email">,
    triggerKeyUsed?: string,
  ) {
    if (!EMAIL_TEST_RECIPIENT) {
      throw new ErrorHandler("EMAIL_TEST_RECIPIENT is not configured", 500);
    }

    const template = await EmailTemplate.findByPk(templateId);
    if (!template) {
      throw new ErrorHandler("Template not found", 404);
    }

    const safeValues: Record<string, string> = {};
    for (const [key, value] of Object.entries(values ?? {})) {
      safeValues[key] = typeof value === "string" ? value : String(value ?? "");
    }

    // Guard against variables the body references but the admin never saw
    // in the modal (declared-variables metadata can be stale) — fall back
    // to a visible placeholder instead of crashing the render. `with()`
    // (which ejs.render compiles to) probes this object for symbol keys
    // like Symbol.unscopables, so those must pass through untouched —
    // only string keys get the placeholder treatment.
    const renderData = new Proxy(safeValues, {
      get: (target, prop) => {
        if (typeof prop === "symbol") return (target as Record<PropertyKey, unknown>)[prop];
        return prop in target ? target[prop] : `[missing: ${prop}]`;
      },
    });

    let html: string;
    try {
      html = ejs.render(template.body, renderData as Record<string, unknown>);
    } catch (err: any) {
      throw new ErrorHandler(`Template failed to render: ${err.message}`, 400);
    }

    // Deliberate deviation from the house "never await sendMail/Slack in the
    // main request path" rule — the entire point of test-send is synchronous
    // pass/fail confirmation, which a setImmediate fire-and-forget can't give
    // without adding polling. See plan doc for the explicit call-out.
    try {
      await sendRawTestEmail({
        email: EMAIL_TEST_RECIPIENT,
        subject: `[TEST] ${template.name}`,
        html,
      });
      await EmailTestSendLog.create({
        templateId: template.id,
        triggerKeyUsed: triggerKeyUsed ?? null,
        sentByAdminId: adminUser.id,
        recipientEmail: EMAIL_TEST_RECIPIENT,
        status: EmailTestSendStatus.SENT,
      });
      logger.info(`Test email sent for template ${template.id} by admin ${adminUser.id}`);
      return { success: true, recipientEmail: EMAIL_TEST_RECIPIENT };
    } catch (err: any) {
      await EmailTestSendLog.create({
        templateId: template.id,
        triggerKeyUsed: triggerKeyUsed ?? null,
        sentByAdminId: adminUser.id,
        recipientEmail: EMAIL_TEST_RECIPIENT,
        status: EmailTestSendStatus.FAILED,
        errorMessage: String(err.message ?? "").slice(0, 512),
      });
      throw new ErrorHandler(`Test email failed: ${err.message}`, 502);
    }
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
