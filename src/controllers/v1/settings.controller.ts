import { Request, Response } from "express";
import catchAsyncError from "../../utils/catchAsyncError";
import ErrorHandler from "../../utils/errorHandler";
import { SettingService } from "../../services/admin/settings.service";
import { getServiceLogger } from "../../utils/createLogger";

const logger = getServiceLogger("Setting-controller");

/**
 * Get Master Password details (without password value)
 */
export const getMasterPassword = catchAsyncError(async (req: any, res: Response) => {
  try {
    const masterpass = await SettingService.getMasterPassword();
    return res.apiSuccess(masterpass, "Master password details retrieved successfully", 200);
  } catch (error: any) {
    logger.error(`❌ Failed to get master password: ${error.message}`);

    if (error.message === "Master password record not found.") {
      return res.apiError(new ErrorHandler(error.message, 404));
    }

    return res.apiError(new ErrorHandler(error.message || "Failed to retrieve master password", 500));
  }
});

/**
 * Update Master Password
 */
export const updateMasterPassword = catchAsyncError(async (req: any, res: Response) => {
  try {
    const { oldPassword, newPassword } = req.body;

    await SettingService.updateMasterPassword(req, oldPassword, newPassword, req.user);

    return res.apiSuccess({}, "Master password updated successfully.", 200);
  } catch (error: any) {
    logger.error(`❌ Failed to update master password: ${error.message}`);

    if (error.message === "Master password record not found.") {
      return res.apiError(new ErrorHandler(error.message, 404));
    }

    if (error.message === "Invalid old password. Try again!") {
      return res.apiError(new ErrorHandler(error.message, 401));
    }

    return res.apiError(new ErrorHandler(error.message || "An error occurred while updating the master password.", 500));
  }
});