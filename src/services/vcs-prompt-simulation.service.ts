// services/vcs-prompt-simulation.service.ts
//
// Runs an admin-triggered test call against a specific VCS prompt version
// (the "Simulate" tab) — never touches production, always records who ran
// it and the full output, so the "History" tab can show past test runs.
import { getServiceLogger } from "../utils/createLogger";
import { queryDigitalOceanAI } from "../utils/digital-factory";
import { AI_MODEL_SHARED_DEFAULT } from "../config/ai-models";
import { VCS } from "../models/v1/keyword-population.model";
import { VCSPromptSimulationRun } from "../models/v1/vcs-prompt-simulation.model";
import { VcsPromptService } from "./vcs-prompt.service";

const logger = getServiceLogger("vcs-prompt-simulation-service");

type Actor = { email?: string; firstName?: string; lastName?: string } | null | undefined;

const actorLabel = (actor: Actor) =>
  actor?.email || `${actor?.firstName ?? ""} ${actor?.lastName ?? ""}`.trim() || "System";

const VARIABLE_PATTERN = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;

const renderPrompt = (promptText: string, variables: Record<string, string>) =>
  promptText.replace(VARIABLE_PATTERN, (match, name) =>
    variables[name] !== undefined ? variables[name] : match,
  );

const serializeRun = (run: VCSPromptSimulationRun) => ({
  id: run.id,
  vcsId: run.vcsId,
  versionId: run.versionId,
  version: run.version ?? null,
  variables: run.variables ?? {},
  renderedPrompt: run.renderedPrompt,
  output: run.output ?? null,
  model: run.model ?? null,
  status: run.status,
  errorMessage: run.errorMessage ?? null,
  durationMs: run.durationMs,
  triggeredBy: run.triggeredBy ?? null,
  createdAt: run.createdAt,
});

export class VcsPromptSimulationService {
  static async runSimulation(
    vcsId: string,
    versionId: string,
    variables: Record<string, unknown>,
    actor: Actor,
  ) {
    const vcsRow = await VCS.findByPk(vcsId);
    if (!vcsRow) {
      throw new Error("Prompt not found");
    }

    const version = await VcsPromptService.findVersionForVcs(vcsRow, versionId);
    if (!version) {
      throw new Error("Version not found");
    }

    const cleanVariables: Record<string, string> = {};
    for (const [key, value] of Object.entries(variables || {})) {
      cleanVariables[key] = String(value ?? "");
    }

    const renderedPrompt = renderPrompt(version.prompt, cleanVariables);
    const startedAt = Date.now();
    // What the run actually resolves to — vcsRow.model may be
    // unset/unrecognized, in which case queryDigitalOceanAI silently falls
    // back to the shared default. Record that resolved value (not the raw,
    // possibly-null config) so History always shows the real model used.
    const effectiveModel = vcsRow.model || AI_MODEL_SHARED_DEFAULT;

    try {
      // Use the key's own configured model, same as a real production call
      // would — otherwise Simulate could pass on a model that then behaves
      // differently (or errors) once actually live.
      const output = await queryDigitalOceanAI(renderedPrompt, undefined, undefined, undefined, vcsRow.model);
      const run = await VCSPromptSimulationRun.create({
        vcsId,
        versionId,
        version: version.version,
        variables: cleanVariables,
        renderedPrompt,
        output,
        model: effectiveModel,
        status: "success",
        durationMs: Date.now() - startedAt,
        triggeredBy: actorLabel(actor),
      });

      return serializeRun(run);
    } catch (error: any) {
      const run = await VCSPromptSimulationRun.create({
        vcsId,
        versionId,
        version: version.version,
        variables: cleanVariables,
        renderedPrompt,
        model: effectiveModel,
        status: "failed",
        errorMessage: String(error.message || "Simulation failed").slice(0, 2048),
        durationMs: Date.now() - startedAt,
        triggeredBy: actorLabel(actor),
      });

      logger.error(`Simulation failed for VCS ${vcsId} version ${versionId}: ${error.message}`);
      return serializeRun(run);
    }
  }

  static async listSimulationRuns(
    vcsId: string,
    filters: { status?: "success" | "failed"; page?: number; limit?: number } = {},
  ) {
    try {
      const page = Math.max(1, filters.page || 1);
      const limit = Math.min(100, Math.max(1, filters.limit || 25));
      const where: Record<string, unknown> = { vcsId };
      if (filters.status) where.status = filters.status;

      const { rows, count } = await VCSPromptSimulationRun.findAndCountAll({
        where,
        order: [["createdAt", "DESC"]],
        limit,
        offset: (page - 1) * limit,
      });

      return {
        rows: rows.map(serializeRun),
        count,
        page,
        limit,
      };
    } catch (error: any) {
      logger.error(`Failed to list simulation runs: ${error.message}`);
      throw error;
    }
  }

  // Cross-prompt view — every simulation run across every key, newest
  // first, each tagged with its key so the admin panel can show one global
  // "All Prompt Simulations" table alongside the per-prompt History tab.
  static async listAllSimulationRuns(
    filters: { status?: "success" | "failed"; page?: number; limit?: number } = {},
  ) {
    try {
      const page = Math.max(1, filters.page || 1);
      const limit = Math.min(100, Math.max(1, filters.limit || 25));
      const where: Record<string, unknown> = {};
      if (filters.status) where.status = filters.status;

      const { rows, count } = await VCSPromptSimulationRun.findAndCountAll({
        where,
        order: [["createdAt", "DESC"]],
        limit,
        offset: (page - 1) * limit,
      });

      const vcsIds = [...new Set(rows.map((r) => r.vcsId))];
      const vcsRows = vcsIds.length
        ? await VCS.findAll({ where: { id: vcsIds }, paranoid: false })
        : [];
      const keyById = new Map(vcsRows.map((v) => [v.id, v.key]));

      return {
        rows: rows.map((run) => ({ ...serializeRun(run), key: keyById.get(run.vcsId) ?? null })),
        count,
        page,
        limit,
      };
    } catch (error: any) {
      logger.error(`Failed to list all simulation runs: ${error.message}`);
      throw error;
    }
  }
}
