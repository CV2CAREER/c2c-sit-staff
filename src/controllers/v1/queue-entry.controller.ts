import { Request, Response } from "express";
import catchAsyncError from "../../utils/catchAsyncError";
import { queueEntryService } from "../../services/admin/queue-entry.service";
import { QUEUE_ENTRY_QUEUES, QueueEntryQueue } from "../../models/v1/queue-entry.model";
import ErrorHandler from "../../utils/errorHandler";

const parseQueue = (raw: unknown): QueueEntryQueue => {
  const queue = (Array.isArray(raw) ? raw[0] : raw) as string | undefined;
  if (queue && (QUEUE_ENTRY_QUEUES as readonly string[]).includes(queue)) {
    return queue as QueueEntryQueue;
  }
  return "staff";
};

const parseStatus = (raw: unknown): "open" | "resolved" | undefined => {
  const status = (Array.isArray(raw) ? raw[0] : raw) as string | undefined;
  if (status === "open" || status === "resolved") return status;
  return undefined;
};

const bodyValue = (body: any, key: string): string | undefined => {
  const v = body?.[key];
  return typeof v === "string" ? v.trim() : undefined;
};

/** GET /api/v1/queue-entries?queue=staff|system&status=open|resolved */
export const listQueueEntries = catchAsyncError(async (req: Request, res: Response) => {
  const queue = parseQueue(req.query.queue);
  const status = parseStatus(req.query.status);
  const entries = await queueEntryService.listQueueEntries(queue, status);
  return res.apiSuccess({ entries, total: entries.length }, "Queue entries fetched", 200);
});

/** POST /api/v1/queue-entries/staff-tasks  { templateId, ownerId?, ownerName? } */
export const raiseStaffTask = catchAsyncError(async (req: Request, res: Response) => {
  const templateId = bodyValue(req.body, "templateId");
  if (!templateId) {
    return res.apiError(new ErrorHandler("templateId is required", 400));
  }
  const entry = await queueEntryService.raiseStaffTask(templateId, req.user, {
    ownerId: bodyValue(req.body, "ownerId") || undefined,
    ownerName: bodyValue(req.body, "ownerName") || undefined,
  });
  return res.apiSuccess({ entry }, "Staff task raised", 201);
});

/** PATCH /api/v1/queue-entries/:id/assign  { ownerId, ownerName } */
export const assignQueueEntry = catchAsyncError(async (req: Request, res: Response) => {
  const ownerId = bodyValue(req.body, "ownerId");
  const ownerName = bodyValue(req.body, "ownerName");
  const entry = await queueEntryService.assignOwner(
    req.params.id,
    ownerId || "",
    ownerName || "",
    req.user,
  );
  return res.apiSuccess({ entry }, "Queue entry assigned", 200);
});

/** POST /api/v1/queue-entries/:id/resolve  { note? } */
export const resolveQueueEntry = catchAsyncError(async (req: Request, res: Response) => {
  const note = bodyValue(req.body, "note");
  const entry = await queueEntryService.resolveEntry(req.params.id, req.user, note);
  return res.apiSuccess({ entry }, "Queue entry resolved", 200);
});
