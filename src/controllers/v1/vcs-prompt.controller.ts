// controllers/v1/vcs-prompt.controller.ts
import { Response } from "express";
import catchAsyncError from "../../utils/catchAsyncError";
import ErrorHandler from "../../utils/errorHandler";
import { VcsPromptService } from "../../services/vcs-prompt.service";

const getActor = (req: any) => ({
  email: req.user?.email,
  firstName: req.user?.firstName,
  lastName: req.user?.lastName,
});

const errorStatus = (message: string) => {
  if (message === "Prompt not found") return 404;
  if (message.includes("already exists")) return 409;
  return 400;
};

export const listVcsPrompts = catchAsyncError(async (req: any, res: Response) => {
  const status = typeof req.query.status === "string" ? req.query.status.toLowerCase() : "";
  const data =
    status === "deleted"
      ? await VcsPromptService.listDeletedPrompts()
      : await VcsPromptService.listPrompts();
  return res.apiSuccess(data, "Prompts retrieved successfully");
});

export const createVcsPrompt = catchAsyncError(async (req: any, res: Response) => {
  try {
    const data = await VcsPromptService.createPrompt(req, req.body || {}, getActor(req));
    return res.apiSuccess(data, "Prompt created successfully", 201);
  } catch (error: any) {
    return res.apiError(new ErrorHandler(error.message, errorStatus(error.message)));
  }
});

export const updateVcsPrompt = catchAsyncError(async (req: any, res: Response) => {
  try {
    const data = await VcsPromptService.updatePrompt(
      req,
      req.params.id,
      req.body || {},
      getActor(req),
    );
    return res.apiSuccess(data, "Prompt updated successfully");
  } catch (error: any) {
    return res.apiError(new ErrorHandler(error.message, errorStatus(error.message)));
  }
});

export const deleteVcsPrompt = catchAsyncError(async (req: any, res: Response) => {
  try {
    const data = await VcsPromptService.softDeletePrompt(req, req.params.id, getActor(req));
    return res.apiSuccess(data, "Prompt moved to recycle bin");
  } catch (error: any) {
    return res.apiError(new ErrorHandler(error.message, errorStatus(error.message)));
  }
});

export const restoreVcsPrompt = catchAsyncError(async (req: any, res: Response) => {
  try {
    const data = await VcsPromptService.restorePrompt(req, req.params.id, getActor(req));
    return res.apiSuccess(data, "Prompt restored successfully");
  } catch (error: any) {
    return res.apiError(new ErrorHandler(error.message, errorStatus(error.message)));
  }
});

export const permanentlyDeleteVcsPrompt = catchAsyncError(async (req: any, res: Response) => {
  try {
    await VcsPromptService.hardDeletePrompt(req, req.params.id, getActor(req));
    return res.apiSuccess({}, "Prompt permanently deleted");
  } catch (error: any) {
    return res.apiError(new ErrorHandler(error.message, errorStatus(error.message)));
  }
});
