import { Router } from "express";
import {
  getInterviewQnA,
  softDeleteInterviewQnA,
  restoreInterviewQnA,
  permanentDeleteInterviewQnA,
} from "../../controllers/v1/interview-prep.controller";
import { isUserAuthenticated } from "../../middlewares/auth";
import { checkBlacklistedTokens } from "../../middlewares/checkBlacklistedToken";
import { authorizeRoles } from "@/middlewares/authorizeRoles";

const interviewPrepRouterV1 = Router();

interviewPrepRouterV1.use(checkBlacklistedTokens, isUserAuthenticated);

// Interview Q&A Endpoints
interviewPrepRouterV1.get("/", getInterviewQnA);
interviewPrepRouterV1.delete("/:prepId", authorizeRoles("admin"), softDeleteInterviewQnA);
interviewPrepRouterV1.patch("/:prepId/restore", authorizeRoles("admin"), restoreInterviewQnA);
interviewPrepRouterV1.delete("/:prepId/permanent", authorizeRoles("admin"), permanentDeleteInterviewQnA);

export default interviewPrepRouterV1;
