import { Router } from "express";
import {
  getChatsByDate,
  getChatById
} from "../../controllers/v1/chat.controller";
import { isUserAuthenticated } from "../../middlewares/auth";
import { authorizeRoles } from "@/middlewares/authorizeRoles";
import { checkBlacklistedTokens } from "../../middlewares/checkBlacklistedToken";

const chatRouterV1 = Router();

// Admin protected routes
chatRouterV1.use(checkBlacklistedTokens, isUserAuthenticated, authorizeRoles("admin"));

chatRouterV1.get("/", getChatsByDate);
chatRouterV1.get("/:id", getChatById);

export default chatRouterV1;