import { Router } from "express";
import { getAuditTrail } from "../../controllers/v1/audit-trail.controller";
import { setPasskey, verifyPasskey } from "../../controllers/v1/passkey-vault.controller";
import { isUserAuthenticated } from "../../middlewares/auth";
import { checkBlacklistedTokens } from "../../middlewares/checkBlacklistedToken";

const auditTrailRouterV1 = Router();

auditTrailRouterV1.get(
  "/",
  checkBlacklistedTokens,
  isUserAuthenticated,
  getAuditTrail,
);

auditTrailRouterV1.post(
  "/passkey",
  checkBlacklistedTokens,
  isUserAuthenticated,
  setPasskey,
);

auditTrailRouterV1.post(
  "/passkey/verify",
  checkBlacklistedTokens,
  verifyPasskey,
);

export default auditTrailRouterV1;
