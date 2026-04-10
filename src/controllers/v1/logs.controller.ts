import { Request, Response } from "express";
import { LogsService } from "../../services/admin/logs.service";
import { getServiceLogger } from "../../utils/createLogger";

const logger = getServiceLogger("logs-controller");

/**
 * GET 
 * Get paginated audit logs with sorting
 */
export const getLogs = async (req: Request, res: Response) => {
  try {
    const { page, limit, column, direction } = req.query;

    const data = await LogsService.getLogs(
      Number(page),
      Number(limit),
      column as string,
      direction as string
    );

    return res.status(200).json({
      success: true,
      ...data
    });

  } catch (error: any) {
    logger.error(`❌ Logs endpoint error: ${error.message}`);
    
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * GET 
 * Export audit logs as CSV file
 */
export const exportLogsToCsv = async (req: any, res: Response) => {
  try {
    const { startDate, endDate, type } = req.query;

    const csv = await LogsService.exportToCSV(req, {
      startDate: startDate as string,
      endDate: endDate as string,
      type: type as string
    }, req.user);

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename=logs-export-${Date.now()}.csv`);
    
    return res.send(csv);

  } catch (error: any) {
    logger.error(`❌ Logs export endpoint error: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
