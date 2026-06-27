import { Request, Response } from 'express';
import catchAsyncError from '../../utils/catchAsyncError';
import { getServiceLogger } from '../../utils/createLogger';
import {
  sendPreferenceNotifications,
  dispatchClientCredentials,
  generateExternalPassword,
  getUserAggregators,
  toggleAggregatorStatus,
  getUserProfileDetails,
  getClientSampleQueueStatus,
  removeFromClientSampleQueue,
  addToClientSampleQueue,
  getCampaignAggregatorData,
  toggleAggregatorRecordStatus,
  syncAggregatorRecords,
  extractJobData,
  saveEditedJob,
  saveManualApplication,
  assignVAToClient,
  getAggregatorsByUserId,
  submitJobMatchRequest,
  dispatchSampleResults,
  getCampaignClients,
  getCampaignClientById,
  createCampaignClient,
  updateCampaignClient,
  UpdateCampaignClientPayload,
  deleteCampaignClient,
  deleteCampaignClientsBulk,
  softDeleteCampaignClient,
  restoreCampaignClient,
  permanentDeleteCampaignClient,
  getUserPreferencesByUserId,
  landOrLaunchCampaign,
  getDocumentReviewData,
  getClientApplicationsByClientId,
  getClientManualApplicationsByClientId,
  updateJobApplicationStatus,
} from '../../services/campaign.service';

const logger = getServiceLogger('campaign-management-controller');

/**
 * Send job preference update notifications
 * POST /api/v1/campaigns/preferences/notify
 */
export const notifyPreferenceUpdate = catchAsyncError(
  async (req: Request, res: Response) => {
    logger.info('Processing preference update notification request');
    const { userId } = req.body;
    const triggeredBy = (req as any).user.id;
    const host = req.get('host') || '';

    const result = await sendPreferenceNotifications(userId, triggeredBy, host);

    res.status(200).json({
      success: true,
      message: 'Preference notifications sent successfully',
      data: result,
    });
  }
);

/**
 * Dispatch jobsite credentials to client
 * POST /api/v1/campaigns/credentials/dispatch
 */
export const dispatchCredentials = catchAsyncError(
  async (req: Request, res: Response) => {
    logger.info('Processing credential dispatch request');
    const { clientId } = req.body;
    const host = req.get('host') || '';

    const result = await dispatchClientCredentials(clientId, host);

    res.status(200).json({
      success: true,
      message: 'Credentials dispatched successfully',
      data: result,
    });
  }
);

/**
 * Generate external password for user
 * POST /api/v1/campaigns/credentials/generate-password
 */
export const generatePassword = catchAsyncError(
  async (req: Request, res: Response) => {
    logger.info('Processing external password generation request');
    const { userId } = req.body;
    const host = req.get('host') || '';

    const result = await generateExternalPassword(userId, host);

    res.status(200).json({
      success: true,
      message: 'External password generated successfully',
      data: result,
    });
  }
);

/**
 * Get user aggregators with status (GET method)
 * GET /api/v1/campaigns/aggregators/list/{clientId}
 */
export const listUserAggregatorsGet = catchAsyncError(
  async (req: Request, res: Response) => {
    logger.info('Processing user aggregators list request (GET)');
    const { clientId } = req.params;

    const result = await getUserAggregators(clientId);

    res.status(200).json({
      success: true,
      message: 'Aggregators retrieved successfully',
      data: result,
    });
  }
);

/**
 * Get user aggregators with status (POST method)
 * POST /api/v1/campaigns/aggregators/list
 */
export const listUserAggregators = catchAsyncError(
  async (req: Request, res: Response) => {
    logger.info('Processing user aggregators list request (POST)');
    const { clientId, internalJobSites, externalJobSites } = req.body;

    const result = await getUserAggregators(
      clientId,
      internalJobSites,
      externalJobSites
    );

    res.status(200).json({
      success: true,
      message: 'Aggregators retrieved successfully',
      data: result,
    });
  }
);

/**
 * Toggle aggregator status for client
 * PATCH /api/v1/campaigns/aggregators/toggle
 */
export const toggleAggregator = catchAsyncError(
  async (req: Request, res: Response) => {
    const { clientId, jobSite } = req.body;

    logger.info(
      `Processing toggle aggregator request for client ID: ${clientId}, job site: ${jobSite}`
    );

    const result = await toggleAggregatorStatus(clientId, jobSite);

    res.status(200).json({
      success: true,
      message: 'Aggregator status updated successfully',
      data: result,
    });
  }
);

/**
 * Get user profile details with plan and craft
 * GET /api/v1/campaigns/users/:userId/profile
 */
export const getUserProfile = catchAsyncError(
  async (req: Request, res: Response) => {
    logger.info('Processing user profile request');
    const { userId } = req.params;

    const result = await getUserProfileDetails(userId);

    res.status(200).json({
      success: true,
      message: 'User profile retrieved successfully',
      data: result,
    });
  }
);

/**
 * Get client sample queue status
 * GET /api/v1/campaigns/queue/:aggregator/status
 */
export const getQueueStatus = catchAsyncError(
  async (req: Request, res: Response) => {
    logger.info('Processing client sample queue status request');
    const { aggregator } = req.params;
    const { environment } = req.query;

    const result = await getClientSampleQueueStatus(
      aggregator,
      environment as string
    );

    res.status(200).json({
      success: true,
      message: 'Queue status retrieved successfully',
      data: result,
    });
  }
);

/**
 * Remove item from client sample queue
 * DELETE /api/v1/campaigns/queue/:queue
 */
export const removeQueueItem = catchAsyncError(
  async (req: Request, res: Response) => {
    logger.info('Processing remove queue item request');
    const { queue } = req.params;
    const { input, environment } = req.body;

    const result = await removeFromClientSampleQueue(
      queue,
      input,
      environment as string
    );

    res.status(200).json({
      success: true,
      ...result,
    });
  }
);

/**
 * Add item to client sample queue
 * POST /api/v1/campaigns/queue/:queue
 */
export const addQueueItem = catchAsyncError(
  async (req: Request, res: Response) => {
    const { queue } = req.params;
    const { environment, aggregator, clientId, input } = req.body;
    logger.info('Processing add queue item request');

    const result = await addToClientSampleQueue(
      queue,
      environment,
      aggregator,
      clientId,
      input
    );

    res.status(200).json({
      success: true,
      ...result,
    });
  }
);

/**
 * Get campaign aggregator data for sheets
 * GET /api/v1/campaigns/sheets/aggregators/:clientId
 */
export const getCampaignAggregators = catchAsyncError(
  async (req: Request, res: Response) => {
    const { clientId } = req.params;
    const { active } = req.query;

    const isActive = active !== 'false';
    const result = await getCampaignAggregatorData(clientId, isActive);
    logger.info('Processing campaign aggregators request');
    res.status(200).json({
      success: true,
      message: 'Campaign aggregator data retrieved successfully',
      data: result,
    });
  }
);

/**
 * Toggle aggregator record status (soft delete/restore)
 * PATCH /api/v1/campaigns/sheets/aggregators/:recordId/status
 */
export const toggleAggregatorRecord = catchAsyncError(
  async (req: Request, res: Response) => {
    const { recordId } = req.params;
    const { action } = req.body;
    logger.info(
      `Processing toggle aggregator record request for record ID: ${recordId}, action: ${action}`
    );
    const result = await toggleAggregatorRecordStatus(
      parseInt(recordId),
      action
    );

    res.status(200).json({
      success: true,
      message: `Aggregator record ${action} successfully`,
      data: result,
    });
  }
);

/**
 * Sync aggregator records between staging and production
 * POST /api/v1/campaigns/sheets/aggregators/sync
 */
export const syncAggregators = catchAsyncError(
  async (req: Request, res: Response) => {
    logger.info('Processing aggregator sync request');
    const { clientId, syncType, fromStage } = req.body;

    const result = await syncAggregatorRecords(clientId, syncType, fromStage);

    res.status(200).json({
      success: true,
      message: 'Aggregator records synced successfully',
      data: result,
    });
  }
);

/**
 * Extract job data using AI service
 * POST /api/v1/campaigns/jobs/extract
 */
export const extractJob = catchAsyncError(
  async (req: Request, res: Response) => {
    logger.info('Processing job extraction request');
    const { clientId, joblink, pageContent } = req.body;
    const user = (req as any).user;

    const result = await extractJobData(clientId, joblink, pageContent, user);

    res.status(200).json(result);
  }
);

/**
 * Save edited job application
 * POST /api/v1/campaigns/jobs/save
 */
export const saveJob = catchAsyncError(async (req: Request, res: Response) => {
  logger.info('Processing job save request');
  const { clientId, joblink, jobData } = req.body;
  const user = (req as any).user;

  const result = await saveEditedJob(clientId, joblink, jobData, user);

  res.status(200).json(result);
});

/**
 * Save edited job application
 * POST /api/v1/campaigns/jobs/save/manual
 */
export const saveJobManually = catchAsyncError(
  async (req: Request, res: Response) => {
    logger.info('Processing job save request');
    const { clientId, joblink, jobData } = req.body;
    const user = (req as any).user;

    const result = await saveManualApplication(
      clientId,
      joblink,
      jobData,
      user
    );

    res.status(200).json(result);
  }
);

export const updateJobApplicationStatusManually = catchAsyncError(
  async (req: Request, res: Response) => {
    logger.info('Processing update job application status');
    const { applicationId, status, qualityScore } = req.body;
    const user = (req as any).user;
    console.log(req.body);
    const result = await updateJobApplicationStatus(
      applicationId,
      status,
      user,
      qualityScore
    );
    res.status(200).json(result);
  }
);

/**
 * Assign/Unassign VA to client
 * POST /api/v1/campaigns/va/assign
 */
export const assignVA = catchAsyncError(async (req: Request, res: Response) => {
  logger.info('Processing VA assignment request');

  const { vaEmail, credId } = req.body;
  const host = req.get('host') || '';
  const authenticatedUser = (req as any).user;
  const updatedByName = authenticatedUser
    ? `${authenticatedUser.firstName} ${authenticatedUser.lastName}`
    : undefined;

  const result = await assignVAToClient(credId, vaEmail, host, updatedByName);

  res.status(200).json(result);
});

/**
 * Get all aggregator records for a specific user ID
 * GET /api/v1/campaigns/aggregators/user/:userId
 */
export const getUserAggregatorsByUserId = catchAsyncError(
  async (req: Request, res: Response) => {
    logger.info('Processing get aggregators by user ID request');
    const { userId } = req.params;

    const result = await getAggregatorsByUserId(userId);

    res.status(200).json({
      success: true,
      message: 'Aggregator records retrieved successfully',
      data: result,
    });
  }
);

/**
 * Submit job match processing request to Redis queue
 * POST /api/v1/campaigns/jobs/match
 */
export const submitJobMatch = catchAsyncError(
  async (req: Request, res: Response) => {
    logger.info('Processing job match submission request');
    const payload = req.body;
    const requestorId = (req as any).user?.id;

    const result = await submitJobMatchRequest(payload, requestorId);

    res.status(200).json(result);
  }
);

/**
 * Dispatch sample job results to client
 * PATCH /api/v1/campaigns/clients/:clientId/dispatch-samples
 */
export const dispatchClientSamples = catchAsyncError(
  async (req: Request, res: Response) => {
    logger.info('Processing sample dispatch request');
    const { clientId } = req.params;
    const host = req.get('host') || '';

    const result = await dispatchSampleResults(clientId, host);

    res.status(201).json(result);
  }
);

/**
 * CAMPAIGN CLIENT CRUD ENDPOINTS
 */

/**
 * Get campaign clients list with filters
 * GET /api/v1/campaigns/clients
 */
export const listCampaignClients = catchAsyncError(
  async (req: Request, res: Response) => {
    logger.info('Processing campaign clients list request');
    const { active, q } = req.query;

    const result = await getCampaignClients(active as string, q as string);

    res.status(200).json({
      success: true,
      message: 'Campaign clients retrieved successfully',
      data: result,
    });
  }
);

/**
 * Get single campaign client by ID
 * GET /api/v1/campaigns/clients/:clientId
 */
export const getCampaignClient = catchAsyncError(
  async (req: Request, res: Response) => {
    logger.info('Processing get campaign client request');
    const { clientId } = req.params;

    const result = await getCampaignClientById(clientId);

    res.status(200).json({
      success: true,
      message: 'Campaign client retrieved successfully',
      data: result,
    });
  }
);

/**
 * Create new campaign client
 * POST /api/v1/campaigns/clients
 */
export const createCampaignClientController = catchAsyncError(
  async (req: Request, res: Response) => {
    logger.info('Processing create campaign client request');
    const data = req.body;

    const result = await createCampaignClient(data);

    res.status(201).json({
      success: true,
      message: 'Campaign client created successfully',
      data: result,
    });
  }
);

/**
 * Update campaign client
 * PATCH /api/v1/campaigns/clients/:id
 */
export const updateCampaignClientController = catchAsyncError(
  async (req: Request, res: Response) => {
    logger.info('Processing update campaign client request');
    const { id } = req.params;
    const data = req.body as UpdateCampaignClientPayload;
    const requestorName =
      `${(req as any).user?.firstName || ''} ${(req as any).user?.lastName || ''}`.trim();
    const host = (req.headers.host ||
      req.headers.origin ||
      'localhost') as string;

    const result = await updateCampaignClient(id, data, requestorName, host);

    res.status(200).json({
      success: true,
      message: 'Campaign client updated successfully',
      data: result,
    });
  }
);

/**
 * Delete campaign client
 * DELETE /api/v1/campaigns/clients/:id
 */
export const deleteCampaignClientController = catchAsyncError(
  async (req: Request, res: Response) => {
    logger.info('Processing delete campaign client request');
    const { id } = req.params;

    const result = await deleteCampaignClient(id);

    res.status(200).json({
      success: true,
      message: 'Campaign client deleted successfully',
      data: result,
    });
  }
);

/**
 * Bulk delete campaign clients
 * DELETE /api/v1/campaigns/clients/bulk
 */
export const deleteCampaignClientsBulkController = catchAsyncError(
  async (req: Request, res: Response) => {
    logger.info('Processing bulk delete campaign clients request');
    const { ids } = req.body;

    const result = await deleteCampaignClientsBulk(ids);

    res.status(200).json({
      success: true,
      message: 'Campaign clients deleted successfully',
      data: result,
    });
  }
);

/**
 * Soft delete campaign client
 * PATCH /api/v1/campaigns/clients/:id/soft-delete
 */
export const softDeleteCampaignClientController = catchAsyncError(
  async (req: Request, res: Response) => {
    logger.info('Processing soft delete campaign client request');
    const { id } = req.params;

    const result = await softDeleteCampaignClient(id);

    res.status(200).json({
      success: true,
      message: 'Campaign client soft deleted successfully',
      data: result,
    });
  }
);

/**
 * Restore soft deleted campaign client
 * PATCH /api/v1/campaigns/clients/:id/restore
 */
export const restoreCampaignClientController = catchAsyncError(
  async (req: Request, res: Response) => {
    logger.info('Processing restore campaign client request');
    const { id } = req.params;

    const result = await restoreCampaignClient(id);

    res.status(200).json({
      success: true,
      message: 'Campaign client restored successfully',
      data: result,
    });
  }
);

/**
 * Permanently delete campaign client (cannot be restored)
 * DELETE /api/v1/campaigns/clients/:id/permanent
 */
export const permanentDeleteCampaignClientController = catchAsyncError(
  async (req: Request, res: Response) => {
    logger.info('Processing PERMANENT delete campaign client request');
    const { id } = req.params;

    const result = await permanentDeleteCampaignClient(id);

    res.status(200).json({
      success: true,
      message: 'Campaign client PERMANENTLY deleted successfully',
      data: result,
    });
  }
);

/**
 * Get user preferences by user ID
 * GET /api/v1/campaigns/users/:userId/preferences
 * Optional query param: type=primary or type=secondary
 */
export const getUserPreferences = catchAsyncError(
  async (req: Request, res: Response) => {
    logger.info('Processing get user preferences request');
    const { userId } = req.params;
    const { type } = req.query;

    const preferenceType =
      type === 'primary' || type === 'secondary'
        ? (type as 'primary' | 'secondary')
        : undefined;
    const result = await getUserPreferencesByUserId(userId, preferenceType);

    res.status(200).json({
      success: true,
      message: 'User preferences retrieved successfully',
      data: result,
    });
  }
);

/**
 * Toggle campaign flight status (Land / Launch)
 * PATCH /api/v1/campaigns/clients/:clientId/toggle-flight
 */
export const toggleCampaignFlight = catchAsyncError(
  async (req: Request, res: Response) => {
    logger.info('Processing campaign toggle flight request');
    const { clientId } = req.params;
    const host = req.get('host') || req.hostname;
    const triggeredBy =
      `${(req as any).user?.firstName || ''} ${(req as any).user?.lastName || ''}`.trim() ||
      undefined;

    const result = await landOrLaunchCampaign(clientId, host, triggeredBy);

    res.status(200).json(result);
  }
);

/**
 * Get document review data for user
 * GET /api/v1/campaigns/users/:userId/document-review
 */
export const getDocumentReview = catchAsyncError(
  async (req: Request, res: Response) => {
    logger.info('Processing document review request');
    const { userId } = req.params;

    const result = await getDocumentReviewData(userId);

    res.status(200).json({
      success: true,
      message: 'Document review data retrieved successfully',
      data: result,
    });
  }
);

/**
 * Manually trigger subscription expiry reminder job (for testing)
 * POST /api/v1/campaigns/jobs/subscription-expiry-reminder/run
 */
export const triggerSubscriptionExpiryReminder = catchAsyncError(
  async (_req: Request, res: Response) => {
    logger.info('Manual trigger: subscription expiry reminder job');
    const { runSubscriptionExpiryReminderJob } =
      await import('../../jobs/cron/subscription-expiry-reminder.job');
    await runSubscriptionExpiryReminderJob();
    res.status(200).json({
      success: true,
      message: 'Subscription expiry reminder job executed successfully',
    });
  }
);

/**
 * Get all applications for a specific client by client_id
 * GET /api/v1/campaigns/clients/:clientId/applications
 */
export const getClientApplications = catchAsyncError(
  async (req: Request, res: Response) => {
    const { clientId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 500;
    const isDeleted =
      req.query.isDeleted !== undefined
        ? req.query.isDeleted === 'true'
        : undefined;
    const status = req.query.status as string | undefined;
    const source = req.query.source as string | undefined;
    const aggregator = req.query.aggregator as string | undefined;

    const result = await getClientApplicationsByClientId(
      clientId,
      page,
      pageSize,
      {
        isDeleted,
        status,
        source,
        aggregator,
      }
    );

    res.apiSuccess(result, 'Client applications retrieved successfully');
  }
);

export const getClientManualApplications = catchAsyncError(
  async (req: Request, res: Response) => {
    const { clientId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 500;
    const isDeleted =
      req.query.isDeleted !== undefined
        ? req.query.isDeleted === 'true'
        : undefined;
    const status = req.query.status as string | undefined;
    const source = req.query.source as string | undefined;
    const aggregator = req.query.aggregator as string | undefined;

    const result = await getClientManualApplicationsByClientId(
      clientId,
      page,
      pageSize,
      {
        isDeleted,
        status,
        source,
        aggregator,
      }
    );

    res.apiSuccess(result, 'Client applications retrieved successfully');
  }
);
