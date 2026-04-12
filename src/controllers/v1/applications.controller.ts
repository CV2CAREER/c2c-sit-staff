// controllers/v1/applications.controller.ts
import { Request, Response } from "express";
import Redis from "ioredis";
import db from "@/database/postgres";
import { Op } from "sequelize";

const redisClient = new Redis({
  host: process.env.CLIENT_SAMPLE_REDIS_HOST,
  password: process.env.CLIENT_SAMPLE_REDIS_PASSWORD,
  maxRetriesPerRequest: 1,
  enableAutoPipelining: true,
});

export const applicationsController = async (req: Request, res: Response) => {
  try {
    if (req.method === "GET") {
      return handleGetApplications(req, res);
    }

    return res.status(405).json({
      message: "Method not allowed",
    });
  } catch (error) {
    console.error("Applications error:", error);
    return res.status(500).json({
      message: "Server error",
    });
  }
};

async function handleGetApplications(req: Request, res: Response) {
  try {
    const skip = Number(req.query.skip) || 0;
    const limit = Math.min(Number(req.query.limit) || 50, 100); // cap for performance
    const active = req.query.active === "true";
    const dataOption = req.query.dataOption as string;
    const aggregator = req.query.aggregator as string;

    const where: any = {};

    /* ---------------- Redis cached unique count ---------------- */
    const redisData = await redisClient.get("uniqueJobIdCounts");
    let uniqueCount = 0;

    if (redisData) {
      uniqueCount = JSON.parse(redisData).uniqueCount;
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

    return res.status(200).json({
      message: "Applications fetched",
      data: rows,
      totalCount: total,
      uniqueCount,
    });
  } catch (error) {
    console.error("GET applications error:", error);
    return res.status(500).json({
      message: "Server error",
    });
  }
}
