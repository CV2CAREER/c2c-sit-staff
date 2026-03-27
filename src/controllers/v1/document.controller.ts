import { Request, Response } from "express";
import {
  getAllDocuments,
  getUserDocuments,
  getDocumentById,
  getUserDocumentsByType,
  updateDocument,
  updateDocumentStatus,
  deleteDocument,
} from "../../services/document.service";
import catchAsyncError from "../../utils/catchAsyncError";
import { getServiceLogger } from "../../utils/createLogger";
import { UploadType, UploadStatus } from "../../utils/enum";

const logger = getServiceLogger("document-controller");

// Get all documents
export const getAllDocumentsController = catchAsyncError(
  async (req: Request, res: Response) => {
    logger.info("Processing request to get all documents");

    const documents = await getAllDocuments();

    logger.info(`Retrieved ${documents.length} documents`);

    res.apiSuccess(
      {
        documents,
        count: documents.length,
      },
      "All documents retrieved successfully"
    );
  }
);

// Get all documents for a user
export const getUserDocumentsController = catchAsyncError(
  async (req: Request, res: Response) => {
    const { userId } = req.params;

    logger.info(`Processing request to get documents for user: ${userId}`);

    const documents = await getUserDocuments(userId);

    logger.info(`Retrieved ${documents.length} documents for user: ${userId}`);

    res.apiSuccess(
      {
        documents,
        count: documents.length,
      },
      "User documents retrieved successfully"
    );
  }
);

// Get a specific document by ID
export const getDocumentByIdController = catchAsyncError(
  async (req: Request, res: Response) => {
    const { documentId } = req.params;
    const { user } = req;

    logger.info(`Processing request to get document: ${documentId}`);

    const document = await getDocumentById(documentId, user.role !== "admin" ? user.id : undefined);

    logger.info(`Document retrieved: ${documentId}`);

    res.apiSuccess(
      {
        document,
      },
      "Document retrieved successfully"
    );
  }
);

// Get documents by type for a user
export const getUserDocumentsByTypeController = catchAsyncError(
  async (req: Request, res: Response) => {
    const { userId, type } = req.params;

    logger.info(`Processing request to get ${type} documents for user: ${userId}`);

    const documents = await getUserDocumentsByType(userId, type as UploadType);

    logger.info(`Retrieved ${documents.length} ${type} documents for user: ${userId}`);

    res.apiSuccess(
      {
        documents,
        count: documents.length,
      },
      `${type} documents retrieved successfully`
    );
  }
);

// Update document
export const updateDocumentController = catchAsyncError(
  async (req: Request, res: Response) => {
    const { documentId } = req.params;
    const { user } = req;
    const updateData = req.body;

    logger.info(`Processing request to update document: ${documentId}`);

    const document = await updateDocument(
      documentId,
      updateData,
      user.role !== "admin" ? user.id : undefined
    );

    logger.info(`Document updated: ${documentId}`);

    res.apiSuccess(
      {
        document,
      },
      "Document updated successfully"
    );
  }
);

// Update document status
export const updateDocumentStatusController = catchAsyncError(
  async (req: Request, res: Response) => {
    const { documentId } = req.params;
    const { status } = req.body;
    const { user } = req;

    logger.info(`Processing request to update document status: ${documentId} to ${status}`);

    const document = await updateDocumentStatus(
      documentId,
      status as UploadStatus,
      user.role !== "admin" ? user.id : undefined
    );

    logger.info(`Document status updated: ${documentId} to ${status}`);

    res.apiSuccess(
      {
        document,
      },
      "Document status updated successfully"
    );
  }
);

// Delete document (soft delete)
export const deleteDocumentController = catchAsyncError(
  async (req: Request, res: Response) => {
    const { documentId } = req.params;
    const { user } = req;

    logger.info(`Processing request to delete document: ${documentId}`);

    const result = await deleteDocument(
      documentId,
      user.role !== "admin" ? user.id : undefined
    );

    logger.info(`Document deleted: ${documentId}`);

    res.apiSuccess(result, "Document deleted successfully");
  }
);

// Get current user's documents
export const getCurrentUserDocumentsController = catchAsyncError(
  async (req: Request, res: Response) => {
    const { user } = req;

    logger.info(`Processing request to get documents for current user: ${user.id}`);

    const documents = await getUserDocuments(user.id);

    logger.info(`Retrieved ${documents.length} documents for current user: ${user.id}`);

    res.apiSuccess(
      {
        documents,
        count: documents.length,
      },
      "User documents retrieved successfully"
    );
  }
);

// Get current user's documents by type
export const getCurrentUserDocumentsByTypeController = catchAsyncError(
  async (req: Request, res: Response) => {
    const { type } = req.params;
    const { user } = req;

    logger.info(`Processing request to get ${type} documents for current user: ${user.id}`);

    const documents = await getUserDocumentsByType(user.id, type as UploadType);

    logger.info(`Retrieved ${documents.length} ${type} documents for current user: ${user.id}`);

    res.apiSuccess(
      {
        documents,
        count: documents.length,
      },
      `${type} documents retrieved successfully`
    );
  }
);