import { Response } from "express";
import catchAsyncError from "@/utils/catchAsyncError";
import ErrorHandler from "@/utils/errorHandler";
import { CommunicationTemplateService } from "@/services/admin/communication-template.service";

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
  const templates = await CommunicationTemplateService.listTemplates(type);
  return res.apiSuccess(templates, "Templates fetched successfully", 200);
});

export const createCommunicationTemplate = catchAsyncError(async (req: any, res: Response) => {
  const requestType = typeof req.query.request === "string" ? req.query.request.trim() : "";
  if (requestType === "duplicate") {
    const templateName =
      typeof req.query.templateName === "string" ? req.query.templateName.trim() : "";
    const duplicate = await CommunicationTemplateService.duplicate(templateName);
    return res.apiSuccess(duplicate, "Template duplicated successfully", 201);
  }

  const template = await CommunicationTemplateService.createTemplate(req.body);
  return res.apiSuccess(template, "Template created successfully", 201);
});

export const patchCommunicationTemplate = catchAsyncError(async (req: any, res: Response) => {
  const action = typeof req.query.action === "string" ? req.query.action.trim() : "";
  const identifier = getIdentifier(req) || (typeof req.body?.id === "string" ? req.body.id : "");

  if (action === "soft-delete") {
    const data = await CommunicationTemplateService.softDelete(identifier);
    return res.apiSuccess(data, "Template moved to recycle bin", 200);
  }

  if (action === "restore") {
    const data = await CommunicationTemplateService.restore(identifier);
    return res.apiSuccess(data, "Template restored successfully", 200);
  }

  const updated = await CommunicationTemplateService.updateTemplate(req.body);
  return res.apiSuccess(updated, "Template updated successfully", 200);
});

export const deleteCommunicationTemplate = catchAsyncError(async (req: any, res: Response) => {
  const identifier = getIdentifier(req);
  await CommunicationTemplateService.hardDelete(identifier);
  return res.apiSuccess({}, "Template deleted successfully", 200);
});

export const notifyMissingInfo = catchAsyncError(async (req: any, res: Response) => {
  const payload = await CommunicationTemplateService.notifyMissingInfo(req.body);
  return res.apiSuccess(payload, "Notification queued successfully", 200);
});

