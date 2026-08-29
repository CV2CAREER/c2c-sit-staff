import { getServiceLogger } from "../utils/createLogger";
import { Upload } from "../models/v1/upload.model";
import { UploadSource } from "../utils/enum";
import ErrorHandler from "../utils/errorHandler";
import { deleteFileFromStorage } from "../utils/fileUpload";

const logger = getServiceLogger("upload-service");

/**
 * Get all uploaded documents with optional filters
 * @param query Query parameters for filtering
 */
export const getAllUploads = async (query: {
  page?: number | string;
  limit?: number | string;
  status?: string;
  type?: string;
  userId?: string;
  isDeleted?: boolean | string;
} = {}) => {
  logger.info(`Retrieving all uploads with filters`);

  // Parse query parameters
  const page = query.page ? parseInt(query.page as string, 10) : undefined;
  const limit = query.limit ? parseInt(query.limit as string, 10) : undefined;
  const isDeleted = query.isDeleted === 'true' ? true : query.isDeleted === 'false' ? false : undefined;
  
  const { status, type, userId } = query;

  const where: any = {};

  // Filter by deleted status
  if (typeof isDeleted === 'boolean') {
    where.isDeleted = isDeleted;
  } else {
    where.isDeleted = false;
  }

  // Filter by status
  if (status) {
    where.status = status;
  }

  // Filter by upload type
  if (type) {
    where.type = type;
  }

  // Filter by user ID
  if (userId) {
    where.userId = userId;
  }

  // Pagination handling
  const options: any = {
    where,
    order: [['createdAt', 'DESC']]
  };

  if (limit && page) {
    options.limit = limit;
    options.offset = (page - 1) * limit;
  }

  const uploads = await Upload.findAll(options);
  const count = await Upload.count({ where });

  logger.info(`Retrieved ${uploads.length} uploads from database`);
  
  return {
    uploads,
    count,
    page,
    limit
  };
};

/**
 * Update an existing upload document
 * @param uploadId ID of upload to update
 * @param updateData Data to update
 */
export const updateUpload = async (uploadId: string, updateData: any) => {
  if (!uploadId) {
    throw new ErrorHandler("Invalid upload ID.", 400);
  }

  logger.info(`Updating upload ID: ${uploadId}`);

  const upload = await Upload.findByPk(uploadId);
  if (!upload) {
    throw new ErrorHandler("Upload document not found.", 404);
  }

  // Allowed fields to update. `isActive` is deliberately excluded — it's
  // only ever flipped true via activateUpload below, so it can't be
  // silently bundled into an unrelated generic update.
  const allowedFields = [
    'status',
    'isDefault',
    'approvedAt',
    'approvedBy',
    'rejectedAt',
    'rejectedBy',
    'rejectionReason',
    'cvDataPoints',
    'cvJobTitles',
    'keywords'
  ];

  let hasChanges = false;
  for (const field of allowedFields) {
    if (updateData[field] !== undefined) {
      const currentValue = (upload as any)[field];
      const newValue = updateData[field];
      
      if (JSON.stringify(currentValue) !== JSON.stringify(newValue)) {
        (upload as any)[field] = newValue;
        hasChanges = true;
      }
    }
  }

  if (hasChanges) {
    await upload.save();
    logger.info(`Upload ${uploadId} updated successfully`);
  } else {
    logger.info(`No changes detected for upload ${uploadId}`);
  }

  return upload;
};

/**
 * Activates an admin-generated upload (source: "admin"). New uploads are
 * created active already; this only matters for legacy rows created
 * inactive under the old gated flow.
 * @param uploadId ID of upload to activate
 */
export const activateUpload = async (uploadId: string) => {
  if (!uploadId) {
    throw new ErrorHandler("Invalid upload ID.", 400);
  }

  logger.info(`Activating upload ID: ${uploadId}`);

  const upload = await Upload.findByPk(uploadId);
  if (!upload) {
    throw new ErrorHandler("Upload document not found.", 404);
  }

  if (upload.source !== UploadSource.ADMIN) {
    throw new ErrorHandler("Only admin-generated uploads can be activated.", 400);
  }

  if (!upload.isActive) {
    upload.isActive = true;
    await upload.save();
    logger.info(`Upload ${uploadId} activated`);
  } else {
    logger.info(`Upload ${uploadId} was already active`);
  }

  return upload;
};

/**
 * Soft-deletes an upload record and removes its underlying object from
 * storage on a best-effort basis (mirrors deleteClientSupportDocument).
 * @param uploadId ID of upload to delete
 */
export const deleteUpload = async (uploadId: string) => {
  if (!uploadId) {
    throw new ErrorHandler("Invalid upload ID.", 400);
  }

  const upload = await Upload.findByPk(uploadId);
  if (!upload) {
    throw new ErrorHandler("Upload document not found.", 404);
  }

  // `document` is normally a single object, but some legacy rows store it as
  // an array — mirrors the same defensive unwrap the download action uses.
  const doc0 = Array.isArray(upload.document) ? upload.document[0] : upload.document;
  const cloudFilename = (doc0 as any)?.cloudFilename ?? (doc0 as any)?.publicId;
  if (cloudFilename) {
    try {
      await deleteFileFromStorage(cloudFilename);
    } catch (error: any) {
      // A missing object shouldn't block the record from being retired.
      logger.warn(`Could not remove ${cloudFilename} from storage: ${error.message}`);
    }
  }

  upload.isDeleted = true;
  await upload.save();
  await upload.destroy();

  logger.info(`Deleted upload ${uploadId}`);
};

/**
 * Bulk soft-delete upload records. Continues past per-upload failures
 * instead of aborting the whole batch.
 * @param uploadIds IDs of uploads to delete
 */
export const deleteUploadsBulk = async (
  uploadIds: string[],
): Promise<{ deletedCount: number; failedCount: number; failures: { id: string; reason: string }[] }> => {
  const failures: { id: string; reason: string }[] = [];
  let deletedCount = 0;

  for (const id of uploadIds) {
    try {
      await deleteUpload(id);
      deletedCount++;
    } catch (error: any) {
      failures.push({ id, reason: error?.message || "Failed to delete upload" });
    }
  }

  logger.info(`Bulk deleted ${deletedCount} upload(s)`);

  return { deletedCount, failedCount: failures.length, failures };
};