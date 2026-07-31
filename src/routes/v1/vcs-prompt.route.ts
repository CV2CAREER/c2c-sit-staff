import { Router } from "express";
import {
  listVcsPrompts,
  createVcsPrompt,
  updateVcsPrompt,
  deleteVcsPrompt,
  restoreVcsPrompt,
  permanentlyDeleteVcsPrompt,
} from "../../controllers/v1/vcs-prompt.controller";
import {
  listVcsPromptUsageLogs,
  listVcsPromptUsageSummary,
} from "../../controllers/v1/vcs-prompt-usage.controller";

const vcsPromptRouterV1 = Router();

vcsPromptRouterV1.get("/usage/summary", listVcsPromptUsageSummary);
vcsPromptRouterV1.get("/usage", listVcsPromptUsageLogs);

vcsPromptRouterV1.get("/", listVcsPrompts);
vcsPromptRouterV1.post("/", createVcsPrompt);
vcsPromptRouterV1.put("/:id", updateVcsPrompt);
vcsPromptRouterV1.delete("/:id", deleteVcsPrompt);
vcsPromptRouterV1.post("/:id/restore", restoreVcsPrompt);
vcsPromptRouterV1.delete("/:id/permanent", permanentlyDeleteVcsPrompt);

export default vcsPromptRouterV1;
