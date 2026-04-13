import { Request, Response } from "express";
import catchAsyncError from "../../utils/catchAsyncError";
import { AuditLogService } from "../../services/admin/audit-log.service";
import { getServiceLogger } from "../../utils/createLogger";

const logger = getServiceLogger("audit-trail-controller");

/**
 * GET
 * Retrieve paginated audit logs
 */
export const getAuditTrail = catchAsyncError(
  async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 50;
    const search = req.query.search as string | undefined;

    const result = await AuditLogService.getAuditLogs(page, pageSize, search);

    res.apiSuccess(
      {
        data: result.data,
        pagination: result.pagination
      },
      "Audit trails retrieved successfully"
    );
  },
);