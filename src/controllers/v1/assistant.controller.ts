import { Request, Response } from "express";
import { ClientsAssignedService } from "../../services/assistant/clients-assigned.service";

/**
 * Assistant Controller
 * Handles all assistant related endpoints
 */
export class AssistantController {
  /**
   * GET
   * Returns assigned clients and statistics for authenticated assistant
   */
  static async getClientsAssigned(req: Request, res: Response) {
    try {
      // Get authenticated user id from request (set by auth middleware)
      const assistantId = (req as any).user?.id;

      if (!assistantId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized - User not authenticated"
        });
      }

      const result = await ClientsAssignedService.getAssignedClients(assistantId);

      return res.status(200).json({
        success: true,
        data: result
      });

    } catch (error: any) {
      console.error("Error fetching assigned clients:", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch assigned clients"
      });
    }
  }
}