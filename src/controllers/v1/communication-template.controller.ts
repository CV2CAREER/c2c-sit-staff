import { Response } from "express";
import catchAsyncError from "@/utils/catchAsyncError";
import ErrorHandler from "@/utils/errorHandler";
import { CommunicationTemplateService } from "@/services/admin/communication-template.service";
import { getServiceLogger } from "@/utils/createLogger";

const logger = getServiceLogger("communication-template-controller");

const getIdentifier = (req: any) => {
  const id = typeof req.query.id === "string" ? req.query.id.trim() : "";
  const templateName =
    typeof req.query.templateName === "string"
      ? req.query.templateName.trim()
      : typeof req.query.template === "string"
        ? req.query.template.trim()
        : "";
  return id || templateName;
};

export const getCommunicationTemplates = catchAsyncError(async (req: any, res: Response) => {
  const type = typeof req.query.type === "string" ? req.query.type : undefined;
  logger.info(`Fetching communication templates (type: ${type || "all"})`);
  const templates = await CommunicationTemplateService.listTemplates(type);
  return res.apiSuccess(templates, "Templates fetched successfully", 200);
});

export const createCommunicationTemplate = catchAsyncError(async (req: any, res: Response) => {
  const requestType = typeof req.query.request === "string" ? req.query.request.trim() : "";
  if (requestType === "duplicate") {
    const templateName =
      typeof req.query.templateName === "string" ? req.query.templateName.trim() : "";
    logger.info(`Duplicating template via controller: ${templateName}`);
    const duplicate = await CommunicationTemplateService.duplicate(templateName);
    return res.apiSuccess(duplicate, "Template duplicated successfully", 201);
  }

  logger.info(`Creating new communication template`);
  const template = await CommunicationTemplateService.createTemplate(req.body);
  return res.apiSuccess(template, "Template created successfully", 201);
});

export const patchCommunicationTemplate = catchAsyncError(async (req: any, res: Response) => {
  const action = typeof req.query.action === "string" ? req.query.action.trim() : "";
  const identifier = getIdentifier(req) || (typeof req.body?.id === "string" ? req.body.id : "");

  if (action === "soft-delete") {
    logger.info(`Soft-deleting template via controller: ${identifier}`);
    const data = await CommunicationTemplateService.softDelete(identifier);
    return res.apiSuccess(data, "Template moved to recycle bin", 200);
  }

  if (action === "restore") {
    logger.info(`Restoring template via controller: ${identifier}`);
    const data = await CommunicationTemplateService.restore(identifier);
    return res.apiSuccess(data, "Template restored successfully", 200);
  }

  logger.info(`Updating template via controller: ${identifier}`);
  const updated = await CommunicationTemplateService.updateTemplate(req.body);
  return res.apiSuccess(updated, "Template updated successfully", 200);
});

export const deleteCommunicationTemplate = catchAsyncError(async (req: any, res: Response) => {
  const identifier = getIdentifier(req);
  logger.info(`Hard-deleting template via controller: ${identifier}`);
  await CommunicationTemplateService.hardDelete(identifier);
  return res.apiSuccess({}, "Template deleted successfully", 200);
});

export const notifyMissingInfo = catchAsyncError(async (req: any, res: Response) => {
  const { user } = req;
  logger.info(
    `Notifying missing info — triggered by: ${user?.email ?? "unknown"}, body: ${JSON.stringify(req.body)}`,
  );
  const payload = await CommunicationTemplateService.notifyMissingInfo(req.body, {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
  });
  return res.apiSuccess(payload, "Notification sent successfully", 200);
});

