import { Router } from "express";
import { getCECIssueBurndowns, getCECClientsWithIssueBurndowns, getCECIssueBurndownById, getCECIssueBurndownStats, createCECIssueBurndown, updateCECIssueBurndown, deleteCECIssueBurndown } from "../../controllers/v1/cec-issue-burndown.controller";
import { checkBlacklistedTokens } from "../../middlewares/checkBlacklistedToken";
import { isUserAuthenticated } from "../../middlewares/auth";
import { authorizeRoles } from "../../middlewares/authorizeRoles";

const cecIssueBurndownRouterV1 = Router();
cecIssueBurndownRouterV1.use(checkBlacklistedTokens, isUserAuthenticated, authorizeRoles("admin", "cec"));

cecIssueBurndownRouterV1.get("/", getCECIssueBurndowns);
cecIssueBurndownRouterV1.get("/clients-with-logs", getCECClientsWithIssueBurndowns);
cecIssueBurndownRouterV1.get("/stats", getCECIssueBurndownStats);
cecIssueBurndownRouterV1.get("/:id", getCECIssueBurndownById);
cecIssueBurndownRouterV1.post("/", createCECIssueBurndown);
cecIssueBurndownRouterV1.put("/:id", updateCECIssueBurndown);
cecIssueBurndownRouterV1.delete("/:id", deleteCECIssueBurndown);

export default cecIssueBurndownRouterV1;
