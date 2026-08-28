import ErrorHandler from "@/utils/errorHandler";
import {
  PreferenceQuestion,
  PREFERENCE_QUESTION_FIELD_TYPES,
  PREFERENCE_QUESTION_VISIBILITIES,
  PreferenceQuestionFieldType,
  PreferenceQuestionVisibility,
} from "@/models/v1/preference-question.model";
import { getServiceLogger } from "@/utils/createLogger";
import { invalidatePreferenceQuestionsCache } from "@/services/cache/preference-question.cache.service";
import { SlackService } from "@/services/slack.service";
import {
  SlackChannel,
  SlackEventType,
  SlackNode,
  SlackProvider,
  SlackSeverity,
} from "@/utils/enum";
import { getEnvironmentFromHost } from "@/utils/slack-helpers";

const logger = getServiceLogger("preference-question-service");

const OPTION_FIELD_TYPES: PreferenceQuestionFieldType[] = ["select", "radio"];

type QuestionPayload = {
  label?: string;
  fieldType?: string;
  options?: unknown;
  visibility?: string;
  isActive?: boolean;
  sortOrder?: number;
  createdById?: string;
};

type ActorUser = { firstName?: string; lastName?: string; email?: string } | undefined;

const FIELD_TYPE_LABELS: Record<string, string> = {
  text: "Short text",
  textarea: "Long text",
  select: "Dropdown",
  radio: "Radio",
  date: "Date",
  checkbox: "Yes / No",
};

const FIELD_CHANGE_LABELS: Record<string, string> = {
  label: "Label",
  fieldType: "Type",
  options: "Options",
  visibility: "Classification",
};

const fieldTypeLabel = (fieldType: string) => FIELD_TYPE_LABELS[fieldType] ?? fieldType;
const visibilityLabel = (visibility: string) => (visibility === "public" ? "Public" : "Private");

const getActorName = (user: ActorUser) =>
  `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim() || user?.email || "System";

const notifyPreferenceQuestionEvent = (host: string, body: string[]) => {
  const location = getEnvironmentFromHost(host);
  setImmediate(async () => {
    try {
      await SlackService.notify({
        location,
        host,
        node: SlackNode.USER_MANAGEMENT,
        provider: SlackProvider.SYSTEM,
        severity: SlackSeverity.INFO,
        type: SlackEventType.ADMIN_ACTION,
        channel: SlackChannel.TOWN_CRIER,
        teamMentions: "CSM",
        trigger: "Preference Question Changed",
        body: body.filter(Boolean).join("\n"),
      });
    } catch (err: any) {
      logger.error(`[PreferenceQuestion] Slack notification failed: ${err.message}`);
    }
  });
};

const normalize = (value: unknown) => (typeof value === "string" ? value.trim() : "");

const validateFieldType = (fieldType: string): PreferenceQuestionFieldType => {
  if (!PREFERENCE_QUESTION_FIELD_TYPES.includes(fieldType as PreferenceQuestionFieldType)) {
    throw new ErrorHandler(
      `fieldType must be one of: ${PREFERENCE_QUESTION_FIELD_TYPES.join(", ")}`,
      400,
    );
  }
  return fieldType as PreferenceQuestionFieldType;
};

const validateVisibility = (visibility: string): PreferenceQuestionVisibility => {
  if (!PREFERENCE_QUESTION_VISIBILITIES.includes(visibility as PreferenceQuestionVisibility)) {
    throw new ErrorHandler(
      `visibility must be one of: ${PREFERENCE_QUESTION_VISIBILITIES.join(", ")}`,
      400,
    );
  }
  return visibility as PreferenceQuestionVisibility;
};

const normalizeOptions = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  for (const entry of value) {
    const option = normalize(entry);
    if (option) seen.add(option);
  }
  return Array.from(seen);
};

export class PreferenceQuestionService {
  static async listQuestions() {
    const questions = await PreferenceQuestion.findAll({
      order: [
        ["visibility", "ASC"],
        ["sortOrder", "ASC"],
      ],
    });
    return questions;
  }

  static async listDeletedQuestions() {
    const questions = await PreferenceQuestion.findAll({
      paranoid: false,
      order: [["deletedAt", "DESC"]],
    });
    return questions.filter((q) => q.deletedAt);
  }

  static async getQuestion(id: string) {
    const question = await PreferenceQuestion.findByPk(id);
    if (!question) {
      throw new ErrorHandler("Question not found", 404);
    }
    return question;
  }

  static async createQuestion(payload: QuestionPayload, host: string, actorUser?: ActorUser) {
    const label = normalize(payload.label);
    if (!label) {
      throw new ErrorHandler("label is required", 400);
    }

    const fieldType = validateFieldType(normalize(payload.fieldType));
    const visibility = validateVisibility(normalize(payload.visibility));
    const options = normalizeOptions(payload.options);

    if (OPTION_FIELD_TYPES.includes(fieldType) && options.length === 0) {
      throw new ErrorHandler(
        `At least one option is required when fieldType is "${fieldType}"`,
        400,
      );
    }

    const highestOrder = await PreferenceQuestion.max<number, PreferenceQuestion>("sortOrder", {
      where: { visibility },
    });

    const question = await PreferenceQuestion.create({
      label,
      fieldType,
      visibility,
      options: OPTION_FIELD_TYPES.includes(fieldType) ? options : null,
      isActive: payload.isActive ?? true,
      sortOrder: typeof highestOrder === "number" ? highestOrder + 1 : 0,
      createdById: normalize(payload.createdById) || null,
    });

    // Fire-and-forget — a slow/unreachable cache must never delay this
    // response back to the admin.
    void invalidatePreferenceQuestionsCache();
    notifyPreferenceQuestionEvent(host, [
      "🟢 New preference question added",
      `Question: ${question.label} · Type: ${fieldTypeLabel(question.fieldType)} · Classification: ${visibilityLabel(question.visibility)}`,
      `Added by: ${getActorName(actorUser)} · live on both touchpoints immediately`,
    ]);
    logger.info(`Preference question created: ${question.id}`);
    return question;
  }

  static async updateQuestion(id: string, payload: QuestionPayload, host: string, actorUser?: ActorUser) {
    const question = await PreferenceQuestion.findByPk(id);
    if (!question) {
      throw new ErrorHandler("Question not found", 404);
    }

    if (question.isSystem) {
      const wantsFieldType = payload.fieldType !== undefined && normalize(payload.fieldType) !== question.fieldType;
      const wantsOptions =
        payload.options !== undefined &&
        JSON.stringify(normalizeOptions(payload.options)) !== JSON.stringify(question.options ?? []);
      if (wantsFieldType || wantsOptions) {
        throw new ErrorHandler(
          "This is a system question — field type and options are fixed and can't be changed",
          400,
        );
      }
    }

    const before = {
      label: question.label,
      fieldType: question.fieldType,
      options: question.options,
      visibility: question.visibility,
    };

    const updates: Record<string, unknown> = {};

    if (payload.label !== undefined) {
      const label = normalize(payload.label);
      if (!label) throw new ErrorHandler("label cannot be empty", 400);
      updates.label = label;
    }

    const nextFieldType = payload.fieldType !== undefined
      ? validateFieldType(normalize(payload.fieldType))
      : (question.fieldType as PreferenceQuestionFieldType);

    if (payload.fieldType !== undefined) {
      updates.fieldType = nextFieldType;
    }

    if (payload.visibility !== undefined) {
      updates.visibility = validateVisibility(normalize(payload.visibility));
    }

    if (payload.options !== undefined) {
      updates.options = normalizeOptions(payload.options);
    }

    const effectiveOptions = (updates.options as string[] | undefined) ?? question.options ?? [];
    if (OPTION_FIELD_TYPES.includes(nextFieldType)) {
      if (effectiveOptions.length === 0) {
        throw new ErrorHandler(
          `At least one option is required when fieldType is "${nextFieldType}"`,
          400,
        );
      }
      updates.options = effectiveOptions;
    } else if (payload.fieldType !== undefined) {
      updates.options = null;
    }

    if (payload.isActive !== undefined) {
      updates.isActive = !!payload.isActive;
    }

    if (payload.sortOrder !== undefined) {
      updates.sortOrder = payload.sortOrder;
    }

    await question.update(updates);

    // Fire-and-forget — a slow/unreachable cache must never delay this
    // response back to the admin.
    void invalidatePreferenceQuestionsCache();

    const changedKeys = (["label", "fieldType", "options", "visibility"] as const).filter((key) => {
      if (updates[key] === undefined) return false;
      if (key === "options") {
        return JSON.stringify(updates.options ?? []) !== JSON.stringify(before.options ?? []);
      }
      return updates[key] !== before[key];
    });

    if (changedKeys.length === 1 && changedKeys[0] === "visibility") {
      notifyPreferenceQuestionEvent(host, [
        "🔄 Preference question reclassified",
        `Question: ${question.label}`,
        `Change: ${visibilityLabel(before.visibility)} → ${visibilityLabel(question.visibility)}`,
        `Changed by: ${getActorName(actorUser)} · applies immediately, both touchpoints`,
      ]);
    } else if (changedKeys.length > 0) {
      const diffLines = changedKeys.map((key) => {
        if (key === "label") return `  • Label: "${before.label}" → "${question.label}"`;
        if (key === "fieldType") {
          return `  • Type: ${fieldTypeLabel(before.fieldType)} → ${fieldTypeLabel(question.fieldType)}`;
        }
        if (key === "options") {
          return `  • Options: ${(before.options ?? []).join(", ") || "—"} → ${(question.options ?? []).join(", ") || "—"}`;
        }
        return `  • Classification: ${visibilityLabel(before.visibility)} → ${visibilityLabel(question.visibility)}`;
      });
      notifyPreferenceQuestionEvent(host, [
        "🟢 Preference question edited",
        `Question: ${question.label}`,
        `Changed: ${changedKeys.map((key) => FIELD_CHANGE_LABELS[key]).join(", ")}`,
        ...diffLines,
        `Edited by: ${getActorName(actorUser)} · existing client answers are unaffected`,
      ]);
    }

    logger.info(`Preference question updated: ${id}`);
    return question;
  }

  static async deleteQuestion(id: string, deletedById: string | undefined, host: string, actorUser?: ActorUser) {
    const question = await PreferenceQuestion.findByPk(id);
    if (!question) {
      throw new ErrorHandler("Question not found", 404);
    }
    if (question.isSystem) {
      throw new ErrorHandler(
        "This is a system question and is bound to a dedicated profile field — it can't be deleted, only deactivated",
        400,
      );
    }
    await question.update({ deletedById: deletedById || null });
    await question.destroy();
    // Fire-and-forget — a slow/unreachable cache must never delay this
    // response back to the admin.
    void invalidatePreferenceQuestionsCache();
    notifyPreferenceQuestionEvent(host, [
      "🗑️ Preference question deleted",
      `Question: ${question.label}`,
      `Deleted by: ${getActorName(actorUser)} · moved to recycle bin, hidden from both touchpoints`,
    ]);
    logger.info(`Preference question moved to recycle bin: ${id}`);
    return { id };
  }

  static async restoreQuestion(id: string, host: string, actorUser?: ActorUser) {
    const question = await PreferenceQuestion.findByPk(id, { paranoid: false });
    if (!question) {
      throw new ErrorHandler("Question not found", 404);
    }
    if (!question.deletedAt) {
      throw new ErrorHandler("Question is not in the recycle bin", 400);
    }
    await question.restore();
    await question.update({ deletedById: null });

    void invalidatePreferenceQuestionsCache();
    notifyPreferenceQuestionEvent(host, [
      "♻️ Preference question restored",
      `Question: ${question.label}`,
      `Restored by: ${getActorName(actorUser)} · visible again on both touchpoints`,
    ]);
    logger.info(`Preference question restored: ${id}`);
    return question;
  }

  static async hardDeleteQuestion(id: string, host: string, actorUser?: ActorUser) {
    const question = await PreferenceQuestion.findByPk(id, { paranoid: false });
    if (!question) {
      throw new ErrorHandler("Question not found", 404);
    }
    if (!question.deletedAt) {
      throw new ErrorHandler("Move the question to the recycle bin before deleting it permanently", 400);
    }
    if (question.isSystem) {
      throw new ErrorHandler("This is a system question and can't be deleted", 400);
    }
    const label = question.label;
    await question.destroy({ force: true });

    void invalidatePreferenceQuestionsCache();
    notifyPreferenceQuestionEvent(host, [
      "🔴 Preference question permanently deleted",
      `Question: ${label}`,
      `Deleted by: ${getActorName(actorUser)} · cannot be undone`,
    ]);
    logger.info(`Preference question permanently deleted: ${id}`);
    return { id };
  }

  static async reorderQuestions(
    items: { id: string; sortOrder: number; visibility?: string }[],
    host: string,
    actorUser?: ActorUser,
  ) {
    if (!Array.isArray(items) || items.length === 0) {
      throw new ErrorHandler("items must be a non-empty array", 400);
    }

    const reclassifyIds = items.filter((item) => item.visibility !== undefined).map((item) => item.id);
    const beforeMap = new Map<string, { label: string; visibility: PreferenceQuestionVisibility }>();
    if (reclassifyIds.length > 0) {
      const existing = await PreferenceQuestion.findAll({ where: { id: reclassifyIds } });
      existing.forEach((q) => beforeMap.set(q.id, { label: q.label, visibility: q.visibility }));
    }

    await Promise.all(
      items.map(({ id, sortOrder, visibility }) => {
        const updates: Record<string, unknown> = { sortOrder };
        if (visibility !== undefined) {
          updates.visibility = validateVisibility(normalize(visibility));
        }
        return PreferenceQuestion.update(updates, { where: { id } });
      }),
    );

    // Fire-and-forget — a slow/unreachable cache must never delay this
    // response back to the admin.
    void invalidatePreferenceQuestionsCache();

    for (const item of items) {
      if (item.visibility === undefined) continue;
      const before = beforeMap.get(item.id);
      const nextVisibility = validateVisibility(normalize(item.visibility));
      if (!before || before.visibility === nextVisibility) continue;
      notifyPreferenceQuestionEvent(host, [
        "🔄 Preference question reclassified",
        `Question: ${before.label}`,
        `Change: ${visibilityLabel(before.visibility)} → ${visibilityLabel(nextVisibility)}`,
        `Changed by: ${getActorName(actorUser)} · applies immediately, both touchpoints`,
      ]);
    }

    logger.info(`Reordered ${items.length} preference question(s)`);
    return this.listQuestions();
  }
}
