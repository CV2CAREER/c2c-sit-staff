import { Router } from "express";
import { isUserAuthenticated } from "../../middlewares/auth";
import { checkBlacklistedTokens } from "../../middlewares/checkBlacklistedToken";
import {
  deleteClientSupportDocumentController,
  getClientSupportDocumentUrlController,
  getClientSupportDocumentsController,
  saveAiRoleTitleRecommendationsController,
  uploadClientSupportDocumentsController,
} from "../../controllers/v1/client-support-document.controller";

const clientSupportDocumentRouterV1 = Router();

clientSupportDocumentRouterV1.use(checkBlacklistedTokens, isUserAuthenticated);

// Multipart upload — fields: roleTitleRecommendations, supportImages,
// supportSpreadsheets (plus clientId).
clientSupportDocumentRouterV1.post("/", uploadClientSupportDocumentsController);

clientSupportDocumentRouterV1.post(
  "/role-titles/save",
  saveAiRoleTitleRecommendationsController,
);

clientSupportDocumentRouterV1.get(
  "/client/:clientId",
  getClientSupportDocumentsController,
);

clientSupportDocumentRouterV1.get(
  "/:id/download-url",
  getClientSupportDocumentUrlController,
);

clientSupportDocumentRouterV1.delete(
  "/:id",
  deleteClientSupportDocumentController,
);

export default clientSupportDocumentRouterV1;
