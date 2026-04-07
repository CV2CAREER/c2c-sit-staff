import { Router } from "express";
import {
  getReferrals,
  approveReferral,
  declineReferral,
  getUserReferrals
} from "../../controllers/v1/referral.controller";
import { isUserAuthenticated } from "../../middlewares/auth";
import { checkBlacklistedTokens } from "../../middlewares/checkBlacklistedToken";

const referralRouterV1 = Router();

referralRouterV1.use(checkBlacklistedTokens, isUserAuthenticated);

// Referral Endpoints
referralRouterV1.get("/", getReferrals);
referralRouterV1.post("/approve", approveReferral);
referralRouterV1.post("/decline", declineReferral);
referralRouterV1.get("/user/:userId", getUserReferrals);

export default referralRouterV1;