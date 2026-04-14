// controllers/v1/jc-trigger.controller.ts
import { Request, Response } from "express";
import db from "@/database/postgres";
import { JustCallTriggerService } from "@/services/justcall.service";
import catchAsyncError from "@/utils/catchAsyncError";
import { getServiceLogger } from "@/utils/createLogger";
import ErrorHandler from "@/utils/errorHandler";

const logger = getServiceLogger("jc-trigger-controller");

export const jcTriggerController = catchAsyncError(
  async (req: Request, res: Response) => {
    const method = req.method;

    if (method === "GET") {
      logger.info("Fetching all JC triggers");

      const triggers = await db.jc_triggers.findAll({
        order: [["createdAt", "DESC"]],
      });

      res.apiSuccess(triggers, "Triggers retrieved successfully");
      return;
    }

    if (method === "PUT") {
      const { id, template, status } = req.body;

      if (!id) {
        throw new ErrorHandler("Missing required field: id", 400);
      }

      const trigger = await db.jc_triggers.findOne({
        where: { id },
      });

      if (!trigger) {
        throw new ErrorHandler("Trigger not found", 404);
      }

      /* ---------- STATUS UPDATE ---------- */
      if (status !== undefined) {
        logger.info(`Updating trigger status: ${id}`);

        await db.jc_triggers.update({ status }, { where: { id } });

        res.apiSuccess(null, "Status updated successfully");
        return;
      }

      /* ---------- TEMPLATE PROCESS ---------- */
      if (!template) {
        throw new ErrorHandler("Missing required field: template", 400);
      }

      logger.info(`Queuing template for processing: ${id}`);

      const jobId = await JustCallTriggerService.verifyTemplate({
        template,
        _id: id,
      });

      res.apiSuccess({ jobId }, "Template queued for processing");
      return;
    }

    throw new ErrorHandler("Method not allowed", 405);
  },
);
