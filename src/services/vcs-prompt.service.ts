import { Op } from "sequelize";
import { Request } from "express";
import { getServiceLogger } from "../utils/createLogger";
import { VCS, VCSPrompt } from "../models/v1/keyword-population.model";
import { SlackService } from "./slack.service";
import { sendMail } from "../config/sendGrid";
import { TEAM_EMAIL } from "../config/env";
import { getEnvironmentFromHost } from "../utils/slack-helpers";
import {
  SlackChannel,
  SlackEventType,
  SlackNode,
  SlackProvider,
  SlackSeverity,
} from "../utils/enum";

const logger = getServiceLogger("vcs-prompt-service");

const KEY_PATTERN = /^[a-z0-9_]+$/;

type Actor = { email?: string; firstName?: string; lastName?: string } | null | undefined;

const actorLabel = (actor: Actor) =>
  actor?.email || `${actor?.firstName ?? ""} ${actor?.lastName ?? ""}`.trim() || "System";

const serializeVcs = (vcs: VCS, prompt: VCSPrompt | null) => ({
  id: vcs.id,
  key: vcs.key,
  active: vcs.active,
  activePromptId: vcs.activePromptId,
  prompt: prompt?.prompt ?? "",
  aiPromptSection: prompt?.aiPromptSection ?? "",
  version: prompt?.version ?? null,
  category: vcs.category ?? null,
  model: vcs.model ?? null,
  temperature: vcs.temperature ?? null,
  maxTokens: vcs.maxTokens ?? null,
  deletedAt: vcs.deletedAt ?? null,
  deletedBy: vcs.deletedBy ?? null,
  updatedBy: vcs.updatedBy ?? null,
  createdAt: vcs.createdAt,
  updatedAt: vcs.updatedAt,
});

const serializeVersion = (v: VCSPrompt) => ({
  id: v.id,
  vcsId: v.vcsId ?? null,
  prompt: v.prompt,
  aiPromptSection: v.aiPromptSection ?? "",
  version: v.version,
  status: v.status,
  createdBy: v.createdBy ?? null,
  deployedBy: v.deployedBy ?? null,
  deployedAt: v.deployedAt ?? null,
  createdAt: v.createdAt,
  updatedAt: v.updatedAt,
});

const normalizeKey = (key: unknown) => String(key || "").trim().toLowerCase();

const assertValidKey = (key: string) => {
  if (!key) {
    throw new Error("Key is required");
  }
  if (!KEY_PATTERN.test(key)) {
    throw new Error("Key must be lowercase snake_case (letters, numbers, underscores only)");
  }
};

// Versions are decimal strings ("1" -> "1.1" -> "1.2" ...) so history reads
// as an incrementing revision counter rather than a whole new release.
const nextVersion = (currentVersion: string | null | undefined) => {
  const parsed = parseFloat(currentVersion || "1");
  const base = Number.isFinite(parsed) ? parsed : 1;
  return (base + 0.1).toFixed(1);
};

type PromptActionLabel =
  | "Created"
  | "Updated"
  | "Deleted"
  | "Restored"
  | "Permanently Deleted"
  | "Draft Saved"
  | "Pushed to Live"
  | "Rolled Back"
  | "Version Restored";

// Fire-and-forget Slack + team-email notification — never allowed to affect
// the outcome of the CRUD action it's reporting on.
const notifyPromptChange = (
  req: Request | undefined,
  actionLabel: PromptActionLabel,
  vcs: VCS,
  prompt: VCSPrompt | null,
  actor: Actor,
) => {
  setImmediate(async () => {
    try {
      const host = req?.headers?.host || (req?.headers?.origin as string) || "localhost";
      const location = getEnvironmentFromHost(host);
      const triggeredBy = actorLabel(actor);
      const promptExcerpt = prompt?.prompt ? prompt.prompt.slice(0, 400) : "";

      await SlackService.notify({
        location,
        host,
        node: SlackNode.AI,
        provider: SlackProvider.SYSTEM,
        severity: SlackSeverity.INFO,
        type: SlackEventType.ADMIN_ACTION,
        channel: SlackChannel.TOWN_CRIER,
        teamMentions: "CSM",
        trigger: `AI Prompt ${actionLabel}`,
        body: [
          `AI Prompt ${actionLabel}`,
          `Key: ${vcs.key}`,
          prompt?.version ? `Version: ${prompt.version}` : null,
          `Active: ${vcs.active ? "Yes" : "No"}`,
          `Triggered by: ${triggeredBy}`,
        ]
          .filter(Boolean)
          .join("\n"),
      });

      await sendMail({
        email: TEAM_EMAIL,
        subject: `AI Prompt ${actionLabel}: ${vcs.key}`,
        templateName: "vcs-prompt-change-admin.ejs",
        templateData: {
          actionLabel,
          key: vcs.key,
          version: prompt?.version ?? "",
          active: vcs.active,
          triggeredBy,
          promptExcerpt,
          currentYear: new Date().getFullYear(),
        },
      });
    } catch (error: any) {
      logger.error(`Failed to send VCS prompt change notification: ${error.message}`);
    }
  });
};

export class VcsPromptService {
  static async listPrompts() {
    try {
      const rows = await VCS.findAll({
        include: [{ model: VCSPrompt, as: "activePrompt" }],
        order: [["key", "ASC"]],
      });

      return rows.map((row) => serializeVcs(row, row.activePrompt ?? null));
    } catch (error: any) {
      logger.error(`Failed to list VCS prompts: ${error.message}`);
      throw error;
    }
  }

  static async listDeletedPrompts() {
    try {
      const rows = await VCS.findAll({
        where: { deletedAt: { [Op.ne]: null } },
        paranoid: false,
        include: [{ model: VCSPrompt, as: "activePrompt" }],
        order: [["deletedAt", "DESC"]],
      });

      return rows.map((row) => serializeVcs(row, row.activePrompt ?? null));
    } catch (error: any) {
      logger.error(`Failed to list deleted VCS prompts: ${error.message}`);
      throw error;
    }
  }

  static async listVersions(vcsId: string) {
    try {
      const vcsRow = await VCS.findByPk(vcsId);
      if (!vcsRow) {
        throw new Error("Prompt not found");
      }

      const rows = await VCSPrompt.findAll({
        where: { vcsId },
        order: [["createdAt", "DESC"]],
      });

      return rows.map(serializeVersion);
    } catch (error: any) {
      logger.error(`Failed to list VCS prompt versions: ${error.message}`);
      throw error;
    }
  }

  static async createPrompt(
    req: Request | undefined,
    data: { key: unknown; prompt: unknown; active?: unknown; model?: unknown },
    actor: Actor,
  ) {
    try {
      const key = normalizeKey(data.key);
      const prompt = String(data.prompt || "").trim();
      const active = data.active !== undefined ? Boolean(data.active) : true;
      const model = data.model ? String(data.model).trim() : undefined;

      assertValidKey(key);

      if (!prompt) {
        throw new Error("Prompt text is required");
      }

      const existing = await VCS.findOne({ where: { key }, paranoid: false });
      if (existing) {
        throw new Error(
          existing.deletedAt
            ? `A deleted prompt with key "${key}" already exists — restore it instead of creating a new one`
            : `A prompt with key "${key}" already exists`,
        );
      }

      const vcsRow = await VCS.create({
        key,
        active,
        model,
        updatedBy: actorLabel(actor),
      });

      const deployedBy = actorLabel(actor);
      const promptRow = await VCSPrompt.create({
        vcsId: vcsRow.id,
        prompt,
        version: "1",
        status: "live",
        active: true,
        deployedBy,
        deployedAt: new Date(),
      });

      vcsRow.activePromptId = promptRow.id;
      await vcsRow.save();

      notifyPromptChange(req, "Created", vcsRow, promptRow, actor);

      return serializeVcs(vcsRow, promptRow);
    } catch (error: any) {
      logger.error(`Failed to create VCS prompt: ${error.message}`);
      throw error;
    }
  }

  // Metadata-only update — key/category/model/temperature/maxTokens/active.
  // Prompt *text* changes go through saveDraft/pushToLive instead, since
  // editing text should never silently become what production reads.
  static async updatePrompt(
    req: Request | undefined,
    id: string,
    data: {
      key?: unknown;
      active?: unknown;
      category?: unknown;
      model?: unknown;
      temperature?: unknown;
      maxTokens?: unknown;
    },
    actor: Actor,
  ) {
    try {
      const vcsRow = await VCS.findByPk(id);
      if (!vcsRow) {
        throw new Error("Prompt not found");
      }

      if (data.key !== undefined) {
        const nextKey = normalizeKey(data.key);
        assertValidKey(nextKey);

        if (nextKey !== vcsRow.key) {
          const clash = await VCS.findOne({ where: { key: nextKey }, paranoid: false });
          if (clash) {
            throw new Error(`A prompt with key "${nextKey}" already exists`);
          }
          vcsRow.key = nextKey;
        }
      }

      if (data.active !== undefined) {
        vcsRow.active = Boolean(data.active);
      }

      if (data.category !== undefined) {
        vcsRow.category = data.category ? String(data.category).trim() : undefined;
      }

      if (data.model !== undefined) {
        vcsRow.model = data.model ? String(data.model).trim() : undefined;
      }

      if (data.temperature !== undefined) {
        const temp = data.temperature === null ? undefined : Number(data.temperature);
        vcsRow.temperature = temp !== undefined && Number.isFinite(temp) ? temp : undefined;
      }

      if (data.maxTokens !== undefined) {
        const tokens = data.maxTokens === null ? undefined : Number(data.maxTokens);
        vcsRow.maxTokens = tokens !== undefined && Number.isFinite(tokens) ? tokens : undefined;
      }

      vcsRow.updatedBy = actorLabel(actor);
      await vcsRow.save();

      const activePrompt = await VCSPrompt.findByPk(vcsRow.activePromptId);

      notifyPromptChange(req, "Updated", vcsRow, activePrompt, actor);

      return serializeVcs(vcsRow, activePrompt);
    } catch (error: any) {
      logger.error(`Failed to update VCS prompt: ${error.message}`);
      throw error;
    }
  }

  // Creates or updates the single in-progress draft for a key. Never touches
  // VCS.activePromptId — production keeps reading whatever is live until an
  // explicit pushToLive.
  static async saveDraft(
    req: Request | undefined,
    vcsId: string,
    data: { prompt: unknown; aiPromptSection?: unknown },
    actor: Actor,
  ) {
    try {
      const vcsRow = await VCS.findByPk(vcsId);
      if (!vcsRow) {
        throw new Error("Prompt not found");
      }

      const nextPrompt = String(data.prompt || "").trim();
      if (!nextPrompt) {
        throw new Error("Prompt text cannot be empty");
      }
      const nextAiPromptSection = String(data.aiPromptSection ?? "").trim();

      let draft = await VCSPrompt.findOne({ where: { vcsId, status: "draft" } });

      if (draft) {
        draft.prompt = nextPrompt;
        draft.aiPromptSection = nextAiPromptSection;
        draft.createdBy = actorLabel(actor);
        await draft.save();
      } else {
        const liveVersion = vcsRow.activePromptId
          ? await VCSPrompt.findByPk(vcsRow.activePromptId)
          : null;

        draft = await VCSPrompt.create({
          vcsId,
          prompt: nextPrompt,
          aiPromptSection: nextAiPromptSection,
          version: nextVersion(liveVersion?.version),
          status: "draft",
          active: false,
          createdBy: actorLabel(actor),
        });
      }

      vcsRow.updatedBy = actorLabel(actor);
      await vcsRow.save();

      notifyPromptChange(req, "Draft Saved", vcsRow, draft, actor);

      return serializeVersion(draft);
    } catch (error: any) {
      logger.error(`Failed to save VCS prompt draft: ${error.message}`);
      throw error;
    }
  }

  // Looks up a version scoped to its key. Pre-migration keys have a live
  // VCSPrompt row that predates the vcsId column, so a strict {id, vcsId}
  // match misses it — if the id being asked for is exactly this key's
  // current activePromptId, adopt/backfill it in place instead of 404ing.
  static async findVersionForVcs(vcsRow: VCS, versionId: string): Promise<VCSPrompt | null> {
    const version = await VCSPrompt.findOne({ where: { id: versionId, vcsId: vcsRow.id } });
    if (version) return version;

    if (vcsRow.activePromptId === versionId) {
      const candidate = await VCSPrompt.findByPk(versionId);
      if (candidate && !candidate.vcsId) {
        candidate.vcsId = vcsRow.id;
        if (!candidate.status) candidate.status = "live";
        await candidate.save();
        return candidate;
      }
    }

    return null;
  }

  // Shared promotion logic for pushToLive/restoreVersion/rollbackToPrevious —
  // retires whatever is currently live and repoints VCS.activePromptId at
  // the target version.
  private static async promoteToLive(
    req: Request | undefined,
    vcsRow: VCS,
    targetVersion: VCSPrompt,
    actor: Actor,
    actionLabel: PromptActionLabel,
  ) {
    if (targetVersion.status === "live") {
      throw new Error("Version is already live");
    }

    const currentLive = vcsRow.activePromptId
      ? await VCSPrompt.findByPk(vcsRow.activePromptId)
      : null;

    if (currentLive && currentLive.id !== targetVersion.id) {
      currentLive.status = "retired";
      currentLive.active = false;
      await currentLive.save();
    }

    const deployedBy = actorLabel(actor);
    targetVersion.status = "live";
    targetVersion.active = true;
    targetVersion.deployedBy = deployedBy;
    targetVersion.deployedAt = new Date();
    await targetVersion.save();

    vcsRow.activePromptId = targetVersion.id;
    vcsRow.updatedBy = deployedBy;
    await vcsRow.save();

    notifyPromptChange(req, actionLabel, vcsRow, targetVersion, actor);

    return serializeVcs(vcsRow, targetVersion);
  }

  static async pushToLive(req: Request | undefined, vcsId: string, versionId: string, actor: Actor) {
    try {
      const vcsRow = await VCS.findByPk(vcsId);
      if (!vcsRow) {
        throw new Error("Prompt not found");
      }

      const targetVersion = await this.findVersionForVcs(vcsRow, versionId);
      if (!targetVersion) {
        throw new Error("Version not found");
      }

      return await this.promoteToLive(req, vcsRow, targetVersion, actor, "Pushed to Live");
    } catch (error: any) {
      logger.error(`Failed to push VCS prompt version live: ${error.message}`);
      throw error;
    }
  }

  static async restoreVersion(
    req: Request | undefined,
    vcsId: string,
    versionId: string,
    actor: Actor,
  ) {
    try {
      const vcsRow = await VCS.findByPk(vcsId);
      if (!vcsRow) {
        throw new Error("Prompt not found");
      }

      const targetVersion = await this.findVersionForVcs(vcsRow, versionId);
      if (!targetVersion) {
        throw new Error("Version not found");
      }

      return await this.promoteToLive(req, vcsRow, targetVersion, actor, "Version Restored");
    } catch (error: any) {
      logger.error(`Failed to restore VCS prompt version: ${error.message}`);
      throw error;
    }
  }

  static async rollbackToPrevious(req: Request | undefined, vcsId: string, actor: Actor) {
    try {
      const vcsRow = await VCS.findByPk(vcsId);
      if (!vcsRow) {
        throw new Error("Prompt not found");
      }

      const previous = await VCSPrompt.findOne({
        where: { vcsId, status: "retired" },
        order: [["deployedAt", "DESC"]],
      });

      if (!previous) {
        throw new Error("No previous version to roll back to");
      }

      return await this.promoteToLive(req, vcsRow, previous, actor, "Rolled Back");
    } catch (error: any) {
      logger.error(`Failed to roll back VCS prompt: ${error.message}`);
      throw error;
    }
  }

  static async softDeletePrompt(req: Request | undefined, id: string, actor: Actor) {
    try {
      const vcsRow = await VCS.findByPk(id);
      if (!vcsRow) {
        throw new Error("Prompt not found");
      }

      const activePrompt = await VCSPrompt.findByPk(vcsRow.activePromptId);

      await vcsRow.update({ deletedBy: actorLabel(actor) });
      await vcsRow.destroy();

      notifyPromptChange(req, "Deleted", vcsRow, activePrompt, actor);

      return serializeVcs(vcsRow, activePrompt);
    } catch (error: any) {
      logger.error(`Failed to soft-delete VCS prompt: ${error.message}`);
      throw error;
    }
  }

  static async restorePrompt(req: Request | undefined, id: string, actor: Actor) {
    try {
      const vcsRow = await VCS.findByPk(id, { paranoid: false });
      if (!vcsRow) {
        throw new Error("Prompt not found");
      }
      if (!vcsRow.deletedAt) {
        throw new Error("Prompt is not deleted");
      }

      await vcsRow.restore();
      await vcsRow.update({ deletedBy: null });

      const activePrompt = await VCSPrompt.findByPk(vcsRow.activePromptId);

      notifyPromptChange(req, "Restored", vcsRow, activePrompt, actor);

      return serializeVcs(vcsRow, activePrompt);
    } catch (error: any) {
      logger.error(`Failed to restore VCS prompt: ${error.message}`);
      throw error;
    }
  }

  static async hardDeletePrompt(req: Request | undefined, id: string, actor: Actor) {
    try {
      const vcsRow = await VCS.findByPk(id, { paranoid: false });
      if (!vcsRow) {
        throw new Error("Prompt not found");
      }
      if (!vcsRow.deletedAt) {
        throw new Error("Prompt must be deleted before it can be permanently removed");
      }

      const activePromptId = vcsRow.activePromptId;
      const activePrompt = await VCSPrompt.findByPk(activePromptId);

      notifyPromptChange(req, "Permanently Deleted", vcsRow, activePrompt, actor);

      await vcsRow.destroy({ force: true });
      await VCSPrompt.destroy({ where: { vcsId: id }, force: true });

      return true;
    } catch (error: any) {
      logger.error(`Failed to permanently delete VCS prompt: ${error.message}`);
      throw error;
    }
  }
}
