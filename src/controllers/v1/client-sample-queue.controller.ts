// controllers/v1/client-sample-queue.controller.ts
import { Request, Response } from "express";
import Redis from "ioredis";
import db from "@/database/postgres";

/* -------------------------------------------------------------------------- */
/* Redis Keys                                                                 */
/* -------------------------------------------------------------------------- */
const CLIENT_SAMPLE_QUEUE_KEY = (agg: string, environment: string) =>
  environment === "_TEST"
    ? `${agg.toUpperCase()}_CLIENT_SAMPLE_QUEUE_TEST`
    : `${agg.toUpperCase()}_CLIENT_SAMPLE_QUEUE`;

const CLIENT_SAMPLE_CURRENT_PROCESSING_KEY = (
  agg: string,
  environment: string,
) =>
  environment === "_TEST"
    ? `${agg.toUpperCase()}_CLIENT_SAMPLE_CURRENT_PROCESSING_TEST`
    : `${agg.toUpperCase()}_CLIENT_SAMPLE_CURRENT_PROCESSING`;

/* -------------------------------------------------------------------------- */
/* Redis Client                                                               */
/* -------------------------------------------------------------------------- */
const getRedisClient = () =>
  new Redis({
    host: process.env.CLIENT_SAMPLE_REDIS_HOST,
    password: process.env.CLIENT_SAMPLE_REDIS_PASSWORD,
  });

const extractValueFromQueueElement = (element: string) =>
  element.split(":;")[0];

/* -------------------------------------------------------------------------- */
/* GET                                                                        */
/* -------------------------------------------------------------------------- */
const handleGetRequest = async (
  req: Request,
  res: Response,
  rdClient: Redis,
) => {
  const agg = req.query.agg as string;
  const environment = (req.query.environment as string) || "";

  const currentKey = CLIENT_SAMPLE_CURRENT_PROCESSING_KEY(agg, environment);
  const queueKey = CLIENT_SAMPLE_QUEUE_KEY(agg, environment);

  const current = await rdClient.get(currentKey);
  let result = await rdClient.lrange(queueKey, 0, -1);

  result = result.map(extractValueFromQueueElement);

  return res.status(200).json({ result, current });
};

/* -------------------------------------------------------------------------- */
/* DELETE                                                                     */
/* -------------------------------------------------------------------------- */
const handleDeleteRequest = async (
  req: Request,
  res: Response,
  rdClient: Redis,
) => {
  const queue = req.query.queue as string;
  const input = req.query.value as string;
  const environment = (req.query.env as string) || "";

  let queueKey;

  if (queue.includes("_stage") && environment === "TEST") {
    const prosQueueKey = queue.replace(/_/g, "").replace(/stage/gi, "");
    queueKey = CLIENT_SAMPLE_QUEUE_KEY(prosQueueKey, "_TEST");
  } else {
    queueKey = CLIENT_SAMPLE_QUEUE_KEY(queue, "_LIVE");
  }

  const values = await rdClient.lrange(queueKey, 0, -1);

  const value = values.find((e) => e.includes(input));

  if (!value) {
    return res.status(404).json({
      deleted: 0,
      message: "Element not found in queue",
    });
  }

  const result = await rdClient.lrem(queueKey, 1, value);

  return res.status(200).json({
    deleted: result,
    message: "Deleted from queue",
  });
};

/* -------------------------------------------------------------------------- */
/* POST                                                                       */
/* -------------------------------------------------------------------------- */
const handlePostRequest = async (
  req: Request,
  res: Response,
  rdClient: Redis,
) => {
  try {
    const { environment, aggregator, clientId } = req.body;
    const queue: string = req.body.queue ?? aggregator;

    let input: string = req.body.input;
    let queueKey;

    if (queue.includes("_stage") && environment === "TEST") {
      const prosQueueKey = queue.replace(/_/g, "").replace(/stage/gi, "");
      queueKey = CLIENT_SAMPLE_QUEUE_KEY(prosQueueKey, "_TEST");
    } else {
      queueKey = CLIENT_SAMPLE_QUEUE_KEY(queue, "_LIVE");
    }

    /* ------------------------------------------------------------ */
    /* build input from postgres                                    */
    /* ------------------------------------------------------------ */
    if (!input && clientId && aggregator) {
      const cred = await db.credentials.findUnique({
        where: { id: clientId },
        select: { alias_email: true },
      });

      if (!cred) {
        return res.status(400).json({ message: "Client not found" });
      }

      input = JSON.stringify({
        email: cred.alias_email,
        process: aggregator.includes("stage") ? "staging" : "production",
      });
    }

    const values = await rdClient.lrange(queueKey, 0, -1);

    if (values.includes(input)) {
      return res.status(200).json({
        saved: false,
        queue: values,
      });
    }

    await rdClient.lpush(queueKey, input);

    return res.status(200).json({
      saved: true,
      queue: [...values, input],
    });
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({
      message: "Failed to add element",
      error: error.message,
    });
  }
};

/* -------------------------------------------------------------------------- */
/* MAIN CONTROLLER                                                            */
/* -------------------------------------------------------------------------- */
export const clientSampleQueueController = async (
  req: Request,
  res: Response,
) => {
  const rdClient = getRedisClient();

  try {
    switch (req.method?.toLowerCase()) {
      case "get":
        return await handleGetRequest(req, res, rdClient);

      case "delete":
        return await handleDeleteRequest(req, res, rdClient);

      case "post":
        return await handlePostRequest(req, res, rdClient);

      default:
        return res.status(405).json({
          message: "Method not allowed",
        });
    }
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({
      message: "Internal server error",
    });
  } finally {
    rdClient.quit();
  }
};
