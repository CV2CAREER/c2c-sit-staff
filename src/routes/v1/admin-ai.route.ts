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

const adminAiRouterV1 = Router();

adminAiRouterV1.get("/:module", getAdminAiPrompts);
adminAiRouterV1.post("/:module", postAdminAiPrompts);
adminAiRouterV1.put("/:module", putAdminAiPrompts);
adminAiRouterV1.delete("/:module", deleteAdminAiPrompts);

adminAiRouterV1.get("/:module/queue", getAdminAiQueue);
adminAiRouterV1.post("/:module/queue", postAdminAiQueue);
adminAiRouterV1.delete("/:module/queue", deleteAdminAiQueue);

adminAiRouterV1.get("/:module/vcs", getAdminAiVcs);
adminAiRouterV1.post("/:module/vcs", postAdminAiVcs);
adminAiRouterV1.put("/:module/vcs", putAdminAiVcs);

adminAiRouterV1.get("/:module/simulation", getAdminAiSimulations);
adminAiRouterV1.post("/:module/simulation", postAdminAiSimulation);
adminAiRouterV1.delete("/:module/simulation", deleteAdminAiSimulation);

adminAiRouterV1.get("/:module/style", getAdminAiCvStyle);
adminAiRouterV1.post("/:module/style", postAdminAiCvStyle);

export default adminAiRouterV1;
