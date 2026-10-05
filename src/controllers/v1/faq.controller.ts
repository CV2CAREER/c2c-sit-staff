import { Response } from "express";
import catchAsyncError from "@/utils/catchAsyncError";
import { FaqService } from "@/services/admin/faq.service";
import { getServiceLogger } from "@/utils/createLogger";

const logger = getServiceLogger("faq-controller");

const actorOf = (req: any) => req.user ?? null;
const idOf = (req: any) => String(req.params.id ?? "").trim();

export const getFaqCategories = catchAsyncError(async (_req: any, res: Response) => {
  const categories = await FaqService.listCategories();
  return res.apiSuccess(categories, "FAQ categories fetched successfully", 200);
});

export const createFaqCategory = catchAsyncError(async (req: any, res: Response) => {
  logger.info(`Creating FAQ category — triggered by: ${req.user?.email ?? "unknown"}`);
  const category = await FaqService.createCategory(req.body ?? {});
  return res.apiSuccess(category, "FAQ category created successfully", 201);
});

export const getFaqArticles = catchAsyncError(async (_req: any, res: Response) => {
  const articles = await FaqService.listArticles();
  return res.apiSuccess(articles, "FAQ articles fetched successfully", 200);
});

export const createFaqArticle = catchAsyncError(async (req: any, res: Response) => {
  logger.info(`Creating FAQ article — triggered by: ${req.user?.email ?? "unknown"}`);
  const article = await FaqService.createArticle(req.body ?? {}, actorOf(req));
  return res.apiSuccess(article, "FAQ article saved successfully", 201);
});

export const updateFaqArticle = catchAsyncError(async (req: any, res: Response) => {
  logger.info(`Updating FAQ article ${idOf(req)} — triggered by: ${req.user?.email ?? "unknown"}`);
  const article = await FaqService.updateArticle(idOf(req), req.body ?? {}, actorOf(req));
  return res.apiSuccess(article, "FAQ article saved successfully", 200);
});

export const submitFaqArticleForReview = catchAsyncError(async (req: any, res: Response) => {
  const article = await FaqService.submitForReview(idOf(req), actorOf(req));
  return res.apiSuccess(article, "FAQ article sent for review", 200);
});

export const approveFaqArticle = catchAsyncError(async (req: any, res: Response) => {
  logger.info(`Approving FAQ article ${idOf(req)} — triggered by: ${req.user?.email ?? "unknown"}`);
  const article = await FaqService.approveArticle(idOf(req), actorOf(req));
  return res.apiSuccess(article, "FAQ article approved and published", 200);
});

export const returnFaqArticleToDraft = catchAsyncError(async (req: any, res: Response) => {
  const article = await FaqService.returnToDraft(idOf(req), actorOf(req));
  return res.apiSuccess(article, "FAQ article sent back to draft", 200);
});

export const deleteFaqArticle = catchAsyncError(async (req: any, res: Response) => {
  logger.info(`Deleting FAQ article ${idOf(req)} — triggered by: ${req.user?.email ?? "unknown"}`);
  const result = await FaqService.deleteArticle(idOf(req));
  return res.apiSuccess(result, "FAQ article deleted", 200);
});
