import { Router } from "express";
import {
  getUnsubscribedUsers,
  unsubscribeUser,
  removeUnsubscribedUser
} from "../../controllers/v1/unsubscribed-user.controller";
import { isUserAuthenticated } from "../../middlewares/auth";
import { checkBlacklistedTokens } from "../../middlewares/checkBlacklistedToken";
import { authorizeRoles } from "@/middlewares/authorizeRoles";

const unsubscribedUserRouterV1 = Router();

unsubscribedUserRouterV1.use(checkBlacklistedTokens, isUserAuthenticated, authorizeRoles("admin", "assistant"));

// Unsubscribed Users Endpoints
unsubscribedUserRouterV1.get("/", getUnsubscribedUsers);
unsubscribedUserRouterV1.post("/", authorizeRoles("admin"), unsubscribeUser);
unsubscribedUserRouterV1.delete("/:userId", authorizeRoles("admin"), removeUnsubscribedUser);

export default unsubscribedUserRouterV1;