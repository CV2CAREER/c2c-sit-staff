import { Job } from "bullmq";
import { createWorker } from "../../config/bullMQ";
import { getServiceLogger } from "../../utils/createLogger";
import { adminUserExportApplicationService } from "../../services/admin/admin-user-export.application.service";

interface AdminUserExportJobPayload {
  taskId: string;
  requestedAt: string;
}

const logger = getServiceLogger("admin-user-export-worker");

const queueMeta = adminUserExportApplicationService.getQueueMetadata();

export const adminUserExportWorker = createWorker(
  queueMeta.queueName,
  async (job: Job<AdminUserExportJobPayload>) => {
    const taskId = String(job.data?.taskId || "");
    if (!taskId) {
      logger.warn("Admin user export job received without taskId.");
      return;
    }

    await adminUserExportApplicationService.processExportTask(taskId);
  },
  { concurrency: 1 },
);
