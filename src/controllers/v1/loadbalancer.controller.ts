// controllers/v1/discovery-queue.controller.ts
import { Request, Response } from "express";
import db from "@/database/postgres";
import { getConnectedRedis } from "@/config/redis";
import catchAsyncError from "@/utils/catchAsyncError";
import { getServiceLogger } from "@/utils/createLogger";
import ErrorHandler from "@/utils/errorHandler";

const logger = getServiceLogger("discovery-queue-controller");

export const discoveryQueueController = catchAsyncError(
  async (req: Request, res: Response) => {
    if (req.method?.toLowerCase() !== "get") {
      throw new ErrorHandler("Invalid method", 400);
    }

    const redisClient = await getConnectedRedis();

    if (!redisClient) {
      throw new ErrorHandler("Redis unavailable", 503);
    }

    const queueName = req.query.jobsite as string | undefined;

    /* -------------------------------------------------------------------------- */
    /* ALL QUEUES                                                                 */
    /* -------------------------------------------------------------------------- */
    if (!queueName) {
      logger.info("Fetching all discovery queues");

      const aggregators = await db.aggregators.findMany({
        select: { name: true },
      });

      const queueitems: any[] = [];
      let id = 0;

      for (const { name } of aggregators) {
        const queueKey = `${name.toUpperCase().trim()}_DISCOVERY_QUEUE`;

        const queueLength = await redisClient.llen(queueKey);
        if (!queueLength) continue;

        const queueData = await redisClient.lrange(queueKey, 0, -1);

        for (const data of queueData) {
          const client = JSON.parse(data);

          const cred = await db.credentials.findUnique({
            where: { id: client.id },
            select: {
              customer_id: true,
              alias_email: true,
            },
          });

          if (!cred) continue;

          const user = await db.users.findUnique({
            where: { unique_id: cred.customer_id },
            select: {
              id: true,
              first_name: true,
              middle_name: true,
              last_name: true,
              email: true,
            },
          });

          queueitems.push({
            id: id++,
            credentialId: client.id,
            uid: user?.id,
            name: `${user?.first_name || ""} ${user?.middle_name || ""} ${user?.last_name || ""}`.trim(),
            aggregator: name,
            email: user?.email,
            jobsiteEmail: cred.alias_email,
          });
        }
      }

      res.apiSuccess(queueitems, "Queues fetched successfully");
      return;
    }

    /* -------------------------------------------------------------------------- */
    /* SINGLE QUEUE                                                               */
    /* -------------------------------------------------------------------------- */
    const queueKey = `${queueName.toUpperCase().trim()}_DISCOVERY_QUEUE`;

    logger.info(`Fetching discovery queue: ${queueKey}`);

    const queueLength = await redisClient.llen(queueKey);

    if (!queueLength) {
      res.apiSuccess([], `Queue ${queueKey} is empty`);
      return;
    }

    const queueData = await redisClient.lrange(queueKey, 0, -1);
    const queueitems: any[] = [];
    let id = 0;

    for (const data of queueData) {
      const client = JSON.parse(data);

      const cred = await db.credentials.findUnique({
        where: { id: client.id },
        select: {
          customer_id: true,
          alias_email: true,
        },
      });

      if (!cred) continue;

      const user = await db.users.findUnique({
        where: { unique_id: cred.customer_id },
        select: {
          id: true,
          first_name: true,
          middle_name: true,
          last_name: true,
          email: true,
        },
      });

      queueitems.push({
        id: id++,
        credentialId: client.id,
        uid: user?.id,
        name: `${user?.first_name || ""} ${user?.middle_name || ""} ${user?.last_name || ""}`.trim(),
        aggregator: queueName,
        email: user?.email,
        jobsiteEmail: cred.alias_email,
      });
    }

    logger.info(`Queue fetched: ${queueKey} with ${queueitems.length} items`);

    res.apiSuccess(queueitems, "Queue fetched successfully");
  },
);
