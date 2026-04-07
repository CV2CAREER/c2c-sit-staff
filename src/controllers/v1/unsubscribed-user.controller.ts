import { Request, Response } from "express";
import { UnsubscribedUserService } from "../../services/unsubscribed-user.service";
import catchAsyncError from "../../utils/catchAsyncError";
import ErrorHandler from "../../utils/errorHandler";
import { getServiceLogger } from "../../utils/createLogger";

const logger = getServiceLogger("unsubscribed-user-controller");

// Get all unsubscribed users
export const getUnsubscribedUsers = catchAsyncError(
  async (req: Request, res: Response) => {
    try {
      const users = await UnsubscribedUserService.getAllUnsubscribedUsers();
      
      res.apiSuccess(users, "Unsubscribed users retrieved successfully");
    } catch (error: any) {
      logger.error(`Failed to retrieve unsubscribed users: ${error.message}`);
      return res.apiError(new ErrorHandler(error.message, 500));
    }
  }
);

// Unsubscribe user by ID (admin can unsubscribe any user)
export const unsubscribeUser = catchAsyncError(
  async (req: Request, res: Response) => {
    try {
      const { userId, reason } = req.body;
      const host = req.headers.host || req.headers.origin || "localhost";
      
      const result = await UnsubscribedUserService.unsubscribeUser(
        userId,
        reason,
        host
      );

      if (result.alreadyUnsubscribed) {
        return res.apiSuccess(result, "Already unsubscribed");
      }

      res.apiSuccess(result, "Unsubscribed successfully");
    } catch (error: any) {
      logger.error(`Failed to unsubscribe user: ${error.message}`);
      return res.apiError(new ErrorHandler(error.message, 500));
    }
  }
);

// Remove user from unsubscribed list
export const removeUnsubscribedUser = catchAsyncError(
  async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      
      // Get user email from auth token
      const result = await UnsubscribedUserService.removeUnsubscribedUser(
        userId,
        req.user!.email
      );

      if (!result.deleted) {
        return res.apiSuccess(result, "User not found in unsubscribed list");
      }

      res.apiSuccess(result, "User removed from unsubscribed list successfully");
    } catch (error: any) {
      logger.error(`Failed to remove unsubscribed user: ${error.message}`);
      return res.apiError(new ErrorHandler(error.message, 500));
    }
  }
);
