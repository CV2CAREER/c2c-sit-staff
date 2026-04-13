import { Router } from "express";
import { AssistantController } from "../../controllers/v1/assistant.controller";
import { checkBlacklistedTokens } from "../../middlewares/checkBlacklistedToken";
import { isUserAuthenticated } from "../../middlewares/auth";

const assistantRouterV1 = Router();

assistantRouterV1.use(checkBlacklistedTokens, isUserAuthenticated);

/**
 * Assistant Routes
 * All routes prefixed
 */

// GET /clients-assigned
assistantRouterV1.get("/clients-assigned", AssistantController.getClientsAssigned);

export default assistantRouterV1;