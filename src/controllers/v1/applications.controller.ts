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
      if (req.query.dataCount === "true") {
        return handleGetApplicationsCount(req, res);
      }
      return handleGetApplications(req, res);
    }
    if (req.method === "PATCH") {
      return handleUpdateApplication(req, res);
    }
    if (req.method === "DELETE") {
      return handleDeleteApplication(req, res);
    }

    throw new ErrorHandler("Method not allowed", 405);
  },
);

async function handleGetApplicationsCount(req: Request, res: Response) {
  try {
    const aggregator = req.query.aggregator as string;
    const source = req.query.source as string;
    const baseWhere: any = { isDeleted: false };

    if (aggregator && aggregator !== "all") baseWhere.Internal_Jobsite = aggregator;
    if (source && source !== "all") baseWhere.Run_Source = source;

    const [successful, failed] = await Promise.all([
      db.applications.count({ where: { ...baseWhere, Status: "Successful" } }),
      db.applications.count({ where: { ...baseWhere, Status: "Failed" } }),
    ]);

    return res.apiSuccess(
      {
        successful,
        failed,
      },
      "Application counts fetched successfully",
    );
  } catch (error: any) {
    logger.error("GET applications count error:", error);
    throw new ErrorHandler("Failed to fetch application counts", 500);
  }
}

async function handleGetApplications(req: Request, res: Response) {
  const user = (req as any).user;

  /* -------------------------------------------------------------------------- */
  /* AUTH CHECK                                                                 */
  /* -------------------------------------------------------------------------- */
  if (user?.role !== "admin" && user?.role !== "assistant") {
    return res.apiError({
      message: "You are not authorized to access this resource",
      statusCode: 403,
      name: ""
    });
  }

  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(Number(req.query.limit) || 25, 500);
    const skip = (page - 1) * limit;

    const dataOption = req.query.dataOption as string;
    const aggregator = req.query.aggregator as string;
    const status = req.query.status as string;
    const source = req.query.source as string;
    const recycle = req.query.recycle === "true" || req.query.active === "false";

    const where: any = { isDeleted: recycle };

    /* ---------------- filters ---------------- */
    if (req.query.client) {
      where.client_id = Number(req.query.client);
    }

    if (req.query.userId) {
      where.client_id = Number(req.query.userId);
    }

    if (aggregator && aggregator !== "all") {
      where.Internal_Jobsite = aggregator;
    }

    if (source && source !== "all") {
      where.Run_Source = source;
    }

    // Status filtering logic
    if (status && status !== "all") {
      if (status === "failed") {
        where.Status = "Failed";
      } else if (status === "successful") {
        where.Status = "Successful";
      } else if (status === "sample") {
        where.Sample_Type = { [Op.in]: ["Sample", "Sample Test"] };
      }
    } else {
      // If status is "all" or not provided:
      // Show Successful and Failed by default for standard view
      // But if we want "ALL", we should probably not filter.
      // Given the requirement "fetch all applications", I will allow all statuses when status is "all".
      if (dataOption === "sample_results") {
        where.Status = { [Op.notIn]: ["Successful", "Failed"] };
      } else if (dataOption === "questions") {
        where.Question = { [Op.not]: null };
      }
      // Otherwise, no Status filter means "All"
    }

    /* ---------------- parallel queries ---------------- */
    const [rows, total] = await Promise.all([
      db.applications.findAll({
        where,
        order: [["id", "DESC"]],
        offset: skip,
        limit,
        raw: true,
      }),
      db.applications.count({ where }),
    ]);

    const uniqueCount = await db.applications.count({
      where,
      distinct: true,
      col: "JobId",
    });

    logger.info(
      `Applications fetched: ${total} total, ${rows.length} in this page`,
    );

    return res.apiSuccess(
      {
        data: rows,
        pagination: {
          totalCount: total,
          currentPage: page,
          pageSize: limit,
          totalPages: Math.ceil(total / limit),
        },
        uniqueCount,
      },
      "Applications fetched successfully",
    );
  } catch (error: any) {
    logger.error("GET applications error:", error);
    throw new ErrorHandler("Failed to fetch applications", 500);
  }
}

async function handleUpdateApplication(req: Request, res: Response) {
  const user = (req as any).user;

  if (user?.role !== "admin" && user?.role !== "assistant") {
    return res.apiError({
      message: "You are not authorized to access this resource",
      statusCode: 403,
      name: "",
    });
  }

  try {
    const id = req.query.id as string;
    const action = req.query.action as string | undefined;
    const updatedByFName = req.query.updatedByFName as string | undefined;

    if (!id) {
      throw new ErrorHandler("ID is required", 400);
    }

    if (action === "restore" || action === "soft-delete") {
      const [updatedCount] = await db.applications.update(
        { isDeleted: action === "soft-delete" },
        { where: { id } },
      );

      if (!updatedCount) {
        throw new ErrorHandler("Application not found", 404);
      }

      return res.apiSuccess(
        { updatedCount },
        action === "soft-delete"
          ? "Application moved to recycle bin"
          : "Application restored successfully",
      );
    }

    const payload = req.body ?? {};
    if (!Object.keys(payload).length) {
      throw new ErrorHandler("Data is required", 400);
    }

    const [updatedCount] = await db.applications.update(
      { ...payload, updateBy: updatedByFName || "system" },
      { where: { id } },
    );

    if (!updatedCount) {
      throw new ErrorHandler("Application not found", 404);
    }

    return res.apiSuccess({ updatedCount }, "Application updated successfully");
  } catch (error: any) {
    logger.error("PATCH applications error:", error);
    if (error instanceof ErrorHandler) throw error;
    throw new ErrorHandler("Failed to update application", 500);
  }
}

async function handleDeleteApplication(req: Request, res: Response) {
  const user = (req as any).user;

  if (user?.role !== "admin" && user?.role !== "assistant") {
    return res.apiError({
      message: "You are not authorized to access this resource",
      statusCode: 403,
      name: "",
    });
  }

  try {
    const id = req.query.id as string;
    if (!id) {
      throw new ErrorHandler("ID is required", 400);
    }

    const deletedCount = await db.applications.destroy({ where: { id } });
    if (!deletedCount) {
      throw new ErrorHandler("Application not found", 404);
    }

    return res.apiSuccess(
      { deletedCount },
      "Application has been deleted successfully!",
    );
  } catch (error: any) {
    logger.error("DELETE applications error:", error);
    if (error instanceof ErrorHandler) throw error;
    throw new ErrorHandler("Failed to delete application", 500);
  }
}
