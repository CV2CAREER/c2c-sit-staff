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
