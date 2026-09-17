import { Router } from "express";
import { checkBlacklistedTokens } from "@/middlewares/checkBlacklistedToken";
import { isUserAuthenticated } from "@/middlewares/auth";
import { authorizeRoles } from "@/middlewares/authorizeRoles";
import {
  listSocialVerificationQueue,
  getUserSocialSubmissions,
  approveSocialVerification,
  rejectSocialVerification,
  exemptUserFromSocialVerification,
  unExemptUserFromSocialVerification,
} from "@/controllers/v1/social-verification.controller";

const socialVerificationRouterV1 = Router();

// Admin surface for SPR-19-07-005. Reads are open to admin + assistant so
// support staff can look up a user's submission set; writes are admin-only.
socialVerificationRouterV1.use(
  checkBlacklistedTokens,
  isUserAuthenticated,
  authorizeRoles("admin", "assistant"),
);

socialVerificationRouterV1.get("/", listSocialVerificationQueue);
socialVerificationRouterV1.get("/user/:userId", getUserSocialSubmissions);
socialVerificationRouterV1.post("/:id/approve", authorizeRoles("admin"), approveSocialVerification);
socialVerificationRouterV1.delete("/:id", authorizeRoles("admin"), rejectSocialVerification);
socialVerificationRouterV1.post("/user/:userId/exempt", authorizeRoles("admin"), exemptUserFromSocialVerification);
socialVerificationRouterV1.delete("/user/:userId/exempt", authorizeRoles("admin"), unExemptUserFromSocialVerification);

export default socialVerificationRouterV1;
