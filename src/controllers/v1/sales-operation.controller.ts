import { Request, Response } from "express";
import catchAsyncError from "../../utils/catchAsyncError";
import ErrorHandler from "../../utils/errorHandler";
import { SalesOperationService } from "../../services/admin/sales-operation.service";
import { getServiceLogger } from "../../utils/createLogger";

const logger = getServiceLogger("sales-operation-controller");

/**
 * Get all sales operations
 */
export const getSalesOperations = catchAsyncError(async (req: Request, res: Response) => {
  try {
    const filters = {
      isDeleted: req.query.isDeleted === "true"
    };

    const operations = await SalesOperationService.getAll(filters);

    return res.apiSuccess(operations, "Sales operations retrieved successfully", 200);
  } catch (error: any) {
    logger.error(`❌ Failed to get sales operations: ${error.message}`);
    return res.apiError(new ErrorHandler(error.message || "Failed to retrieve sales operations", 500));
  }
});

/**
 * Create new sales operation
 */
export const createSalesOperation = catchAsyncError(async (req: any, res: Response) => {
  try {
    const operation = await SalesOperationService.create(req, req.body, req.user);

    return res.apiSuccess(operation, "Sales operation created successfully", 201);
  } catch (error: any) {
    logger.error(`❌ Failed to create sales operation: ${error.message}`);
    return res.apiError(new ErrorHandler(error.message || "Failed to create sales operation", 500));
  }
});

/**
 * Update sales operation
 */
export const updateSalesOperation = catchAsyncError(async (req: any, res: Response) => {
  try {
    const { id } = req.query as { id: string };

    if (!id) {
      return res.apiError(new ErrorHandler("Sales operation ID is required", 400));
    }

    const operation = await SalesOperationService.update(req, id, req.body, req.user);

    return res.apiSuccess(operation, "Sales operation updated successfully", 200);
  } catch (error: any) {
    logger.error(`❌ Failed to update sales operation: ${error.message}`);

    if (error.message === "Sales operation not found") {
      return res.apiError(new ErrorHandler(error.message, 404));
    }

    return res.apiError(new ErrorHandler(error.message || "Failed to update sales operation", 500));
  }
});

/**
 * Delete sales operation
 */
export const deleteSalesOperation = catchAsyncError(async (req: any, res: Response) => {
  try {
    const { id, hard, undo } = req.query as {
      id: string;
      hard?: string;
      undo?: string;
    };

    if (!id) {
      return res.apiError(new ErrorHandler("Sales operation ID is required", 400));
    }

    if (undo === "true") {
      await SalesOperationService.restore(req, id, req.user);
      return res.apiSuccess({}, "Sales operation restored successfully", 200);
    }

    if (hard === "true") {
      await SalesOperationService.hardDelete(req, id, req.user);
      return res.apiSuccess({}, "Sales operation permanently deleted successfully", 200);
    }

    await SalesOperationService.delete(req, id, req.user);

    return res.apiSuccess({}, "Sales operation deleted successfully", 200);
  } catch (error: any) {
    logger.error(`❌ Failed to delete sales operation: ${error.message}`);

    if (error.message === "Sales operation not found") {
      return res.apiError(new ErrorHandler(error.message, 404));
    }

    return res.apiError(new ErrorHandler(error.message || "Failed to delete sales operation", 500));
  }
});

/**
 * Export Sales Operation data as CSV
 */
export const exportSalesOperationCSV = catchAsyncError(async (req: any, res: Response) => {
  try {
    const filters = {
      id: req.query.id as string
    };

    const csv = await SalesOperationService.exportToCSV(req, filters, req.user);

    // Set CSV headers
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=sales-operations-${new Date().toISOString().split('T')[0]}.csv`);

    return res.send(csv);
  } catch (error: any) {
    logger.error(`❌ Failed to export sales operations: ${error.message}`);
    return res.apiError(new ErrorHandler(error.message || "Failed to export sales operations", 500));
  }
});
