// controllers/v1/ai-prompt-queue.controller.ts
import { Request, Response } from "express";
import Redis from "ioredis";

const rdClient = new Redis({
  host: process.env.CLIENT_SAMPLE_REDIS_HOST,
  password: process.env.CLIENT_SAMPLE_REDIS_PASSWORD,
});

const QUEUE = "ANSWERED_QUESTION_AI_PROMPT_QUEUE";

export const aiPromptQueueController = async (req: Request, res: Response) => {
  const method = req.method.toLowerCase();

  try {
    /* ---------------- GET ---------------- */
    if (method === "get") {
      let result = await rdClient.lrange(QUEUE, 0, -1);
      result = result.map((e) => e.split(":;")[0]);

      return res.status(200).json({ result });
    }

    /* ---------------- DELETE ---------------- */
    if (method === "delete") {
      const values = await rdClient.lrange(QUEUE, 0, -1);

      if (!values.length) {
        return res.status(401).json({
          deleted: 0,
          message: "Queue empty",
        });
      }

      for (const value of values) {
        await rdClient.lrem(QUEUE, 1, value);
      }

      return res.status(200).json({
        message: "deleted values from ANSWERED_QUESTION_AI_PROMPT_QUEUE",
      });
    }

    /* ---------------- POST ---------------- */
    if (method === "post") {
      const input: string = req.body.input;

      const values = await rdClient.lrange(QUEUE, 0, -1);

      if (values.includes(input)) {
        return res.status(200).json({
          saved: false,
          queue: values,
        });
      }

      await rdClient.lpush(QUEUE, input);

      return res.status(200).json({
        saved: true,
        queue: values,
      });
    }

    return res.status(405).json({
      message: `Method ${method.toUpperCase()} not allowed`,
    });
  } catch (error: any) {
    return res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
};
