import { Router } from "express";
import {
  listVcsPrompts,
  createVcsPrompt,
  updateVcsPrompt,
  deleteVcsPrompt,
  restoreVcsPrompt,
  permanentlyDeleteVcsPrompt,
  listVcsPromptVersions,
  saveVcsPromptDraft,
  pushVcsPromptVersionLive,
  restoreVcsPromptVersion,
  rollbackVcsPromptVersion,
} from "../../controllers/v1/vcs-prompt.controller";
import {
  listVcsPromptUsageLogs,
  listVcsPromptUsageSummary,
  listVcsPromptLastUsed,
} from "../../controllers/v1/vcs-prompt-usage.controller";
import {
  runVcsPromptSimulation,
  listVcsPromptSimulationRuns,
  listAllVcsPromptSimulationRuns,
} from "../../controllers/v1/vcs-prompt-simulation.controller";

const vcsPromptRouterV1 = Router();

vcsPromptRouterV1.get("/usage/summary", listVcsPromptUsageSummary);
vcsPromptRouterV1.get("/usage/last-used", listVcsPromptLastUsed);
vcsPromptRouterV1.get("/usage", listVcsPromptUsageLogs);
vcsPromptRouterV1.get("/simulations", listAllVcsPromptSimulationRuns);

vcsPromptRouterV1.get("/", listVcsPrompts);
vcsPromptRouterV1.post("/", createVcsPrompt);
vcsPromptRouterV1.put("/:id", updateVcsPrompt);
vcsPromptRouterV1.delete("/:id", deleteVcsPrompt);
vcsPromptRouterV1.post("/:id/restore", restoreVcsPrompt);
vcsPromptRouterV1.delete("/:id/permanent", permanentlyDeleteVcsPrompt);

vcsPromptRouterV1.get("/:vcsId/versions", listVcsPromptVersions);
vcsPromptRouterV1.post("/:vcsId/draft", saveVcsPromptDraft);
vcsPromptRouterV1.post("/:vcsId/versions/:versionId/push", pushVcsPromptVersionLive);
vcsPromptRouterV1.post("/:vcsId/versions/:versionId/restore", restoreVcsPromptVersion);
vcsPromptRouterV1.post("/:vcsId/rollback", rollbackVcsPromptVersion);

vcsPromptRouterV1.get("/:vcsId/simulations", listVcsPromptSimulationRuns);
vcsPromptRouterV1.post("/:vcsId/versions/:versionId/simulate", runVcsPromptSimulation);

export default vcsPromptRouterV1;
