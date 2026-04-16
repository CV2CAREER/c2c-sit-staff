// controllers/v1/client-sample-queue.controller.ts
import { Request, Response } from "express";
import db from "@/database/postgres";
import { getConnectedRedis } from "@/config/redis";
import { getServiceLogger } from "@/utils/createLogger";
import ErrorHandler from "@/utils/errorHandler";
import catchAsyncError from "@/utils/catchAsyncError";

const logger = getServiceLogger("client-sample-queue");

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

const extractValueFromQueueElement = (element: string) =>
  element.split(":;")[0];

/* -------------------------------------------------------------------------- */
/* GET                                                                        */
/* -------------------------------------------------------------------------- */
const handleGetRequest = async (req: Request, res: Response, rdClient: any) => {
  const agg = req.query.agg as string;
  const environment = (req.query.environment as string) || "";

  const currentKey = CLIENT_SAMPLE_CURRENT_PROCESSING_KEY(agg, environment);
  const queueKey = CLIENT_SAMPLE_QUEUE_KEY(agg, environment);

  logger.info(`Getting queue data for agg: ${agg}`);

  const current = await rdClient.get(currentKey);
  let result = await rdClient.lrange(queueKey, 0, -1);

  result = result.map(extractValueFromQueueElement);

  return res.apiSuccess({ result, current }, "Queue data retrieved");
};

/* -------------------------------------------------------------------------- */
/* DELETE                                                                     */
/* -------------------------------------------------------------------------- */
const handleDeleteRequest = async (
  req: Request,
  res: Response,
  rdClient: any,
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

  const value = values.find((e: string) => e.includes(input));

  if (!value) {
    throw new ErrorHandler("Element not found in queue", 404);
  }

  logger.info(`Deleting element from queue: ${queue}`);

  const result = await rdClient.lrem(queueKey, 1, value);

  return res.apiSuccess({ deleted: result }, "Deleted from queue");
};

/* -------------------------------------------------------------------------- */
/* POST                                                                       */
/* -------------------------------------------------------------------------- */
const handlePostRequest = async (
  req: Request,
  res: Response,
  rdClient: any,
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
      logger.info("Element already in queue");
      return res.apiSuccess(
        { saved: false, queue: values },
        "Element already in queue",
      );
    }

    logger.info(`Adding element to queue: ${queue}`);
    await rdClient.lpush(queueKey, input);

    return res.apiSuccess(
      { saved: true, queue: [...values, input] },
      "Element added to queue",
    );
  } catch (error: any) {
    logger.error("Error in POST handler", error);
    throw new ErrorHandler("Failed to add element", 500);
  }
};

/* -------------------------------------------------------------------------- */
/* MAIN CONTROLLER                                                            */
/* -------------------------------------------------------------------------- */
export const clientSampleQueueController = catchAsyncError(
  async (req: Request, res: Response) => {
    const rdClient = await getConnectedRedis();

    if (!rdClient) {
      throw new ErrorHandler("Redis unavailable", 503);
    }

    switch (req.method?.toLowerCase()) {
      case "get":
        return await handleGetRequest(req, res, rdClient);

      case "delete":
        return await handleDeleteRequest(req, res, rdClient);

      case "post":
        return await handlePostRequest(req, res, rdClient);

      default:
        throw new ErrorHandler("Method not allowed", 405);
    }
  },
);
