import fs from "fs/promises";
import { Request, Response } from "express";
import formidable, { type File as FormidableFile } from "formidable";
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

const PROOF_MAX_BYTES = 10 * 1024 * 1024;
const PROOF_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "application/pdf"]);

const parseProofForm = (req: Request) =>
  new Promise<{ fields: formidable.Fields; files: formidable.Files }>((resolve, reject) => {
    formidable({ keepExtensions: true, maxFiles: 1, maxFileSize: PROOF_MAX_BYTES }).parse(req, (err, fields, files) =>
      err ? reject(err) : resolve({ fields, files }),
    );
  });

/** POST /api/v1/queue-entries/:id/resolve  { note? }  or multipart { note, file? } (proof: image or PDF, max 10 MB) */
export const resolveQueueEntry = catchAsyncError(async (req: Request, res: Response) => {
  let note: string | undefined;
  let file: { buffer: Buffer; name: string; mimeType: string } | null = null;

  if ((req.headers["content-type"] || "").includes("multipart/form-data")) {
    let parsed;
    try {
      parsed = await parseProofForm(req);
    } catch (e: any) {
      const tooBig = e?.code === 1009 || /maxFileSize/i.test(e?.message || "");
      return res.apiError(new ErrorHandler(tooBig ? "The proof file must be 10 MB or smaller" : "Could not read the upload", 400));
    }
    const rawNote = parsed.fields.note;
    note = (Array.isArray(rawNote) ? rawNote[0] : rawNote)?.toString().trim();
    const upload = ([] as FormidableFile[]).concat((parsed.files.file as any) || [])[0];
    if (upload) {
      try {
        const mimeType = upload.mimetype || "";
        if (!PROOF_TYPES.has(mimeType)) {
          return res.apiError(new ErrorHandler("The proof must be a PNG, JPG, WEBP image or a PDF", 400));
        }
        if (upload.size > PROOF_MAX_BYTES) {
          return res.apiError(new ErrorHandler("The proof file must be 10 MB or smaller", 400));
        }
        file = {
          buffer: await fs.readFile(upload.filepath),
          name: upload.originalFilename || upload.newFilename || "proof",
          mimeType,
        };
      } finally {
        await fs.unlink(upload.filepath).catch(() => undefined);
      }
    }
  } else {
    note = bodyValue(req.body, "note");
  }

  const entry = await queueEntryService.resolveEntry(req.params.id, req.user, note, file);
  return res.apiSuccess({ entry }, "Queue entry resolved", 200);
});
