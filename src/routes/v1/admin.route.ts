import { Router } from "express";
import {
  assignPlacementController,
  getAdminAnalytics,
  getAdminLocations,
  patchAdminLocationMultiplier,
  getAdminStatus,
  getAdminTableMetadata,
  getAdminThrottle,
  getAdminPricingPlans,
  patchAdminPricingPlan,
  getAdminUsers,
  getInFlightSubscriptions,
  getAdminUsersExportStatus,
  downloadAdminUsersExport,
  postAdminUsersExport,
  postAdminUsers,
  postAdminPrecheckEmail,
  patchAdminUserPersona,
  postAdminSendUserOtp,
  postAdminVerifyUserOtp,
  getPlacementControllers,
  getAdminSchemaTables,
  postAdminSchemaTable,
  deleteAdminSchemaTable,
  getSchemaColumns,
  patchAdminThrottle,
  deleteAdminThrottle,
  patchAdminBotToggle,
  postSchemaExpandColumn,
  unassignPlacementController,
  deleteSchemaColumn,
} from "../../controllers/v1/admin.controller";

import { generateExternalPassword } from "../../controllers/v1/generate-password.controller";
import { isUserAuthenticated } from "../../middlewares/auth";
import { checkBlacklistedTokens } from "../../middlewares/checkBlacklistedToken";
import { campaignCalculatorMiddleware } from "../../middlewares/campaign.middleware";
import { authorizeRoles } from "@/middlewares/authorizeRoles";
import {
  countApplications,
  toggleAggregatorStatus,
} from "../../controllers/v1/count-applications.controller";

import { getAllCredentials } from "../../controllers/v1/get_clients.controller";
import {
  getCampaignSheet,
  patchCampaignSheet,
  putCampaignSheet,
} from "../../controllers/v1/campaign-sheets.controller";
import { updateKeywordsController } from "../../controllers/v1/update-keywords.controller";
import { updateUserPlanByFeatureController, confirmUserProgressController, activateCoralPlanController, deactivateCoralPlanController, generateAmbassadorLinkController, getUserPlanSummaryController, extendUserPlanController } from "../../controllers/v1/admin-plan.controller";
import { discoveryQueueController } from "../../controllers/v1/loadbalancer.controller";

import { getSamplesController } from "../../controllers/v1/samples.controller";
import { getCredentialAliasesController } from "../../controllers/v1/credential-alias.controller";
import { aiPromptController } from "@/controllers/v1/ai-prompt.controller";
import { aiPromptQueueController } from "@/controllers/v1/ai-prompt-queue.controller";

import { aiSimulationController } from "@/controllers/v1/ai-simulation.controller";
import { aiPromptVcsController } from "@/controllers/v1/ai-prompt-vcs.controller";
import vcsPromptRouterV1 from "./vcs-prompt.route";
import { supportAiPromptController } from "@/controllers/v1/support-ai-prompt.controller";
import applicationRouterV1 from "./application.route";
import interviewPrepRouterV1 from "./interview-prep.route";
import { jcTriggerController } from "@/controllers/v1/jc-trigger.controller";
import {
  getJobPreferencesController,
  putJobPreferencesController,
  getSheetTemplatesController,
  getUsersFullNameController,
} from "@/controllers/v1/job-preferences.controller";
import {
  createPromotion,
  deletePromotion,
  getPromotions,
  updatePromotionLength,
} from "../../controllers/v1/promotion.controller";
import {
  createBlogPost,
  deleteBlogPost,
  getBlogPostById,
  getBlogPosts,
  getBlogStats,
  updateBlogPost,
} from "../../controllers/v1/blog.controller";
import { chatbotLogsController } from "@/controllers/v1/chatbot-logs.controller";
import {
  exportLogsToCsv,
  getLogs,
} from "@/controllers/v1/logs.controller";
import {
  getAllViewAsRules,
  upsertViewAsRuleByPersona,
} from "@/controllers/v1/view-as-rules.controller";
import clientSampleRouterV1 from "./client-sample.route";
import trainingTrackerRouterV1 from "./training-tracker.route";
import crTrackingRouterV1 from "./cr-tracking.route";
import crEOTRouterV1 from "./cr-eot.route";
import adminAiVettingRouterV1 from "./admin-ai-vetting.route";
import adminDocumentRouterV1 from "./admin-document.route";
import supportRouterV1 from "./support.route";
import accessLevelRouterV1 from "./access-level.route";
import communicationTemplateRouterV1 from "./communication-template.route";
import clientContentRouterV1 from "./client-content.route";
import clientAllocationRouterV1 from "./client-allocation.route";
import discoveryTrackerRouterV1 from "./discovery-tracker.route";
const adminRouterV1 = Router();

// Baseline role gates for routes defined directly in this file: GET reads are
// open to admin + assistant; everything else (create/update/delete) is
// admin-only. The few exceptions that should stay assistant-accessible on a
// non-GET verb live on the /applications sub-router (out of scope here) —
// nothing defined directly in this file touches the application/manual
// application tables, so no carve-out is needed below.
const readAccess = authorizeRoles("admin", "assistant");
const writeAccess = authorizeRoles("admin");
// For routes registered with .all() (one handler shared across every HTTP
// verb) — read the method at request time and apply the matching gate.
const readOrWriteAccess = (req: any, res: any, next: any) =>
  (req.method === "GET" ? readAccess : writeAccess)(req, res, next);

adminRouterV1.use("/client-sample", clientSampleRouterV1);

adminRouterV1.get(
  "/jc-triggers",
  checkBlacklistedTokens,
  isUserAuthenticated,
  readAccess,
  jcTriggerController,
);

adminRouterV1.put(
  "/jc-triggers",
  checkBlacklistedTokens,
  isUserAuthenticated,
  writeAccess,
  jcTriggerController,
);

adminRouterV1.use("/applications", applicationRouterV1);
adminRouterV1.use("/interview-prep", interviewPrepRouterV1);
adminRouterV1.use(
  "/ai-vetting",
  checkBlacklistedTokens,
  isUserAuthenticated,
  adminAiVettingRouterV1,
);
adminRouterV1.use(
  "/prompts",
  checkBlacklistedTokens,
  isUserAuthenticated,
  vcsPromptRouterV1,
);
adminRouterV1.use(
  "/training-tracker",
  trainingTrackerRouterV1,
);
adminRouterV1.use(
  "/trackers/cr/eot",
  crEOTRouterV1,
);
adminRouterV1.use(
  "/trackers/cr",
  crTrackingRouterV1,
);
adminRouterV1.use(
  "/support",
  checkBlacklistedTokens,
  isUserAuthenticated,
  authorizeRoles("admin"),
  supportRouterV1,
);
adminRouterV1.use(
  "/access-levels",
  accessLevelRouterV1,
);
adminRouterV1.use(
  "/templates",
  communicationTemplateRouterV1,
);
adminRouterV1.use(
  "/client-content",
  clientContentRouterV1,
);
adminRouterV1.use("/documents", adminDocumentRouterV1);
adminRouterV1.all(
  "/support-ai-prompt",
  checkBlacklistedTokens,
  isUserAuthenticated,
  readOrWriteAccess,
  supportAiPromptController,
);
adminRouterV1.all(
  "/chatbot/train",
  checkBlacklistedTokens,
  isUserAuthenticated,
  authorizeRoles("admin"),
  supportAiPromptController,
);
adminRouterV1.get(
  "/chatbot/logs",
  checkBlacklistedTokens,
  isUserAuthenticated,
  authorizeRoles("admin"),
  chatbotLogsController,
);
adminRouterV1.get(
  "/persona-rules",
  checkBlacklistedTokens,
  isUserAuthenticated,
  authorizeRoles("admin"),
  getAllViewAsRules,
);
adminRouterV1.put(
  "/persona-rules",
  checkBlacklistedTokens,
  isUserAuthenticated,
  authorizeRoles("admin"),
  upsertViewAsRuleByPersona,
);
adminRouterV1.get(
  "/system/logs",
  checkBlacklistedTokens,
  isUserAuthenticated,
  authorizeRoles("admin"),
  getLogs,
);
adminRouterV1.get(
  "/system/logs/export/csv",
  checkBlacklistedTokens,
  isUserAuthenticated,
  authorizeRoles("admin"),
  exportLogsToCsv,
);

adminRouterV1.all(
  "/ai-prompt-vcs",
  checkBlacklistedTokens,
  isUserAuthenticated,
  readOrWriteAccess,
  aiPromptVcsController,
);

adminRouterV1.all(
  "/ai-simulation",
  checkBlacklistedTokens,
  isUserAuthenticated,
  readOrWriteAccess,
  aiSimulationController,
);

adminRouterV1.all(
  "/ai-prompt-queue",
  checkBlacklistedTokens,
  isUserAuthenticated,
  readOrWriteAccess,
  aiPromptQueueController,
);
adminRouterV1.all(
  "/ai-prompts",
  checkBlacklistedTokens,
  isUserAuthenticated,
  readOrWriteAccess,
  aiPromptController,
);
adminRouterV1.get(
  "/credential-alias",
  checkBlacklistedTokens,
  isUserAuthenticated,
  readAccess,
  getCredentialAliasesController,
);

adminRouterV1.get(
  "/samples",
  checkBlacklistedTokens,
  isUserAuthenticated,
  readAccess,
  getSamplesController,
);

adminRouterV1.get(
  "/discovery-queue",
  checkBlacklistedTokens,
  isUserAuthenticated,
  readAccess,
  discoveryQueueController,
);

adminRouterV1.get(
  "/job-preferences",
  checkBlacklistedTokens,
  isUserAuthenticated,
  readAccess,
  getJobPreferencesController,
);

adminRouterV1.put(
  "/job-preferences",
  checkBlacklistedTokens,
  isUserAuthenticated,
  writeAccess,
  putJobPreferencesController,
);

adminRouterV1.get(
  "/sheets/templates",
  checkBlacklistedTokens,
  isUserAuthenticated,
  readAccess,
  getSheetTemplatesController,
);

adminRouterV1.get(
  "/users/full-name",
  checkBlacklistedTokens,
  isUserAuthenticated,
  readAccess,
  getUsersFullNameController,
);

adminRouterV1.post(
  "/keywords/update",
  checkBlacklistedTokens,
  isUserAuthenticated,
  writeAccess,
  updateKeywordsController,
);

adminRouterV1.get(
  "/campaign/sheet",
  checkBlacklistedTokens,
  isUserAuthenticated,
  readAccess,
  getCampaignSheet,
);

adminRouterV1.patch(
  "/campaign/sheet",
  checkBlacklistedTokens,
  isUserAuthenticated,
  writeAccess,
  patchCampaignSheet,
);

adminRouterV1.put(
  "/campaign/sheet",
  checkBlacklistedTokens,
  isUserAuthenticated,
  writeAccess,
  putCampaignSheet,
);

adminRouterV1.get(
  "/credentials",
  checkBlacklistedTokens,
  isUserAuthenticated,
  readAccess,
  getAllCredentials,
);
adminRouterV1.get(
  "/locations",
  checkBlacklistedTokens,
  isUserAuthenticated,
  readAccess,
  getAdminLocations,
);
adminRouterV1.patch(
  "/locations",
  checkBlacklistedTokens,
  isUserAuthenticated,
  writeAccess,
  patchAdminLocationMultiplier,
);
adminRouterV1.get(
  "/pricing",
  checkBlacklistedTokens,
  isUserAuthenticated,
  readAccess,
  getAdminPricingPlans,
);
adminRouterV1.patch(
  "/pricing",
  checkBlacklistedTokens,
  isUserAuthenticated,
  writeAccess,
  patchAdminPricingPlan,
);
adminRouterV1.get(
  "/promos",
  checkBlacklistedTokens,
  isUserAuthenticated,
  readAccess,
  getPromotions,
);
adminRouterV1.post(
  "/promos",
  checkBlacklistedTokens,
  isUserAuthenticated,
  writeAccess,
  createPromotion,
);
adminRouterV1.patch(
  "/promos",
  checkBlacklistedTokens,
  isUserAuthenticated,
  writeAccess,
  updatePromotionLength,
);
adminRouterV1.delete(
  "/promos",
  checkBlacklistedTokens,
  isUserAuthenticated,
  writeAccess,
  deletePromotion,
);
adminRouterV1.get(
  "/blog",
  checkBlacklistedTokens,
  isUserAuthenticated,
  readAccess,
  getBlogPosts,
);
adminRouterV1.post(
  "/blog",
  checkBlacklistedTokens,
  isUserAuthenticated,
  writeAccess,
  createBlogPost,
);
adminRouterV1.patch(
  "/blog",
  checkBlacklistedTokens,
  isUserAuthenticated,
  writeAccess,
  updateBlogPost,
);
adminRouterV1.delete(
  "/blog",
  checkBlacklistedTokens,
  isUserAuthenticated,
  writeAccess,
  deleteBlogPost,
);
adminRouterV1.get(
  "/blog/id",
  checkBlacklistedTokens,
  isUserAuthenticated,
  readAccess,
  getBlogPostById,
);
adminRouterV1.get(
  "/blog/stats",
  checkBlacklistedTokens,
  isUserAuthenticated,
  readAccess,
  getBlogStats,
);
adminRouterV1.get(
  "/pricing-plans",
  checkBlacklistedTokens,
  isUserAuthenticated,
  readAccess,
  getAdminPricingPlans,
);

adminRouterV1.get(
  "/analytics",
  checkBlacklistedTokens,
  isUserAuthenticated,
  readAccess,
  getAdminAnalytics,
);
adminRouterV1.get(
  "/campaign",
  checkBlacklistedTokens,
  isUserAuthenticated,
  readAccess,
  // async (req, res) => {
  //   // Return empty campaigns array or fetch from database
  //   res.json({
  //     success: true,
  //     data: {
  //       campaigns: [],
  //       total: 0,
  //     },
  //   });
  // },
);
adminRouterV1.post(
  "/campaign",
  checkBlacklistedTokens,
  isUserAuthenticated,
  writeAccess,
  campaignCalculatorMiddleware,
  async (req, res) => {
    res.json(req.body);
  },
);

adminRouterV1.post(
  "/campaign/sheet/count-applications",
  checkBlacklistedTokens,
  isUserAuthenticated,
  writeAccess,
  countApplications,
);

adminRouterV1.put(
  "/campaign/sheet/count-applications",
  checkBlacklistedTokens,
  isUserAuthenticated,
  writeAccess,
  toggleAggregatorStatus,
);

adminRouterV1.get(
  "/status",
  checkBlacklistedTokens,
  isUserAuthenticated,
  readAccess,
  getAdminStatus,
);
adminRouterV1.patch(
  "/bot-toggle",
  checkBlacklistedTokens,
  isUserAuthenticated,
  writeAccess,
  patchAdminBotToggle,
);
adminRouterV1.get(
  "/throttle",
  checkBlacklistedTokens,
  isUserAuthenticated,
  readAccess,
  getAdminThrottle,
);
adminRouterV1.patch(
  "/throttle",
  checkBlacklistedTokens,
  isUserAuthenticated,
  writeAccess,
  patchAdminThrottle,
);
adminRouterV1.delete(
  "/throttle",
  checkBlacklistedTokens,
  isUserAuthenticated,
  writeAccess,
  deleteAdminThrottle,
);
adminRouterV1.get(
  "/schema",
  checkBlacklistedTokens,
  isUserAuthenticated,
  readAccess,
  getAdminSchemaTables,
);
adminRouterV1.post(
  "/schema",
  checkBlacklistedTokens,
  isUserAuthenticated,
  writeAccess,
  postAdminSchemaTable,
);
adminRouterV1.delete(
  "/schema/:table",
  checkBlacklistedTokens,
  isUserAuthenticated,
  writeAccess,
  deleteAdminSchemaTable,
);
adminRouterV1.get(
  "/schema/:tableName/columns",
  checkBlacklistedTokens,
  isUserAuthenticated,
  readAccess,
  getSchemaColumns,
);
adminRouterV1.post(
  "/schema/expand",
  checkBlacklistedTokens,
  isUserAuthenticated,
  writeAccess,
  postSchemaExpandColumn,
);
adminRouterV1.delete(
  "/schema/:tableName/columns/:columnName",
  checkBlacklistedTokens,
  isUserAuthenticated,
  writeAccess,
  deleteSchemaColumn,
);
adminRouterV1.get(
  "/table-metadata/:tableName",
  checkBlacklistedTokens,
  isUserAuthenticated,
  readAccess,
  getAdminTableMetadata,
);
adminRouterV1.get(
  "/users",
  checkBlacklistedTokens,
  isUserAuthenticated,
  readAccess,
  getAdminUsers,
);
adminRouterV1.post(
  "/users",
  checkBlacklistedTokens,
  isUserAuthenticated,
  writeAccess,
  postAdminUsers,
);
adminRouterV1.post(
  "/users/precheck-email",
  checkBlacklistedTokens,
  isUserAuthenticated,
  writeAccess,
  postAdminPrecheckEmail,
);
adminRouterV1.patch(
  "/users/persona",
  checkBlacklistedTokens,
  isUserAuthenticated,
  writeAccess,
  patchAdminUserPersona,
);

adminRouterV1.post(
  "/users/:userId/send-otp",
  checkBlacklistedTokens,
  isUserAuthenticated,
  writeAccess,
  postAdminSendUserOtp,
);
adminRouterV1.post(
  "/users/:userId/verify-otp",
  checkBlacklistedTokens,
  isUserAuthenticated,
  writeAccess,
  postAdminVerifyUserOtp,
);
adminRouterV1.patch(
  "/users/:userId/plan",
  checkBlacklistedTokens,
  isUserAuthenticated,
  writeAccess,
  updateUserPlanByFeatureController,
);
adminRouterV1.get(
  "/users/:userId/plan",
  checkBlacklistedTokens,
  isUserAuthenticated,
  readAccess,
  getUserPlanSummaryController,
);
adminRouterV1.patch(
  "/users/:userId/plan/extend",
  checkBlacklistedTokens,
  isUserAuthenticated,
  writeAccess,
  extendUserPlanController,
);
adminRouterV1.post(
  "/users/:userId/activate-coral",
  checkBlacklistedTokens,
  isUserAuthenticated,
  writeAccess,
  activateCoralPlanController,
);
adminRouterV1.delete(
  "/users/:userId/activate-coral",
  checkBlacklistedTokens,
  isUserAuthenticated,
  writeAccess,
  deactivateCoralPlanController,
);

adminRouterV1.get(
  "/ambassador/generate-link/:userId",
  checkBlacklistedTokens,
  isUserAuthenticated,
  readAccess,
  generateAmbassadorLinkController,
);

adminRouterV1.patch(
  "/users/:userId/progress",
  checkBlacklistedTokens,
  isUserAuthenticated,
  writeAccess,
  confirmUserProgressController,
);
adminRouterV1.post(
  "/users/export",
  checkBlacklistedTokens,
  isUserAuthenticated,
  writeAccess,
  postAdminUsersExport,
);
adminRouterV1.get(
  "/users/export/:taskId",
  checkBlacklistedTokens,
  isUserAuthenticated,
  readAccess,
  getAdminUsersExportStatus,
);
adminRouterV1.get(
  "/users/export/:taskId/download",
  checkBlacklistedTokens,
  isUserAuthenticated,
  readAccess,
  downloadAdminUsersExport,
);
adminRouterV1.get(
  "/in-flight",
  checkBlacklistedTokens,
  isUserAuthenticated,
  readAccess,
  getInFlightSubscriptions,
);
adminRouterV1.get(
  "/in-flight/staff",
  checkBlacklistedTokens,
  isUserAuthenticated,
  readAccess,
  getPlacementControllers,
);
adminRouterV1.post(
  "/in-flight/assign",
  checkBlacklistedTokens,
  isUserAuthenticated,
  writeAccess,
  assignPlacementController,
);
adminRouterV1.patch(
  "/in-flight/:planId/unassign",
  checkBlacklistedTokens,
  isUserAuthenticated,
  writeAccess,
  unassignPlacementController,
);

adminRouterV1.post(
  "/generate-password",
  checkBlacklistedTokens,
  isUserAuthenticated,
  writeAccess,
  generateExternalPassword,
);

adminRouterV1.use(
  "/discovery-tracker",
  checkBlacklistedTokens,
  isUserAuthenticated,
  discoveryTrackerRouterV1,
);

adminRouterV1.use("/", clientAllocationRouterV1);
export default adminRouterV1;
