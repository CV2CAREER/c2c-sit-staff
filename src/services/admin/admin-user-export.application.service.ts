import { createWriteStream, existsSync } from "fs";
import fs from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { validate as isUuid } from "uuid";
import { USE_REDIS } from "../../config/env";
import { getConnectedRedis } from "../../config/redis";
import { getQueue } from "../../config/bullMQ";
import { getServiceLogger } from "../../utils/createLogger";
import ErrorHandler from "../../utils/errorHandler";
import { isRedisUsable } from "../../utils/helpers";
import { adminUserApplicationService } from "./admin-user.application.service";

type ExportFormat = "csv" | "excel";
type ExportStatus = "queued" | "processing" | "completed" | "failed";

interface ExportFilters {
  search?: string;
  role?: string;
}

interface CreateExportTaskInput {
  format?: string;
  filters?: ExportFilters;
  actorUserId: string;
  actorEmail?: string;
}

interface ExportTaskRecord {
  taskId: string;
  format: ExportFormat;
  status: ExportStatus;
  filters: ExportFilters;
  requestedByUserId: string;
  requestedByEmail?: string;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  rowCount: number;
  fileName?: string;
  filePath?: string;
  fileSizeBytes?: number;
  mimeType?: string;
  error?: string;
}

interface ExportStatusResponse {
  taskId: string;
  format: ExportFormat;
  status: ExportStatus;
  filters: ExportFilters;
  requestedByUserId: string;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  rowCount: number;
  fileName?: string;
  fileSizeBytes?: number;
  downloadReady: boolean;
  error?: string;
}

interface DownloadInfo {
  taskId: string;
  filePath: string;
  fileName: string;
  mimeType: string;
}

interface ExportQueuePayload {
  taskId: string;
  requestedAt: string;
}

const logger = getServiceLogger("admin-user-export-service");

const ADMIN_USER_EXPORT_QUEUE = "admin-user-export";
const ADMIN_USER_EXPORT_JOB = "generate-user-export";
const EXPORT_TASK_KEY_PREFIX = "admin:user-export:v1:task:";
const EXPORT_TASK_TTL_SECONDS = 24 * 60 * 60;
const EXPORT_BATCH_SIZE = 1000;
const EXPORT_OUTPUT_DIR = path.resolve(
  process.cwd(),
  "tmp",
  "exports",
  "admin-users",
);

const localTaskStore = new Map<string, ExportTaskRecord>();

const csvEscape = (value: unknown): string => {
  const raw = value === null || value === undefined ? "" : String(value);
  const escaped = raw.replace(/"/g, "\"\"");
  return /[",\n\r]/.test(escaped) ? `"${escaped}"` : escaped;
};

const xmlEscape = (value: unknown): string => {
  const raw = value === null || value === undefined ? "" : String(value);
  return raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
};

const streamWrite = async (stream: NodeJS.WritableStream, chunk: string) =>
  new Promise<void>((resolve, reject) => {
    const ok = stream.write(chunk, (error: any) => {
      if (error) {
        reject(error);
      }
    });
    if (ok) {
      resolve();
      return;
    }
    stream.once("drain", () => resolve());
  });

const resolveFormat = (value?: string): ExportFormat => {
  const normalized = String(value || "csv").trim().toLowerCase();
  if (normalized === "csv") {
    return "csv";
  }
  if (normalized === "excel" || normalized === "xlsx" || normalized === "xls") {
    return "excel";
  }

  throw new ErrorHandler("format must be 'csv' or 'excel'.", 400);
};

const getTaskKey = (taskId: string) => `${EXPORT_TASK_KEY_PREFIX}${taskId}`;

const sanitizeFilters = (filters?: ExportFilters): ExportFilters => {
  const safe: ExportFilters = {};

  if (typeof filters?.search === "string" && filters.search.trim().length > 0) {
    safe.search = filters.search.trim();
  }
  if (typeof filters?.role === "string" && filters.role.trim().length > 0) {
    safe.role = filters.role.trim();
  }

  return safe;
};

const toPublicStatus = (task: ExportTaskRecord): ExportStatusResponse => ({
  taskId: task.taskId,
  format: task.format,
  status: task.status,
  filters: task.filters,
  requestedByUserId: task.requestedByUserId,
  createdAt: task.createdAt,
  updatedAt: task.updatedAt,
  expiresAt: task.expiresAt,
  rowCount: task.rowCount,
  fileName: task.fileName,
  fileSizeBytes: task.fileSizeBytes,
  downloadReady:
    task.status === "completed" &&
    Boolean(task.filePath) &&
    new Date(task.expiresAt).getTime() > Date.now(),
  error: task.error,
});

class AdminUserExportApplicationService {
  private async getRedis() {
    const redis = await getConnectedRedis();
    return isRedisUsable(redis) ? redis : null;
  }

  private async persistTask(task: ExportTaskRecord) {
    localTaskStore.set(task.taskId, task);

    const redis = await this.getRedis();
    if (!redis) {
      return;
    }

    await redis.set(
      getTaskKey(task.taskId),
      JSON.stringify(task),
      "EX",
      EXPORT_TASK_TTL_SECONDS,
    );
  }

  private async loadTask(taskId: string): Promise<ExportTaskRecord | null> {
    const local = localTaskStore.get(taskId);
    if (local) {
      return local;
    }

    const redis = await this.getRedis();
    if (!redis) {
      return null;
    }

    const raw = await redis.get(getTaskKey(taskId));
    if (!raw) {
      return null;
    }

    try {
      const parsed = JSON.parse(raw) as ExportTaskRecord;
      localTaskStore.set(taskId, parsed);
      return parsed;
    } catch {
      return null;
    }
  }

  private async enqueueTask(taskId: string): Promise<void> {
    if (USE_REDIS !== "true") {
      return;
    }

    const queue = getQueue(ADMIN_USER_EXPORT_QUEUE);
    await queue.add(
      ADMIN_USER_EXPORT_JOB,
      {
        taskId,
        requestedAt: new Date().toISOString(),
      } as ExportQueuePayload,
      {
        jobId: `${ADMIN_USER_EXPORT_JOB}:${taskId}`,
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 5000,
        },
        removeOnComplete: 20,
        removeOnFail: 50,
      },
    );
  }

  private async prepareOutputPath(task: ExportTaskRecord): Promise<{
    filePath: string;
    fileName: string;
    mimeType: string;
  }> {
    await fs.mkdir(EXPORT_OUTPUT_DIR, { recursive: true });

    const extension = task.format === "csv" ? "csv" : "xls";
    const fileName = `admin-users-${task.taskId}.${extension}`;
    const filePath = path.join(EXPORT_OUTPUT_DIR, fileName);
    const mimeType =
      task.format === "csv"
        ? "text/csv"
        : "application/vnd.ms-excel";

    return { filePath, fileName, mimeType };
  }

  private async writeCsvExport(task: ExportTaskRecord, filePath: string) {
    const stream = createWriteStream(filePath, { encoding: "utf8" });
    const headers = [
      "id",
      "firstName",
      "lastName",
      "email",
      "role",
      "country",
      "isActive",
      "isEmailVerified",
      "createdAt",
      "updatedAt",
    ];
    await streamWrite(stream, `${headers.join(",")}\n`);

    let offset = 0;
    let rowCount = 0;
    while (true) {
      const rows = await adminUserApplicationService.listUsersForExportBatch({
        ...task.filters,
        offset,
        limit: EXPORT_BATCH_SIZE,
      });

      if (rows.length === 0) {
        break;
      }

      for (const row of rows) {
        const line = [
          row.id,
          row.firstName,
          row.lastName,
          row.email,
          row.role,
          row.country,
          row.isActive,
          row.isEmailVerified,
          row.createdAt,
          row.updatedAt,
        ]
          .map(csvEscape)
          .join(",");

        await streamWrite(stream, `${line}\n`);
      }

      rowCount += rows.length;
      offset += rows.length;
      await new Promise<void>((resolve) => setImmediate(resolve));
    }

    await new Promise<void>((resolve, reject) => {
      stream.once("error", reject);
      stream.end(() => resolve());
    });

    return rowCount;
  }

  private async writeExcelExport(task: ExportTaskRecord, filePath: string) {
    const stream = createWriteStream(filePath, { encoding: "utf8" });

    await streamWrite(
      stream,
      `<?xml version="1.0"?>\n` +
        `<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"` +
        ` xmlns:o="urn:schemas-microsoft-com:office:office"` +
        ` xmlns:x="urn:schemas-microsoft-com:office:excel"` +
        ` xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">\n` +
        `<Worksheet ss:Name="Users">\n<Table>\n`,
    );

    const headers = [
      "id",
      "firstName",
      "lastName",
      "email",
      "role",
      "country",
      "isActive",
      "isEmailVerified",
      "createdAt",
      "updatedAt",
    ];

    const headerCells = headers
      .map(
        (header) =>
          `<Cell><Data ss:Type="String">${xmlEscape(header)}</Data></Cell>`,
      )
      .join("");
    await streamWrite(stream, `<Row>${headerCells}</Row>\n`);

    let offset = 0;
    let rowCount = 0;
    while (true) {
      const rows = await adminUserApplicationService.listUsersForExportBatch({
        ...task.filters,
        offset,
        limit: EXPORT_BATCH_SIZE,
      });

      if (rows.length === 0) {
        break;
      }

      for (const row of rows) {
        const values = [
          row.id,
          row.firstName,
          row.lastName,
          row.email,
          row.role,
          row.country,
          row.isActive ? "true" : "false",
          row.isEmailVerified ? "true" : "false",
          row.createdAt,
          row.updatedAt,
        ];
        const cells = values
          .map(
            (value) =>
              `<Cell><Data ss:Type="String">${xmlEscape(value)}</Data></Cell>`,
          )
          .join("");
        await streamWrite(stream, `<Row>${cells}</Row>\n`);
      }

      rowCount += rows.length;
      offset += rows.length;
      await new Promise<void>((resolve) => setImmediate(resolve));
    }

    await streamWrite(stream, `</Table>\n</Worksheet>\n</Workbook>\n`);
    await new Promise<void>((resolve, reject) => {
      stream.once("error", reject);
      stream.end(() => resolve());
    });

    return rowCount;
  }

  private async writeFile(task: ExportTaskRecord): Promise<{
    rowCount: number;
    filePath: string;
    fileName: string;
    mimeType: string;
    fileSizeBytes: number;
  }> {
    const { filePath, fileName, mimeType } = await this.prepareOutputPath(task);

    const rowCount =
      task.format === "csv"
        ? await this.writeCsvExport(task, filePath)
        : await this.writeExcelExport(task, filePath);

    const stat = await fs.stat(filePath);
    return {
      rowCount,
      filePath,
      fileName,
      mimeType,
      fileSizeBytes: stat.size,
    };
  }

  async createExportTask(input: CreateExportTaskInput): Promise<ExportStatusResponse> {
    const actorUserId = String(input.actorUserId || "");
    if (!isUuid(actorUserId)) {
      throw new ErrorHandler("Invalid actor user ID.", 400);
    }

    const taskId = randomUUID();
    const nowIso = new Date().toISOString();
    const expiresAt = new Date(
      Date.now() + EXPORT_TASK_TTL_SECONDS * 1000,
    ).toISOString();
    const task: ExportTaskRecord = {
      taskId,
      format: resolveFormat(input.format),
      status: "queued",
      filters: sanitizeFilters(input.filters),
      requestedByUserId: actorUserId,
      requestedByEmail: input.actorEmail,
      createdAt: nowIso,
      updatedAt: nowIso,
      expiresAt,
      rowCount: 0,
    };

    await this.persistTask(task);
    await this.enqueueTask(task.taskId);

    // Local fallback when Redis queueing is disabled.
    if (USE_REDIS !== "true") {
      setImmediate(() => {
        void this.processExportTask(task.taskId).catch((error: any) => {
          logger.error(
            `Failed local export processing for task ${task.taskId}: ${error.message}`,
          );
        });
      });
    }

    logger.info(
      `Admin user export task created: taskId=${task.taskId}, format=${task.format}`,
    );

    return toPublicStatus(task);
  }

  async processExportTask(taskId: string): Promise<void> {
    const task = await this.loadTask(taskId);
    if (!task) {
      throw new ErrorHandler(`Export task not found: ${taskId}`, 404);
    }

    if (task.status === "completed") {
      return;
    }

    task.status = "processing";
    task.updatedAt = new Date().toISOString();
    task.error = undefined;
    await this.persistTask(task);

    try {
      const result = await this.writeFile(task);
      task.status = "completed";
      task.rowCount = result.rowCount;
      task.filePath = result.filePath;
      task.fileName = result.fileName;
      task.fileSizeBytes = result.fileSizeBytes;
      task.mimeType = result.mimeType;
      task.updatedAt = new Date().toISOString();
      await this.persistTask(task);
      logger.info(
        `Admin user export completed: taskId=${task.taskId}, rows=${task.rowCount}`,
      );
    } catch (error: any) {
      task.status = "failed";
      task.error = error?.message || "Export failed unexpectedly.";
      task.updatedAt = new Date().toISOString();
      await this.persistTask(task);
      logger.error(
        `Admin user export failed: taskId=${task.taskId}, error=${task.error}`,
      );
      throw error;
    }
  }

  async getTaskStatus(taskId: string): Promise<ExportStatusResponse> {
    if (!isUuid(taskId)) {
      throw new ErrorHandler("Invalid taskId.", 400);
    }

    const task = await this.loadTask(taskId);
    if (!task) {
      throw new ErrorHandler("Export task not found.", 404);
    }

    return toPublicStatus(task);
  }

  async getDownloadInfo(taskId: string): Promise<DownloadInfo> {
    const taskStatus = await this.getTaskStatus(taskId);
    if (!taskStatus.downloadReady) {
      throw new ErrorHandler("Export file is not ready for download yet.", 409);
    }

    const task = await this.loadTask(taskId);
    if (!task?.filePath || !task.fileName || !task.mimeType) {
      throw new ErrorHandler("Export file metadata is incomplete.", 500);
    }

    if (new Date(task.expiresAt).getTime() <= Date.now()) {
      throw new ErrorHandler("Export file has expired. Please re-run export.", 410);
    }

    if (!existsSync(task.filePath)) {
      throw new ErrorHandler("Export file no longer exists on disk.", 410);
    }

    return {
      taskId: task.taskId,
      filePath: task.filePath,
      fileName: task.fileName,
      mimeType: task.mimeType,
    };
  }

  getQueueMetadata() {
    return {
      queueName: ADMIN_USER_EXPORT_QUEUE,
      jobName: ADMIN_USER_EXPORT_JOB,
    };
  }
}

export const adminUserExportApplicationService =
  new AdminUserExportApplicationService();
