// controllers/v1/sample-queue.controller.ts
import { Request, Response } from "express";
import Redis from "ioredis";
import db from "@/database/postgres";

const redisClient = new Redis({
  host: process.env.CLIENT_SAMPLE_REDIS_HOST,
  password: process.env.CLIENT_SAMPLE_REDIS_PASSWORD,
});

const ENVIRONMENT =
  process.env.NEXTAUTH_URL === "https://cvtocareer.com" ? "" : "_TEST";

export const sampleQueueController = async (req: Request, res: Response) => {
  try {
    if (req.method === "GET") return handleGetRequest(req, res);
    if (req.method === "POST") return handlePostRequest(req, res);
    if (req.method === "DELETE") return handleDeleteRequest(req, res);

    return res.status(405).json({
      error: `Method ${req.method} is not allowed`,
    });
  } catch (error: any) {
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

const handleGetRequest = async (req: Request, res: Response) => {
  const { variance, jobsite } = req.query as any;

  if (!variance)
    return res.status(400).json({ message: "Request variance not found!" });

  if (variance === "queue") return getQueueData(req, res);
  if (variance === "processing")
    return getProcessingOrCompleted(req, res, false, jobsite);
  if (variance === "completed")
    return getProcessingOrCompleted(req, res, true, jobsite);

  return res.status(200).json([]);
};

const handlePostRequest = async (req: Request, res: Response) => {
  const { queue, email, environment } = req.body;
  if (!queue || !email)
    return res.status(400).json({ message: "Queue, Email required!" });

  const input_object = {
    email,
    process: queue.includes("STAGE") ? "staging" : "production",
  };

  const sanitizedQueue = queue.replace(/_STAGE/gi, "");
  const key = `${sanitizedQueue.toUpperCase()}_CLIENT_SAMPLE_QUEUE${
    environment || ENVIRONMENT
  }`;

  const values = await redisClient.lrange(key, 0, -1);

  if (
    values.some((item) => {
      try {
        return JSON.parse(item).email === email;
      } catch {
        return false;
      }
    })
  ) {
    return res.status(200).send({ saved: false, queue: values });
  }

  await redisClient.lpush(key, JSON.stringify(input_object));
  return res.status(200).send({ saved: true, queue: values });
};

const handleDeleteRequest = async (req: Request, res: Response) => {
  const { queue, email, environment } = req.body;

  if (!queue || !email || !environment)
    return res.status(400).json({
      message: "Queue, Email, Environment required!",
    });

  const key = `${queue.toUpperCase()}_CLIENT_SAMPLE_QUEUE${environment}`;
  const values = await redisClient.lrange(key, 0, -1);

  const value = values.find((e) => {
    try {
      return JSON.parse(e).email === email;
    } catch {
      return false;
    }
  });

  if (!value)
    return res.status(401).send({ deleted: 0, message: "Not in queue" });

  const result = await redisClient.lrem(key, 1, value);

  return res.status(200).send({
    deleted: result,
    message: `deleted ${email}`,
  });
};

const getQueueData = async (req: Request, res: Response) => {
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

  const redisResults = await Promise.all(
    processQueue.map((q) => redisClient.lrange(q.redisKey, 0, -1)),
  );

  const emailEntries: any[] = [];

  redisResults.forEach((list, i) => {
    list.forEach((item) => {
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

  return res.status(200).json(result);
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
