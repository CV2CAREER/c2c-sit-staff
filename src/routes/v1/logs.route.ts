import { Router } from "express";
import { getLogs, exportLogsToCsv } from "../../controllers/v1/logs.controller";
import { isUserAuthenticated } from "../../middlewares/auth";
import { authorizeRoles } from "../../middlewares/authorizeRoles";
import { checkBlacklistedTokens } from "../../middlewares/checkBlacklistedToken";

const logsRouterV1 = Router();

// Protected admin routes
logsRouterV1.use(checkBlacklistedTokens, isUserAuthenticated, authorizeRoles("admin"));

logsRouterV1.get("/", getLogs);
logsRouterV1.get("/export/csv", exportLogsToCsv);

export default logsRouterV1;