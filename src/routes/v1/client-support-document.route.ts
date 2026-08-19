import { Router } from "express";
import { isUserAuthenticated } from "../../middlewares/auth";
import { checkBlacklistedTokens } from "../../middlewares/checkBlacklistedToken";
import {
  activateClientSupportDocumentController,
  deleteClientSupportDocumentController,
  getClientSupportDocumentUrlController,
  getClientSupportDocumentsController,
  saveAiRoleTitleRecommendationsController,
  uploadClientSupportDocumentsController,
} from "../../controllers/v1/client-support-document.controller";
import { authorizeRoles } from "@/middlewares/authorizeRoles";

const clientSupportDocumentRouterV1 = Router();

clientSupportDocumentRouterV1.use(checkBlacklistedTokens, isUserAuthenticated);

// Multipart upload — fields: roleTitleRecommendations, supportImages,
// supportSpreadsheets (plus clientId).
clientSupportDocumentRouterV1.post("/", authorizeRoles("admin"), uploadClientSupportDocumentsController);

clientSupportDocumentRouterV1.post(
  "/role-titles/save",
  authorizeRoles("admin"),
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

clientSupportDocumentRouterV1.patch(
  "/:id/activate",
  activateClientSupportDocumentController,
);

clientSupportDocumentRouterV1.delete(
  "/:id",
  authorizeRoles("admin"),
  deleteClientSupportDocumentController,
);

export default clientSupportDocumentRouterV1;
