import { Router } from "express";
import {
  getAllSlackMessages,
  createSlackMessage,
  updateSlackMessage,
  getMessageById,
} from "../../controllers/v1/slack-manage.controller";
import { isUserAuthenticated } from "../../middlewares/auth";
import { checkBlacklistedTokens } from "../../middlewares/checkBlacklistedToken";
import { authorizeRoles } from "@/middlewares/authorizeRoles";

const slackManageRouterV1 = Router();

slackManageRouterV1.use(checkBlacklistedTokens, isUserAuthenticated, authorizeRoles("admin", "assistant"));

slackManageRouterV1.get(
  "/",
  getAllSlackMessages,
);

slackManageRouterV1.post(
  "/",
  authorizeRoles("admin"),
  createSlackMessage,
);

slackManageRouterV1.put(
  "/:id",
  authorizeRoles("admin"),
  updateSlackMessage,
);

slackManageRouterV1.get(
  "/:id",
  authorizeRoles("admin"),
  getMessageById,
);

export default slackManageRouterV1;