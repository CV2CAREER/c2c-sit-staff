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
  version: prompt?.version ?? null,
  deletedAt: vcs.deletedAt ?? null,
  deletedBy: vcs.deletedBy ?? null,
  createdAt: vcs.createdAt,
  updatedAt: vcs.updatedAt,
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

// Fire-and-forget Slack + team-email notification — never allowed to affect
// the outcome of the CRUD action it's reporting on.
const notifyPromptChange = (
  req: Request | undefined,
  actionLabel: "Created" | "Updated" | "Deleted" | "Restored" | "Permanently Deleted",
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

  static async createPrompt(
    req: Request | undefined,
    data: { key: unknown; prompt: unknown; active?: unknown },
    actor: Actor,
  ) {
    try {
      const key = normalizeKey(data.key);
      const prompt = String(data.prompt || "").trim();
      const active = data.active !== undefined ? Boolean(data.active) : true;

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

      const promptRow = await VCSPrompt.create({
        prompt,
        version: "1",
        active: true,
      });

      const vcsRow = await VCS.create({
        key,
        active,
        activePromptId: promptRow.id,
      });

      notifyPromptChange(req, "Created", vcsRow, promptRow, actor);

      return serializeVcs(vcsRow, promptRow);
    } catch (error: any) {
      logger.error(`Failed to create VCS prompt: ${error.message}`);
      throw error;
    }
  }

  static async updatePrompt(
    req: Request | undefined,
    id: string,
    data: { key?: unknown; prompt?: unknown; active?: unknown },
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

      let activePrompt = await VCSPrompt.findByPk(vcsRow.activePromptId);

      if (data.prompt !== undefined) {
        const nextPrompt = String(data.prompt).trim();
        if (!nextPrompt) {
          throw new Error("Prompt text cannot be empty");
        }

        if (nextPrompt !== activePrompt?.prompt) {
          if (activePrompt) {
            await activePrompt.update({ active: false });
          }

          activePrompt = await VCSPrompt.create({
            prompt: nextPrompt,
            version: nextVersion(activePrompt?.version),
            active: true,
          });

          vcsRow.activePromptId = activePrompt.id;
        }
      }

      await vcsRow.save();

      notifyPromptChange(req, "Updated", vcsRow, activePrompt, actor);

      return serializeVcs(vcsRow, activePrompt);
    } catch (error: any) {
      logger.error(`Failed to update VCS prompt: ${error.message}`);
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
      if (activePromptId) {
        await VCSPrompt.destroy({ where: { id: activePromptId } });
      }

      return true;
    } catch (error: any) {
      logger.error(`Failed to permanently delete VCS prompt: ${error.message}`);
      throw error;
    }
  }
}
