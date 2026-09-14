import { Router } from "express";
import { getCECAmbassadorScouts, getCECClientsWithAmbassadorScouts, getCECAmbassadorScoutById, getCECAmbassadorScoutStats, createCECAmbassadorScout, updateCECAmbassadorScout, deleteCECAmbassadorScout } from "../../controllers/v1/cec-ambassador-scout.controller";
import { checkBlacklistedTokens } from "../../middlewares/checkBlacklistedToken";
import { isUserAuthenticated } from "../../middlewares/auth";
import { authorizeRoles } from "../../middlewares/authorizeRoles";

const cecAmbassadorScoutRouterV1 = Router();
cecAmbassadorScoutRouterV1.use(checkBlacklistedTokens, isUserAuthenticated, authorizeRoles("admin", "assistant"));

cecAmbassadorScoutRouterV1.get("/", getCECAmbassadorScouts);
cecAmbassadorScoutRouterV1.get("/clients-with-logs", getCECClientsWithAmbassadorScouts);
cecAmbassadorScoutRouterV1.get("/stats", getCECAmbassadorScoutStats);
cecAmbassadorScoutRouterV1.get("/:id", getCECAmbassadorScoutById);
cecAmbassadorScoutRouterV1.post("/", createCECAmbassadorScout);
cecAmbassadorScoutRouterV1.put("/:id", updateCECAmbassadorScout);
cecAmbassadorScoutRouterV1.delete("/:id", deleteCECAmbassadorScout);

export default cecAmbassadorScoutRouterV1;
