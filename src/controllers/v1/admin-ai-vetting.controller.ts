import { Request, Response } from "express";
import catchAsyncError from "../../utils/catchAsyncError";
import { aiVettingConfigApplicationService } from "../../services/admin/ai-vetting-config.application.service";

export const getAiVettingConfig = catchAsyncError(
  async (req: Request, res: Response) => {
    const config = await aiVettingConfigApplicationService.getConfig();
    return res.apiSuccess(config, "AI Vetting config fetched successfully");
  },
);

export const updateAiVettingConfig = catchAsyncError(
  async (req: any, res: Response) => {
    const body = req.body ?? {};

    const input: Record<string, boolean> = {};
    for (const key of [
      "enabled",
      "learningMonth",
      "mqaLiveFromDayOne",
      "hqaAutoSubmit",
      "lqaAutoSkip",
    ]) {
      if (typeof body[key] === "boolean") {
        input[key] = body[key];
      }
    }

    const config = await aiVettingConfigApplicationService.updateConfig(
      input,
      req.user?.id ?? null,
    );

    return res.apiSuccess(config, "AI Vetting config updated successfully");
  },
);
