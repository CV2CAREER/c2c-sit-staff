import { Router } from "express";
import {
  getAllUploadDocuments,
  updateUploadDocument
} from "../../controllers/v1/upload.controller";
import { isUserAuthenticated } from "../../middlewares/auth";
import { checkBlacklistedTokens } from "../../middlewares/checkBlacklistedToken";

const uploadRouterV1 = Router();

uploadRouterV1.use(checkBlacklistedTokens, isUserAuthenticated)

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

export default uploadRouterV1;