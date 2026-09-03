import { Router } from "express";
import { checkBlacklistedTokens } from "@/middlewares/checkBlacklistedToken";
import { isUserAuthenticated } from "@/middlewares/auth";
import { authorizeRoles } from "@/middlewares/authorizeRoles";
import {
  getPreferenceQuestions,
  getDeletedPreferenceQuestions,
  getPreferenceQuestion,
  createPreferenceQuestion,
  updatePreferenceQuestion,
  deletePreferenceQuestion,
  restorePreferenceQuestion,
  hardDeletePreferenceQuestion,
  reorderPreferenceQuestions,
} from "@/controllers/v1/preference-question.controller";

const preferenceQuestionRouterV1 = Router();

preferenceQuestionRouterV1.use(
  checkBlacklistedTokens,
  isUserAuthenticated,
  authorizeRoles("admin", "assistant"),
);

preferenceQuestionRouterV1.get("/", getPreferenceQuestions);
preferenceQuestionRouterV1.get("/recycle-bin", getDeletedPreferenceQuestions);
preferenceQuestionRouterV1.get("/:id", getPreferenceQuestion);
preferenceQuestionRouterV1.post("/", authorizeRoles("admin"), createPreferenceQuestion);
preferenceQuestionRouterV1.post("/reorder", authorizeRoles("admin"), reorderPreferenceQuestions);
preferenceQuestionRouterV1.post("/:id/restore", authorizeRoles("admin"), restorePreferenceQuestion);
preferenceQuestionRouterV1.put("/:id", authorizeRoles("admin"), updatePreferenceQuestion);
preferenceQuestionRouterV1.delete("/:id", authorizeRoles("admin"), deletePreferenceQuestion);
preferenceQuestionRouterV1.delete("/:id/permanent", authorizeRoles("admin"), hardDeletePreferenceQuestion);

export default preferenceQuestionRouterV1;
