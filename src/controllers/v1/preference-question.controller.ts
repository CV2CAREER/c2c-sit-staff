import { Response } from "express";
import catchAsyncError from "@/utils/catchAsyncError";
import { PreferenceQuestionService } from "@/services/admin/preference-question.service";
import { getServiceLogger } from "@/utils/createLogger";

const logger = getServiceLogger("preference-question-controller");

const getHost = (req: any) => req.headers.host || req.headers.origin || "localhost";

export const getPreferenceQuestions = catchAsyncError(async (req: any, res: Response) => {
  logger.info("Fetching preference questions");
  const questions = await PreferenceQuestionService.listQuestions();
  return res.apiSuccess(questions, "Questions fetched successfully", 200);
});

export const getDeletedPreferenceQuestions = catchAsyncError(async (req: any, res: Response) => {
  logger.info("Fetching recycle bin preference questions");
  const questions = await PreferenceQuestionService.listDeletedQuestions();
  return res.apiSuccess(questions, "Recycle bin fetched successfully", 200);
});

export const getPreferenceQuestion = catchAsyncError(async (req: any, res: Response) => {
  const { id } = req.params;
  logger.info(`Fetching preference question: ${id}`);
  const question = await PreferenceQuestionService.getQuestion(id);
  return res.apiSuccess(question, "Question fetched successfully", 200);
});

export const createPreferenceQuestion = catchAsyncError(async (req: any, res: Response) => {
  logger.info("Creating preference question");
  const question = await PreferenceQuestionService.createQuestion(
    {
      ...req.body,
      createdById: req.user?.id,
    },
    getHost(req),
    req.user,
  );
  return res.apiSuccess(question, "Question created successfully", 201);
});

export const updatePreferenceQuestion = catchAsyncError(async (req: any, res: Response) => {
  const { id } = req.params;
  logger.info(`Updating preference question: ${id}`);
  const question = await PreferenceQuestionService.updateQuestion(id, req.body, getHost(req), req.user);
  return res.apiSuccess(question, "Question updated successfully", 200);
});

export const deletePreferenceQuestion = catchAsyncError(async (req: any, res: Response) => {
  const { id } = req.params;
  logger.info(`Moving preference question to recycle bin: ${id}`);
  const result = await PreferenceQuestionService.deleteQuestion(id, req.user?.id, getHost(req), req.user);
  return res.apiSuccess(result, "Question moved to recycle bin", 200);
});

export const restorePreferenceQuestion = catchAsyncError(async (req: any, res: Response) => {
  const { id } = req.params;
  logger.info(`Restoring preference question: ${id}`);
  const question = await PreferenceQuestionService.restoreQuestion(id, getHost(req), req.user);
  return res.apiSuccess(question, "Question restored successfully", 200);
});

export const hardDeletePreferenceQuestion = catchAsyncError(async (req: any, res: Response) => {
  const { id } = req.params;
  logger.info(`Permanently deleting preference question: ${id}`);
  const result = await PreferenceQuestionService.hardDeleteQuestion(id, getHost(req), req.user);
  return res.apiSuccess(result, "Question permanently deleted", 200);
});

export const reorderPreferenceQuestions = catchAsyncError(async (req: any, res: Response) => {
  logger.info("Reordering preference questions");
  const questions = await PreferenceQuestionService.reorderQuestions(req.body?.items, getHost(req), req.user);
  return res.apiSuccess(questions, "Questions reordered successfully", 200);
});
