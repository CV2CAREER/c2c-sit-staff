import { Request, Response } from "express";
import { VaChatService } from "@/services/assistant/va-chat.service";
import { getServiceLogger } from "@/utils/createLogger";

const logger = getServiceLogger("va-chat-controller");

export class VaChatController {
  /** GET /api/v1/assistant/va?sessionId=xxx */
  static async getMessages(req: Request, res: Response) {
    try {
      const { sessionId } = req.query;

      if (!sessionId || Array.isArray(sessionId)) {
        return res.status(400).json({
          success: false,
          message: "Bad request. Valid sessionId required.",
        });
      }

      const messages = await VaChatService.getMessages(sessionId as string);

      return res.status(200).json({ success: true, data: messages });
    } catch (error: any) {
      logger.error("VA Chat GET error:", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch messages",
      });
    }
  }

  /** POST /api/v1/assistant/va */
  static async sendMessage(req: Request, res: Response) {
    try {
      const { message, sessionId, userId, jobUrl, type } = req.body;

      if (!message || !sessionId) {
        return res.status(400).json({
          success: false,
          message: "Missing required fields: message and sessionId.",
        });
      }

      logger.info("VA Chat POST:", { type, userId, hasJobUrl: !!jobUrl });

      const result = await VaChatService.sendMessage({
        message,
        sessionId,
        userId,
        jobUrl,
        type,
      });

      return res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      logger.error("VA Chat POST error:", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Internal Server Error",
      });
    }
  }

  /** DELETE /api/v1/assistant/va?sessionId=xxx */
  static async deleteSession(req: Request, res: Response) {
    try {
      const { sessionId } = req.query;

      logger.info("VA Chat DELETE:", { sessionId });

      if (!sessionId || Array.isArray(sessionId)) {
        return res.status(400).json({
          success: false,
          message: "Bad request. Valid sessionId required.",
        });
      }

      await VaChatService.deleteSession(sessionId as string);

      return res.status(200).json({
        success: true,
        message: "Chat session deleted successfully",
      });
    } catch (error: any) {
      logger.error("VA Chat DELETE error:", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to delete session",
      });
    }
  }
}
