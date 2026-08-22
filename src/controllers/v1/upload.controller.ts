import { Request, Response } from "express";
import catchAsyncError from "../../utils/catchAsyncError";
import { getServiceLogger } from "../../utils/createLogger";
import ErrorHandler from "../../utils/errorHandler";
import { activateUpload, deleteUpload, deleteUploadsBulk, getAllUploads, updateUpload } from "../../services/upload.service";

const logger = getServiceLogger("upload-controller");

/**
 * Get all uploaded documents
 */
export const getAllUploadDocuments = catchAsyncError(
  async (req: Request, res: Response) => {
    logger.info(`Processing request to get all uploaded documents`);

    const result = await getAllUploads(req.query);

    logger.info(`Retrieved ${result.uploads.length} uploaded documents`);

    res.apiSuccess(
      result,
      "Uploaded documents retrieved successfully",
    );
  },
);

/**
 * Update an upload document
 */
export const updateUploadDocument = catchAsyncError(
  async (req: Request, res: Response) => {
    const { uploadId } = req.params;
    
    logger.info(`Processing request to update upload document ID: ${uploadId}`);

    const updatedUpload = await updateUpload(uploadId, req.body);

    logger.info(`Upload document ${uploadId} updated successfully`);

    res.apiSuccess(
      {
        upload: updatedUpload
      },
      "Upload document updated successfully",
    );
  },
);

/**
 * Activate an admin-generated upload
 */
export const activateUploadDocument = catchAsyncError(
  async (req: Request, res: Response) => {
    const { uploadId } = req.params;

    logger.info(`Processing request to activate upload document ID: ${uploadId}`);

    const upload = await activateUpload(uploadId);

    logger.info(`Upload document ${uploadId} activated successfully`);

    res.apiSuccess(
      {
        upload
      },
      "Upload document activated successfully",
    );
  },
);

/**
 * Delete an upload document
 */
export const deleteUploadDocument = catchAsyncError(
  async (req: Request, res: Response) => {
    const { uploadId } = req.params;

    logger.info(`Processing request to delete upload document ID: ${uploadId}`);

    await deleteUpload(uploadId);

    logger.info(`Upload document ${uploadId} deleted successfully`);

    res.apiSuccess({}, "Upload document deleted successfully");
  },
);

/**
 * Bulk delete upload documents
 */
export const deleteUploadDocumentsBulk = catchAsyncError(
  async (req: Request, res: Response) => {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      throw new ErrorHandler("ids must be a non-empty array", 400);
    }

    logger.info(`Processing bulk delete request for ${ids.length} upload document(s)`);

    const result = await deleteUploadsBulk(ids);

    res.apiSuccess(result, "Upload documents deleted successfully");
  },
);