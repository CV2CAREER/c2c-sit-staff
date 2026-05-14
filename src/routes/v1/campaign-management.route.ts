import express from "express";
import {
  notifyPreferenceUpdate,
  dispatchCredentials,
  generatePassword,
  listUserAggregators,
  toggleAggregator,
  getUserProfile,
  getQueueStatus,
  removeQueueItem,
  addQueueItem,
  getCampaignAggregators,
  toggleAggregatorRecord,
  syncAggregators,
  extractJob,
  saveJob,
  assignVA, 
  listUserAggregatorsGet,
  getUserAggregatorsByUserId,
  submitJobMatch,
  dispatchClientSamples,
  listCampaignClients,
  getCampaignClient,
  createCampaignClientController,
  updateCampaignClientController,
  deleteCampaignClientController,
  deleteCampaignClientsBulkController,
  softDeleteCampaignClientController,
  restoreCampaignClientController,
  permanentDeleteCampaignClientController,
  getUserPreferences,
  toggleCampaignFlight,
  getDocumentReview,
  triggerSubscriptionExpiryReminder,
} from "../../controllers/v1/campaign-management.controller";
import { checkBlacklistedTokens } from "../../middlewares/checkBlacklistedToken";
import { isUserAuthenticated } from "../../middlewares/auth";
import { authorizeRoles } from "../../middlewares/authorizeRoles";

const campaignManagementRouterV1 = express.Router();

campaignManagementRouterV1.use(checkBlacklistedTokens, isUserAuthenticated, authorizeRoles("admin", "assistant"));

// Preference Notifications
campaignManagementRouterV1.post("/preferences/notify", notifyPreferenceUpdate);

// Credentials Management
campaignManagementRouterV1.post("/credentials/dispatch", dispatchCredentials);
campaignManagementRouterV1.post("/credentials/generate-password", generatePassword);

// Aggregators Management
campaignManagementRouterV1.get("/aggregators/list/:clientId", listUserAggregatorsGet);
campaignManagementRouterV1.post("/aggregators/list", listUserAggregators);
campaignManagementRouterV1.patch("/aggregators/toggle", toggleAggregator);
campaignManagementRouterV1.get("/aggregators/user/:userId", getUserAggregatorsByUserId);

// User Profile
campaignManagementRouterV1.get("/users/:userId/profile", getUserProfile);
campaignManagementRouterV1.get("/users/:userId/preferences", getUserPreferences);
campaignManagementRouterV1.get("/users/:userId/document-review", getDocumentReview);

// Client Sample Queue
campaignManagementRouterV1.get("/queue/:aggregator/status", getQueueStatus);
campaignManagementRouterV1.delete("/queue/:queue", removeQueueItem);
campaignManagementRouterV1.post("/queue/:queue", addQueueItem);

// Campaign Sheet Management
campaignManagementRouterV1.get("/sheets/aggregators/:clientId", getCampaignAggregators);
campaignManagementRouterV1.patch("/sheets/aggregators/:recordId/status", toggleAggregatorRecord);
campaignManagementRouterV1.post("/sheets/aggregators/sync", syncAggregators);

// AI Job Extraction & Saving
campaignManagementRouterV1.post("/jobs/extract", extractJob);
campaignManagementRouterV1.post("/jobs/save", saveJob);
campaignManagementRouterV1.post("/jobs/match", submitJobMatch);

// VA Assignment
campaignManagementRouterV1.post("/va/assign", assignVA);

// Campaign Client Management
campaignManagementRouterV1.get("/clients", listCampaignClients);
campaignManagementRouterV1.get("/clients/:clientId", getCampaignClient);
campaignManagementRouterV1.post("/clients", createCampaignClientController);
campaignManagementRouterV1.patch("/clients/:id", updateCampaignClientController);
campaignManagementRouterV1.delete("/clients/:id", deleteCampaignClientController);
campaignManagementRouterV1.delete("/clients/bulk", deleteCampaignClientsBulkController);
campaignManagementRouterV1.patch("/clients/:clientId/dispatch-samples", dispatchClientSamples);
campaignManagementRouterV1.patch("/clients/:clientId/toggle-flight", toggleCampaignFlight);

// Job Test Trigger
campaignManagementRouterV1.post("/jobs/subscription-expiry-reminder/run", triggerSubscriptionExpiryReminder);
campaignManagementRouterV1.patch("/clients/:id/soft-delete", softDeleteCampaignClientController);
campaignManagementRouterV1.patch("/clients/:id/restore", restoreCampaignClientController);
campaignManagementRouterV1.delete("/clients/:id/permanent", permanentDeleteCampaignClientController);

export default campaignManagementRouterV1;
