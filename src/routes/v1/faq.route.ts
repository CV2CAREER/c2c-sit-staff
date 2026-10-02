import { Router } from "express";
import { checkBlacklistedTokens } from "@/middlewares/checkBlacklistedToken";
import { isUserAuthenticated } from "@/middlewares/auth";
import { authorizeRoles } from "@/middlewares/authorizeRoles";
import {
  approveFaqArticle,
  createFaqArticle,
  createFaqCategory,
  deleteFaqArticle,
  getFaqArticles,
  getFaqCategories,
  returnFaqArticleToDraft,
  submitFaqArticleForReview,
  updateFaqArticle,
} from "@/controllers/v1/faq.controller";

const faqRouterV1 = Router();

// Admins and assistants can read, draft and send for review.
faqRouterV1.use(
  checkBlacklistedTokens,
  isUserAuthenticated,
  authorizeRoles("admin", "assistant"),
);

faqRouterV1.get("/categories", getFaqCategories);
// The taxonomy is the bot's retrieval structure, so only admins change it.
faqRouterV1.post("/categories", authorizeRoles("admin"), createFaqCategory);

faqRouterV1.get("/articles", getFaqArticles);
faqRouterV1.post("/articles", createFaqArticle);
faqRouterV1.patch("/articles/:id", updateFaqArticle);
faqRouterV1.post("/articles/:id/submit", submitFaqArticleForReview);
faqRouterV1.delete("/articles/:id", deleteFaqArticle);

// Review gate — publishing is an admin decision (C2C-253).
faqRouterV1.post("/articles/:id/approve", authorizeRoles("admin"), approveFaqArticle);
faqRouterV1.post("/articles/:id/return", authorizeRoles("admin"), returnFaqArticleToDraft);

export default faqRouterV1;
