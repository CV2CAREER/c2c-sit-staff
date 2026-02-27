import { Worker } from "bullmq";
import { emailWorker } from "./emailWorker";
import { getServiceLogger } from "../../utils/createLogger";
import { USE_REDIS } from "../../config/env";
// import { smsWorker } from "./smsWorker";
// import { reportWorker } from "./reportWorker";

const logger = getServiceLogger("background-jobs");

const allWorkers: Worker[] = [
  emailWorker,
  // smsWorker,
  // reportWorker,
];

export const initializeBullMQWorkers = () => {
  if (USE_REDIS !== "true") {
    logger.warn("⚠️ Redis disabled, skipping BullMQ worker initialization");
    return;
  }

  logger.info(`✅ BullMQ: ${allWorkers.length} worker(s) initialized`);
};
