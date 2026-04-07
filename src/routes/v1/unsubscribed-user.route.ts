import { Router } from "express";
import {
  getUnsubscribedUsers,
  unsubscribeUser,
  removeUnsubscribedUser
} from "../../controllers/v1/unsubscribed-user.controller";
import { isUserAuthenticated } from "../../middlewares/auth";
import { checkBlacklistedTokens } from "../../middlewares/checkBlacklistedToken";

const unsubscribedUserRouterV1 = Router();

unsubscribedUserRouterV1.use(checkBlacklistedTokens, isUserAuthenticated);

// Unsubscribed Users Endpoints
unsubscribedUserRouterV1.get("/", getUnsubscribedUsers);
unsubscribedUserRouterV1.post("/", unsubscribeUser);
unsubscribedUserRouterV1.delete("/:userId", removeUnsubscribedUser);

export default unsubscribedUserRouterV1;