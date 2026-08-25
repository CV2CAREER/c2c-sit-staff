import fs from "fs/promises";
import path from "path";
import { Request, Response } from "express";
import formidable, { type File as FormidableFile, type Files } from "formidable";
import catchAsyncError from "../../utils/catchAsyncError";
import ErrorHandler from "../../utils/errorHandler";
import { getServiceLogger } from "../../utils/createLogger";
import bucket from "../../config/firebase";
import {
  deleteFileFromStorage,
  generateDownloadSignedUrl,
  generateUniqueFilename,
  uploadBufferToStorage,
} from "../../utils/fileUpload";
import { AdminDocumentService } from "../../services/admin-document.service";
import { InterviewPackService } from "../../services/interview-pack.service";
import { SlackService } from "../../services/slack.service";
import { getEnvironmentFromHost } from "../../utils/slack-helpers";
import {
  SlackChannel,
  SlackEventType,
  SlackNode,
  SlackProvider,
  SlackSeverity,
} from "../../utils/enum";

const logger = getServiceLogger("admin-document-upload-controller");

const parseMultipartForm = (
  req: Request,
): Promise<{ fields: formidable.Fields; files: Files }> =>
  new Promise((resolve, reject) => {
    const form = formidable({
      keepExtensions: true,
      multiples: true,
    });

    form.parse(req, (err, fields, files) => {
      if (err) {
        reject(err);
        return;
      }

      resolve({ fields, files });
    });
  });

const toFileArray = (value: FormidableFile | FormidableFile[] | undefined) => {
  if (!value) {
    return [] as FormidableFile[];
  }

  return Array.isArray(value) ? value : [value];
};

const extractStoragePathFromUrl = (fileUrl: string) => {
  try {
    const parsed = new URL(fileUrl);

    if (parsed.hostname === "storage.googleapis.com") {
      const prefix = `/${bucket.name}/`;
      if (parsed.pathname.startsWith(prefix)) {
        return decodeURIComponent(parsed.pathname.slice(prefix.length));
      }
    }

    if (
      parsed.hostname === "firebasestorage.googleapis.com" &&
      parsed.pathname.includes(`/b/${bucket.name}/o/`)
    ) {
      const encodedPath = parsed.pathname.split("/o/")[1];
      if (encodedPath) {
        return decodeURIComponent(encodedPath);
      }
    }
  } catch (error) {
    logger.warn(`Could not parse upload URL for deletion: ${fileUrl}`);
  }

  return undefined;
};

export const uploadAdminDocumentsController = catchAsyncError(
  async (req: Request, res: Response) => {
    const tempFilePaths: string[] = [];

    try {
      const { files } = await parseMultipartForm(req);
      const fileKeys = Object.keys(files || {});

      if (fileKeys.length === 0) {
        return res.apiError(new ErrorHandler("No files uploaded", 400));
      }

      const uploadedFiles = await Promise.all(
        fileKeys.flatMap((key) =>
          toFileArray(files[key]).map(async (file) => {
            tempFilePaths.push(file.filepath);

            const buffer = await fs.readFile(file.filepath);
            const originalName = file.originalFilename || file.newFilename || "upload.bin";
            const storageName = generateUniqueFilename(originalName);
            const uploadResult = await uploadBufferToStorage(buffer, storageName, {
              folder: `admin-documents/${req.user?.id || "anonymous"}`,
              mimeType: file.mimetype || undefined,
            });

            return {
              [key]: {
                filename: originalName,
                cloudFilename: uploadResult.publicId,
                fileUrl: uploadResult.url,
              },
            };
          }),
        ),
      );

      return res.apiSuccess(uploadedFiles, "Files uploaded successfully", 200);
    } catch (error: any) {
      logger.error(`Failed to upload admin documents: ${error.message}`);
      return res.apiError(
        new ErrorHandler(error.message || "Failed to upload files", 500),
      );
    } finally {
      await Promise.all(
        tempFilePaths.map(async (filePath) => {
          try {
            await fs.unlink(filePath);
          } catch (cleanupError) {
            logger.warn(`Failed to clean up temp file: ${filePath}`);
          }
        }),
      );
    }
  },
);

export const deleteAdminDocumentUploadController = catchAsyncError(
  async (req: Request, res: Response) => {
    const fileUrl = req.body?.url as string | undefined;

    if (!fileUrl) {
      return res.apiError(new ErrorHandler("File url is required", 400));
    }

    const storagePath = extractStoragePathFromUrl(fileUrl);

    if (storagePath) {
      await deleteFileFromStorage(storagePath);
    } else {
      logger.info(`Skipping storage deletion for external URL: ${fileUrl}`);
    }

    return res.apiSuccess({}, "File deleted successfully", 200);
  },
);

export const getDocumentSignedUrlController = catchAsyncError(
  async (req: Request, res: Response) => {
    const filePath = (req.query.filePath as string | undefined)?.trim();
    const filename =
      typeof req.query.filename === "string" ? req.query.filename : undefined;

    if (!filePath) {
      return res.apiError(new ErrorHandler("filePath is required", 400));
    }

    try {
      const url = await generateDownloadSignedUrl(filePath, filename);
      return res.apiSuccess({ url }, "Signed URL generated successfully", 200);
    } catch (error: any) {
      const statusCode =
        error instanceof ErrorHandler ? error.statusCode : 500;
      logger.error(
        `Failed to generate signed URL for "${filePath}": ${error.message}`,
      );
      return res.apiError(
        new ErrorHandler(
          error.message || "Failed to generate signed URL",
          statusCode,
        ),
      );
    }
  },
);

export const validateAndUploadUrlController = catchAsyncError(
  async (req: Request, res: Response) => {
    const fileUrl = req.body?.url as string | undefined;

    if (!fileUrl) {
      return res.apiError(new ErrorHandler("URL is required", 400));
    }

    const validateResponse = await fetch(fileUrl, {
      method: "HEAD",
      redirect: "follow",
    }).catch(async () =>
      fetch(fileUrl, {
        method: "GET",
        redirect: "follow",
      }),
    );

    if (!validateResponse.ok) {
      return res.apiError(new ErrorHandler("Invalid image URL", 400));
    }

    const contentType = validateResponse.headers.get("content-type") || "";
    if (!contentType.toLowerCase().startsWith("image/")) {
      return res.apiError(new ErrorHandler("Invalid image URL", 400));
    }

    return res.apiSuccess({ url: fileUrl }, "URL is a valid image", 200);
  },
);

/**
 * Generate a cover letter for a client's resume against a job link/description.
 * Returns the raw AI-generated text for review — does not persist anything
 * yet (Firebase upload + Upload record is a follow-up once the desired
 * output format — plain text vs docx — is decided).
 */
export const generateCoverLetterController = catchAsyncError(
  async (req: Request, res: Response) => {
    const userId = (req.body?.userId as string | undefined)?.trim();
    const resumeUploadId = (req.body?.resumeUploadId as string | undefined)?.trim();
    const jobLink = (req.body?.jobLink as string | undefined)?.trim();
    const jobContent = (req.body?.jobContent as string | undefined)?.trim();

    if (!userId) {
      return res.apiError(new ErrorHandler("userId is required", 400));
    }
    if (!resumeUploadId) {
      return res.apiError(new ErrorHandler("resumeUploadId is required", 400));
    }
    if (!jobContent) {
      return res.apiError(new ErrorHandler("jobContent is required", 400));
    }

    try {
      const coverLetter = await AdminDocumentService.generateCoverLetter(
        userId,
        resumeUploadId,
        jobContent,
        jobLink,
      );
      return res.apiSuccess({ coverLetter }, "Cover letter generated successfully", 200);
    } catch (error: any) {
      const statusCode = error instanceof ErrorHandler ? error.statusCode : 500;
      logger.error(`Failed to generate cover letter for user ${userId}: ${error.message}`);
      return res.apiError(
        new ErrorHandler(error.message || "Failed to generate cover letter", statusCode),
      );
    }
  },
);

/**
 * Renders the cover letter text into a PDF/DOCX and streams it straight
 * back — no Firebase upload, no Upload record, nothing visible to the
 * client. Lets an admin download and check the render before saving it for
 * real via save-cover-letter.
 */
export const previewCoverLetterController = catchAsyncError(
  async (req: Request, res: Response) => {
    const userId = (req.body?.userId as string | undefined)?.trim();
    const resumeUploadId = (req.body?.resumeUploadId as string | undefined)?.trim();
    const coverLetter = (req.body?.coverLetter as string | undefined)?.trim();
    const format = (req.body?.format as string | undefined)?.trim().toLowerCase();

    if (!userId) {
      return res.apiError(new ErrorHandler("userId is required", 400));
    }
    if (!resumeUploadId) {
      return res.apiError(new ErrorHandler("resumeUploadId is required", 400));
    }
    if (!coverLetter) {
      return res.apiError(new ErrorHandler("coverLetter is required", 400));
    }
    if (format !== "pdf" && format !== "docx") {
      return res.apiError(new ErrorHandler("format must be 'pdf' or 'docx'", 400));
    }

    try {
      const { buffer, filename, mimeType } = await AdminDocumentService.previewCoverLetter(
        userId,
        resumeUploadId,
        coverLetter,
        format,
      );
      res.setHeader("Content-Type", mimeType);
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      return res.send(buffer);
    } catch (error: any) {
      const statusCode = error instanceof ErrorHandler ? error.statusCode : 500;
      logger.error(`Failed to preview cover letter for user ${userId}: ${error.message}`);
      return res.apiError(
        new ErrorHandler(error.message || "Failed to preview cover letter", statusCode),
      );
    }
  },
);

/**
 * Renders the (admin-reviewed) cover letter text into a PDF or DOCX,
 * uploads it to Firebase, and records it as a `coverletter` Upload for
 * the client — the persistence follow-up to generate-cover-letter above.
 */
export const saveCoverLetterController = catchAsyncError(
  async (req: Request, res: Response) => {
    const userId = (req.body?.userId as string | undefined)?.trim();
    const resumeUploadId = (req.body?.resumeUploadId as string | undefined)?.trim();
    const coverLetter = (req.body?.coverLetter as string | undefined)?.trim();
    const format = (req.body?.format as string | undefined)?.trim().toLowerCase();

    if (!userId) {
      return res.apiError(new ErrorHandler("userId is required", 400));
    }
    if (!resumeUploadId) {
      return res.apiError(new ErrorHandler("resumeUploadId is required", 400));
    }
    if (!coverLetter) {
      return res.apiError(new ErrorHandler("coverLetter is required", 400));
    }
    if (format !== "pdf" && format !== "docx") {
      return res.apiError(new ErrorHandler("format must be 'pdf' or 'docx'", 400));
    }

    try {
      const { upload, clientName } = await AdminDocumentService.saveCoverLetter(
        userId,
        resumeUploadId,
        coverLetter,
        format,
      );

      const adminUser = (req as any).user;
      const adminName = `${adminUser?.firstName || ""} ${adminUser?.lastName || ""}`.trim() || "Admin";
      const host = req.get("host") || "localhost";
      const location = getEnvironmentFromHost(host);
      const fileExtension = format === "pdf" ? "pdf" : "docx";

      setImmediate(async () => {
        try {
          await SlackService.notify({
            location,
            host,
            node: SlackNode.DATA_STORE,
            provider: SlackProvider.FIREBASE,
            severity: SlackSeverity.INFO,
            type: SlackEventType.DOCUMENT_UPLOAD,
            channel: SlackChannel.TOWN_CRIER,
            teamMentions: "CSM",
            trigger: `Cover Letter Generated by ${adminName}`,
            body: `🟠 Cover Letter generated
Client: ${clientName} · ${userId}
Files: Cover-Letter.${fileExtension} → Admin's Downloads
Generated by: ${adminName}`,
          });
          logger.info(`✅ Slack notification sent for cover letter save (user ${userId})`);
        } catch (error: any) {
          logger.error(`❌ Failed to send Slack notification: ${error.message}`);
        }
      });

      return res.apiSuccess({ upload }, "Cover letter saved successfully", 200);
    } catch (error: any) {
      const statusCode = error instanceof ErrorHandler ? error.statusCode : 500;
      logger.error(`Failed to save cover letter for user ${userId}: ${error.message}`);
      return res.apiError(
        new ErrorHandler(error.message || "Failed to save cover letter", statusCode),
      );
    }
  },
);

/**
 * Generate Role Title Recommendations (RTR) for a client's resume via AI.
 * Returns the raw parsed JSON for admin review — does not persist anything
 * yet (saving into ClientSupportDocument is a separate confirm step).
 */
export const generateRoleTitleRecommendationsController = catchAsyncError(
  async (req: Request, res: Response) => {
    const userId = (req.body?.userId as string | undefined)?.trim();
    const resumeUploadId = (req.body?.resumeUploadId as string | undefined)?.trim();

    if (!userId) {
      return res.apiError(new ErrorHandler("userId is required", 400));
    }
    if (!resumeUploadId) {
      return res.apiError(new ErrorHandler("resumeUploadId is required", 400));
    }

    try {
      const result = await AdminDocumentService.generateRoleTitleRecommendations(
        userId,
        resumeUploadId,
      );
      return res.apiSuccess(result, "Role title recommendations generated successfully", 200);
    } catch (error: any) {
      const statusCode = error instanceof ErrorHandler ? error.statusCode : 500;
      logger.error(`Failed to generate role title recommendations for user ${userId}: ${error.message}`);
      return res.apiError(
        new ErrorHandler(error.message || "Failed to generate role title recommendations", statusCode),
      );
    }
  },
);

/**
 * Generate a consolidated, enriched CV Variant for a client's resume via AI.
 * Returns the raw parsed JSON (with per-field is_new flags) for admin
 * review — does not persist anything yet (saving is a separate confirm step
 * once the admin has flattened/edited the text on the frontend).
 */
export const generateCvVariantController = catchAsyncError(
  async (req: Request, res: Response) => {
    const userId = (req.body?.userId as string | undefined)?.trim();
    const resumeUploadId = (req.body?.resumeUploadId as string | undefined)?.trim();

    if (!userId) {
      return res.apiError(new ErrorHandler("userId is required", 400));
    }
    if (!resumeUploadId) {
      return res.apiError(new ErrorHandler("resumeUploadId is required", 400));
    }

    try {
      const result = await AdminDocumentService.generateCvVariant(userId, resumeUploadId);
      return res.apiSuccess(result, "CV variant generated successfully", 200);
    } catch (error: any) {
      const statusCode = error instanceof ErrorHandler ? error.statusCode : 500;
      logger.error(`Failed to generate CV variant for user ${userId}: ${error.message}`);
      return res.apiError(
        new ErrorHandler(error.message || "Failed to generate CV variant", statusCode),
      );
    }
  },
);

/**
 * Renders the CV variant into a PDF/DOCX and streams it straight back — no
 * Firebase upload, no Upload record, no onboarding-progress advance, nothing
 * visible to the client. Lets an admin download and check the render before
 * saving it for real via save-cv-variant.
 */
export const previewCvVariantController = catchAsyncError(
  async (req: Request, res: Response) => {
    const userId = (req.body?.userId as string | undefined)?.trim();
    const resumeUploadId = (req.body?.resumeUploadId as string | undefined)?.trim();
    const cvVariant = (req.body?.cvVariant as string | undefined)?.trim();
    const format = (req.body?.format as string | undefined)?.trim().toLowerCase();
    const design = req.body?.design;

    if (!userId) {
      return res.apiError(new ErrorHandler("userId is required", 400));
    }
    if (!resumeUploadId) {
      return res.apiError(new ErrorHandler("resumeUploadId is required", 400));
    }
    if (!cvVariant) {
      return res.apiError(new ErrorHandler("cvVariant is required", 400));
    }
    if (format !== "pdf" && format !== "docx") {
      return res.apiError(new ErrorHandler("format must be 'pdf' or 'docx'", 400));
    }

    try {
      const { buffer, filename, mimeType } = await AdminDocumentService.previewCvVariant(
        userId,
        resumeUploadId,
        cvVariant,
        format,
        design,
      );
      res.setHeader("Content-Type", mimeType);
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      return res.send(buffer);
    } catch (error: any) {
      const statusCode = error instanceof ErrorHandler ? error.statusCode : 500;
      logger.error(`Failed to preview CV variant for user ${userId}: ${error.message}`);
      return res.apiError(
        new ErrorHandler(error.message || "Failed to preview CV variant", statusCode),
      );
    }
  },
);

/**
 * Renders the (admin-reviewed/edited) CV variant text into a PDF or DOCX,
 * uploads it to Firebase, records it as a new `resume` Upload, and advances
 * the client's onboarding progress to the "CV Variant Dispatch" milestone —
 * the persistence follow-up to generate-cv-variant above.
 */
export const saveCvVariantController = catchAsyncError(
  async (req: Request, res: Response) => {
    const userId = (req.body?.userId as string | undefined)?.trim();
    const resumeUploadId = (req.body?.resumeUploadId as string | undefined)?.trim();
    const cvVariant = (req.body?.cvVariant as string | undefined)?.trim();
    const format = (req.body?.format as string | undefined)?.trim().toLowerCase();
    const design = req.body?.design;

    if (!userId) {
      return res.apiError(new ErrorHandler("userId is required", 400));
    }
    if (!resumeUploadId) {
      return res.apiError(new ErrorHandler("resumeUploadId is required", 400));
    }
    if (!cvVariant) {
      return res.apiError(new ErrorHandler("cvVariant is required", 400));
    }
    if (format !== "pdf" && format !== "docx") {
      return res.apiError(new ErrorHandler("format must be 'pdf' or 'docx'", 400));
    }

    try {
      const { upload, clientName } = await AdminDocumentService.saveCvVariant(
        userId,
        resumeUploadId,
        cvVariant,
        format,
        design,
      );

      const adminUser = (req as any).user;
      const adminName = `${adminUser?.firstName || ""} ${adminUser?.lastName || ""}`.trim() || "Admin";
      const host = req.get("host") || "localhost";
      const location = getEnvironmentFromHost(host);
      const fileName = upload.document?.name || `CV_Variant.${format}`;

      setImmediate(async () => {
        try {
          await SlackService.notify({
            location,
            host,
            node: SlackNode.DATA_STORE,
            provider: SlackProvider.FIREBASE,
            severity: SlackSeverity.INFO,
            type: SlackEventType.DOCUMENT_UPLOAD,
            channel: SlackChannel.TOWN_CRIER,
            teamMentions: "CSM",
            trigger: `CV Variant Generated by ${adminName}`,
            body: `🟢 CV Variant generated
Client: ${clientName} · ${userId}
Progress bar: → Variant Dispatch
Files: ${fileName} → Admin's Downloads
Generated by: ${adminName}`,
          });
          logger.info(`✅ Slack notification sent for CV variant save (user ${userId})`);
        } catch (error: any) {
          logger.error(`❌ Failed to send Slack notification: ${error.message}`);
        }
      });

      return res.apiSuccess({ upload }, "CV variant saved successfully", 200);
    } catch (error: any) {
      const statusCode = error instanceof ErrorHandler ? error.statusCode : 500;
      logger.error(`Failed to save CV variant for user ${userId}: ${error.message}`);
      return res.apiError(
        new ErrorHandler(error.message || "Failed to save CV variant", statusCode),
      );
    }
  },
);

/**
 * Starts a new "Generate Interview Pack" process for a client's resume
 * against a job link/description, or — if this specific resume already has
 * a non-completed process — transparently resumes it instead of starting a
 * competing second one. Scoped per resume (not per user) so a stuck process
 * on one of a client's resumes doesn't block generating a pack for another.
 * Does not run any AI stage itself; the frontend drives stage execution one
 * at a time via run-interview-pack-stage below so it can show real
 * per-stage progress.
 */
export const startInterviewPackController = catchAsyncError(
  async (req: Request, res: Response) => {
    const userId = (req.body?.userId as string | undefined)?.trim();
    const resumeUploadId = (req.body?.resumeUploadId as string | undefined)?.trim();
    const jobContent = (req.body?.jobContent as string | undefined)?.trim();
    const jobLink = (req.body?.jobLink as string | undefined)?.trim();

    if (!userId) {
      return res.apiError(new ErrorHandler("userId is required", 400));
    }
    if (!resumeUploadId) {
      return res.apiError(new ErrorHandler("resumeUploadId is required", 400));
    }
    if (!jobContent) {
      return res.apiError(new ErrorHandler("jobContent is required", 400));
    }

    try {
      const adminUser = (req as any).user;
      const process = await InterviewPackService.startOrResume(
        userId,
        resumeUploadId,
        jobContent,
        jobLink,
        adminUser?.id,
      );
      return res.apiSuccess({ process }, "Interview pack process started", 200);
    } catch (error: any) {
      const statusCode = error instanceof ErrorHandler ? error.statusCode : 500;
      logger.error(`Failed to start interview pack for user ${userId}: ${error.message}`);
      return res.apiError(
        new ErrorHandler(error.message || "Failed to start interview pack", statusCode),
      );
    }
  },
);

/**
 * Runs exactly one stage (whichever `currentStage` currently points at) of
 * an in-progress Interview Pack process. Called repeatedly by the frontend,
 * once per stage, so it can render "Stage 1 done, Stage 2..." progress in
 * real time instead of a single opaque combined call.
 */
export const runInterviewPackStageController = catchAsyncError(
  async (req: Request, res: Response) => {
    const userId = (req.body?.userId as string | undefined)?.trim();
    const processId = (req.body?.processId as string | undefined)?.trim();

    if (!userId) {
      return res.apiError(new ErrorHandler("userId is required", 400));
    }
    if (!processId) {
      return res.apiError(new ErrorHandler("processId is required", 400));
    }

    try {
      const process = await InterviewPackService.runNextStage(processId, userId);
      return res.apiSuccess({ process }, "Interview pack stage completed", 200);
    } catch (error: any) {
      const statusCode = error instanceof ErrorHandler ? error.statusCode : 500;
      logger.error(`Failed to run interview pack stage for process ${processId}: ${error.message}`);
      return res.apiError(
        new ErrorHandler(error.message || "Failed to run interview pack stage", statusCode),
      );
    }
  },
);

/**
 * Fetches the current state of an Interview Pack process — used by the
 * frontend to resume showing progress after a page reload mid-run.
 */
export const getInterviewPackProcessController = catchAsyncError(
  async (req: Request, res: Response) => {
    const userId = (req.query?.userId as string | undefined)?.trim();
    const processId = (req.params?.processId as string | undefined)?.trim();

    if (!userId) {
      return res.apiError(new ErrorHandler("userId is required", 400));
    }
    if (!processId) {
      return res.apiError(new ErrorHandler("processId is required", 400));
    }

    try {
      const process = await InterviewPackService.getProcess(processId, userId);
      return res.apiSuccess({ process }, "Interview pack process fetched", 200);
    } catch (error: any) {
      const statusCode = error instanceof ErrorHandler ? error.statusCode : 500;
      logger.error(`Failed to fetch interview pack process ${processId}: ${error.message}`);
      return res.apiError(
        new ErrorHandler(error.message || "Failed to fetch interview pack process", statusCode),
      );
    }
  },
);

/**
 * Renders the Interview Pack into a PDF/DOCX and streams it straight back —
 * no Firebase upload, no Upload record, nothing visible to the client. Lets
 * an admin download and check the render before saving it for real via
 * save-interview-pack.
 */
export const previewInterviewPackController = catchAsyncError(
  async (req: Request, res: Response) => {
    const userId = (req.body?.userId as string | undefined)?.trim();
    const resumeUploadId = (req.body?.resumeUploadId as string | undefined)?.trim();
    const interviewPack = (req.body?.interviewPack as string | undefined)?.trim();
    const format = (req.body?.format as string | undefined)?.trim().toLowerCase();

    if (!userId) {
      return res.apiError(new ErrorHandler("userId is required", 400));
    }
    if (!resumeUploadId) {
      return res.apiError(new ErrorHandler("resumeUploadId is required", 400));
    }
    if (!interviewPack) {
      return res.apiError(new ErrorHandler("interviewPack is required", 400));
    }
    if (format !== "pdf" && format !== "docx") {
      return res.apiError(new ErrorHandler("format must be 'pdf' or 'docx'", 400));
    }

    try {
      const { buffer, filename, mimeType } = await AdminDocumentService.previewInterviewPack(
        userId,
        resumeUploadId,
        interviewPack,
        format,
      );
      res.setHeader("Content-Type", mimeType);
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      return res.send(buffer);
    } catch (error: any) {
      const statusCode = error instanceof ErrorHandler ? error.statusCode : 500;
      logger.error(`Failed to preview interview pack for user ${userId}: ${error.message}`);
      return res.apiError(
        new ErrorHandler(error.message || "Failed to preview interview pack", statusCode),
      );
    }
  },
);

/**
 * Renders the (admin-reviewed/formatted) Interview Pack — rich-text HTML
 * combining all 4 completed stages, built on the frontend — into a PDF or
 * DOCX, uploads it to Firebase, and records it as an `otherDocs` Upload.
 */
export const saveInterviewPackController = catchAsyncError(
  async (req: Request, res: Response) => {
    const userId = (req.body?.userId as string | undefined)?.trim();
    const resumeUploadId = (req.body?.resumeUploadId as string | undefined)?.trim();
    const interviewPack = (req.body?.interviewPack as string | undefined)?.trim();
    const format = (req.body?.format as string | undefined)?.trim().toLowerCase();

    if (!userId) {
      return res.apiError(new ErrorHandler("userId is required", 400));
    }
    if (!resumeUploadId) {
      return res.apiError(new ErrorHandler("resumeUploadId is required", 400));
    }
    if (!interviewPack) {
      return res.apiError(new ErrorHandler("interviewPack is required", 400));
    }
    if (format !== "pdf" && format !== "docx") {
      return res.apiError(new ErrorHandler("format must be 'pdf' or 'docx'", 400));
    }

    try {
      const { upload, clientName } = await AdminDocumentService.saveInterviewPack(
        userId,
        resumeUploadId,
        interviewPack,
        format,
      );

      const adminUser = (req as any).user;
      const adminName = `${adminUser?.firstName || ""} ${adminUser?.lastName || ""}`.trim() || "Admin";
      const host = req.get("host") || "localhost";
      const location = getEnvironmentFromHost(host);
      const fileName = upload.document?.name || `Interview_Pack.${format}`;

      setImmediate(async () => {
        try {
          await SlackService.notify({
            location,
            host,
            node: SlackNode.DATA_STORE,
            provider: SlackProvider.FIREBASE,
            severity: SlackSeverity.INFO,
            type: SlackEventType.DOCUMENT_UPLOAD,
            channel: SlackChannel.TOWN_CRIER,
            teamMentions: "CSM",
            trigger: `Interview Pack Generated by ${adminName}`,
            body: `🟠 Interview Pack generated
Client: ${clientName} · ${userId}
Files: ${fileName} → Admin's Downloads
Generated by: ${adminName}`,
          });
          logger.info(`✅ Slack notification sent for interview pack save (user ${userId})`);
        } catch (error: any) {
          logger.error(`❌ Failed to send Slack notification: ${error.message}`);
        }
      });

      return res.apiSuccess({ upload }, "Interview pack saved successfully", 200);
    } catch (error: any) {
      const statusCode = error instanceof ErrorHandler ? error.statusCode : 500;
      logger.error(`Failed to save interview pack for user ${userId}: ${error.message}`);
      return res.apiError(
        new ErrorHandler(error.message || "Failed to save interview pack", statusCode),
      );
    }
  },
);
