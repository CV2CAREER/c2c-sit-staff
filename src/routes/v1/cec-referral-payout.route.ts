import { Router } from "express";
import { getCECReferralPayouts, getCECClientsWithReferralPayouts, getCECReferralPayoutById, getCECReferralPayoutStats, createCECReferralPayout, updateCECReferralPayout, deleteCECReferralPayout } from "../../controllers/v1/cec-referral-payout.controller";
import { checkBlacklistedTokens } from "../../middlewares/checkBlacklistedToken";
import { isUserAuthenticated } from "../../middlewares/auth";
import { authorizeRoles } from "../../middlewares/authorizeRoles";

const cecReferralPayoutRouterV1 = Router();
cecReferralPayoutRouterV1.use(checkBlacklistedTokens, isUserAuthenticated, authorizeRoles("admin", "assistant"));

cecReferralPayoutRouterV1.get("/", getCECReferralPayouts);
cecReferralPayoutRouterV1.get("/clients-with-logs", getCECClientsWithReferralPayouts);
cecReferralPayoutRouterV1.get("/stats", getCECReferralPayoutStats);
cecReferralPayoutRouterV1.get("/:id", getCECReferralPayoutById);
cecReferralPayoutRouterV1.post("/", createCECReferralPayout);
cecReferralPayoutRouterV1.put("/:id", updateCECReferralPayout);
cecReferralPayoutRouterV1.delete("/:id", deleteCECReferralPayout);

export default cecReferralPayoutRouterV1;
