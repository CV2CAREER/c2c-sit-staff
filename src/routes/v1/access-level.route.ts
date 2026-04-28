import { Router } from "express";
import { checkBlacklistedTokens } from "@/middlewares/checkBlacklistedToken";
import { isUserAuthenticated } from "@/middlewares/auth";
import { authorizeRoles } from "@/middlewares/authorizeRoles";
import {
  createAccessRule,
  deleteAccessRule,
  getAccessLevels,
  getAccessLevelsMasterPassword,
  getAccessLevelUsers,
  getUserAccessLevels,
  updateAccessLevelsMasterPassword,
  updateAccessRule,
  updateUserAccess,
} from "@/controllers/v1/access-level.controller";

const accessLevelRouterV1 = Router();

accessLevelRouterV1.use(
  checkBlacklistedTokens,
  isUserAuthenticated,
  authorizeRoles("admin", "assistant"),
);

accessLevelRouterV1.get("/", getAccessLevels);
accessLevelRouterV1.get("/users", getAccessLevelUsers);
accessLevelRouterV1.get("/users/:userId", getUserAccessLevels);
accessLevelRouterV1.get("/master-password", getAccessLevelsMasterPassword);

accessLevelRouterV1.patch(
  "/users",
  authorizeRoles("admin"),
  updateUserAccess,
);
accessLevelRouterV1.post(
  "/master-password",
  authorizeRoles("admin"),
  updateAccessLevelsMasterPassword,
);
accessLevelRouterV1.post(
  "/rules",
  authorizeRoles("admin"),
  createAccessRule,
);
accessLevelRouterV1.patch(
  "/rules/:id",
  authorizeRoles("admin"),
  updateAccessRule,
);
accessLevelRouterV1.delete(
  "/rules/:id",
  authorizeRoles("admin"),
  deleteAccessRule,
);

export default accessLevelRouterV1;

