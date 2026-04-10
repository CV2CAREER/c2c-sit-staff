import { Request, Response } from "express";
import catchAsyncError from "../../utils/catchAsyncError";
import ErrorHandler from "../../utils/errorHandler";
import { ChatService } from "../../services/admin/chat.service";
import { getServiceLogger } from "../../utils/createLogger";

const logger = getServiceLogger("chat-controller");

/**
 * Get chats filtered by date
 */
export const getChatsByDate = catchAsyncError(async (req: any, res: Response) => {
  try {
    const { date, endDate, page, limit } = req.query;

    if (!date) {
      return res.apiError(new ErrorHandler("Date parameter is required", 400));
    }

    const result = await ChatService.getByDate(
      date as string,
      endDate as string | undefined,
      parseInt(page as string) || 1,
      parseInt(limit as string) || 20
    );

    return res.apiSuccess(result, "Chats retrieved successfully", 200);
  } catch (error: any) {
    logger.error(`❌ Failed to get chats by date: ${error.message}`);
    return res.apiError(new ErrorHandler(error.message || "Failed to retrieve chats", 500));
  }
});

/**
 * Get chat by ID
 */
export const getChatById = catchAsyncError(async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const chat = await ChatService.getById(id);

    if (!chat) {
      return res.apiError(new ErrorHandler("Chat not found", 404));
    }

    return res.apiSuccess(chat, "Chat retrieved successfully", 200);
  } catch (error: any) {
    logger.error(`❌ Failed to get chat: ${error.message}`);
    return res.apiError(new ErrorHandler(error.message || "Failed to retrieve chat", 500));
  }
});