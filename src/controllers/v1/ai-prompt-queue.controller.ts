// controllers/v1/ai-prompt-queue.controller.ts
import { Request, Response } from "express";
import { getConnectedRedis } from "@/config/redis";
import { getServiceLogger } from "@/utils/createLogger";
import ErrorHandler from "@/utils/errorHandler";
import catchAsyncError from "@/utils/catchAsyncError";

const logger = getServiceLogger("ai-prompt-queue");

const QUEUE = "ANSWERED_QUESTION_AI_PROMPT_QUEUE";

export const aiPromptQueueController = catchAsyncError(
  async (req: Request, res: Response) => {
    const method = req.method.toLowerCase();
    const rdClient = await getConnectedRedis();

    if (!rdClient) {
      throw new ErrorHandler("Redis unavailable", 503);
    }

    /* ---------------- GET ---------------- */
    if (method === "get") {
      logger.info("Retrieving AI prompt queue");
      let result = await rdClient.lrange(QUEUE, 0, -1);
      result = result.map((e) => e.split(":;")[0]);

      return res.apiSuccess({ result }, "Queue retrieved");
    }

    /* ---------------- DELETE ---------------- */
    if (method === "delete") {
      logger.info("Clearing AI prompt queue");
      const values = await rdClient.lrange(QUEUE, 0, -1);

      if (!values.length) {
        throw new ErrorHandler("Queue empty", 400);
      }

      for (const value of values) {
        await rdClient.lrem(QUEUE, 1, value);
      }

      return res.apiSuccess(
        { count: values.length },
        "Cleared values from ANSWERED_QUESTION_AI_PROMPT_QUEUE",
      );
    }

    /* ---------------- POST ---------------- */
    if (method === "post") {
      const input: string = req.body.input;

      if (!input) {
        throw new ErrorHandler("Input is required", 400);
      }

      logger.info(`Adding to AI prompt queue: ${input}`);
      const values = await rdClient.lrange(QUEUE, 0, -1);

      if (values.includes(input)) {
        logger.info("Input already in queue");
        return res.apiSuccess(
          { saved: false, queue: values },
          "Input already in queue",
        );
      }

      await rdClient.lpush(QUEUE, input);

      return res.apiSuccess(
        { saved: true, queue: [...values, input] },
        "Input added to queue",
      );
    }

    throw new ErrorHandler(`Method ${method.toUpperCase()} not allowed`, 405);
  },
);
