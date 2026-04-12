// controllers/v1/jc-trigger.controller.ts
import { Request, Response } from "express";
import db from "@/database/postgres";
import { JustCallTriggerService } from "@/services/justcall.service";

export const jcTriggerController = async (req: Request, res: Response) => {
  try {
    const method = req.method;

    if (method === "GET") {
      const triggers = await db.jc_triggers.findAll({
        order: [["createdAt", "DESC"]],
      });

      return res.status(200).json(triggers);
    }

    if (method === "PUT") {
      const { id, template, status } = req.body;

      if (!id) {
        return res.status(400).json({ message: "Missing required field: id" });
      }

      const trigger = await db.jc_triggers.findOne({
        where: { id },
      });

      if (!trigger) {
        return res.status(404).json({ message: "Trigger not found" });
      }

      /* ---------- STATUS UPDATE ---------- */
      if (status !== undefined) {
        await db.jc_triggers.update({ status }, { where: { id } });

        return res.status(200).json({
          message: "Status updated successfully",
        });
      }

      /* ---------- TEMPLATE PROCESS ---------- */
      if (!template) {
        return res.status(400).json({
          message: "Missing required field: template",
        });
      }

      const jobId = await JustCallTriggerService.verifyTemplate({
        template,
        _id: id,
      });

      return res.status(200).json({
        message: "Template queued for processing",
        jobId,
      });
    }

    return res.status(405).json({
      message: "Method Not Allowed",
    });
  } catch (error) {
    console.error("JC Trigger error:", error);
    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};
