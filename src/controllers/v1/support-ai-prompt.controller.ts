// controllers/v1/support-ai-prompt.controller.ts
import { Request, Response } from "express";
import Redis from "ioredis";
import { REDIS_HOST, REDIS_PASSWORD, REDIS_PORT } from "@/config/env";

const redisClient = new Redis({
  host: REDIS_HOST,
  port: REDIS_PORT,
  password: REDIS_PASSWORD,
});

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

export const supportAiPromptController = async (
  req: Request,
  res: Response,
) => {
  try {
    const method = req.method.toLowerCase();

    /* ---------------- POST ---------------- */
    if (method === "post") {
      const { question, response } = req.body;

      if (!question || !response) {
        return res.status(400).json({
          message: "Could not extract question or answer.",
        });
      }

      const fullPair = `QUESTION: ${question} ANSWER: ${response}`;

      const existingPrompt =
        (await redisClient.get("SUPPORT_AI_PROMPT")) || basePrompt;

      const updatedPrompt = `${existingPrompt}\n\n${fullPair}`;

      await redisClient.set("SUPPORT_AI_PROMPT", updatedPrompt);

      return res.status(201).json({
        message: "Question and Answer added successfully.",
        question,
        response,
      });
    }

    /* ---------------- GET ---------------- */
    if (method === "get") {
      const prompt = (await redisClient.get("SUPPORT_AI_PROMPT")) || basePrompt;

      return res.status(200).json({ prompt });
    }

    /* ---------------- DELETE ---------------- */
    if (method === "delete") {
      const { question } = req.body;

      if (!question) {
        return res.status(400).json({
          message: "Question is required for deletion.",
        });
      }

      const existingPrompt = await redisClient.get("SUPPORT_AI_PROMPT");

      if (!existingPrompt) {
        return res.status(404).json({
          message: "Prompt not found.",
        });
      }

      const qaRegex = new RegExp(
        `QUESTION: ${question}\\s+ANSWER: .*?(?=QUESTION:|$)`,
        "s",
      );

      if (!qaRegex.test(existingPrompt)) {
        return res.status(404).json({
          message: "Question not found in prompt.",
        });
      }

      const updatedPrompt = existingPrompt.replace(qaRegex, "").trim();

      await redisClient.set("SUPPORT_AI_PROMPT", updatedPrompt);

      return res.status(200).json({
        message: "Question deleted successfully.",
      });
    }

    return res.status(405).json({ message: "Method not allowed." });
  } catch (error: any) {
    return res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
};
