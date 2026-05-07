import { Router } from "express";
import {
  getInterviewQnA,
  softDeleteInterviewQnA,
  restoreInterviewQnA,
  permanentDeleteInterviewQnA,
} from "../../controllers/v1/interview-prep.controller";
import { isUserAuthenticated } from "../../middlewares/auth";
import { checkBlacklistedTokens } from "../../middlewares/checkBlacklistedToken";

const interviewPrepRouterV1 = Router();

interviewPrepRouterV1.use(checkBlacklistedTokens, isUserAuthenticated);

// Interview Q&A Endpoints
interviewPrepRouterV1.get("/", getInterviewQnA);
interviewPrepRouterV1.delete("/:prepId", softDeleteInterviewQnA);
interviewPrepRouterV1.patch("/:prepId/restore", restoreInterviewQnA);
interviewPrepRouterV1.delete("/:prepId/permanent", permanentDeleteInterviewQnA);

export default interviewPrepRouterV1;
