import { Router } from "express";
import {
  assignPlacementController,
  getAdminAnalytics,
  getAdminLocations,
  getAdminStatus,
  getAdminTableMetadata,
  getAdminThrottle,
  getAdminPricingPlans,
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
import { applicationsController } from "@/controllers/v1/applications.controller";
import { jcTriggerController } from "@/controllers/v1/jc-trigger.controller";
import {
  getJobPreferencesController,
  putJobPreferencesController,
  getSheetTemplatesController,
  getUsersFullNameController,
} from "@/controllers/v1/job-preferences.controller";
import clientSampleRouterV1 from "./client-sample.route";
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

adminRouterV1.get(
  "/applications",
  checkBlacklistedTokens,
  isUserAuthenticated,
  applicationsController,
);
adminRouterV1.all(
  "/support-ai-prompt",
  checkBlacklistedTokens,
  isUserAuthenticated,
  supportAiPromptController,
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

export default adminRouterV1;
