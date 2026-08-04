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
  if (message === "Prompt not found" || message === "Version not found") return 404;
  if (message.includes("already exists") || message === "Version is already live") return 409;
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

export const listVcsPromptVersions = catchAsyncError(async (req: any, res: Response) => {
  try {
    const data = await VcsPromptService.listVersions(req.params.vcsId);
    return res.apiSuccess(data, "Versions retrieved successfully");
  } catch (error: any) {
    return res.apiError(new ErrorHandler(error.message, errorStatus(error.message)));
  }
});

export const saveVcsPromptDraft = catchAsyncError(async (req: any, res: Response) => {
  try {
    const data = await VcsPromptService.saveDraft(
      req,
      req.params.vcsId,
      req.body || {},
      getActor(req),
    );
    return res.apiSuccess(data, "Draft saved successfully");
  } catch (error: any) {
    return res.apiError(new ErrorHandler(error.message, errorStatus(error.message)));
  }
});

export const pushVcsPromptVersionLive = catchAsyncError(async (req: any, res: Response) => {
  try {
    const data = await VcsPromptService.pushToLive(
      req,
      req.params.vcsId,
      req.params.versionId,
      getActor(req),
    );
    return res.apiSuccess(data, "Version pushed to live");
  } catch (error: any) {
    return res.apiError(new ErrorHandler(error.message, errorStatus(error.message)));
  }
});

export const restoreVcsPromptVersion = catchAsyncError(async (req: any, res: Response) => {
  try {
    const data = await VcsPromptService.restoreVersion(
      req,
      req.params.vcsId,
      req.params.versionId,
      getActor(req),
    );
    return res.apiSuccess(data, "Version restored successfully");
  } catch (error: any) {
    return res.apiError(new ErrorHandler(error.message, errorStatus(error.message)));
  }
});

export const rollbackVcsPromptVersion = catchAsyncError(async (req: any, res: Response) => {
  try {
    const data = await VcsPromptService.rollbackToPrevious(req, req.params.vcsId, getActor(req));
    return res.apiSuccess(data, "Rolled back successfully");
  } catch (error: any) {
    return res.apiError(new ErrorHandler(error.message, errorStatus(error.message)));
  }
});
