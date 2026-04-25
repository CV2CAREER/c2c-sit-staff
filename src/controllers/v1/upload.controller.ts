import { Request, Response } from "express";
import catchAsyncError from "../../utils/catchAsyncError";
import { getServiceLogger } from "../../utils/createLogger";
import { getAllUploads, updateUpload } from "../../services/upload.service";

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