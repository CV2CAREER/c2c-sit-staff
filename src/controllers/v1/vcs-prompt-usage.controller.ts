// controllers/v1/vcs-prompt-usage.controller.ts
import { Response } from "express";
import catchAsyncError from "../../utils/catchAsyncError";
import { VcsPromptUsageService } from "../../services/vcs-prompt-usage.service";

export const listVcsPromptUsageLogs = catchAsyncError(async (req: any, res: Response) => {
  const key = typeof req.query.key === "string" ? req.query.key : undefined;
  const page = req.query.page ? Number(req.query.page) : undefined;
  const limit = req.query.limit ? Number(req.query.limit) : undefined;

  const data = await VcsPromptUsageService.listLogs({ key, page, limit });
  return res.apiSuccess(data, "Usage logs retrieved successfully");
});

export const listVcsPromptUsageSummary = catchAsyncError(async (_req: any, res: Response) => {
  const data = await VcsPromptUsageService.listSummary();
  return res.apiSuccess(data, "Usage summary retrieved successfully");
});
