import { Request, Response } from "express";
import catchAsyncError from "../../utils/catchAsyncError";
import ErrorHandler from "../../utils/errorHandler";
import { SupportService } from "../../services/admin/support.service";
import { getServiceLogger } from "../../utils/createLogger";

const logger = getServiceLogger("support-controller");

/**
 * Create new support session
 */
export const createSupportSession = catchAsyncError(async (req: any, res: Response) => {
  try {
    const session = await SupportService.createSession(req.body, req, req.user);
    return res.apiSuccess(session, "Support session created successfully", 201);
  } catch (error: any) {
    logger.error(`❌ Failed to create support session: ${error.message}`);
    return res.apiError(new ErrorHandler(error.message || "Failed to create support session", 500));
  }
});

/**
 * Send message in support session
 */
export const sendSupportMessage = catchAsyncError(async (req: any, res: Response) => {
  try {
    const { sessionId } = req.params;
    const message = await SupportService.sendMessage(sessionId, req.body, req, req.user);
    return res.apiSuccess(message, "Message sent successfully", 201);
  } catch (error: any) {
    logger.error(`❌ Failed to send message: ${error.message}`);

    if (error.message === "Support session not found") {
      return res.apiError(new ErrorHandler(error.message, 404));
    }

    return res.apiError(new ErrorHandler(error.message || "Failed to send message", 500));
  }
});

/**
 * Get all messages for a session
 */
export const getSessionMessages = catchAsyncError(async (req: any, res: Response) => {
  try {
    const { sessionId } = req.params;
    const messages = await SupportService.getSessionMessages(sessionId);
    return res.apiSuccess(messages, "Messages retrieved successfully", 200);
  } catch (error: any) {
    logger.error(`❌ Failed to get messages: ${error.message}`);
    return res.apiError(new ErrorHandler(error.message || "Failed to retrieve messages", 500));
  }
});

/**
 * Submit customer feedback
 */
export const submitFeedback = catchAsyncError(async (req: any, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { feedback, comment } = req.body;

    if (!feedback) {
      return res.apiError(new ErrorHandler("Feedback is required", 400));
    }

    const session = await SupportService.submitFeedback(sessionId, feedback, comment, req, req.user);
    return res.apiSuccess(session, "Feedback submitted successfully", 200);
  } catch (error: any) {
    logger.error(`❌ Failed to submit feedback: ${error.message}`);

    if (error.message === "Support session not found") {
      return res.apiError(new ErrorHandler(error.message, 404));
    }

    return res.apiError(new ErrorHandler(error.message || "Failed to submit feedback", 500));
  }
});

/**
 * Assign staff to session
 */
export const assignStaffToSession = catchAsyncError(async (req: any, res: Response) => {
  try {
    const { sessionId, staffId } = req.body;

    if (!sessionId || !staffId) {
      return res.apiError(new ErrorHandler("Session ID and Staff ID are required", 400));
    }

    const session = await SupportService.assignStaff(sessionId, staffId, req, req.user);
    
    return res.apiSuccess(session, "Staff assigned successfully", 200);
  } catch (error: any) {
    logger.error(`❌ Failed to assign staff: ${error.message}`);

    if (error.message === "Support session not found") {
      return res.apiError(new ErrorHandler(error.message, 404));
    }

    return res.apiError(new ErrorHandler(error.message || "Failed to assign staff", 500));
  }
});

/**
 * End/Close support session
 */
export const endSupportSession = catchAsyncError(async (req: any, res: Response) => {
  try {
    const { sessionId } = req.params;
    const session = await SupportService.endSession(sessionId, req, req.user);
    return res.apiSuccess(session, "Support session closed successfully", 200);
  } catch (error: any) {
    logger.error(`❌ Failed to close session: ${error.message}`);

    if (error.message === "Support session not found") {
      return res.apiError(new ErrorHandler(error.message, 404));
    }

    return res.apiError(new ErrorHandler(error.message || "Failed to close session", 500));
  }
});

/**
 * Get all support sessions
 */
export const getAllSupportSessions = catchAsyncError(async (req: any, res: Response) => {
  try {
    const { page, limit } = req.query;
    const result = await SupportService.getAllSessions(
      parseInt(page as string) || 1,
      parseInt(limit as string) || 20
    );
    return res.apiSuccess(result, "Support sessions retrieved successfully", 200);
  } catch (error: any) {
    logger.error(`❌ Failed to get sessions: ${error.message}`);
    return res.apiError(new ErrorHandler(error.message || "Failed to retrieve sessions", 500));
  }
});
