import { getServiceLogger } from "../utils/createLogger";
import { Upload } from "../models/v1/upload.model";
import { User } from "../models/v1/user.model";
import ErrorHandler from "../utils/errorHandler";
import { UploadType, UploadStatus, UploadSource } from "../utils/enum";
import { CvDataPoints, DocumentFile } from "../types/userdocument.types";
import { Op } from "sequelize";

const logger = getServiceLogger("document-service");

// Get all documents
export const getAllDocuments = async () => {
  logger.info("Retrieving all documents from database");

  const documents = await Upload.findAll({
    where: {
      isDeleted: false,
    },
    include: [
      {
        model: User,
        as: "user",
      },
    ],
    order: [["createdAt", "DESC"]],
  });

  logger.info(`Retrieved ${documents.length} documents from database`);
  return documents;
};

// Get all documents for a user
export const getUserDocuments = async (userId: string) => {
  logger.info(`Retrieving documents for user: ${userId}`);

  const documents = await Upload.findAll({
    where: {
      userId,
      isDeleted: false,
    },
    include: [
      {
        model: User,
        as: "user"
      },
    ],
    order: [["createdAt", "DESC"]],
  });

  logger.info(`Retrieved ${documents.length} documents for user: ${userId}`);
  return documents;
};

// Get a specific document by ID
export const getDocumentById = async (documentId: string, userId?: string) => {
  logger.info(`Retrieving document: ${documentId}`);

  const whereClause: any = {
    id: documentId,
    isDeleted: false,
  };

  if (userId) {
    whereClause.userId = userId;
  }

  const document = await Upload.findOne({
    where: whereClause,
    include: [
      {
        model: User,
        as: "user"
      },
    ],
  });

  if (!document) {
    logger.warn(`Document not found: ${documentId}`);
    throw new ErrorHandler("Document not found", 404);
  }

  logger.info(`Document retrieved: ${documentId}`);
  return document;
};

// Get documents by type for a user
export const getUserDocumentsByType = async (
  userId: string,
  type: UploadType
) => {
  logger.info(`Retrieving ${type} documents for user: ${userId}`);

  const documents = await Upload.findAll({
    where: {
      userId,
      type,
      isDeleted: false,
    },
    include: [
      {
        model: User,
        as: "user"
      },
    ],
    order: [["createdAt", "DESC"]],
  });

  logger.info(`Retrieved ${documents.length} ${type} documents for user: ${userId}`);
  return documents;
};

// Update document
export const updateDocument = async (
  documentId: string,
  updateData: {
    type?: UploadType;
    status?: UploadStatus;
    document?: DocumentFile;
    cvDataPoints?: CvDataPoints;
    cvJobTitles?: string[];
    keywords?: string[];
    isDefault?: boolean;
  },
  userId?: string
) => {
  logger.info(`Updating document: ${documentId}`);

  const whereClause: any = {
    id: documentId,
    isDeleted: false,
  };

  if (userId) {
    whereClause.userId = userId;
  }

  const document = await Upload.findOne({
    where: whereClause,
  });

  if (!document) {
    logger.warn(`Document not found for update: ${documentId}`);
    throw new ErrorHandler("Document not found", 404);
  }

  // If setting as default, unset other default documents for this user
  if (updateData.isDefault === true) {
    await Upload.update(
      { isDefault: false },
      {
        where: {
          userId: document.userId,
          isDefault: true,
          isDeleted: false,
          id: { [require("sequelize").Op.ne]: documentId },
        },
      }
    );
    logger.info(`Unset default status for other documents of user: ${document.userId}`);
  }

  // Update the document
  await document.update(updateData);

  // Reload with associations
  await document.reload({
    include: [
      {
        model: User,
        as: "user"
      },
    ],
  });

  logger.info(`Document updated successfully: ${documentId}`);
  return document;
};

// Update document status
export const updateDocumentStatus = async (
  documentId: string,
  status: UploadStatus,
  userId?: string
) => {
  logger.info(`Updating document status: ${documentId} to ${status}`);

  const whereClause: any = {
    id: documentId,
    isDeleted: false,
  };

  if (userId) {
    whereClause.userId = userId;
  }

  const document = await Upload.findOne({
    where: whereClause,
  });

  if (!document) {
    logger.warn(`Document not found for status update: ${documentId}`);
    throw new ErrorHandler("Document not found", 404);
  }

  await document.update({ status });

  logger.info(`Document status updated: ${documentId} to ${status}`);
  return document;
};

// Soft delete document
export const deleteDocument = async (documentId: string, userId?: string) => {
  logger.info(`Soft deleting document: ${documentId}`);

  const whereClause: any = {
    id: documentId,
    isDeleted: false,
  };

  if (userId) {
    whereClause.userId = userId;
  }

  const document = await Upload.findOne({
    where: whereClause,
  });

  if (!document) {
    logger.warn(`Document not found for deletion: ${documentId}`);
    throw new ErrorHandler("Document not found", 404);
  }

  await document.update({
    isDeleted: true,
    deletedAt: new Date(),
  });

  logger.info(`Document soft deleted: ${documentId}`);
  return { message: "Document deleted successfully" };
};
