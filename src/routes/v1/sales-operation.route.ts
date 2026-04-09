import { Router } from "express";
import {
  getSalesOperations,
  createSalesOperation,
  updateSalesOperation,
  deleteSalesOperation,
  exportSalesOperationCSV
} from "../../controllers/v1/sales-operation.controller";
import { isUserAuthenticated } from "../../middlewares/auth";
import { authorizeRoles } from "@/middlewares/authorizeRoles";
import { checkBlacklistedTokens } from "../../middlewares/checkBlacklistedToken";

const salesOperationRouterV1 = Router();

salesOperationRouterV1.use(checkBlacklistedTokens, isUserAuthenticated, authorizeRoles("admin", "assistance"));

salesOperationRouterV1.get("/", getSalesOperations);
salesOperationRouterV1.post("/", createSalesOperation);
salesOperationRouterV1.patch("/", updateSalesOperation);
salesOperationRouterV1.delete("/", deleteSalesOperation);
salesOperationRouterV1.get("/export", exportSalesOperationCSV);

export default salesOperationRouterV1;