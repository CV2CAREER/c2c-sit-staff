import { Request, Response } from "express";
import { ClientsAssignedService } from "../../services/assistant/clients-assigned.service";
import catchAsyncError from "../../utils/catchAsyncError";

/**
 * Placement Controller
 * Handles placement controller (assistant) dashboard endpoints
 */
export class PlacementController {
  /**
   * GET /api/v1/placement/summary
   * Returns dashboard summary with assigned clients and statistics
   */
  static getDashboardSummary = catchAsyncError(async (req: Request, res: Response) => {
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.apiError({ message: "Unauthorized - User not authenticated", statusCode: 401 });
    }

    const result = await ClientsAssignedService.getAssignedClients(userId);

    return res.apiSuccess(result, "Dashboard summary fetched successfully");
  });
}
