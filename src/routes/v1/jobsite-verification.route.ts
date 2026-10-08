import { Router } from "express";
import { checkBlacklistedTokens } from "@/middlewares/checkBlacklistedToken";
import { isUserAuthenticated } from "@/middlewares/auth";
import { authorizeRoles } from "@/middlewares/authorizeRoles";
import { getServiceLogger } from "@/utils/createLogger";
import {
  listJobsiteVerifications,
  getClientJobsiteVerifications,
  getJobsiteRejectReasons,
  getJobsiteConfigs,
  verifyJobsiteVerification,
  rejectJobsiteVerification,
  exemptJobsiteVerification,
  unexemptJobsiteVerification,
  toggleJobsiteRequired,
  updateJobsiteVideoGuide,
  addJobsiteConfig,
} from "../../controllers/v1/jobsite-verification.controller";

const logger = getServiceLogger("jobsite-verification-route");
const jobsiteVerificationRouterV1 = Router();

jobsiteVerificationRouterV1.use((req, res, next) => {
  logger.info(
    `[JOBSITE-ROUTE-DEBUG] Entered router: method=${req.method} baseUrl=${req.baseUrl} url=${req.url} path=${req.path} originalUrl=${req.originalUrl}`
  );
  next();
});

jobsiteVerificationRouterV1.use(
  checkBlacklistedTokens,
  isUserAuthenticated,
  authorizeRoles("admin", "assistant", "superadmin", "placement"),
);

jobsiteVerificationRouterV1.use((req, res, next) => {
  logger.info(
    `[JOBSITE-ROUTE-DEBUG] Post-Auth router: method=${req.method} baseUrl=${req.baseUrl} url=${req.url} path=${req.path} originalUrl=${req.originalUrl}`
  );
  next();
});

// Queries
jobsiteVerificationRouterV1.get("/", (req, res, next) => {
  logger.info(`[JOBSITE-ROUTE-DEBUG] Matched GET /`);
  return listJobsiteVerifications(req, res, next);
});

jobsiteVerificationRouterV1.get("/reject-reasons", (req, res, next) => {
  logger.info(`[JOBSITE-ROUTE-DEBUG] Matched GET /reject-reasons`);
  return getJobsiteRejectReasons(req, res, next);
});

jobsiteVerificationRouterV1.get("/configs", (req, res, next) => {
  logger.info(`[JOBSITE-ROUTE-DEBUG] Matched GET /configs`);
  return getJobsiteConfigs(req, res, next);
});

jobsiteVerificationRouterV1.get("/client/:clientId", (req, res, next) => {
  logger.info(`[JOBSITE-ROUTE-DEBUG] Matched GET /client/:clientId (${req.params.clientId})`);
  return getClientJobsiteVerifications(req, res, next);
});

// Config Mutations
jobsiteVerificationRouterV1.post("/configs/add", (req, res, next) => {
  logger.info(`[JOBSITE-ROUTE-DEBUG] Matched POST /configs/add`);
  return addJobsiteConfig(req, res, next);
});

jobsiteVerificationRouterV1.post("/configs", (req, res, next) => {
  logger.info(`[JOBSITE-ROUTE-DEBUG] Matched POST /configs`);
  return addJobsiteConfig(req, res, next);
});

jobsiteVerificationRouterV1.post("/configs/toggle-required", (req, res, next) => {
  logger.info(`[JOBSITE-ROUTE-DEBUG] Matched POST /configs/toggle-required`);
  return toggleJobsiteRequired(req, res, next);
});

jobsiteVerificationRouterV1.patch("/configs/toggle-required", (req, res, next) => {
  logger.info(`[JOBSITE-ROUTE-DEBUG] Matched PATCH /configs/toggle-required`);
  return toggleJobsiteRequired(req, res, next);
});

jobsiteVerificationRouterV1.put("/configs/toggle-required", (req, res, next) => {
  logger.info(`[JOBSITE-ROUTE-DEBUG] Matched PUT /configs/toggle-required`);
  return toggleJobsiteRequired(req, res, next);
});

jobsiteVerificationRouterV1.post("/configs/video-guide", (req, res, next) => {
  logger.info(`[JOBSITE-ROUTE-DEBUG] Matched POST /configs/video-guide`);
  return updateJobsiteVideoGuide(req, res, next);
});

jobsiteVerificationRouterV1.put("/configs/video-guide", (req, res, next) => {
  logger.info(`[JOBSITE-ROUTE-DEBUG] Matched PUT /configs/video-guide`);
  return updateJobsiteVideoGuide(req, res, next);
});

// Exemption
jobsiteVerificationRouterV1.post("/exempt", (req, res, next) => {
  logger.info(`[JOBSITE-ROUTE-DEBUG] Matched POST /exempt`);
  return exemptJobsiteVerification(req, res, next);
});

jobsiteVerificationRouterV1.post("/unexempt", (req, res, next) => {
  logger.info(`[JOBSITE-ROUTE-DEBUG] Matched POST /unexempt`);
  return unexemptJobsiteVerification(req, res, next);
});

// Status Mutations (Parameterized :id)
jobsiteVerificationRouterV1.post("/:id/verify", (req, res, next) => {
  logger.info(`[JOBSITE-ROUTE-DEBUG] Matched POST /:id/verify (${req.params.id})`);
  return verifyJobsiteVerification(req, res, next);
});

jobsiteVerificationRouterV1.put("/:id/verify", (req, res, next) => {
  logger.info(`[JOBSITE-ROUTE-DEBUG] Matched PUT /:id/verify (${req.params.id})`);
  return verifyJobsiteVerification(req, res, next);
});

jobsiteVerificationRouterV1.post("/:id/reject", (req, res, next) => {
  logger.info(`[JOBSITE-ROUTE-DEBUG] Matched POST /:id/reject (${req.params.id})`);
  return rejectJobsiteVerification(req, res, next);
});

jobsiteVerificationRouterV1.put("/:id/reject", (req, res, next) => {
  logger.info(`[JOBSITE-ROUTE-DEBUG] Matched PUT /:id/reject (${req.params.id})`);
  return rejectJobsiteVerification(req, res, next);
});

export default jobsiteVerificationRouterV1;
