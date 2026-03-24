import { Request, Response } from "express";
import { analyticsApplicationService } from "../../services/admin/analytics.application.service";
import catchAsyncError from "../../utils/catchAsyncError";
import { getServiceLogger } from "../../utils/createLogger";
import ErrorHandler from "../../utils/errorHandler";
import { Role } from "../../utils/enum";

const logger = getServiceLogger("admin-controller");

export const getAdminAnalytics = catchAsyncError(
  async (req: Request, res: Response) => {
    const { user } = req;

    if (!user || user.role !== Role.ADMIN) {
      throw new ErrorHandler("Only admin users can access this endpoint.", 403);
    }

    const from = typeof req.query.from === "string" ? req.query.from : undefined;
    const to = typeof req.query.to === "string" ? req.query.to : undefined;

    logger.info(
      `Processing analytics request for admin ${user.email} (from=${from ?? "default"}, to=${to ?? "default"})`,
    );

    const analytics = await analyticsApplicationService.getSuccessfulVsFailedMetrics(
      { from, to },
    );

    res.apiSuccess(analytics, "Admin analytics retrieved successfully");
  },
);

