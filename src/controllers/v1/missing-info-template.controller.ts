import { Response } from "express";
import catchAsyncError from "@/utils/catchAsyncError";
import ErrorHandler from "@/utils/errorHandler";
import { MissingInfoTemplateService } from "@/services/admin/missing-info-template.service";
import { getServiceLogger } from "@/utils/createLogger";

const logger = getServiceLogger("missing-info-template-controller");

export const getMissingInfoTemplates = catchAsyncError(async (req: any, res: Response) => {
  const category = typeof req.query.category === "string" ? req.query.category : undefined;
  const status = typeof req.query.status === "string" ? req.query.status : undefined;
  logger.info(`Fetching missing info templates (category: ${category || "all"}, status: ${status || "all"})`);
  const templates = await MissingInfoTemplateService.listTemplates(category, status);
  return res.apiSuccess(templates, "Templates fetched successfully", 200);
});

export const getMissingInfoTemplate = catchAsyncError(async (req: any, res: Response) => {
  const { id } = req.params;
  logger.info(`Fetching missing info template: ${id}`);
  const template = await MissingInfoTemplateService.getTemplate(id);
  return res.apiSuccess(template, "Template fetched successfully", 200);
});

export const createMissingInfoTemplate = catchAsyncError(async (req: any, res: Response) => {
  logger.info(`Creating missing info template`);
  const template = await MissingInfoTemplateService.createTemplate({
    ...req.body,
    createdById: req.user?.id || req.user?.userId || "unknown",
  });
  return res.apiSuccess(template, "Template created successfully", 201);
});

export const updateMissingInfoTemplate = catchAsyncError(async (req: any, res: Response) => {
  const { id } = req.params;
  logger.info(`Updating missing info template: ${id}`);
  const template = await MissingInfoTemplateService.updateTemplate(id, req.body);
  return res.apiSuccess(template, "Template updated successfully", 200);
});

export const deleteMissingInfoTemplate = catchAsyncError(async (req: any, res: Response) => {
  const { id } = req.params;
  logger.info(`Deleting missing info template: ${id}`);
  const result = await MissingInfoTemplateService.deleteTemplate(id);
  return res.apiSuccess(result, "Template deleted successfully", 200);
});

export const publishMissingInfoTemplate = catchAsyncError(async (req: any, res: Response) => {
  const { id } = req.params;
  logger.info(`Publishing missing info template: ${id}`);
  const template = await MissingInfoTemplateService.publishTemplate(id, req.user);
  return res.apiSuccess(template, "Template published successfully", 200);
});
