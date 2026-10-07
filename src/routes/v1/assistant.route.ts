import { Router } from "express";
import { AssistantController } from "../../controllers/v1/assistant.controller";
import { VaChatController } from "../../controllers/v1/va-chat.controller";
import { checkBlacklistedTokens } from "../../middlewares/checkBlacklistedToken";
import { isUserAuthenticated } from "../../middlewares/auth";
import { authorizeRoles } from "@/middlewares/authorizeRoles";

const assistantRouterV1 = Router();

assistantRouterV1.use(checkBlacklistedTokens, isUserAuthenticated);

/**
 * Assistant Routes
 * All routes prefixed with /api/v1/assistant
 */

// GET /clients-assigned
assistantRouterV1.get("/clients-assigned", AssistantController.getClientsAssigned);

// Can this staff member open this client's page? (PCs: assigned clients only)
assistantRouterV1.get("/client-access/:clientId", authorizeRoles("admin", "assistant"), AssistantController.checkClientAccess);

// VA Chat routes — the widget is mounted in both the admin and PC layouts,
// so admins and assistants both use it.
assistantRouterV1.get("/va", authorizeRoles("admin", "assistant"), VaChatController.getMessages);
assistantRouterV1.post("/va", authorizeRoles("admin", "assistant"), VaChatController.sendMessage);
assistantRouterV1.delete("/va", authorizeRoles("admin", "assistant"), VaChatController.deleteSession);
// Admin client picker — searches every client. PCs use /clients-assigned.
assistantRouterV1.get("/va/clients", authorizeRoles("admin"), VaChatController.searchClients);
// Client the widget is scoped to when opened on a client page.
assistantRouterV1.get("/va/client/:clientId", authorizeRoles("admin", "assistant"), VaChatController.getClient);

// Selection Criteria Assistant (SPR-20-01-014 → 021) — the PC Customer-mode flow.
assistantRouterV1.get("/va/client/:clientId/cvs", authorizeRoles("admin", "assistant"), VaChatController.listCvs);
assistantRouterV1.post("/va/job-ad", authorizeRoles("admin", "assistant"), VaChatController.fetchJobAd);
assistantRouterV1.post("/va/criteria/classify", authorizeRoles("admin", "assistant"), VaChatController.classifyCriteria);
assistantRouterV1.post("/va/criteria", authorizeRoles("admin", "assistant"), VaChatController.runCriteria);

export default assistantRouterV1;