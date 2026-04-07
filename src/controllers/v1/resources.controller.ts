import { Request, Response } from "express";
import { ResourcesService } from "../../services/resources.service";
import catchAsyncError from "../../utils/catchAsyncError";
import ErrorHandler from "../../utils/errorHandler";
import { getServiceLogger } from "../../utils/createLogger";
import { Role } from "../../utils/enum";

const logger = getServiceLogger("resources-controller");

// Get all resources or single by type
export const getResources = catchAsyncError(
  async (req: Request, res: Response) => {
    try {
      const { type } = req.query;
      const resources = await ResourcesService.getResources(type as string);
      
      res.apiSuccess(resources, "All Resources retrieved Successfully");
    } catch (error: any) {
      logger.error(`Failed to retrieve resources: ${error.message}`);
      return res.apiError(new ErrorHandler(error.message, 500));
    }
  }
);

// Create new resource
export const createResource = catchAsyncError(
  async (req: Request, res: Response) => {
    // Check if user has permission (ADMIN or ASSISTANT)
    const userRole = req.user?.role;
    if (userRole !== Role.ADMIN && userRole !== Role.ASSISTANT) {
      return res.apiError(new ErrorHandler("Unauthorized: Only admins and PC can manage resources", 403));
    }

    try {
      const { resourceName, value } = req.body;

      if (!resourceName || !value) {
        return res.apiError(new ErrorHandler("resourceName and value are required", 400));
      }

      if (resourceName.length < 3 || resourceName.length > 25) {
        return res.apiError(new ErrorHandler("resourceName must be between 3 and 25 characters", 400));
      }

      const resource = await ResourcesService.createResource(resourceName, value);
      
      res.apiSuccess(resource, "Resource Created Successfully");
    } catch (error: any) {
      logger.error(`Failed to create resource: ${error.message}`);
      
      if (error.message.includes("already exists")) {
        return res.apiError(new ErrorHandler(error.message, 400));
      }
      
      return res.apiError(new ErrorHandler(error.message, 500));
    }
  }
);

// Update resource (upsert - create if not exists)
export const updateResource = catchAsyncError(
  async (req: Request, res: Response) => {
    // Check if user has permission (ADMIN or ASSISTANT)
    const userRole = req.user?.role;
    if (userRole !== Role.ADMIN && userRole !== Role.ASSISTANT) {
      return res.apiError(new ErrorHandler("Unauthorized: Only admins and PC can manage resources", 403));
    }

    try {
      const { resourceName, value } = req.body;

      if (!resourceName || !value) {
        return res.apiError(new ErrorHandler("resourceName and value are required", 400));
      }

      if (resourceName.length < 3 || resourceName.length > 25) {
        return res.apiError(new ErrorHandler("resourceName must be between 3 and 25 characters", 400));
      }

      const resource = await ResourcesService.updateResource(resourceName, value);
      
      res.apiSuccess(resource, "Resource Updated Successfully");
    } catch (error: any) {
      logger.error(`Failed to update resource: ${error.message}`);
      return res.apiError(new ErrorHandler(error.message, 500));
    }
  }
);

// Delete resource
export const deleteResource = catchAsyncError(
  async (req: Request, res: Response) => {
    // Check if user has permission (ADMIN or ASSISTANT)
    const userRole = req.user?.role;
    if (userRole !== Role.ADMIN && userRole !== Role.ASSISTANT) {
      return res.apiError(new ErrorHandler("Unauthorized: Only admins and PC can manage resources", 403));
    }

    try {
      const { resource_id } = req.query;

      if (!resource_id) {
        return res.apiError(new ErrorHandler("resource_id query parameter is required", 400));
      }

      const result = await ResourcesService.deleteResource(resource_id as string);
      
      res.apiSuccess(result, "Resource deleted Successfully");
    } catch (error: any) {
      logger.error(`Failed to delete resource: ${error.message}`);
      
      if (error.message.includes("not found")) {
        return res.apiError(new ErrorHandler(error.message, 404));
      }
      
      return res.apiError(new ErrorHandler(error.message, 500));
    }
  }
);