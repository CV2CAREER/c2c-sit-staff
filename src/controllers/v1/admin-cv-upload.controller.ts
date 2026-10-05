import fs from "fs/promises";
import { Request, Response } from "express";
import formidable, { type File as FormidableFile, type Files } from "formidable";
import catchAsyncError from "../../utils/catchAsyncError";
import ErrorHandler from "../../utils/errorHandler";
import { getServiceLogger } from "../../utils/createLogger";
import { UploadService } from "../../services/admin-upload.service";
import { SlackService } from "../../services/slack.service";
import { sendMail } from "../../config/sendGrid";
import { TEAM_EMAIL, CLIENT_APP_DOMAIN } from "../../config/env";
import { User } from "../../models/v1/user.model";
import { UploadType, SlackNode, SlackProvider, SlackSeverity, SlackEventType, SlackChannel } from "../../utils/enum";
import { getEnvironmentFromHost } from "../../utils/slack-helpers";
import { getFullName } from "../../utils/helpers";
import {
  generateUniqueFilename,
  uploadBufferToStorage,
} from "../../utils/fileUpload";

const logger = getServiceLogger("admin-cv-upload-controller");

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

const getStringField = (field: string | string[] | undefined): string | undefined => {
  if (Array.isArray(field)) return field[0];
  return field;
};

/**
 * POST /api/v1/admin/documents/upload-cv-cover-letter
 * Admin uploads a CV and/or Cover Letter for a user.
 * Accepts multipart/form-data with fields:
 *   - userId (required): The target user ID
 *   - resume (file, optional): The CV/resume file
 *   - coverletter (file, optional): The cover letter file
 * At least one of resume or coverletter must be provided.
 */
export const adminUploadCvCoverLetterController = catchAsyncError(
  async (req: Request, res: Response) => {
    const tempFilePaths: string[] = [];

    try {
      const { fields, files } = await parseMultipartForm(req);
      const userId = getStringField(fields.userId)?.trim();

      if (!userId) {
        return res.apiError(new ErrorHandler("userId is required", 400));
      }

      // Collect files to upload - only resume and coverletter
      const fileEntries: Array<{
        fieldName: string;
        type: UploadType.RESUME | UploadType.COVER_LETTER;
        file: FormidableFile;
      }> = [];

      for (const key of ["resume", "coverletter"]) {
        for (const file of toFileArray(files[key])) {
          fileEntries.push({
            fieldName: key,
            type: key === "resume" ? UploadType.RESUME : UploadType.COVER_LETTER,
            file,
          });
        }
      }

      if (fileEntries.length === 0) {
        return res.apiError(
          new ErrorHandler(
            "No files uploaded. Please attach a resume and/or cover letter.",
            400,
          ),
        );
      }

      // Upload each file to Google bucket and build the document list
      const documents = await Promise.all(
        fileEntries.map(async ({ type, file }) => {
          tempFilePaths.push(file.filepath);

          const buffer = await fs.readFile(file.filepath);
          const originalName =
            file.originalFilename || file.newFilename || "upload.bin";
          // const storageName = generateUniqueFilename(originalName);

          const uploadResult = await uploadBufferToStorage(buffer, originalName, {
            folder: `admin-cv-uploads/${userId}`,
            mimeType: file.mimetype || undefined,
          });

          return {
            type,
            document: {
              url: uploadResult.url,
              publicId: uploadResult.publicId,
              name: uploadResult.name,
              size: uploadResult.size,
              mimeType: uploadResult.mimeType,
            },
          };
        }),
      );

      // Create upload records using the admin upload service
      const uploads = await UploadService.adminUploadCvCoverLetter(
        userId,
        documents,
      );

      // Send background notifications using setImmediate to avoid blocking the response
      setImmediate(async () => {
        const documentTypes = documents
          .map((doc) => doc.type)
          .join(", ");

        const documentNames = documents
          .map((doc) => doc.document.name)
          .join(", ");

        const uploadTimestamp = new Date().toLocaleString();

        const slackHost = req.get("host") || CLIENT_APP_DOMAIN;
        const environment = getEnvironmentFromHost(slackHost);

        // Fetch the target client up-front so the same record can back both
        // the Slack alert (needs a real name for follow-up) and the client
        // confirmation email further down — one DB hit instead of two.
        const targetUser = await User.findByPk(userId).catch(() => null);
        const clientDisplayName = targetUser
          ? getFullName(targetUser).trim() || "Unknown client"
          : "Unknown client";
        const clientEmail = targetUser?.email || "unknown";

        // Send Slack notification
        SlackService.notify({
          location: environment,
          host: slackHost,
          node: SlackNode.USER_MANAGEMENT,
          provider: SlackProvider.SYSTEM,
          severity: SlackSeverity.INFO,
          type: SlackEventType.DOCUMENT_UPLOAD,
          trigger: `Documents Uploaded by ${(req as any).user?.firstName} ${(req as any).user?.lastName}`,
          channel: SlackChannel.TOWN_CRIER,
          teamMentions: "CSM,WFC",
          body: `Admin has uploaded revised documents for user.\n\n👤 Client: ${clientDisplayName} (${clientEmail})\n🆔 User ID: ${userId}\n📄 Documents: ${documentTypes}\n📊 Count: ${uploads.length}`,
        }).catch((err) => {
          logger.error(
            `Failed to send Slack notification for CV/Cover Letter upload: ${err.message}`,
          );
        });

        // Send email notification to team
        if (TEAM_EMAIL) {
          try {
            await sendMail({
              email: TEAM_EMAIL,
              subject: `📄 Revised Document Uploaded - by ${(req as any).user?.firstName} ${(req as any).user?.lastName}`,
              templateName: "admin-revised-documents.ejs",
              templateData: {
                title: "Document Upload Notification",
                message: `Admin has uploaded Revised documents for user.`,
                userId,
                documentTypes,
                uploadCount: uploads.length,
                timestamp: uploadTimestamp,
                currentYear: new Date().getFullYear(),
              },
            });
            logger.info(`✅ Team notification email sent for CV/Cover Letter upload`);
          } catch (emailError: any) {
            logger.error(
              `Failed to send team email notification: ${emailError?.message || emailError}`,
            );
          }
        }

        // Send email notification to the client (user) — reuses targetUser
        // fetched above so this path avoids a second DB round-trip.
        // Client-facing "Revised Document Available" is meant for CVs only —
        // a cover-letter-only batch (no resume in this upload) must not
        // trigger it, even though the team Slack/email notifications above
        // still cover every upload type.
        const hasRevisedResume = documents.some(
          (doc) => doc.type === UploadType.RESUME,
        );
        try {
          if (targetUser?.email && hasRevisedResume) {
            const clientName =
              `${targetUser.firstName || ""} ${targetUser.lastName || ""}`.trim() || "there";

            await sendMail({
              email: targetUser.email,
              subject: `📄 Your Revised Document is Ready - CVtoCAREER`,
              templateName: "client-revised-documents.ejs",
              templateData: {
                title: "Revised Document Available",
                name: clientName,
                message:
                  "Our team has uploaded a revised version of your document(s). Please find the details below.",
                documentNames,
                documentTypes,
                timestamp: uploadTimestamp,
                frontendUrl: CLIENT_APP_DOMAIN || "",
                currentYear: new Date().getFullYear(),
              },
            });
            logger.info(
              `✅ Client notification email sent for revised document upload to user ${userId}`,
            );
          } else if (!hasRevisedResume) {
            logger.info(
              `Skipped client email for revised document upload: cover-letter-only batch (no resume) for user ${userId}`,
            );
          } else {
            logger.warn(
              `Skipped client email for revised document upload: no email found for user ${userId}`,
            );
          }
        } catch (clientEmailError: any) {
          logger.error(
            `Failed to send client email notification: ${clientEmailError?.message || clientEmailError}`,
          );
        }
      });

      return res.apiSuccess(
        { uploads },
        "CV/Cover Letter uploaded successfully",
        200,
      );
    } catch (error: any) {
      logger.error(
        `Failed to upload CV/Cover Letter: ${error.message}`,
      );
      return res.apiError(
        new ErrorHandler(
          error.message || "Failed to upload CV/Cover Letter",
          500,
        ),
      );
    } finally {
      // Clean up temporary files
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