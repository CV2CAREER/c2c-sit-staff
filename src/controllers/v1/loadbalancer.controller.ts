// controllers/v1/discovery-queue.controller.ts
import { Request, Response } from "express";
import Redis from "ioredis";
import db from "@/database/postgres";

export const discoveryQueueController = async (req: Request, res: Response) => {
  const redisClient = new Redis({
    host: process.env.CLIENT_SAMPLE_REDIS_HOST,
    password: process.env.CLIENT_SAMPLE_REDIS_PASSWORD,
    db: 1,
  });

  try {
    if (req.method?.toLowerCase() !== "get") {
      return res.status(400).json({ message: "Invalid method" });
    }

    const queueName = req.query.jobsite as string | undefined;

    /* -------------------------------------------------------------------------- */
    /* ALL QUEUES                                                                 */
    /* -------------------------------------------------------------------------- */
    if (!queueName) {
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

      return res.status(200).json({
        success: true,
        data: queueitems,
        message: "Queues fetched successfully",
      });
    }

    /* -------------------------------------------------------------------------- */
    /* SINGLE QUEUE                                                               */
    /* -------------------------------------------------------------------------- */
    const queueKey = `${queueName.toUpperCase().trim()}_DISCOVERY_QUEUE`;

    const queueLength = await redisClient.llen(queueKey);

    if (!queueLength) {
      return res.status(200).json({
        success: false,
        data: [],
        message: `Queue ${queueKey} is empty`,
      });
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

    return res.status(200).json({
      success: true,
      data: queueitems,
      message: "Queue fetched successfully",
    });
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({
      message: "Internal server error",
    });
  } finally {
    redisClient.quit();
  }
};
