import { Request, Response } from "express";
import { LogsService } from "../../services/admin/logs.service";
import { getServiceLogger } from "../../utils/createLogger";
import ErrorHandler from "../../utils/errorHandler";

const logger = getServiceLogger("logs-controller");

/**
 * GET 
 * Get paginated audit logs with sorting
 */
export const getLogs = async (req: Request, res: Response) => {
  try {
    const { page, limit, column, direction, search, type, startDate, endDate } = req.query;

    const data = await LogsService.getLogs(
      Number(page),
      Number(limit),
      column as string,
      direction as string,
      {
        search: typeof search === "string" ? search : undefined,
        type: typeof type === "string" ? type : undefined,
        startDate: typeof startDate === "string" ? startDate : undefined,
        endDate: typeof endDate === "string" ? endDate : undefined,
      }
    );

    return res.apiSuccess(data, "Logs retrieved successfully", 200);

  } catch (error: any) {
    logger.error(`❌ Logs endpoint error: ${error.message}`);
    
    return res.apiError(
      new ErrorHandler(error.message || "Failed to retrieve logs", 500),
    );
  }
};

/**
 * GET 
 * Export audit logs as CSV file
 */
export const exportLogsToCsv = async (req: any, res: Response) => {
  try {
    const { startDate, endDate, type, search } = req.query;

    const csv = await LogsService.exportToCSV(req, {
      startDate: startDate as string,
      endDate: endDate as string,
      type: type as string,
      search: search as string,
    }, req.user);

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename=logs-export-${Date.now()}.csv`);
    
    return res.send(csv);

  } catch (error: any) {
    logger.error(`❌ Logs export endpoint error: ${error.message}`);
    return res.apiError(
      new ErrorHandler(error.message || "Failed to export logs", 500),
    );
  }
};
