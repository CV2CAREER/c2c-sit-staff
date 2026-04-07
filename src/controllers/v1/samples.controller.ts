// controllers/v1/samples.controller.ts
import { Request, Response } from "express";
import db from "@/database/postgres";

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
    const results = await db.samples.findMany({
      orderBy: { timestamp: "desc" },
      skip: offset,
      take: limit,
    });

    const names = results.map((r: any) => r.name);

    /* -------------------------------------------------------------------------- */
    /* FETCH CREDENTIAL IDS                                                       */
    /* -------------------------------------------------------------------------- */
    const credentials = await db.master_credentials.findMany({
      where: {
        full_name: {
          in: names,
        },
      },
      select: {
        id: true,
        full_name: true,
      },
    });

    const newResults = results.map((result: any) => ({
      ...result,
      credentialId:
        credentials.find((c: any) => c.full_name === result.name)?.id || null,
    }));

    return res.status(200).json(newResults);
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};
