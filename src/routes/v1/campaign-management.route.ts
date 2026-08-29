import express from 'express';
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
  saveJobManually,
  updateJobApplicationStatusManually,
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
  softDeleteCampaignClientsBulkController,
  softDeleteCampaignClientController,
  restoreCampaignClientController,
  permanentDeleteCampaignClientController,
  getUserPreferences,
  toggleCampaignFlight,
  getDocumentReview,
  triggerSubscriptionExpiryReminder,
  getClientApplications,
  getClientManualApplications,
  getClientTours,
} from '../../controllers/v1/campaign-management.controller';
import { checkBlacklistedTokens } from '../../middlewares/checkBlacklistedToken';
import { isUserAuthenticated } from '../../middlewares/auth';
import { authorizeRoles } from '../../middlewares/authorizeRoles';

const campaignManagementRouterV1 = express.Router();

campaignManagementRouterV1.use(
  checkBlacklistedTokens,
  isUserAuthenticated,
  authorizeRoles('admin', 'assistant')
);

// Preference Notifications
campaignManagementRouterV1.post('/preferences/notify', notifyPreferenceUpdate);

// Credentials Management
campaignManagementRouterV1.post('/credentials/dispatch', dispatchCredentials);
campaignManagementRouterV1.post(
  '/credentials/generate-password',
  authorizeRoles('admin'),
  generatePassword
);

// Aggregators Management
campaignManagementRouterV1.get(
  '/aggregators/list/:clientId',
  listUserAggregatorsGet
);
campaignManagementRouterV1.post('/aggregators/list', listUserAggregators);
campaignManagementRouterV1.patch('/aggregators/toggle', toggleAggregator);
campaignManagementRouterV1.get(
  '/aggregators/user/:userId',
  getUserAggregatorsByUserId
);

// User Profile
campaignManagementRouterV1.get('/users/:userId/profile', getUserProfile);
campaignManagementRouterV1.get(
  '/users/:userId/preferences',
  getUserPreferences
);
campaignManagementRouterV1.get(
  '/users/:userId/document-review',
  getDocumentReview
);

// Client Sample Queue
campaignManagementRouterV1.get('/queue/:aggregator/status', getQueueStatus);
campaignManagementRouterV1.delete('/queue/:queue', removeQueueItem);
campaignManagementRouterV1.post('/queue/:queue', addQueueItem);

// Campaign Sheet Management
campaignManagementRouterV1.get(
  '/sheets/aggregators/:clientId',
  getCampaignAggregators
);
campaignManagementRouterV1.patch(
  '/sheets/aggregators/:recordId/status',
  toggleAggregatorRecord
);
campaignManagementRouterV1.post('/sheets/aggregators/sync', syncAggregators);

// AI Job Extraction & Saving
campaignManagementRouterV1.post('/jobs/extract', extractJob);
campaignManagementRouterV1.post('/jobs/save', saveJob);
campaignManagementRouterV1.post('/jobs/save/manual', saveJobManually);
campaignManagementRouterV1.post('/jobs/match', submitJobMatch);

// VA Assignment
campaignManagementRouterV1.post('/va/assign', authorizeRoles('admin'), assignVA);

// Campaign Client Management
campaignManagementRouterV1.get('/clients', listCampaignClients);
campaignManagementRouterV1.get('/clients/:clientId', getCampaignClient);
campaignManagementRouterV1.post(
  '/clients',
  authorizeRoles('admin'),
  createCampaignClientController
);
campaignManagementRouterV1.patch(
  '/clients/:id',
  authorizeRoles('admin'),
  updateCampaignClientController
);
// Bulk soft delete campaign clients (move to recycle bin) - must be registered before /clients/:id/soft-delete
campaignManagementRouterV1.patch(
  '/clients/bulk/soft-delete',
  authorizeRoles('admin'),
  softDeleteCampaignClientsBulkController
);
// Bulk permanently delete campaign clients - must be registered before /clients/:id/permanent
campaignManagementRouterV1.delete(
  '/clients/bulk/permanent',
  authorizeRoles('admin'),
  deleteCampaignClientsBulkController
);
campaignManagementRouterV1.delete(
  '/clients/:id',
  authorizeRoles('admin'),
  deleteCampaignClientController
);
campaignManagementRouterV1.patch(
  '/clients/:clientId/dispatch-samples',
  dispatchClientSamples
);
campaignManagementRouterV1.patch(
  '/clients/:clientId/toggle-flight',
  toggleCampaignFlight
);
campaignManagementRouterV1.get(
  '/clients/:clientId/applications',
  getClientApplications
);
campaignManagementRouterV1.get(
  '/clients/:clientId/applications/manual',
  getClientManualApplications
);
campaignManagementRouterV1.get('/clients/:clientId/tours', getClientTours);
campaignManagementRouterV1.post(
  '/clients/applications/update-status',
  updateJobApplicationStatusManually
);

// Job Test Trigger
campaignManagementRouterV1.post(
  '/jobs/subscription-expiry-reminder/run',
  triggerSubscriptionExpiryReminder
);
campaignManagementRouterV1.patch(
  '/clients/:id/soft-delete',
  authorizeRoles('admin'),
  softDeleteCampaignClientController
);
campaignManagementRouterV1.patch(
  '/clients/:id/restore',
  authorizeRoles('admin'),
  restoreCampaignClientController
);
campaignManagementRouterV1.delete(
  '/clients/:id/permanent',
  authorizeRoles('admin'),
  permanentDeleteCampaignClientController
);

export default campaignManagementRouterV1;
