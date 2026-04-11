import { Request, Response } from "express";
import catchAsyncError from "../../utils/catchAsyncError";
import ErrorHandler from "../../utils/errorHandler";
import { ViewAsRuleService } from "../../services/admin/view-as-rule.service";
import { getServiceLogger } from "../../utils/createLogger";

const logger = getServiceLogger("view-as-rules-controller");

/**
 * Get all view as rules
 */
export const getAllViewAsRules = catchAsyncError(async (req: any, res: Response) => {
  try {
    const rules = await ViewAsRuleService.getAll();
    return res.apiSuccess(rules, "View as rules retrieved successfully", 200);
  } catch (error: any) {
    logger.error(`❌ Failed to get view as rules: ${error.message}`);
    return res.apiError(new ErrorHandler(error.message || "Failed to retrieve view as rules", 500));
  }
});

/**
 * Get view as rule by persona
 */
export const getViewAsRuleByPersona = catchAsyncError(async (req: any, res: Response) => {
  try {
    const { persona } = req.params;
    const rule = await ViewAsRuleService.getByPersona(persona);

    if (!rule) {
      return res.apiError(new ErrorHandler("View as rule not found", 404));
    }

    return res.apiSuccess(rule, "View as rule retrieved successfully", 200);
  } catch (error: any) {
    logger.error(`❌ Failed to get view as rule: ${error.message}`);
    return res.apiError(new ErrorHandler(error.message || "Failed to retrieve view as rule", 500));
  }
});

/**
 * Create new view as rule
 */
export const createViewAsRule = catchAsyncError(async (req: any, res: Response) => {
  try {
    const rule = await ViewAsRuleService.create(req.body, req, req.user);
    return res.apiSuccess(rule, "View as rule created successfully", 201);
  } catch (error: any) {
    logger.error(`❌ Failed to create view as rule: ${error.message}`);

    if (error.message === "View as rule for this persona already exists") {
      return res.apiError(new ErrorHandler(error.message, 409));
    }

    return res.apiError(new ErrorHandler(error.message || "Failed to create view as rule", 500));
  }
});

/**
 * Update existing view as rule
 */
export const updateViewAsRule = catchAsyncError(async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const rule = await ViewAsRuleService.update(id, req.body, req, req.user);
    return res.apiSuccess(rule, "View as rule updated successfully", 200);
  } catch (error: any) {
    logger.error(`❌ Failed to update view as rule: ${error.message}`);

    if (error.message === "View as rule not found") {
      return res.apiError(new ErrorHandler(error.message, 404));
    }

    return res.apiError(new ErrorHandler(error.message || "Failed to update view as rule", 500));
  }
});

/**
 * Check view as permission
 */
export const checkViewAsPermission = catchAsyncError(async (req: any, res: Response) => {
  try {
    const { staffPersona, targetRole } = req.body;
    const canView = await ViewAsRuleService.canViewAs(staffPersona, targetRole);
    
    return res.apiSuccess({ allowed: canView }, "Permission checked successfully", 200);
  } catch (error: any) {
    logger.error(`❌ Failed to check view as permission: ${error.message}`);
    return res.apiError(new ErrorHandler(error.message || "Failed to check permission", 500));
  }
});

/**
 * Get view as rule for currently authenticated user
 */
export const getMyViewAsRule = catchAsyncError(async (req: any, res: Response) => {
  try {
    const userPersona = req.user?.role || req.user?.persona;
    
    if (!userPersona) {
      return res.apiError(new ErrorHandler("User persona not found", 400));
    }

    const rule = await ViewAsRuleService.getByPersona(userPersona);

    return res.apiSuccess(
      rule ? rule : { persona: userPersona, allowedTargets: [] },
      "User view as rule retrieved successfully",
      200
    );
  } catch (error: any) {
    logger.error(`❌ Failed to get user view as rule: ${error.message}`);
    return res.apiError(new ErrorHandler(error.message || "Failed to retrieve user view as rule", 500));
  }
});
