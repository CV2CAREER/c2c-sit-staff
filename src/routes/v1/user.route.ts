import { Router } from "express";
import {
    loginUser,
    promoteToAdmin,
    getUserInfo,
    getCurrentUserProfile,
    logoutUser,
    getClients,
    getAssistants,
    getAllUsers
} from "../../controllers/v1/user.controller";
import { dispatchClient } from "../../controllers/v1/dispatch-client.controller";
import { checkBlacklistedTokens } from "../../middlewares/checkBlacklistedToken";
import { isUserAuthenticated } from "../../middlewares/auth";
import { authorizeRoles } from "../../middlewares/authorizeRoles";

const userRouterV1 = Router();

userRouterV1.post("/login", loginUser);
userRouterV1.get("/profile", checkBlacklistedTokens, isUserAuthenticated, getCurrentUserProfile);
userRouterV1.get("/clients", checkBlacklistedTokens, isUserAuthenticated, getClients);
userRouterV1.get("/assistants", checkBlacklistedTokens, isUserAuthenticated, getAssistants);
userRouterV1.get("/all", checkBlacklistedTokens, isUserAuthenticated, authorizeRoles("admin", "assistant"), getAllUsers);
userRouterV1.patch("/promote/:userId", promoteToAdmin);
userRouterV1.get("/:userId", checkBlacklistedTokens, isUserAuthenticated, getUserInfo);
userRouterV1.post("/logout", checkBlacklistedTokens, isUserAuthenticated, logoutUser);
userRouterV1.post("/dispatch-client", checkBlacklistedTokens, isUserAuthenticated, dispatchClient);

export default userRouterV1;
