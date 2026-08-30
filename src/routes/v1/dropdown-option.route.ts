import { Router } from "express";
import { checkBlacklistedTokens } from "@/middlewares/checkBlacklistedToken";
import { isUserAuthenticated } from "@/middlewares/auth";
import { authorizeRoles } from "@/middlewares/authorizeRoles";
import {
  getDropdownOptions,
  getDeletedDropdownOptions,
  getDropdownOption,
  createDropdownOption,
  updateDropdownOption,
  deleteDropdownOption,
  restoreDropdownOption,
  hardDeleteDropdownOption,
  reorderDropdownOptions,
} from "@/controllers/v1/dropdown-option.controller";

const dropdownOptionRouterV1 = Router();

dropdownOptionRouterV1.use(
  checkBlacklistedTokens,
  isUserAuthenticated,
  authorizeRoles("admin", "assistant"),
);

dropdownOptionRouterV1.get("/:listKey", getDropdownOptions);
dropdownOptionRouterV1.get("/:listKey/recycle-bin", getDeletedDropdownOptions);
dropdownOptionRouterV1.get("/item/:id", getDropdownOption);
dropdownOptionRouterV1.post("/:listKey", authorizeRoles("admin"), createDropdownOption);
dropdownOptionRouterV1.post("/:listKey/reorder", authorizeRoles("admin"), reorderDropdownOptions);
dropdownOptionRouterV1.post("/item/:id/restore", authorizeRoles("admin"), restoreDropdownOption);
dropdownOptionRouterV1.put("/item/:id", authorizeRoles("admin"), updateDropdownOption);
dropdownOptionRouterV1.delete("/item/:id", authorizeRoles("admin"), deleteDropdownOption);
dropdownOptionRouterV1.delete("/item/:id/permanent", authorizeRoles("admin"), hardDeleteDropdownOption);

export default dropdownOptionRouterV1;
