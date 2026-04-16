// controllers/v1/samples.controller.ts
import { Request, Response } from "express";
import db from "@/database/postgres";
import { Op } from "sequelize";

export const getSamplesController = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    /* -------------------------------------------------------------------------- */
    /* AUTH CHECK                                                                 */
    /* -------------------------------------------------------------------------- */
    if (user?.role !== "admin") {
      return res.status(403).json({
        message: "You are not authorized to access this resource",
      });
    }

    /* -------------------------------------------------------------------------- */
    /* PAGINATION                                                                 */
    /* -------------------------------------------------------------------------- */
    const page = parseInt(req.query.page as string) || 0;
    const limit = 10;
    const offset = page * limit;

    /* -------------------------------------------------------------------------- */
    /* FETCH SAMPLES                                                              */
    /* -------------------------------------------------------------------------- */
    const results = await db.applications.findMany({
      where: {
        isDeleted: false,
        Status: {
          [Op.notIn]: ["Successful", "Failed"],
        },
      },
      attributes: [
        "id",
        "Client",
        "Timestamp",
        "Internal_Jobsite",
        "External_Jobsite",
        "Status",
        "Application_Mode",
        "client_id",
        "createdAt",
      ],
      order: [["createdAt", "DESC"]],
      offset,
      limit,
    });

    const normalizedResults = results.map((r: any) =>
      typeof r?.get === "function" ? r.get({ plain: true }) : r,
    );
    const clientIds = normalizedResults
      .map((r: any) => r.client_id)
      .filter((id: any) => !!id);

    /* -------------------------------------------------------------------------- */
    /* FETCH CREDENTIAL IDS                                                       */
    /* -------------------------------------------------------------------------- */
    const credentials = await db.credentials.findMany({
      where: {
        clientId: {
          [Op.in]: clientIds,
        },
      },
      attributes: ["id", "clientId"],
    });

    const newResults = normalizedResults.map((result: any) => ({
      ...result,
      credentialId:
        credentials.find((c: any) => c.clientId === result.client_id)?.id ||
        null,
      // Backward compatibility for legacy consumers
      name: result.Client ?? null,
      timestamp: result.Timestamp ?? result.createdAt ?? null,
    }));

    return res.status(200).json(newResults);
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};
