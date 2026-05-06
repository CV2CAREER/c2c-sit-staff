import { Router } from "express";
import { getClientAllocation } from "../../controllers/v1/client-allocation.controller";

const clientAllocationRouterV1 = Router();

// No authentication - for testing only
clientAllocationRouterV1.get("/client-allocation", getClientAllocation);

export default clientAllocationRouterV1;
