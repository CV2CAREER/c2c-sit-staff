import { Response } from "express";
import catchAsyncError from "@/utils/catchAsyncError";
import { DropdownOptionService } from "@/services/admin/dropdown-option.service";
import { getServiceLogger } from "@/utils/createLogger";

const logger = getServiceLogger("dropdown-option-controller");

export const getDropdownOptions = catchAsyncError(async (req: any, res: Response) => {
  const { listKey } = req.params;
  logger.info(`Fetching dropdown options: ${listKey}`);
  const result = await DropdownOptionService.listByListKey(listKey, {
    q: req.query?.q,
    page: req.query?.page ? Number(req.query.page) : undefined,
    limit: req.query?.limit ? Number(req.query.limit) : undefined,
  });
  return res.apiSuccess(result, "Options fetched successfully", 200);
});

export const getDeletedDropdownOptions = catchAsyncError(async (req: any, res: Response) => {
  const { listKey } = req.params;
  logger.info(`Fetching recycle bin dropdown options: ${listKey}`);
  const rows = await DropdownOptionService.listDeletedByListKey(listKey);
  return res.apiSuccess(rows, "Recycle bin fetched successfully", 200);
});

export const getDropdownOption = catchAsyncError(async (req: any, res: Response) => {
  const { id } = req.params;
  logger.info(`Fetching dropdown option: ${id}`);
  const row = await DropdownOptionService.getOne(id);
  return res.apiSuccess(row, "Option fetched successfully", 200);
});

export const createDropdownOption = catchAsyncError(async (req: any, res: Response) => {
  const { listKey } = req.params;
  logger.info(`Creating dropdown option: ${listKey}`);
  const row = await DropdownOptionService.createOption(listKey, {
    ...req.body,
    createdById: req.user?.id,
  });
  return res.apiSuccess(row, "Option created successfully", 201);
});

export const updateDropdownOption = catchAsyncError(async (req: any, res: Response) => {
  const { id } = req.params;
  logger.info(`Updating dropdown option: ${id}`);
  const row = await DropdownOptionService.updateOption(id, req.body);
  return res.apiSuccess(row, "Option updated successfully", 200);
});

export const deleteDropdownOption = catchAsyncError(async (req: any, res: Response) => {
  const { id } = req.params;
  logger.info(`Moving dropdown option to recycle bin: ${id}`);
  const result = await DropdownOptionService.deleteOption(id, req.user?.id);
  return res.apiSuccess(result, "Option moved to recycle bin", 200);
});

export const restoreDropdownOption = catchAsyncError(async (req: any, res: Response) => {
  const { id } = req.params;
  logger.info(`Restoring dropdown option: ${id}`);
  const row = await DropdownOptionService.restoreOption(id);
  return res.apiSuccess(row, "Option restored successfully", 200);
});

export const hardDeleteDropdownOption = catchAsyncError(async (req: any, res: Response) => {
  const { id } = req.params;
  logger.info(`Permanently deleting dropdown option: ${id}`);
  const result = await DropdownOptionService.hardDeleteOption(id);
  return res.apiSuccess(result, "Option permanently deleted", 200);
});

export const reorderDropdownOptions = catchAsyncError(async (req: any, res: Response) => {
  const { listKey } = req.params;
  logger.info(`Reordering dropdown options: ${listKey}`);
  const result = await DropdownOptionService.reorderOptions(req.body?.items);
  return res.apiSuccess(result, "Options reordered successfully", 200);
});
