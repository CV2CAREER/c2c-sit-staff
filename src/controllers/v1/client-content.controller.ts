import { Response } from "express";
import catchAsyncError from "@/utils/catchAsyncError";
import { ClientContentService } from "@/services/admin/client-content.service";
import { getServiceLogger } from "@/utils/createLogger";

const logger = getServiceLogger("client-content-controller");

export const getClientContentSections = catchAsyncError(
  async (_req: any, res: Response) => {
    logger.info("Fetching client content sections");
    const sections = await ClientContentService.listSections();
    return res.apiSuccess(sections, "Client content fetched successfully", 200);
  },
);

export const getClientContentSectionByKey = catchAsyncError(
  async (req: any, res: Response) => {
    const key = String(req.params.key ?? "").trim();
    logger.info(`Fetching client content section: ${key}`);
    const section = await ClientContentService.getSectionByKey(key);
    return res.apiSuccess(section, "Client content fetched successfully", 200);
  },
);

export const updateClientContentSection = catchAsyncError(
  async (req: any, res: Response) => {
    const id = String(req.params.id ?? "").trim();
    logger.info(
      `Updating client content section ${id} — triggered by: ${req.user?.email ?? "unknown"}`,
    );
    const section = await ClientContentService.updateSection(
      id,
      req.body,
      req.user ?? null,
    );
    return res.apiSuccess(section, "Client content updated successfully", 200);
  },
);
