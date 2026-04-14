// controllers/v1/applications.controller.ts
import { Request, Response } from "express";
import db from "@/database/postgres";
import { Op } from "sequelize";
import { getConnectedRedis } from "@/config/redis";
import catchAsyncError from "@/utils/catchAsyncError";
import { getServiceLogger } from "@/utils/createLogger";
import ErrorHandler from "@/utils/errorHandler";

const logger = getServiceLogger("applications-controller");

export const applicationsController = catchAsyncError(
  async (req: Request, res: Response) => {
    if (req.method === "GET") {
      return handleGetApplications(req, res);
    }

    throw new ErrorHandler("Method not allowed", 405);
  },
);

async function handleGetApplications(req: Request, res: Response) {
  const redisClient = await getConnectedRedis();

  try {
    const skip = Number(req.query.skip) || 0;
    const limit = Math.min(Number(req.query.limit) || 50, 100); // cap for performance
    const active = req.query.active === "true";
    const dataOption = req.query.dataOption as string;
    const aggregator = req.query.aggregator as string;

    const where: any = {};

    /* ---------------- Redis cached unique count (optional) ---------------- */
    let uniqueCount = 0;

    if (redisClient) {
      try {
        const redisData = await redisClient.get("uniqueJobIdCounts");
        if (redisData) {
          uniqueCount = JSON.parse(redisData).uniqueCount;
        }
      } catch (err) {
        logger.warn("Redis unavailable, skipping cache lookup");
      }
    }

    /* ---------------- filters ---------------- */
    if (req.query.client) {
      where.client_id = Number(req.query.client);
    }

    if (req.query.userId) {
      where.client_id = Number(req.query.userId);
    }

    if (aggregator && dataOption !== "questions") {
      where.Internal_Jobsite = aggregator;
    }

    where.isDeleted = active ? 0 : 1;

    if (dataOption === "sample_results") {
      where.Status = { [Op.notIn]: ["Successful", "Failed"] };
    } else {
      where.Status = { [Op.in]: ["Successful", "Failed"] };
    }

    /* ---------------- optimized select ---------------- */
    const selectedFields = [
      "id",
      "Client",
      "Timestamp",
      "Internal_Jobsite",
      "External_Jobsite",
      "All_Words",
      "Status",
      "Application_Mode",
      "Category",
      "Job_Title",
      "JobId",
      "Location",
      "Job_Type",
      "Date_Advertised",
      "Requestor",
      "Sample_Type",
      "ApplicationSubmittedBy",
      "MatchLevel",
    ];

    /* ---------------- parallel queries ---------------- */
    const [rows, total] = await Promise.all([
      db.applications.findAll({
        where,
        attributes: selectedFields,
        order: [["id", "DESC"]],
        offset: skip,
        limit,
        subQuery: false, // performance boost
      }),
      db.applications.count({ where }),
    ]);

    logger.info(
      `Applications fetched: ${total} total, ${rows.length} in this page`,
    );

    res.apiSuccess(
      { applications: rows, totalCount: total, uniqueCount },
      "Applications fetched successfully",
    );
  } catch (error: any) {
    logger.error("GET applications error:", error);
    throw new ErrorHandler("Failed to fetch applications", 500);
  }
}
