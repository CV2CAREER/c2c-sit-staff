import fs from "fs/promises";
import { Request, Response } from "express";
import formidable, { type File as FormidableFile, type Files } from "formidable";
import catchAsyncError from "../../utils/catchAsyncError";
import ErrorHandler from "../../utils/errorHandler";
import { getServiceLogger } from "../../utils/createLogger";
import {
  CLIENT_SUPPORT_DOCUMENT_CATEGORIES,
  ClientSupportDocumentCategory,
} from "../../models/v1/client-support-document.model";
import {
  deleteClientSupportDocument,
  getClientSupportDocument,
  listClientSupportDocuments,
  uploadClientSupportDocuments,
  type IncomingSupportFile,
} from "../../services/admin/client-support-document.service";
import { generateDownloadSignedUrl } from "../../utils/fileUpload";

const logger = getServiceLogger("client-support-document-controller");

const parseMultipartForm = (
  req: Request,
): Promise<{ fields: formidable.Fields; files: Files }> =>
  new Promise((resolve, reject) => {
    const form = formidable({ keepExtensions: true, multiples: true });

    form.parse(req, (err, fields, files) => {
      if (err) {
        reject(err);
        return;
      }
      resolve({ fields, files });
    });
  });

const toFileArray = (value: FormidableFile | FormidableFile[] | undefined) => {
  if (!value) return [] as FormidableFile[];
  return Array.isArray(value) ? value : [value];
};

const firstValue = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

const isSupportedCategory = (
  key: string,
): key is ClientSupportDocumentCategory =>
  (CLIENT_SUPPORT_DOCUMENT_CATEGORIES as string[]).includes(key);

/**
 * POST — multipart upload of Role Title Recommendations, Support Images and
 * Support Spreadsheets for a client. Field names must match the category enum.
 */
export const uploadClientSupportDocumentsController = catchAsyncError(
  async (req: Request, res: Response) => {
    const tempFilePaths: string[] = [];

    try {
      const { fields, files } = await parseMultipartForm(req);

      const clientId =
        firstValue(fields.clientId as string | string[] | undefined) ||
        firstValue(fields.userId as string | string[] | undefined);

      if (!clientId) {
        return res.apiError(new ErrorHandler("clientId is required", 400));
      }

      const incoming: IncomingSupportFile[] = [];
      const unknownFields: string[] = [];

      Object.keys(files || {}).forEach((key) => {
        if (!isSupportedCategory(key)) {
          unknownFields.push(key);
          return;
        }

        toFileArray(files[key]).forEach((file) => {
          tempFilePaths.push(file.filepath);
          incoming.push({
            category: key,
            filepath: file.filepath,
            originalFilename:
              file.originalFilename || file.newFilename || "upload.bin",
            mimetype: file.mimetype || undefined,
            size: file.size,
          });
        });
      });

      if (unknownFields.length) {
        logger.warn(`Ignoring unsupported upload fields: ${unknownFields.join(", ")}`);
      }

      if (incoming.length === 0) {
        return res.apiError(
          new ErrorHandler(
            `No files uploaded. Expected one of: ${CLIENT_SUPPORT_DOCUMENT_CATEGORIES.join(", ")}.`,
            400,
          ),
        );
      }

      const documents = await uploadClientSupportDocuments({
        clientId,
        uploadedBy: req.user?.id,
        files: incoming,
      });

      return res.apiSuccess(
        documents,
        `${documents.length} file(s) uploaded successfully`,
        201,
      );
    } catch (error: any) {
      const statusCode = error instanceof ErrorHandler ? error.statusCode : 500;
      logger.error(`Failed to upload client support documents: ${error.message}`);
      return res.apiError(
        new ErrorHandler(error.message || "Failed to upload files", statusCode),
      );
    } finally {
      await Promise.all(
        tempFilePaths.map(async (filePath) => {
          try {
            await fs.unlink(filePath);
          } catch {
            logger.warn(`Failed to clean up temp file: ${filePath}`);
          }
        }),
      );
    }
  },
);

/** GET — list a client's support documents, optionally filtered by category. */
export const getClientSupportDocumentsController = catchAsyncError(
  async (req: Request, res: Response) => {
    const clientId = (req.params.clientId || req.query.clientId) as
      | string
      | undefined;

    if (!clientId) {
      return res.apiError(new ErrorHandler("clientId is required", 400));
    }

    const category = req.query.category as string | undefined;

    if (category && !isSupportedCategory(category)) {
      return res.apiError(
        new ErrorHandler(
          `Unknown category. Expected one of: ${CLIENT_SUPPORT_DOCUMENT_CATEGORIES.join(", ")}.`,
          400,
        ),
      );
    }

    const documents = await listClientSupportDocuments(
      clientId,
      category as ClientSupportDocumentCategory | undefined,
    );

    return res.apiSuccess(documents, "Documents retrieved successfully", 200);
  },
);

/** GET — mint a fresh signed download URL for one stored document. */
export const getClientSupportDocumentUrlController = catchAsyncError(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    if (!id) {
      return res.apiError(new ErrorHandler("Document id is required", 400));
    }

    const document = await getClientSupportDocument(id);
    const url = await generateDownloadSignedUrl(
      document.cloudFilename,
      document.filename,
    );

    return res.apiSuccess({ url }, "Signed URL generated successfully", 200);
  },
);

/** DELETE — soft-delete the record and remove the object from storage. */
export const deleteClientSupportDocumentController = catchAsyncError(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    if (!id) {
      return res.apiError(new ErrorHandler("Document id is required", 400));
    }

    await deleteClientSupportDocument(id, req.user?.id);

    return res.apiSuccess({}, "Document deleted successfully", 200);
  },
);
