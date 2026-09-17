import { Router } from "express";
import { getCECDailyLogs, getCECClientsWithLogs, getCECDailyLogById, getCECDailyLogStats, createCECDailyLog, updateCECDailyLog, deleteCECDailyLog } from "../../controllers/v1/cec-daily-log.controller";
import { checkBlacklistedTokens } from "../../middlewares/checkBlacklistedToken";
import { isUserAuthenticated } from "../../middlewares/auth";
import { authorizeRoles } from "../../middlewares/authorizeRoles";

const cecDailyLogRouterV1 = Router();
cecDailyLogRouterV1.use(checkBlacklistedTokens, isUserAuthenticated, authorizeRoles("admin", "assistant"));

cecDailyLogRouterV1.get("/", getCECDailyLogs);
cecDailyLogRouterV1.get("/clients-with-logs", getCECClientsWithLogs);
cecDailyLogRouterV1.get("/stats", getCECDailyLogStats);
cecDailyLogRouterV1.get("/:id", getCECDailyLogById);
cecDailyLogRouterV1.post("/", createCECDailyLog);
cecDailyLogRouterV1.put("/:id", updateCECDailyLog);
cecDailyLogRouterV1.delete("/:id", deleteCECDailyLog);

export default cecDailyLogRouterV1;
