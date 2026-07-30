import { Router } from "express";
import {
  activateUploadDocument,
  getAllUploadDocuments,
  updateUploadDocument
} from "../../controllers/v1/upload.controller";
import { generateKeywords, extractCvDataPoints } from "../../controllers/v1/admin-document.controller";
import { isUserAuthenticated } from "../../middlewares/auth";
import { checkBlacklistedTokens } from "../../middlewares/checkBlacklistedToken";
import { authorizeRoles } from "../../middlewares/authorizeRoles";

const uploadRouterV1 = Router();

uploadRouterV1.use(checkBlacklistedTokens, isUserAuthenticated, authorizeRoles("admin", "assistant"))

/**
 * Get all uploaded documents
 * GET /api/v1/uploads
 */
uploadRouterV1.get(
  "/", getAllUploadDocuments,
);

/**
 * Update upload document
 * PATCH /api/v1/uploads/:uploadId
 */
uploadRouterV1.patch(
  "/:uploadId", updateUploadDocument,
);

/**
 * Activate an admin-generated upload
 * PATCH /api/v1/uploads/:uploadId/activate
 */
uploadRouterV1.patch(
  "/:uploadId/activate", activateUploadDocument,
);

// Admin document operations
uploadRouterV1.post("/extract-cv-data-points", extractCvDataPoints);
uploadRouterV1.post("/generate-keywords", generateKeywords);

export default uploadRouterV1;
