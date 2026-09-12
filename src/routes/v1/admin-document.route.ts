import { Router } from "express";
import {
  deleteAdminDocumentUploadController,
  generateCoverLetterController,
  generateCvVariantController,
  generateRoleTitleRecommendationsController,
  getDocumentSignedUrlController,
  getInterviewPackProcessController,
  previewCoverLetterController,
  previewCvVariantController,
  previewInterviewPackController,
  runInterviewPackStageController,
  saveCoverLetterController,
  saveCvVariantController,
  saveInterviewPackController,
  startInterviewPackController,
  uploadAdminDocumentsController,
  validateAndUploadUrlController,
} from "../../controllers/v1/admin-document-upload.controller";
import { adminUploadCvCoverLetterController } from "../../controllers/v1/admin-cv-upload.controller";
import { authorizeRoles } from "../../middlewares/authorizeRoles";
import { checkBlacklistedTokens } from "../../middlewares/checkBlacklistedToken";
import { isUserAuthenticated } from "../../middlewares/auth";

const adminDocumentRouterV1 = Router();

adminDocumentRouterV1.use(
  checkBlacklistedTokens,
  isUserAuthenticated,
  authorizeRoles("admin", "assistant"),
);

adminDocumentRouterV1.get("/get-signed-url", getDocumentSignedUrlController);
adminDocumentRouterV1.post("/upload", uploadAdminDocumentsController);
adminDocumentRouterV1.delete("/upload", authorizeRoles("admin"), deleteAdminDocumentUploadController);
adminDocumentRouterV1.post(
  "/validate-and-upload-url",
  validateAndUploadUrlController,
);

adminDocumentRouterV1.post(
  "/upload-cv-cover-letter",
  adminUploadCvCoverLetterController,
);

adminDocumentRouterV1.post(
  "/generate-cover-letter",
  generateCoverLetterController,
);

adminDocumentRouterV1.post(
  "/preview-cover-letter",
  previewCoverLetterController,
);

adminDocumentRouterV1.post(
  "/save-cover-letter",
  saveCoverLetterController,
);

adminDocumentRouterV1.post(
  "/generate-role-titles",
  generateRoleTitleRecommendationsController,
);

adminDocumentRouterV1.post(
  "/generate-cv-variant",
  generateCvVariantController,
);

adminDocumentRouterV1.post(
  "/preview-cv-variant",
  previewCvVariantController,
);

adminDocumentRouterV1.post(
  "/save-cv-variant",
  saveCvVariantController,
);

adminDocumentRouterV1.post(
  "/generate-interview-pack/start",
  startInterviewPackController,
);

adminDocumentRouterV1.post(
  "/generate-interview-pack/run-stage",
  runInterviewPackStageController,
);

adminDocumentRouterV1.get(
  "/generate-interview-pack/:processId",
  getInterviewPackProcessController,
);

adminDocumentRouterV1.post(
  "/preview-interview-pack",
  previewInterviewPackController,
);

adminDocumentRouterV1.post(
  "/save-interview-pack",
  saveInterviewPackController,
);

export default adminDocumentRouterV1;
