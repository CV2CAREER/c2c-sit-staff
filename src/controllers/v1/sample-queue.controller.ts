// controllers/v1/sample-queue.controller.ts
import { Request, Response } from "express";
import db from "@/database/postgres";
import { getConnectedRedis } from "@/config/redis";
import { getServiceLogger } from "@/utils/createLogger";
import ErrorHandler from "@/utils/errorHandler";
import catchAsyncError from "@/utils/catchAsyncError";

const logger = getServiceLogger("sample-queue");

export const sampleQueueController = catchAsyncError(
  async (req: Request, res: Response) => {
    const redisClient = await getConnectedRedis();
    if (!redisClient) {
      throw new ErrorHandler("Redis unavailable", 503);
    }

    if (req.method === "GET") return handleGetRequest(req, res, redisClient);
    if (req.method === "POST") return handlePostRequest(req, res, redisClient);
    if (req.method === "DELETE")
      return handleDeleteRequest(req, res, redisClient);

    throw new ErrorHandler(`Method ${req.method} is not allowed`, 405);
  },
);

const handleGetRequest = async (
  req: Request,
  res: Response,
  redisClient: any,
) => {
  const { variance, jobsite } = req.query as any;

  if (!variance) {
    throw new ErrorHandler("Request variance not found!", 400);
  }

  if (variance === "queue") return getQueueData(req, res, redisClient);
  if (variance === "processing")
    return getProcessingOrCompleted(req, res, false, jobsite);
  if (variance === "completed")
    return getProcessingOrCompleted(req, res, true, jobsite);

  return res.apiSuccess([], "Request processed");
};

const handlePostRequest = async (
  req: Request,
  res: Response,
  redisClient: any,
) => {
  const { queue, email, environment } = req.body;
  if (!queue || !email) {
    throw new ErrorHandler("Queue, Email required!", 400);
  }

  logger.info(`Adding ${email} to queue: ${queue}`);

  const input_object = {
    email,
    process: queue.includes("STAGE") ? "staging" : "production",
  };

  const sanitizedQueue = queue.replace(/_STAGE/gi, "");
  const key = `${sanitizedQueue.toUpperCase()}_CLIENT_SAMPLE_QUEUE${
    environment || ""
  }`;

  const values = await redisClient.lrange(key, 0, -1);

  if (
    values.some((item: any) => {
      try {
        return JSON.parse(item).email === email;
      } catch {
        return false;
      }
    })
  ) {
    return res.apiSuccess(
      { saved: false, queue: values },
      "Email already in queue",
    );
  }

  await redisClient.lpush(key, JSON.stringify(input_object));
  return res.apiSuccess({ saved: true, queue: values }, "Email added to queue");
};

const handleDeleteRequest = async (
  req: Request,
  res: Response,
  redisClient: any,
) => {
  const { queue, email, environment } = req.body;

  if (!queue || !email || !environment) {
    throw new ErrorHandler("Queue, Email, Environment required!", 400);
  }

  logger.info(`Removing ${email} from queue: ${queue}`);

  const key = `${queue.toUpperCase()}_CLIENT_SAMPLE_QUEUE${environment}`;
  const values = await redisClient.lrange(key, 0, -1);

  const value = values.find((e: any) => {
    try {
      return JSON.parse(e).email === email;
    } catch {
      return false;
    }
  });

  if (!value) {
    throw new ErrorHandler("Not in queue", 401);
  }

  const result = await redisClient.lrem(key, 1, value);

  return res.apiSuccess({ deleted: result }, `Deleted ${email} from queue`);
};

const getQueueData = async (req: Request, res: Response, redisClient: any) => {
  const { environment, jobsite } = req.query as any;

  const jobsites = [
    "SEEK",
    "CareerOne",
    "Adzuna",
    "Jora",
    "Reed",
    "Randstad",
    "MichaelPage",
  ];

  const envs = ["_LIVE", "_TEST"];

  let globalId = 1;

  const processQueue: any[] = [];

  for (const js of jobsites) {
    for (const en of envs) {
      processQueue.push({
        redisKey:
          en === "_LIVE"
            ? `${js}_CLIENT_SAMPLE_QUEUE`
            : `${js}_CLIENT_SAMPLE_QUEUE${en}`,
        queue: js,
        environment: en,
      });
    }
  }

  logger.info("Fetching queue data for all jobsites");

  const redisResults = await Promise.all(
    processQueue.map((q) => redisClient.lrange(q.redisKey, 0, -1)),
  );

  const emailEntries: any[] = [];

  redisResults.forEach((list, i) => {
    list.forEach((item: any) => {
      const parsed = JSON.parse(item);
      emailEntries.push({
        email: parsed.email,
        queue: processQueue[i].queue,
        environment: processQueue[i].environment,
      });
    });
  });

  const emails = [...new Set(emailEntries.map((e) => e.email))];

  const credentials: any[] = await db.credentials.findMany({
    where: {
      alias_email: { in: emails },
    },
  });

  const customerIds = credentials.map((c: any) => c.customer_id);

  const users: any[] = await db.users.findMany({
    where: { id: { in: customerIds } },
  });

  const result: any[] = [];

  for (const entry of emailEntries) {
    const cred = credentials.find((c: any) => c.alias_email === entry.email);
    if (!cred) continue;

    const user = users.find((u: any) => u.id === cred.customer_id);
    if (!user) continue;

    result.push({
      id: globalId++,
      email: user.email,
      aggregator: entry.queue,
      env: entry.environment,
      jobsiteEmail: entry.email,
      uid: user.id,
      name: `${user.first_name} ${user.last_name}`,
      bot: "Not Assigned",
    });
  }

  return res.apiSuccess(result, "Queue data retrieved");
};

const getProcessingOrCompleted = async (
  req: Request,
  res: Response,
  completed: boolean,
  aggregator?: string,
) => {
  const processData = await db.sample_process.findMany({
    where: {
      status: completed ? { not: null } : null,
      ...(aggregator && { aggregator }),
    },
    orderBy: {
      start_time: "desc",
    },
    take: 100,
  });

  const credentials: any[] = await db.credentials.findMany();
  const users: any[] = await db.users.findMany();

  const result: any[] = [];

  for (const item of processData) {
    const cred = credentials.find(
      (c: any) => c.id === item.client_id || c.alias_email === item.email,
    );

    if (!cred) continue;

    const user = users.find((u: any) => u.id === cred.customer_id);
    if (!user) continue;

    result.push({
      id: item.id,
      credentialId: cred.id,
      uid: user.id,
      name: `${user.first_name} ${user.last_name}`,
      bot: item.bot,
      aggregator: item.aggregator,
      email: user.email,
      jobsiteEmail: item.email,
      startTime: item.start_time,
      endTime: item.end_time,
      progress: item.progress,
      status: item.status,
    });
  }

  return res.status(200).json(result);
};
