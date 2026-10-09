import { Request, Response } from "express";
import { VaChatService } from "@/services/assistant/va-chat.service";
import { SelectionCriteriaService } from "@/services/assistant/selection-criteria.service";
import { assertClientAccess } from "@/services/assistant/client-access";
import { getServiceLogger } from "@/utils/createLogger";

const logger = getServiceLogger("va-chat-controller");

const sendError = (res: Response, error: any, fallback: string) =>
  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || fallback,
  });

export class VaChatController {
  /** GET /api/v1/assistant/va/clients?q= — admin picker, all clients */
  static async searchClients(req: Request, res: Response) {
    try {
      const clients = await VaChatService.searchClients(String(req.query.q ?? ""));
      return res.status(200).json({ success: true, data: clients });
    } catch (error: any) {
      logger.error("VA client search error:", error);
      return sendError(res, error, "Failed to search clients");
    }
  }

  /** GET /api/v1/assistant/va/client/:clientId/cvs */
  static async listCvs(req: Request, res: Response) {
    try {
      const clientId = String(req.params.clientId ?? "").trim();
      await assertClientAccess((req as any).user, clientId);
      const cvs = await SelectionCriteriaService.listCvs(clientId);
      return res.status(200).json({ success: true, data: cvs });
    } catch (error: any) {
      logger.error("VA CV list error:", error);
      return sendError(res, error, "Failed to load CVs");
    }
  }

  /** POST /api/v1/assistant/va/job-ad  { url } */
  static async fetchJobAd(req: Request, res: Response) {
    try {
      const result = await SelectionCriteriaService.fetchJobAd(String(req.body?.url ?? ""));
      return res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      logger.error("VA job ad fetch error:", error);
      return sendError(res, error, "Failed to fetch the job ad");
    }
  }

  /** POST /api/v1/assistant/va/criteria/classify  { clientId, questions } — step 1, no side effects */
  static async classifyCriteria(req: Request, res: Response) {
    try {
      const { clientId, questions } = req.body ?? {};
      await assertClientAccess((req as any).user, String(clientId ?? ""));
      const items = SelectionCriteriaService.classify(String(questions ?? ""));
      return res.status(200).json({ success: true, data: { items } });
    } catch (error: any) {
      logger.error("VA selection criteria classify error:", error);
      return sendError(res, error, "Failed to extract the questions");
    }
  }

  /** POST /api/v1/assistant/va/criteria  { clientId, uploadId, jobAdText, items, sessionId } — step 2 */
  static async runCriteria(req: Request, res: Response) {
    try {
      const { clientId, uploadId, jobAdText, items, sessionId } = req.body ?? {};
      const user = (req as any).user;
      await assertClientAccess(user, String(clientId ?? ""));

      const requestedBy =
        `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim() || user?.email || "a staff member";
      const result = await SelectionCriteriaService.run({
        clientId: String(clientId),
        uploadId: String(uploadId ?? ""),
        jobAdText: String(jobAdText ?? ""),
        items,
        requestedBy,
        sessionId: String(sessionId ?? `sc-${Date.now()}`),
      });
      return res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      logger.error("VA selection criteria error:", error);
      return sendError(res, error, "Failed to process the selection criteria");
    }
  }

  /** GET /api/v1/assistant/va/client/:clientId */
  static async getClient(req: Request, res: Response) {
    try {
      const clientId = String(req.params.clientId ?? "").trim();
      if (!clientId) {
        return res.status(400).json({ success: false, message: "clientId is required." });
      }

      await assertClientAccess((req as any).user, clientId);
      const client = await VaChatService.getClient(clientId);
      return res.status(200).json({ success: true, data: client });
    } catch (error: any) {
      logger.error("VA Chat client lookup error:", error);
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Failed to load client",
      });
    }
  }

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

      if (type === "sample" && userId) {
        await assertClientAccess((req as any).user, String(userId));
      }

      const result = await VaChatService.sendMessage({
        message,
        sessionId,
        userId,
        jobUrl,
        type,
        // Admins use the admin VA; assistants are Placement Controllers.
        askedBy: (req as any).user?.role === "admin" ? "admin" : "pc",
      });

      return res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      logger.error("VA Chat POST error:", error);
      return res.status(error.statusCode || 500).json({
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
