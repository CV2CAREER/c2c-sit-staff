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
  patchAdminUserPersona,
  getPlacementControllers,
  getSchemaColumns,
  patchAdminThrottle,
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
import { discoveryQueueController } from "../../controllers/v1/loadbalancer.controller";

import { getSamplesController } from "../../controllers/v1/samples.controller";
import { getCredentialAliasesController } from "../../controllers/v1/credential-alias.controller";
import { aiPromptController } from "@/controllers/v1/ai-prompt.controller";
import { aiPromptQueueController } from "@/controllers/v1/ai-prompt-queue.controller";

import { aiSimulationController } from "@/controllers/v1/ai-simulation.controller";
import { aiPromptVcsController } from "@/controllers/v1/ai-prompt-vcs.controller";
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
import adminAiRouterV1 from "./admin-ai.route";
import adminDocumentRouterV1 from "./admin-document.route";
import supportRouterV1 from "./support.route";
import accessLevelRouterV1 from "./access-level.route";
import communicationTemplateRouterV1 from "./communication-template.route";
import clientAllocationRouterV1 from "./client-allocation.route";
const adminRouterV1 = Router();

adminRouterV1.use("/client-sample", clientSampleRouterV1);

adminRouterV1.get(
  "/jc-triggers",
  checkBlacklistedTokens,
  isUserAuthenticated,
  jcTriggerController,
);

adminRouterV1.put(
  "/jc-triggers",
  checkBlacklistedTokens,
  isUserAuthenticated,
  jcTriggerController, 
);

adminRouterV1.use("/applications", applicationRouterV1);
adminRouterV1.use("/interview-prep", interviewPrepRouterV1);
adminRouterV1.use(
  "/ai",
  checkBlacklistedTokens,
  isUserAuthenticated,
  adminAiRouterV1,
);
adminRouterV1.use(
  "/prompts",
  checkBlacklistedTokens,
  isUserAuthenticated,
  adminAiRouterV1,
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
adminRouterV1.use("/documents", adminDocumentRouterV1);
adminRouterV1.all(
  "/support-ai-prompt",
  checkBlacklistedTokens,
  isUserAuthenticated,
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
  aiPromptVcsController,
);

adminRouterV1.all(
  "/ai-simulation",
  checkBlacklistedTokens,
  isUserAuthenticated,
  aiSimulationController,
);

adminRouterV1.all(
  "/ai-prompt-queue",
  checkBlacklistedTokens,
  isUserAuthenticated,
  aiPromptQueueController,
);
adminRouterV1.all(
  "/ai-prompts",
  checkBlacklistedTokens,
  isUserAuthenticated,
  aiPromptController,
);
adminRouterV1.get(
  "/credential-alias",
  checkBlacklistedTokens,
  isUserAuthenticated,
  getCredentialAliasesController,
);

adminRouterV1.get(
  "/samples",
  checkBlacklistedTokens,
  isUserAuthenticated,
  getSamplesController,
);

adminRouterV1.get(
  "/discovery-queue",
  checkBlacklistedTokens,
  isUserAuthenticated,
  discoveryQueueController,
);

adminRouterV1.get(
  "/job-preferences",
  checkBlacklistedTokens,
  isUserAuthenticated,
  getJobPreferencesController,
);

adminRouterV1.put(
  "/job-preferences",
  checkBlacklistedTokens,
  isUserAuthenticated,
  putJobPreferencesController,
);

adminRouterV1.get(
  "/sheets/templates",
  checkBlacklistedTokens,
  isUserAuthenticated,
  getSheetTemplatesController,
);

adminRouterV1.get(
  "/users/full-name",
  checkBlacklistedTokens,
  isUserAuthenticated,
  getUsersFullNameController,
);

adminRouterV1.post(
  "/keywords/update",
  checkBlacklistedTokens,
  isUserAuthenticated,
  updateKeywordsController,
);

adminRouterV1.get(
  "/campaign/sheet",
  checkBlacklistedTokens,
  isUserAuthenticated,
  getCampaignSheet,
);

adminRouterV1.patch(
  "/campaign/sheet",
  checkBlacklistedTokens,
  isUserAuthenticated,
  patchCampaignSheet,
);

adminRouterV1.put(
  "/campaign/sheet",
  checkBlacklistedTokens,
  isUserAuthenticated,
  putCampaignSheet,
);

adminRouterV1.get(
  "/credentials",
  checkBlacklistedTokens,
  isUserAuthenticated,
  getAllCredentials,
);
adminRouterV1.get(
  "/locations",
  checkBlacklistedTokens,
  isUserAuthenticated,
  getAdminLocations,
);
adminRouterV1.patch(
  "/locations",
  checkBlacklistedTokens,
  isUserAuthenticated,
  patchAdminLocationMultiplier,
);
adminRouterV1.get(
  "/pricing",
  checkBlacklistedTokens,
  isUserAuthenticated,
  getAdminPricingPlans,
);
adminRouterV1.patch(
  "/pricing",
  checkBlacklistedTokens,
  isUserAuthenticated,
  patchAdminPricingPlan,
);
adminRouterV1.get(
  "/promos",
  checkBlacklistedTokens,
  isUserAuthenticated,
  getPromotions,
);
adminRouterV1.post(
  "/promos",
  checkBlacklistedTokens,
  isUserAuthenticated,
  createPromotion,
);
adminRouterV1.patch(
  "/promos",
  checkBlacklistedTokens,
  isUserAuthenticated,
  updatePromotionLength,
);
adminRouterV1.delete(
  "/promos",
  checkBlacklistedTokens,
  isUserAuthenticated,
  deletePromotion,
);
adminRouterV1.get(
  "/blog",
  checkBlacklistedTokens,
  isUserAuthenticated,
  getBlogPosts,
);
adminRouterV1.post(
  "/blog",
  checkBlacklistedTokens,
  isUserAuthenticated,
  createBlogPost,
);
adminRouterV1.patch(
  "/blog",
  checkBlacklistedTokens,
  isUserAuthenticated,
  updateBlogPost,
);
adminRouterV1.delete(
  "/blog",
  checkBlacklistedTokens,
  isUserAuthenticated,
  deleteBlogPost,
);
adminRouterV1.get(
  "/blog/id",
  checkBlacklistedTokens,
  isUserAuthenticated,
  getBlogPostById,
);
adminRouterV1.get(
  "/blog/stats",
  checkBlacklistedTokens,
  isUserAuthenticated,
  getBlogStats,
);
adminRouterV1.get(
  "/pricing-plans",
  checkBlacklistedTokens,
  isUserAuthenticated,
  getAdminPricingPlans,
);

adminRouterV1.get(
  "/analytics",
  checkBlacklistedTokens,
  isUserAuthenticated,
  getAdminAnalytics,
);
adminRouterV1.get(
  "/campaign",
  checkBlacklistedTokens,
  isUserAuthenticated,
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
  campaignCalculatorMiddleware,
  async (req, res) => {
    res.json(req.body);
  },
);

adminRouterV1.post(
  "/campaign/sheet/count-applications",
  checkBlacklistedTokens,
  isUserAuthenticated,
  countApplications,
);

adminRouterV1.put(
  "/campaign/sheet/count-applications",
  checkBlacklistedTokens,
  isUserAuthenticated,
  toggleAggregatorStatus,
);

adminRouterV1.get(
  "/status",
  checkBlacklistedTokens,
  isUserAuthenticated,
  getAdminStatus,
);
adminRouterV1.patch(
  "/bot-toggle",
  checkBlacklistedTokens,
  isUserAuthenticated,
  patchAdminBotToggle,
);
adminRouterV1.get(
  "/throttle",
  checkBlacklistedTokens,
  isUserAuthenticated,
  getAdminThrottle,
);
adminRouterV1.patch(
  "/throttle",
  checkBlacklistedTokens,
  isUserAuthenticated,
  patchAdminThrottle,
);
adminRouterV1.get(
  "/schema/:tableName/columns",
  checkBlacklistedTokens,
  isUserAuthenticated,
  getSchemaColumns,
);
adminRouterV1.post(
  "/schema/expand",
  checkBlacklistedTokens,
  isUserAuthenticated,
  postSchemaExpandColumn,
);
adminRouterV1.delete(
  "/schema/:tableName/columns/:columnName",
  checkBlacklistedTokens,
  isUserAuthenticated,
  deleteSchemaColumn,
);
adminRouterV1.get(
  "/table-metadata/:tableName",
  checkBlacklistedTokens,
  isUserAuthenticated,
  getAdminTableMetadata,
);
adminRouterV1.get(
  "/users",
  checkBlacklistedTokens,
  isUserAuthenticated,
  getAdminUsers,
);
adminRouterV1.post(
  "/users",
  checkBlacklistedTokens,
  isUserAuthenticated,
  postAdminUsers,
);
adminRouterV1.patch(
  "/users/persona",
  checkBlacklistedTokens,
  isUserAuthenticated,
  patchAdminUserPersona,
);
adminRouterV1.post(
  "/users/export",
  checkBlacklistedTokens,
  isUserAuthenticated,
  postAdminUsersExport,
);
adminRouterV1.get(
  "/users/export/:taskId",
  checkBlacklistedTokens,
  isUserAuthenticated,
  getAdminUsersExportStatus,
);
adminRouterV1.get(
  "/users/export/:taskId/download",
  checkBlacklistedTokens,
  isUserAuthenticated,
  downloadAdminUsersExport,
);
adminRouterV1.get(
  "/in-flight",
  checkBlacklistedTokens,
  isUserAuthenticated,
  getInFlightSubscriptions,
);
adminRouterV1.get(
  "/in-flight/staff",
  checkBlacklistedTokens,
  isUserAuthenticated,
  getPlacementControllers,
);
adminRouterV1.post(
  "/in-flight/assign",
  checkBlacklistedTokens,
  isUserAuthenticated,
  assignPlacementController,
);
adminRouterV1.patch(
  "/in-flight/:planId/unassign",
  checkBlacklistedTokens,
  isUserAuthenticated,
  unassignPlacementController,
);

adminRouterV1.post(
  "/generate-password",
  checkBlacklistedTokens,
  isUserAuthenticated,
  generateExternalPassword,
);

adminRouterV1.use("/", clientAllocationRouterV1);
export default adminRouterV1;
