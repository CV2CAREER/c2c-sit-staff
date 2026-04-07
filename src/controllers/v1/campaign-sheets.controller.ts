// controllers/v1/campaign-sheets.controller.ts
import { Request, Response } from "express";
import db from "@/database/postgres";

/* -------------------------------------------------------------------------- */
/* GET                                                                        */
/* -------------------------------------------------------------------------- */
export const getCampaignSheet = async (req: Request, res: Response) => {
  try {
    const {
      userId,
      active = "true",
      aggregator,
      tableDisplay,
    } = req.query as any;

    if (!userId) {
      return res.status(400).json({ message: "User id not provided" });
    }

    if (tableDisplay === "aggregator" && aggregator) {
      const model = modelFromDb(aggregator, res);
      if (!model) return;

      const where = {
        master_credential_id: userId,
        is_deleted: active === "true" ? false : true,
      };

      const [optionsData, totalCount] = await Promise.all([
        model.findMany({ where }),
        model.count({ where }),
      ]);

      return res.status(200).json({ optionsData, totalCount });
    }

    return res.status(400).json({ message: "Invalid table display value" });
  } catch (error) {
    console.error("getCampaignSheet:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/* -------------------------------------------------------------------------- */
/* PATCH                                                                      */
/* -------------------------------------------------------------------------- */
export const patchCampaignSheet = async (req: Request, res: Response) => {
  try {
    const { id, entity, action } = req.body;

    if (!id || !entity || !action) {
      return res.status(400).json({ message: "Invalid query parameters" });
    }

    const updateClause =
      action === "soft-delete"
        ? { is_deleted: true }
        : action === "restore"
          ? { is_deleted: false }
          : null;

    if (!updateClause) {
      return res.status(400).json({ message: "Invalid action" });
    }

    const model = modelFromDb(
      entity === "sample_results" ? "applications" : entity,
      res,
    );
    if (!model) return;

    await model.update({
      where: { id },
      data: updateClause,
    });

    return res.status(200).json({ message: "Moved to recycle bin" });
  } catch (error) {
    console.error("patchCampaignSheet:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/* -------------------------------------------------------------------------- */
/* PUT                                                                        */
/* -------------------------------------------------------------------------- */
export const putCampaignSheet = async (req: Request, res: Response) => {
  try {
    const { type, table, clientId } = req.body;

    if (!type || !table || !clientId) {
      return res.status(400).json({
        message: "Missing required fields: type, table, or clientId",
      });
    }

    const isStage = table.includes("_stage");
    const sourceTable = table;
    const targetTable = isStage
      ? table.replace("_stage", "")
      : `${table}_stage`;

    const SourceModel = modelFromDb(sourceTable, res);
    const TargetModel = modelFromDb(targetTable, res);

    if (!SourceModel || !TargetModel) return;

    const dataToCopy = await SourceModel.findMany({
      where: { master_credential_id: clientId },
    });

    if (!dataToCopy.length) {
      return res.status(200).json({
        message: `No records found for clientId: ${clientId}`,
      });
    }

    if (type === "override") {
      await TargetModel.deleteMany({
        where: { master_credential_id: clientId },
      });
    }

    await TargetModel.createMany({
      data: dataToCopy,
      skipDuplicates: true,
    });

    return res.status(200).json({
      message: `Successfully ${type === "override" ? "overridden" : "incremented"} records`,
    });
  } catch (error) {
    console.error("putCampaignSheet:", error);
    return res.status(500).json({
      message: "Internal server error during sheet update",
    });
  }
};

/* -------------------------------------------------------------------------- */
/* dynamic model resolver                                                     */
/* -------------------------------------------------------------------------- */
const modelFromDb = (model: string, res: Response) => {
  if (!(model in db)) {
    res.status(500).json({ message: `Invalid model requested: ${model}` });
    return null;
  }
  return (db as any)[model];
};
