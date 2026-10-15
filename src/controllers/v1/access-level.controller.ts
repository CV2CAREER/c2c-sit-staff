import { Response } from "express";
import catchAsyncError from "@/utils/catchAsyncError";
import ErrorHandler from "@/utils/errorHandler";
import { AccessLevelService } from "@/services/admin/access-level.service";

export const getAccessLevels = catchAsyncError(async (req: any, res: Response) => {
  const levels = await AccessLevelService.getAccessLevels();
  return res.apiSuccess(levels, "Access levels fetched successfully", 200);
});

export const getAccessLevelUsers = catchAsyncError(async (req: any, res: Response) => {
  const variant = typeof req.query.variant === "string" ? req.query.variant.trim() : "";
  const accessLevel = typeof req.query.accessLevel === "string" ? req.query.accessLevel.trim() : "";

  if (variant === "users") {
    if (!accessLevel) {
      return res.apiError(new ErrorHandler("accessLevel is required", 400));
    }

    const users = await AccessLevelService.getUsersByAccessLevel(accessLevel);
    return res.apiSuccess(users, "Assigned users fetched successfully", 200);
  }

  const users = await AccessLevelService.getAllUsers();
  return res.apiSuccess(users, "Users fetched successfully", 200);
});

export const getUserAccessLevels = catchAsyncError(async (req: any, res: Response) => {
  const userId = typeof req.params.userId === "string" ? req.params.userId.trim() : "";
  if (!userId) {
    return res.apiError(new ErrorHandler("userId is required", 400));
  }

  const levels = await AccessLevelService.getUserAccessLevels(userId);
  return res.apiSuccess(levels, "User access levels fetched successfully", 200);
});

export const updateUserAccess = catchAsyncError(async (req: any, res: Response) => {
  const action =
    req.query.action === "add" || req.query.action === "remove"
      ? (req.query.action as "add" | "remove")
      : null;

  if (!action) {
    return res.apiError(new ErrorHandler("action must be add or remove", 400));
  }

  await AccessLevelService.updateUserAccess(action, req.body);
  return res.apiSuccess({}, "User access updated successfully", 200);
});

export const createAccessRule = catchAsyncError(async (req: any, res: Response) => {
  const rule = await AccessLevelService.createRule(req.body);
  return res.apiSuccess(rule, "Rule created successfully", 201);
});

export const updateAccessRule = catchAsyncError(async (req: any, res: Response) => {
  const id = typeof req.params.id === "string" ? req.params.id.trim() : "";
  if (!id) {
    return res.apiError(new ErrorHandler("Rule id is required", 400));
  }

  const rule = await AccessLevelService.updateRule(id, req.body);
  return res.apiSuccess(rule, "Rule updated successfully", 200);
});

export const deleteAccessRule = catchAsyncError(async (req: any, res: Response) => {
  const id = typeof req.params.id === "string" ? req.params.id.trim() : "";
  if (!id) {
    return res.apiError(new ErrorHandler("Rule id is required", 400));
  }

  await AccessLevelService.deleteRule(id);
  return res.apiSuccess({}, "Rule deleted successfully", 200);
});

export const getAccessLevelsMasterPassword = catchAsyncError(async (req: any, res: Response) => {
  const details = await AccessLevelService.getMasterPasswordInfo();
  return res.apiSuccess(details, "Master keys retrieved successfully", 200);
});

export const updateAccessLevelsMasterPassword = catchAsyncError(async (req: any, res: Response) => {
  // `oldPassword` is accepted for older clients, which only knew one key (Key 1).
  const { slot = 1, currentKey, oldPassword, newPassword } = req.body ?? {};
  await AccessLevelService.updateMasterPassword(
    req,
    { slot: Number(slot), currentKey: currentKey ?? oldPassword, newPassword },
    req.user,
  );
  return res.apiSuccess({}, `Master Key ${Number(slot)} updated successfully.`, 200);
});

