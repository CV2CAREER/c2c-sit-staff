import { Router } from "express";
import {
  getCvRevamps,
  getCvRevampById,
  createCvRevamp,
  updateCvRevampStatus,
  deleteCvRevamp,
} from "../../controllers/v1/cv-revamp.controller";
import { isUserAuthenticated } from "../../middlewares/auth";
import { checkBlacklistedTokens } from "../../middlewares/checkBlacklistedToken";
import { authorizeRoles } from "../../middlewares/authorizeRoles";

const cvRevampRouterV1 = Router();

// All routes require authentication and admin/assistant role
cvRevampRouterV1.use(
  checkBlacklistedTokens,
  isUserAuthenticated,
  authorizeRoles("admin", "assistant")
);

// GET /api/v1/admin/cv-revamp - Get all revamps or filter by docId/userId
cvRevampRouterV1.get("/", getCvRevamps);

// GET /api/v1/admin/cv-revamp/:id - Get single revamp
cvRevampRouterV1.get("/:id", getCvRevampById);

// POST /api/v1/admin/cv-revamp - Create new revamp
cvRevampRouterV1.post("/", createCvRevamp);

// PATCH /api/v1/admin/cv-revamp - Update revamp status (approve/decline)
cvRevampRouterV1.patch("/", updateCvRevampStatus);

// DELETE /api/v1/admin/cv-revamp/:id - Delete revamp
cvRevampRouterV1.delete("/:id", deleteCvRevamp);

export default cvRevampRouterV1;
