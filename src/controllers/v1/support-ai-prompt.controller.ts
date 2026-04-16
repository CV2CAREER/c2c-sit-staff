// controllers/v1/support-ai-prompt.controller.ts
import { Request, Response } from "express";
import { getConnectedRedis } from "@/config/redis";
import { getServiceLogger } from "@/utils/createLogger";
import ErrorHandler from "@/utils/errorHandler";
import catchAsyncError from "@/utils/catchAsyncError";

const basePrompt = `You are an AI chatbot. Here are your questions and answers:

QUESTION: What is your name? 
ANSWER: I am VhatBot, your helpful AI assistant.

QUESTION: What can you do?
ANSWER: I can answer questions, help with tasks, and make your life easier.

QUESTION: How do I reset my password?
ANSWER: To reset your password, click on 'Forgot Password' on the login screen and follow the instructions.

QUESTION: Where are you located?
ANSWER: I exist in the cloud, always ready to assist you.

QUESTION: Can you help me with my CV?
ANSWER: Absolutely! I can help review, improve, and tailor your CV for different jobs.
`;

const logger = getServiceLogger("support-ai-prompt");

export const supportAiPromptController = catchAsyncError(
  async (req: Request, res: Response) => {
    const method = req.method.toLowerCase();
    const redisClient = await getConnectedRedis();

    if (!redisClient) {
      throw new ErrorHandler("Redis unavailable", 503);
    }

    /* ---------------- POST ---------------- */
    if (method === "post") {
      const { question, response } = req.body;

      if (!question || !response) {
        throw new ErrorHandler("Could not extract question or answer.", 400);
      }

      logger.info(`Adding question: ${question}`);

      const fullPair = `QUESTION: ${question} ANSWER: ${response}`;
      const existingPrompt =
        (await redisClient.get("SUPPORT_AI_PROMPT")) || basePrompt;
      const updatedPrompt = `${existingPrompt}\n\n${fullPair}`;

      await redisClient.set("SUPPORT_AI_PROMPT", updatedPrompt);

      return res.apiSuccess(
        { question, response },
        "Question and Answer added successfully.",
        201,
      );
    }

    /* ---------------- GET ---------------- */
    if (method === "get") {
      logger.info("Retrieving support AI prompt");
      const prompt = (await redisClient.get("SUPPORT_AI_PROMPT")) || basePrompt;

      return res.apiSuccess({ prompt }, "Prompt retrieved successfully.");
    }

    /* ---------------- DELETE ---------------- */
    if (method === "delete") {
      const { question } = req.body;

      if (!question) {
        throw new ErrorHandler("Question is required for deletion.", 400);
      }

      logger.info(`Deleting question: ${question}`);
      const existingPrompt = await redisClient.get("SUPPORT_AI_PROMPT");

      if (!existingPrompt) {
        throw new ErrorHandler("Prompt not found.", 404);
      }

      const qaRegex = new RegExp(
        `QUESTION: ${question}\\s+ANSWER: .*?(?=QUESTION:|$)`,
        "s",
      );

      if (!qaRegex.test(existingPrompt)) {
        throw new ErrorHandler("Question not found in prompt.", 404);
      }

      const updatedPrompt = existingPrompt.replace(qaRegex, "").trim();
      await redisClient.set("SUPPORT_AI_PROMPT", updatedPrompt);

      return res.apiSuccess({}, "Question deleted successfully.");
    }

    throw new ErrorHandler("Method not allowed.", 405);
  },
);
