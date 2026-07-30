import { Router } from "express";
import {
  deleteAdminAiPrompts,
  deleteAdminAiQueue,
  deleteAdminAiSimulation,
  getAdminAiCvStyle,
  getAdminAiPrompts,
  getAdminAiQueue,
  getAdminAiSimulations,
  getAdminAiVcs,
  postAdminAiCvStyle,
  postAdminAiPrompts,
  postAdminAiQueue,
  postAdminAiSimulation,
  postAdminAiVcs,
  putAdminAiPrompts,
  putAdminAiVcs,
} from "../../controllers/v1/admin-ai.controller";
import { authorizeRoles } from "../../middlewares/authorizeRoles";

const adminAiRouterV1 = Router();

// GET reads are open to admin + assistant; everything that creates, edits,
// or deletes AI prompt config is admin-only.
const readAccess = authorizeRoles("admin", "assistant");
const writeAccess = authorizeRoles("admin");

adminAiRouterV1.get("/:module", readAccess, getAdminAiPrompts);
adminAiRouterV1.post("/:module", writeAccess, postAdminAiPrompts);
adminAiRouterV1.put("/:module", writeAccess, putAdminAiPrompts);
adminAiRouterV1.delete("/:module", writeAccess, deleteAdminAiPrompts);

adminAiRouterV1.get("/:module/queue", readAccess, getAdminAiQueue);
adminAiRouterV1.post("/:module/queue", writeAccess, postAdminAiQueue);
adminAiRouterV1.delete("/:module/queue", writeAccess, deleteAdminAiQueue);

adminAiRouterV1.get("/:module/vcs", readAccess, getAdminAiVcs);
adminAiRouterV1.post("/:module/vcs", writeAccess, postAdminAiVcs);
adminAiRouterV1.put("/:module/vcs", writeAccess, putAdminAiVcs);

adminAiRouterV1.get("/:module/simulation", readAccess, getAdminAiSimulations);
adminAiRouterV1.post("/:module/simulation", writeAccess, postAdminAiSimulation);
adminAiRouterV1.delete("/:module/simulation", writeAccess, deleteAdminAiSimulation);

adminAiRouterV1.get("/:module/style", readAccess, getAdminAiCvStyle);
adminAiRouterV1.post("/:module/style", writeAccess, postAdminAiCvStyle);

export default adminAiRouterV1;
