import { Response } from "express";
import catchAsyncError from "@/utils/catchAsyncError";
import { CommunicationTemplateService } from "@/services/admin/communication-template.service";
import { getServiceLogger } from "@/utils/createLogger";

const logger = getServiceLogger("communication-template-controller");

const getIdentifier = (req: any) => {
  const id = typeof req.query.id === "string" ? req.query.id.trim() : "";
  const key =
    typeof req.query.key === "string"
      ? req.query.key.trim()
      : typeof req.query.templateName === "string"
        ? req.query.templateName.trim()
        : typeof req.query.template === "string"
          ? req.query.template.trim()
          : "";
  return id || key;
};

const getActorLabel = (req: any) =>
  req.user?.email ||
  `${req.user?.firstName ?? ""} ${req.user?.lastName ?? ""}`.trim() ||
  "System";

export const getCommunicationTemplates = catchAsyncError(async (req: any, res: Response) => {
  const identifier = getIdentifier(req);

  if (identifier) {
    logger.info(`Fetching single email template: ${identifier}`);
    const template = await CommunicationTemplateService.getTemplate(identifier);
    return res.apiSuccess(template, "Template fetched successfully", 200);
  }

  const category = typeof req.query.category === "string" ? req.query.category : undefined;
  const status = typeof req.query.status === "string" ? req.query.status : undefined;
  logger.info(`Fetching email templates (category: ${category || "all"}, status: ${status || "active"})`);
  const templates = await CommunicationTemplateService.listTemplates({ category, status });
  return res.apiSuccess(templates, "Templates fetched successfully", 200);
});

export const createCommunicationTemplate = catchAsyncError(async (req: any, res: Response) => {
  logger.info(`Creating new email template`);
  const template = await CommunicationTemplateService.createTemplate({
    ...req.body,
    updatedBy: getActorLabel(req),
  });
  return res.apiSuccess(template, "Template created successfully", 201);
});

export const patchCommunicationTemplate = catchAsyncError(async (req: any, res: Response) => {
  const action = typeof req.query.action === "string" ? req.query.action.trim() : "";
  const identifier = getIdentifier(req) || (typeof req.body?.id === "string" ? req.body.id : "");
  const actor = getActorLabel(req);

  if (action === "soft-delete") {
    logger.info(`Soft-deleting template via controller: ${identifier}`);
    const data = await CommunicationTemplateService.softDelete(identifier, actor);
    return res.apiSuccess(data, "Template moved to recycle bin", 200);
  }

  if (action === "restore") {
    logger.info(`Restoring template via controller: ${identifier}`);
    const data = await CommunicationTemplateService.restore(identifier, actor);
    return res.apiSuccess(data, "Template restored successfully", 200);
  }

  logger.info(`Updating template via controller: ${identifier}`);
  const updated = await CommunicationTemplateService.updateTemplate({
    ...req.body,
    id: identifier || req.body?.id,
    updatedBy: actor,
  });
  return res.apiSuccess(updated, "Template updated successfully", 200);
});

export const deleteCommunicationTemplate = catchAsyncError(async (req: any, res: Response) => {
  const identifier = getIdentifier(req);
  logger.info(`Hard-deleting template via controller: ${identifier}`);
  await CommunicationTemplateService.hardDelete(identifier);
  return res.apiSuccess({}, "Template deleted successfully", 200);
});

export const notifyMissingInfo = catchAsyncError(async (req: any, res: Response) => {
  const host = req.headers.host || req.headers.origin || "localhost";
  logger.info(
    `Notifying missing info — triggered by: ${req.user?.email ?? "unknown"}, body: ${JSON.stringify(req.body)}`,
  );
  const payload = await CommunicationTemplateService.notifyMissingInfo(req.body, host, req.user);
  return res.apiSuccess(payload, "Notification sent successfully", 200);
});
