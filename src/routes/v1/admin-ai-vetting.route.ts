import { Router } from "express";
import {
  getAiVettingConfig,
  updateAiVettingConfig,
} from "../../controllers/v1/admin-ai-vetting.controller";
import { authorizeRoles } from "../../middlewares/authorizeRoles";

const adminAiVettingRouterV1 = Router();

const readAccess = authorizeRoles("admin", "assistant");
const writeAccess = authorizeRoles("admin");

adminAiVettingRouterV1.get("/", readAccess, getAiVettingConfig);
adminAiVettingRouterV1.put("/", writeAccess, updateAiVettingConfig);

export default adminAiVettingRouterV1;
