import { Router } from "express";
import { getCECComplaints, getCECClientsWithComplaints, getCECComplaintById, getCECComplaintStats, createCECComplaint, updateCECComplaint, deleteCECComplaint } from "../../controllers/v1/cec-complaint.controller";
import { checkBlacklistedTokens } from "../../middlewares/checkBlacklistedToken";
import { isUserAuthenticated } from "../../middlewares/auth";
import { authorizeRoles } from "../../middlewares/authorizeRoles";

const cecComplaintRouterV1 = Router();
cecComplaintRouterV1.use(checkBlacklistedTokens, isUserAuthenticated, authorizeRoles("admin", "assistant"));

cecComplaintRouterV1.get("/", getCECComplaints);
cecComplaintRouterV1.get("/clients-with-logs", getCECClientsWithComplaints);
cecComplaintRouterV1.get("/stats", getCECComplaintStats);
cecComplaintRouterV1.get("/:id", getCECComplaintById);
cecComplaintRouterV1.post("/", createCECComplaint);
cecComplaintRouterV1.put("/:id", updateCECComplaint);
cecComplaintRouterV1.delete("/:id", deleteCECComplaint);

export default cecComplaintRouterV1;
