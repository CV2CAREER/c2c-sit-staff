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

// VA Chat routes — restricted to assistant role
assistantRouterV1.get("/va", authorizeRoles("assistant"), VaChatController.getMessages);
assistantRouterV1.post("/va", authorizeRoles("assistant"), VaChatController.sendMessage);
assistantRouterV1.delete("/va", authorizeRoles("assistant"), VaChatController.deleteSession);

export default assistantRouterV1;