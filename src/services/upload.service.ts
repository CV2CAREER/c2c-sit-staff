import { getServiceLogger } from "../utils/createLogger";
import { Upload } from "../models/v1/upload.model";
import ErrorHandler from "../utils/errorHandler";
import { validate as isUuid } from "uuid";

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
  if (!isUuid(uploadId)) {
    throw new ErrorHandler("Invalid upload ID.", 400);
  }

  logger.info(`Updating upload ID: ${uploadId}`);

  const upload = await Upload.findByPk(uploadId);
  if (!upload) {
    throw new ErrorHandler("Upload document not found.", 404);
  }

  // Allowed fields to update
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