import { Router } from "express";
import {
  getReferrals,
  approveReferral,
  declineReferral,
  deleteReferral,
  restoreReferral,
  permanentDeleteReferral,
  getUserReferrals,
  getUserReferralsByEmail,
} from "../../controllers/v1/referral.controller";
import { isUserAuthenticated } from "../../middlewares/auth";
import { checkBlacklistedTokens } from "../../middlewares/checkBlacklistedToken";

const referralRouterV1 = Router();

referralRouterV1.use(checkBlacklistedTokens, isUserAuthenticated);

// Referral Endpoints
referralRouterV1.get("/", getReferrals);
referralRouterV1.post("/approve", approveReferral);
referralRouterV1.post("/decline", declineReferral);
referralRouterV1.get("/by-email", getUserReferralsByEmail);
referralRouterV1.get("/user/:userId", getUserReferrals);
referralRouterV1.delete("/:referralId", deleteReferral);
referralRouterV1.patch("/:referralId/restore", restoreReferral);
referralRouterV1.delete("/:referralId/permanent", permanentDeleteReferral);

export default referralRouterV1;
