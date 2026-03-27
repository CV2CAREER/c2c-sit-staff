import { Request, Response } from "express";
import { dispatchClientToVA } from "../../services/dispatch-client.service";
import catchAsyncError from "../../utils/catchAsyncError";
import ErrorHandler from "../../utils/errorHandler";

// Dispatch client information to a PC (Placement Control)
export const dispatchClient = catchAsyncError(
  async (req: Request, res: Response) => {
    const { pcId, clientId, userIds }: { pcId: string; clientId?: string; userIds?: string[] } = req.body;
    
    // Validate required parameters
    if (!pcId) {
      return res.apiError(new ErrorHandler("PC ID is required", 400));
    }

    let clientIds: string[] = [];
    if (clientId) {
      clientIds.push(clientId);
    }
    if (userIds && Array.isArray(userIds)) {
      clientIds = [...clientIds, ...userIds];
    }

    if (clientIds.length === 0) {
      return res.apiError(new ErrorHandler("At least one client ID must be provided", 400));
    }

    const host = req.headers.host || req.headers.origin || "localhost";
    const senderId = req.user?.email || 'System';
    
    // Call the service to handle the dispatch logic
    const result = await dispatchClientToVA(pcId, clientIds, host, senderId);

    res.apiSuccess(
      result,
      `Client dispatch completed: ${result.successCount} successful, ${result.failedCount} failed`
    );
  }
);
