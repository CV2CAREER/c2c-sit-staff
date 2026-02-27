// config/bullmq.ts
import { Queue, Worker, Job, ConnectionOptions } from "bullmq";
import { REDIS_HOST, REDIS_PASSWORD, REDIS_PORT, USE_REDIS } from "./env";
import { getServiceLogger } from "../utils/createLogger";

const logger = getServiceLogger("bullmq");

// BullMQ needs its own connection config (not a shared ioredis instance)
export const bullMQConnection: ConnectionOptions = {
  port: REDIS_PORT,
  host: REDIS_HOST,
  password: REDIS_PASSWORD,
  maxRetriesPerRequest: null, // required by BullMQ
  enableReadyCheck: false, // recommended for BullMQ
};

// --- Queue Registry ---
const queues = new Map<string, Queue>();

export const getQueue = (name: string): Queue => {
  if (!queues.has(name)) {
    const queue = new Queue(name, { connection: bullMQConnection });
    queues.set(name, queue);
    logger.info(`✅ BullMQ queue created: ${name}`);
  }
  return queues.get(name)!;
};

// --- Worker Registry ---
const workers = new Map<string, Worker>();

export const createWorker = (
  queueName: string,
  processor: (job: Job) => Promise<any>,
): Worker => {
  if (workers.has(queueName)) {
    logger.warn(`⚠️ Worker for queue "${queueName}" already exists`);
    return workers.get(queueName)!;
  }

  const worker = new Worker(queueName, processor, {
    connection: bullMQConnection,
    concurrency: 5,
  });

  worker.on("completed", (job) =>
    logger.info(`✅ Job ${job.id} completed in queue "${queueName}"`),
  );
  worker.on("failed", (job, err) =>
    logger.error(
      `❌ Job ${job?.id} failed in queue "${queueName}": ${err.message}`,
    ),
  );

  workers.set(queueName, worker);
  logger.info(`✅ BullMQ worker started for queue: ${queueName}`);
  return worker;
};

// --- Graceful Shutdown ---
export const closeBullMQ = async () => {
  for (const [name, worker] of workers) {
    await worker.close();
    logger.warn(`Worker for queue "${name}" closed`);
  }
  for (const [name, queue] of queues) {
    await queue.close();
    logger.warn(`Queue "${name}" closed`);
  }
};
