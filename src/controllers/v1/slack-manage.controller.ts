import e, { Request, Response } from "express";
import catchAsyncError from "../../utils/catchAsyncError";
import { getServiceLogger } from "../../utils/createLogger";
import ErrorHandler from "../../utils/errorHandler";
import { slackManageService } from "../../services/admin/slack-manage.application.service";

const logger = getServiceLogger("slack-manage-controller");

/**
 * GET
 * Retrieve all Slack messages with optimized query
 */
export const getAllSlackMessages = catchAsyncError(
  async (req: Request, res: Response) => {

    const messages = await slackManageService.getAllMessages();

    res.apiSuccess(
      messages,
      "All Slack messages retrieved successfully",
    );
  },
);

/**
 * POST 
 * Create new Slack message with atomic SMID generation
 */
export const createSlackMessage = catchAsyncError(
  async (req: Request, res: Response) => {

    const newMessage = await slackManageService.createMessage(req.body);

    res.apiSuccess(
      newMessage,
      "Slack message created successfully",
      201,
    );
  },
);

/**
 * PUT
 * Update existing Slack message
 */
export const updateSlackMessage = catchAsyncError(
  async (req: Request, res: Response) => {

    const { id } = req.params;

    if (!id) {
      throw new ErrorHandler("Slack message ID is required", 400);
    }

    logger.info(`Updating Slack message with ID: ${id}`);

    const updatedMessage = await slackManageService.updateMessage(id, req.body);

    if (!updatedMessage) {
      throw new ErrorHandler("Slack message not found", 404);
    }

    res.apiSuccess(
      updatedMessage,
      "Slack message updated successfully",
    );
  },
);

/**
   * getMessageById - Retrieve a single Slack message by its ID
   */
export const getMessageById = catchAsyncError(
    async (req: Request, res: Response) => {

      const { id } = req.params;
        if (!id) {
            throw new ErrorHandler("Slack message ID is required", 400);
        }

        logger.info(`Fetching Slack message with ID: ${id}`);
        const message = await slackManageService.getMessageById(id);

        if (!message) {
            throw new ErrorHandler("Slack message not found", 404);
        }
    }
);