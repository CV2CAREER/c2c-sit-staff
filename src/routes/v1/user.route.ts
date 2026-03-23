import { Router } from "express";
import { loginUser, promoteToAdmin, getUserInfo, getCurrentUserProfile } from "../../controllers/v1/user.controller";
import { checkBlacklistedTokens } from "../../middlewares/checkBlacklistedToken";
import { isUserAuthenticated } from "../../middlewares/auth";

const userRouterV1 = Router();

userRouterV1.post("/login", loginUser);
userRouterV1.get("/profile", checkBlacklistedTokens, isUserAuthenticated, getCurrentUserProfile);
userRouterV1.patch("/promote/:userId", checkBlacklistedTokens, isUserAuthenticated, promoteToAdmin);
userRouterV1.get("/:userId", checkBlacklistedTokens, isUserAuthenticated, getUserInfo);

export default userRouterV1;
