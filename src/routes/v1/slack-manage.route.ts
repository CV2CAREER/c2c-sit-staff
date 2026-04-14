import { Router } from "express";
import {
  getAllSlackMessages,
  createSlackMessage,
  updateSlackMessage,
  getMessageById,
} from "../../controllers/v1/slack-manage.controller";
import { isUserAuthenticated } from "../../middlewares/auth";
import { checkBlacklistedTokens } from "../../middlewares/checkBlacklistedToken";

const slackManageRouterV1 = Router();

slackManageRouterV1.get(
  "/",
  checkBlacklistedTokens,
  isUserAuthenticated,
  getAllSlackMessages,
);

slackManageRouterV1.post(
  "/",
  checkBlacklistedTokens,
  isUserAuthenticated,
  createSlackMessage,
);

slackManageRouterV1.put(
  "/:id",
  checkBlacklistedTokens,
  isUserAuthenticated,
  updateSlackMessage,
);

slackManageRouterV1.get(
  "/:id",
  checkBlacklistedTokens,
  isUserAuthenticated,
  getMessageById,
);

export default slackManageRouterV1;