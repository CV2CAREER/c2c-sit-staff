import { Request, Response } from "express";
import db from "@/database/postgres";
import { getConnectedRedis } from "@/config/redis";
import catchAsyncError from "@/utils/catchAsyncError";
import ErrorHandler from "@/utils/errorHandler";
import { fieldEncryption } from "@/utils/field-encryption";
import { getServiceLogger } from "@/utils/createLogger";
import { Op } from "sequelize";

const logger = getServiceLogger("client-sample-controller");

/**
 * Helper to get Redis key for client sample queue
 */
const getQueueKey = (queue: string, environment: string) => {
  const sanitizedQueue = queue.toUpperCase().replace(/_STAGE/gi, "").trim();
  const suffix = environment === "_TEST" ? "_TEST" : "";
  return `${sanitizedQueue}_CLIENT_SAMPLE_QUEUE${suffix}`;
};

/**
 * 1. Get Client Sample Users
 * Fetches a list of users with credentials.
 */
export const getUsers = catchAsyncError(async (req: Request, res: Response) => {
  const credentials = await db.credentials.findMany({
    where: { deletedAt: null },
    attributes: ["clientId"],
  });

  const customerIds = credentials
    .map((c: any) => c.clientId)
    .filter((id: any) => id !== null && id !== undefined);

  if (customerIds.length === 0) {
    return res.apiSuccess([], "No client sample users found");
  }

  const users = await db.users.findMany({
    where: {
      id: { [Op.in]: customerIds },
    },
    attributes: ["id", "firstName", "lastName"],
  });

  const data = credentials
    .map((cred: any) => {
      const user = users.find((u: any) => u.id === cred.clientId);
      if (!user) return null;
      return {
        Alias_Email: cred.seekEmail,
        Full_Name: `${user.firstName} ${user.lastName}`,
        uid: user.id,
      };
    })
    .filter(Boolean);

  res.apiSuccess(data, "Client sample users fetched successfully");
});

/**
 * 2. Get Client Sample Table
 * Fetches the data for the Queued, Processing, or Completed tabs.
 */
export const getTable = catchAsyncError(async (req: Request, res: Response) => {
  const { variance, environment, jobsite } = req.query as any;

  if (!variance) {
    throw new ErrorHandler("variance query parameter is required (queue | processing | completed)", 400);
  }

  const redisClient = await getConnectedRedis();
  if (!redisClient) {
    throw new ErrorHandler("Redis unavailable", 503);
  }

  if (variance === "queue") {
    const jobsites = jobsite
      ? [jobsite]
      : [
          "SEEK",
          "CareerOne",
          "Adzuna",
          "Jora",
          "Reed",
          "Randstad",
          "MichaelPage",
          "LinkedIn",
          "ADECCO",
        ];
    const envs = environment ? [environment] : ["_LIVE", "_TEST"];

    const processQueue = jobsites.flatMap((js: string) =>
      envs.map((env: string) => ({
        js,
        env,
        key: getQueueKey(js, env),
      })),
    );

    const redisResults = await Promise.all(
      processQueue.map((q: any) => redisClient.lrange(q.key, 0, -1)),
    );

    const emailEntries: Array<{ email: string; queue: string; environment: string }> = [];

    redisResults.forEach((list: string[], i: number) => {
      list.forEach((item: string) => {
        try {
          const parsed = JSON.parse(item);
          if (!parsed?.email) return;
          emailEntries.push({
            email: parsed.email,
            queue: processQueue[i].js,
            environment: processQueue[i].env,
          });
        } catch (e) {
          logger.error(`Error parsing queue item: ${item}`, e);
        }
      });
    });

    if (!emailEntries.length) {
      return res.apiSuccess([], "Queued samples fetched successfully");
    }

    const uniqueEmails = [...new Set(emailEntries.map((e) => e.email))];

    const credentials: any[] = await fieldEncryption.findCredentialsBySeekEmail(uniqueEmails);

    const uniqueClientIds = [
      ...new Set(
        credentials.map((c: any) => c.clientId).filter((id: any) => !!id),
      ),
    ];

    const users: any[] = await db.users.findMany({
      where: {
        id: { [Op.in]: uniqueClientIds },
      },
      attributes: ["id", "firstName", "lastName"],
    });

    const credentialByEmail = new Map(
      credentials.map((c: any) => [c.seekEmail, c]),
    );
    const userById = new Map(users.map((u: any) => [u.id, u]));

    const results: any[] = [];
    let globalId = 1;

    for (const entry of emailEntries) {
      const cred = credentialByEmail.get(entry.email);
      if (!cred) continue;

      const user = userById.get(cred.clientId);
      if (!user) continue;

      results.push({
        id: globalId++,
        uid: user.id,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        jobsiteEmail: entry.email,
        aggregator: entry.queue,
        bot: "Not Assigned",
        startTime: null,
        endTime: null,
        progress: 0,
        status: "Queued",
        env: entry.environment,
        credentialId: cred.id,
      });
    }

    return res.apiSuccess(results, "Queued samples fetched successfully");
  }

  if (variance === "processing" || variance === "completed") {
    // Logic adapted from sample-queue.controller.ts:getProcessingOrCompleted
    const isCompleted = variance === "completed";
    const processData = await db.sample_process.findMany({
      where: {
        status: isCompleted ? { not: null } : null,
        ...(jobsite && { aggregator: jobsite }),
      },
      orderBy: { start_time: "desc" },
      take: 100,
    });

    const results: any[] = [];

    for (const item of processData) {
      let cred = await db.credentials.findUnique({
        where: { id: item.client_id },
      });

      if (!cred && item.email) {
        const matched = await fieldEncryption.findCredentialsBySeekEmail([item.email]);
        if (matched.length) {
          cred = await db.credentials.findUnique({ where: { id: matched[0].id } });
        }
      }

      if (!cred) continue;

      const user = await db.users.findUnique({
        where: { id: cred.clientId },
      });

      if (!user) continue;

      results.push({
        id: item.id,
        uid: user.id,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        jobsiteEmail: item.email,
        aggregator: item.aggregator,
        bot: item.bot,
        startTime: item.start_time,
        endTime: item.end_time,
        progress: item.progress,
        status: item.status || (isCompleted ? "Completed" : "Running"),
        env: item.aggregator?.includes("STAGE") ? "_TEST" : "_LIVE", // Heuristic
        credentialId: cred.id,
      });
    }
    return res.apiSuccess(results, `${variance} samples fetched successfully`);
  }

  throw new ErrorHandler("Invalid variance", 400);
});

/**
 * 3. Run Client Sample / Retry Sample
 * Initiates or retries a sample run.
 */
export const runSample = catchAsyncError(async (req: Request, res: Response) => {
  const { environment, queue, email } = req.body;

  if (!queue || !email) {
    throw new ErrorHandler("queue and email are required", 400);
  }

  const redisClient = await getConnectedRedis();
  if (!redisClient) {
    throw new ErrorHandler("Redis unavailable", 503);
  }

  const key = getQueueKey(queue, environment || "_LIVE");
  const values = await redisClient.lrange(key, 0, -1);

  const alreadyInQueue = values.some((item: string) => {
    try {
      return JSON.parse(item).email === email;
    } catch {
      return false;
    }
  });

  if (alreadyInQueue) {
    return res.apiSuccess({ saved: false }, "Email already in queue");
  }

  const inputObject = {
    email,
    process: (queue.toUpperCase().includes("STAGE") || environment === "_TEST") ? "staging" : "production",
  };

  await redisClient.lpush(key, JSON.stringify(inputObject));
  
  logger.info(`Added ${email} to queue: ${key}`);
  res.apiSuccess({ saved: true }, `Email ${email} added to ${queue}${environment || ""} queue`);
});

/**
 * 4. Remove from Queue
 * Removes a pending sample request from the queue.
 */
export const removeFromQueue = catchAsyncError(async (req: Request, res: Response) => {
  const { environment, email, queue } = req.body;

  if (!queue || !email) {
    throw new ErrorHandler("queue and email are required", 400);
  }

  const redisClient = await getConnectedRedis();
  if (!redisClient) {
    throw new ErrorHandler("Redis unavailable", 503);
  }

  const key = getQueueKey(queue, environment || "_LIVE");
  const values = await redisClient.lrange(key, 0, -1);

  const valueToRemove = values.find((e: string) => {
    try {
      return JSON.parse(e).email === email;
    } catch {
      return false;
    }
  });

  if (!valueToRemove) {
    throw new ErrorHandler("Element not found in queue", 404);
  }

  await redisClient.lrem(key, 1, valueToRemove);
  
  logger.info(`Removed ${email} from queue: ${key}`);
  res.apiSuccess({ success: true }, "Removed from queue successfully");
});

/**
 * 5. Get Load Balancer (Perpetual Discovery Queue)
 */
export const getLoadBalancer = catchAsyncError(async (req: Request, res: Response) => {
  const jobsite = req.query.jobsite as string | undefined;
  const redisClient = await getConnectedRedis();

  if (!redisClient) {
    throw new ErrorHandler("Redis unavailable", 503);
  }

  const aggregators = jobsite ? [{ name: jobsite }] : await db.aggregators.findMany({
    select: { name: true },
  });

  const queueItems: any[] = [];
  let globalId = 0;

  for (const { name } of aggregators) {
    const queueKey = `${name.toUpperCase().trim()}_DISCOVERY_QUEUE`;
    const queueData = await redisClient.lrange(queueKey, 0, -1);

    for (const data of queueData) {
      try {
        const client = JSON.parse(data);
        const cred = await db.credentials.findUnique({
          where: { id: client.id },
          attributes: ["clientId"],
        });

        if (!cred) continue;

        const user = await db.users.findUnique({
          where: { id: cred.clientId },
          attributes: ["id", "firstName", "lastName"],
        });

        if (!user) continue;

        queueItems.push({
          credentialId: client.id,
          uid: user.id,
          name: `${user.firstName} ${user.lastName}`,
          aggregator: name,
          email: user.email,
          jobsiteEmail: cred.seekEmail,
        });
      } catch (e) {
        logger.error(`Error parsing discovery queue item: ${data}`, e);
      }
    }
  }

  res.apiSuccess(queueItems, "Load balancer data fetched successfully");
});
