import express from "express";
import { getCoachSessions } from "../../controllers/v1/coach-session.controller";
import { authorizeRoles } from "../../middlewares/authorizeRoles";
import { isUserAuthenticated } from "../../middlewares/auth";
import { checkBlacklistedTokens } from "../../middlewares/checkBlacklistedToken";
import { Role } from "../../utils/enum";

const coachRouterV1 = express.Router();

coachRouterV1.use(checkBlacklistedTokens, isUserAuthenticated, authorizeRoles(Role.COACH));

/**
 * Coach protected routes
 * Only users with COACH role can access these endpoints
 */
coachRouterV1.get("/sessions", getCoachSessions);

export default coachRouterV1;