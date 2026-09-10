import { Router } from "express";
import { getCECSalesOutreachs, getCECClientsWithSalesOutreachs, getCECSalesOutreachById, getCECSalesOutreachStats, createCECSalesOutreach, updateCECSalesOutreach, deleteCECSalesOutreach } from "../../controllers/v1/cec-sales-outreach.controller";
import { checkBlacklistedTokens } from "../../middlewares/checkBlacklistedToken";
import { isUserAuthenticated } from "../../middlewares/auth";
import { authorizeRoles } from "../../middlewares/authorizeRoles";

const cecSalesOutreachRouterV1 = Router();
cecSalesOutreachRouterV1.use(checkBlacklistedTokens, isUserAuthenticated, authorizeRoles("admin", "cec"));

cecSalesOutreachRouterV1.get("/", getCECSalesOutreachs);
cecSalesOutreachRouterV1.get("/clients-with-logs", getCECClientsWithSalesOutreachs);
cecSalesOutreachRouterV1.get("/stats", getCECSalesOutreachStats);
cecSalesOutreachRouterV1.get("/:id", getCECSalesOutreachById);
cecSalesOutreachRouterV1.post("/", createCECSalesOutreach);
cecSalesOutreachRouterV1.put("/:id", updateCECSalesOutreach);
cecSalesOutreachRouterV1.delete("/:id", deleteCECSalesOutreach);

export default cecSalesOutreachRouterV1;
