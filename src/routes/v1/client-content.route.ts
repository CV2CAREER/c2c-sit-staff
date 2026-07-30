import { Router } from "express";
import { checkBlacklistedTokens } from "@/middlewares/checkBlacklistedToken";
import { isUserAuthenticated } from "@/middlewares/auth";
import { authorizeRoles } from "@/middlewares/authorizeRoles";
import {
  getClientContentSectionByKey,
  getClientContentSections,
  updateClientContentSection,
} from "@/controllers/v1/client-content.controller";

const clientContentRouterV1 = Router();

clientContentRouterV1.use(
  checkBlacklistedTokens,
  isUserAuthenticated,
  authorizeRoles("admin", "assistant"),
);

clientContentRouterV1.get("/", getClientContentSections);
clientContentRouterV1.get("/:key", getClientContentSectionByKey);

// Only the business owns this copy, so assistants read but never write.
clientContentRouterV1.patch(
  "/:id",
  authorizeRoles("admin"),
  updateClientContentSection,
);

export default clientContentRouterV1;
