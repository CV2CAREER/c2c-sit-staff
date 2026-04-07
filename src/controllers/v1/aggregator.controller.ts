import { Request, Response } from "express";
import { AggregatorService } from "../../services/aggregator.service";
import catchAsyncError from "../../utils/catchAsyncError";
import ErrorHandler from "../../utils/errorHandler";
import { getServiceLogger } from "../../utils/createLogger";
import { Role } from "../../utils/enum";

const logger = getServiceLogger("aggregator-controller");

// Create new aggregator
export const createAggregator = catchAsyncError(
  async (req: Request, res: Response) => {
    // Check if user has permission (ADMIN or ASSISTANT)
    const userRole = req.user?.role;
    if (userRole !== Role.ADMIN && userRole !== Role.ASSISTANT) {
      return res.apiError(new ErrorHandler("Unauthorized: Only admins and PC can manage aggregators", 403));
    }

    try {
      const payload = req.body;
      const host = req.headers.host || req.headers.origin || "localhost";
      const newAggregator = await AggregatorService.createAggregator(
        payload,
        req.user?.id,
        req.user?.email || 'System',
        host
      );
      
      res.apiSuccess(
        newAggregator,
        "A new Aggregator has been created."
      );

      logger.info(`Aggregator created successfully by ${req.user?.email || 'System'}`);
    } catch (error: any) {
      logger.error(`Failed to create aggregator: ${error.message}`);
      return res.apiError(new ErrorHandler(error.message, 500));
    }
  }
);

// Slack Queue Management - Get Queue
export const getSlackQueue = catchAsyncError(
  async (req: Request, res: Response) => {
    try {
      const { queue } = req.query;

      if (!queue) {
        return res.apiError(new ErrorHandler("Queue parameter is required", 400));
      }

      const data = await AggregatorService.getQueue(queue as string);
      res.apiSuccess(data, "Queue data retrieved successfully");
    } catch (error: any) {
      logger.error(`Failed to fetch queue data: ${error.message}`);
      return res.apiError(new ErrorHandler(`Error fetching data: ${error.message}`, 500));
    }
  }
);

// Slack Queue Management - Add to Queue
export const addToSlackQueue = catchAsyncError(
  async (req: Request, res: Response) => {
    try {
      const { email, queue } = req.body;

      if (!email || !queue) {
        return res.apiError(new ErrorHandler("Email and queue parameters are required", 400));
      }

      const host = req.headers.host || req.headers.origin || "localhost";
      const result = await AggregatorService.addToQueue(email, queue, req.user?.email, host);
      res.apiSuccess(result, result.saved ? "User added to queue successfully" : result.message);
    } catch (error: any) {
      logger.error(`Failed to add to queue: ${error.message}`);
      return res.apiError(new ErrorHandler(`Error: ${error.message}`, 500));
    }
  }
);

// Slack Queue Management - Remove from Queue
export const removeFromSlackQueue = catchAsyncError(
  async (req: Request, res: Response) => {
    try {
      const { email, queue } = req.body;

      if (!email || !queue) {
        return res.apiError(new ErrorHandler("Email and queue parameters are required", 400));
      }

      const host = req.headers.host || req.headers.origin || "localhost";
      const result = await AggregatorService.removeFromQueue(email, queue, req.user?.email, host);
      res.apiSuccess(result, `Deleted ${result.deleted} occurrence(s) of ${email} from ${queue}`);
    } catch (error: any) {
      logger.error(`Failed to remove from queue: ${error.message}`);
      return res.apiError(new ErrorHandler(`Error: ${error.message}`, 500));
    }
  }
);

// Get all aggregators or single by ID
export const getAggregators = catchAsyncError(
  async (req: Request, res: Response) => {
    try {
      const { aid, startDate, endDate } = req.query;

      if (aid) {
        const aggregator = await AggregatorService.getAggregatorById(aid as string);
        return res.apiSuccess(aggregator, "Requested aggregator retrieved successfully.");
      }

      const aggregators = await AggregatorService.getAllAggregators(
        startDate as string,
        endDate as string
      );
      
      res.apiSuccess(
        aggregators,
        "All Aggregators retrieved successfully."
      );
    } catch (error: any) {
      logger.error(`Failed to retrieve aggregators: ${error.message}`);
      return res.apiError(new ErrorHandler(error.message, 500));
    }
  }
);

// Update aggregator
export const updateAggregator = catchAsyncError(
  async (req: Request, res: Response) => {
    // Check if user has permission (ADMIN or ASSISTANT)
    const userRole = req.user?.role;
    if (userRole !== Role.ADMIN && userRole !== Role.ASSISTANT) {
      return res.apiError(new ErrorHandler("Unauthorized: Only admins and PC can manage aggregators", 403));
    }

    try {
      const { aid } = req.query;
      const payload = req.body;

      if (!aid) {
        return res.apiError(new ErrorHandler("Aggregator ID (aid) is required", 400));
      }

      const host = req.headers.host || req.headers.origin || "localhost";
      const updatedAggregator = await AggregatorService.updateAggregator(
        aid as string,
        payload,
        req.user?.id,
        req.user?.email || 'System',
        host
      );
      
      res.apiSuccess(
        updatedAggregator,
        "Aggregator updated successfully."
      );

      logger.info(`Aggregator ${aid} updated successfully by ${req.user?.email || 'System'}`);
    } catch (error: any) {
      logger.error(`Failed to update aggregator: ${error.message}`);
      return res.apiError(new ErrorHandler(error.message, 500));
    }
  }
);

// Delete aggregator(s)
export const deleteAggregators = catchAsyncError(
  async (req: Request, res: Response) => {
    // Check if user has permission (ADMIN or ASSISTANT)
    const userRole = req.user?.role;
    if (userRole !== Role.ADMIN && userRole !== Role.ASSISTANT) {
      return res.apiError(new ErrorHandler("Unauthorized: Only admins and assistants can manage aggregators", 403));
    }

    try {
      const { aid } = req.query;
      const payload = req.body;

      let result;
      const host = req.headers.host || req.headers.origin || "localhost";
      
      if (aid) {
        // Delete single aggregator
        result = await AggregatorService.deleteAggregator(
          aid as string,
          req.user?.email || 'System',
          host
        );
        res.apiSuccess(result, "The selected Aggregator has been deleted successfully.");
      } else if (payload && Array.isArray(payload) && payload.length > 0) {
        // Delete multiple aggregators
        result = await AggregatorService.deleteMultipleAggregators(
          payload,
          req.user?.email || 'System',
          host
        );
        res.apiSuccess(result, "All selected aggregators are deleted successfully");
      } else {
        return res.apiError(new ErrorHandler("Either aid query parameter or array of IDs in body is required", 400));
      }

      logger.info(`Aggregator(s) deleted successfully by ${req.user?.email || 'System'}`);
    } catch (error: any) {
      logger.error(`Failed to delete aggregator(s): ${error.message}`);
      return res.apiError(new ErrorHandler(error.message, 500));
    }
  }
);