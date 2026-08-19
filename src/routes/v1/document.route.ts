import { Router } from "express";
import {
  getAllDocumentsController,
  getUserDocumentsController,
  getDocumentByIdController,
  getUserDocumentsByTypeController,
  updateDocumentController,
  updateDocumentStatusController,
  deleteDocumentController,
} from "../../controllers/v1/document.controller";
import { checkBlacklistedTokens } from "../../middlewares/checkBlacklistedToken";
import { isUserAuthenticated } from "../../middlewares/auth";
import { authorizeRoles } from "../../middlewares/authorizeRoles";

const documentRouterV1 = Router();

// All document routes require admin or assistant role
documentRouterV1.use(checkBlacklistedTokens, isUserAuthenticated, authorizeRoles("admin", "assistant"));

// Get all documents
documentRouterV1.get("/all", getAllDocumentsController);

// Get all documents for a user
documentRouterV1.get("/user/:userId", getUserDocumentsController);

// Get documents by type for a user
documentRouterV1.get("/user/:userId/type/:type", getUserDocumentsByTypeController);

// Get a specific document by ID
documentRouterV1.get("/:documentId", getDocumentByIdController);

// Update document
documentRouterV1.patch("/:documentId", authorizeRoles("admin"), updateDocumentController);

// Update document status
documentRouterV1.patch("/:documentId/status", authorizeRoles("admin"), updateDocumentStatusController);

// Delete document (soft delete)
documentRouterV1.delete("/:documentId", authorizeRoles("admin"), deleteDocumentController);

export default documentRouterV1;
