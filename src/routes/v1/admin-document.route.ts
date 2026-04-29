import { Router } from "express";
import {
  deleteAdminDocumentUploadController,
  uploadAdminDocumentsController,
  validateAndUploadUrlController,
} from "../../controllers/v1/admin-document-upload.controller";
import { authorizeRoles } from "../../middlewares/authorizeRoles";
import { checkBlacklistedTokens } from "../../middlewares/checkBlacklistedToken";
import { isUserAuthenticated } from "../../middlewares/auth";

const adminDocumentRouterV1 = Router();

adminDocumentRouterV1.use(
  checkBlacklistedTokens,
  isUserAuthenticated,
  authorizeRoles("admin", "assistant"),
);

adminDocumentRouterV1.post("/upload", uploadAdminDocumentsController);
adminDocumentRouterV1.delete("/upload", deleteAdminDocumentUploadController);
adminDocumentRouterV1.post(
  "/validate-and-upload-url",
  validateAndUploadUrlController,
);

export default adminDocumentRouterV1;
