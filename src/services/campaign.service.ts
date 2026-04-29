import { getServiceLogger } from "../utils/createLogger";
import { User } from "../models/v1/user.model";
import { Credentials } from "../models/v1/credentials.model";
import { Aggregator } from "../models/v1/aggregator.model";
import { Profile } from "../models/v1/profile.model";
import { Upload } from "../models/v1/upload.model";
import { sendMail } from "../config/sendGrid";
import { SlackService } from "./slack.service";
import { SlackChannel, SlackNode, SlackProvider, SlackSeverity, SlackEventType } from "../utils/enum";
import { getEnvironmentFromHost, getSlackIdByEmail } from "../utils/slack-helpers";
import { hopeUserIdExists } from "../utils/user-helper";
import { getConnectedRedis } from "../config/redis";
import { Op, Sequelize } from "sequelize";
import path from "path";
import { credential } from "firebase-admin";

const logger = getServiceLogger("campaign-service");
const mailDirectory = path.resolve(__dirname, "../views/emails");

/**
 * Aggregator status field mapping
 */
const statusField: Record<string, string> = {
  'jobbank': 'JobBank_Aggregator',
  'seek': 'Seek_Aggregator',
  'adecco': 'Adecco_Aggregator',
  'indeed': 'Indeed_Aggregator',
  'linkedin': 'LinkedIn_Aggregator',
  'adzuna': 'Adzuna_Aggregator',
  'escapecity': 'EscapeCity_Aggregator',
  'reed': 'Reed_Aggregator',
  'careerone': 'CareerOne_Aggregator',
  'jora': 'Jora_Aggregator',
  'randstad': 'Randstad_Aggregator',
  'michaelpage': 'Michael_Page_Aggregator',
};

/**
 * Extract active aggregator credentials from credentials object
 */
export const extractAggregatorCredentials = (obj: {[key: string]: string}) => {
  const aggregatorKeyMap = [
    { name: 'SEEK', email: 'Alias_Email', password: 'Alias_Password', active: 'SEEK_Aggregator' },
    { name: 'Adecco', email: 'Alias_Email', password: 'Alias_Password', active: 'Adecco_Aggregator' },
    { name: 'Adzuna', email: 'Alias_Email', password: 'Alias_Password', active: 'Adzuna_Aggregator' },
    { name: 'CareerOne', email: 'Alias_Email', password: 'Alias_Password', active: 'CareerOne_Aggregator' },
    { name: 'LinkedIn', email: 'Alias_Email', password: 'Alias_Password', active: 'Linkedin_Aggregator' },
    { name: 'Jora', email: 'Alias_Email', password: 'Alias_Password', active: 'Jora_Aggregator' }
  ];

  return aggregatorKeyMap.reduce((acc, curr) => {
    const email = obj[curr.email];
    const password = obj[curr.password];
    if (email && password) {
      acc.push({ email, password, name: curr.name });
    }
    return acc;
  }, [] as ({email: string; password: string; name: string;})[]);
};

/**
 * Send job preference update notifications to user and admin
 */
export const sendPreferenceNotifications = async (userId: string, triggeredBy: string, host: string) => {
  logger.info(`Processing preference notifications for user ID: ${userId}`);

  if (!userId) {
    logger.warn("User ID is required");
    throw new Error("User ID is required");
  }

  const userAccount = await Credentials.findOne({ where: { id: userId }, raw: true });

  if (!userAccount) {
    logger.warn("User account not found");
    throw new Error("User account not found");
  }

  const user = await User.findOne({ where: { id: userAccount.clientId }, raw: true });
  const firstname = user?.firstName || "User";
  const email = user?.email || "unknown email";

  // Send notification email to the user
  await sendMail({
    email: email,
    subject: 'Update on Your Job Preferences',
    templateName: 'DispatchPreference.ejs',
    templateDir: mailDirectory,
    templateData: { firstname, email, link: 'dashboard/profile/job-references' }
  });

  // Send notification email to delivery team admins
  await sendMail({
    email: "deliveryteam@cvtocareer.com",
    subject: 'User Notification of Updated Job Preferences',
    templateName: 'AdminNotificationTemplate.ejs',
    templateDir: mailDirectory,
    templateData: { firstname, email, link: '/admin-dashboard/manage-accounts', triggeredBy }
  });

  // Send Slack notification
  const location = getEnvironmentFromHost(host);
  await SlackService.notify({
    location,
    host,
    node: SlackNode.MESSAGING,
    provider: SlackProvider.SENDGRID,
    severity: SlackSeverity.INFO,
    trigger: `User preference update notification sent`,
    type: SlackEventType.USER_TRIGGERED,
    channel: SlackChannel.CRY_WOLF,
    body: `A User, ${firstname} (${email}), has been notified of updated job preferences.
*Success*: Notification email sent specifically for preference updates.
*Immediate Impact*: User is informed that their preferences have been updated and can review them.
*Next Step*: Admin to monitor for user feedback or further preference changes.`
  });

  logger.info(`Preference notifications sent successfully for user: ${firstname} (${email})`);

  return {
    emailSent: true,
    slackNotificationSent: true,
    recipient: email,
    user: { email, firstname }
  };
};

/**
 * Dispatch jobsite credentials to client user
 */
export const dispatchClientCredentials = async (clientId: string, host: string) => {
  logger.info(`Processing credentials dispatch for client ID: ${clientId}`);

  // Fetch client credentials
  const client = await Credentials.findOne({ where: { id: clientId } });
  if (!client) {
    logger.warn(`Client not found for ID: ${clientId}`);
    throw new Error("Client not found");
  }

  // Fetch associated user
  const clientUser = await User.findOne({ where: { id: client.clientId } });
  if (!clientUser) {
    logger.warn(`Customer ID not set for client: ${clientId}`);
    throw new Error("Client customer ID not set");
  }

  const credentials = extractAggregatorCredentials(client.toJSON());
  
  if (!credentials.length) {
    logger.warn(`No credentials found for client: ${clientId}`);
    throw new Error("No credential(s) set for client");
  }

  // Send credentials email to user
  await sendMail({
    email: clientUser.email,
    subject: 'Your Jobsites Credentials',
    templateName: 'DispatchCredentials.ejs',
    templateDir: mailDirectory,
    templateData: { 
      firstname: clientUser.firstName,
      credentials 
    }
  });

  // Send Slack notification
  const location = getEnvironmentFromHost(host);
  await SlackService.notify({
    location,
    host,
    node: SlackNode.MESSAGING,
    provider: SlackProvider.SENDGRID,
    severity: SlackSeverity.INFO,
    trigger: `Jobsite credentials dispatched`,
    type: SlackEventType.USER_TRIGGERED,
    channel: SlackChannel.CRY_WOLF,
    body: `Jobsite credentials have been dispatched to user ${clientUser.firstName} ${clientUser.lastName}.
*Success*: Email containing ${credentials.length} aggregator credentials sent.
*Immediate Impact*: User can now access and manage their jobsite accounts.
*Next Step*: Monitor for user support requests regarding login issues.`
  });

  logger.info(`Successfully dispatched ${credentials.length} credentials to ${clientUser.email}`);

  return {
    credentialsDispatched: credentials.length,
    recipient: clientUser.email,
    user: {
      id: clientUser.id,
      email: clientUser.email,
      firstName: clientUser.firstName
    }
  };
};

/**
 * Generate and set external password for user credentials
 */
export const generateExternalPassword = async (userId: string, host: string) => {
  logger.info(`Generating external password for user ID: ${userId}`);

  // Generate secure random password
  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };
  
  const generatedPassword = generatePassword();

  // Find user credentials
  const userCredentials = await Credentials.findOne({ where: { id: userId } });
  if (!userCredentials) {
    logger.warn(`User credentials not found for ID: ${userId}`);
    throw new Error("User not found");
  }

  // Check if password already exists
  const credentialsData = userCredentials.toJSON() as any;
  if (credentialsData.ExternalPassword) {
    logger.warn(`External password already exists for user: ${userId}`);
    throw new Error("External password already exists");
  }

  // Update with generated password
  await Credentials.update(
    { ExternalPassword: generatedPassword } as any,
    { where: { id: userId } }
  );

  const userFullName = credentialsData.Full_Name || credentialsData.fullName || userId;

  logger.info(`External password generated successfully for user: ${userFullName} (${userId})`);

  // Send Slack notification
  const location = getEnvironmentFromHost(host);
  await SlackService.notify({
    location,
    host,
    node: SlackNode.DATABASE,
    provider: SlackProvider.MYSQL,
    severity: SlackSeverity.INFO,
    trigger: `External password generated for user`,
    type: SlackEventType.USER_TRIGGERED,
    channel: SlackChannel.CRY_WOLF,
    body: `Jobsite password for user ${userFullName} has been generated successfully.
*Success*: ExternalPassword field updated in database with auto-generated password.
*Immediate Impact*: User can now be dispatched with credentials for automated applications.
*Next Step*: Proceed with credential dispatch if ready.`
  });

  return {
    passwordGenerated: true,
    userId,
    userFullName,
    password: generatedPassword
  };
};

/**
 * Get user aggregators with status
 */
export const getUserAggregators = async (clientId: string, internalJobSites: any[] = [], externalJobSites: any[] = []) => {
  logger.info(`Fetching aggregators for client ID: ${clientId}`);

  // Find user credentials
  const cred = await Credentials.findOne({ where: { clientId: clientId } });
  if (!cred) {
    throw new Error("User not found");
  }

  // Find associated user
  const user = await User.findOne({ where: { id: clientId } });
  if (!user) {
    throw new Error("User not found");
  }

  // Check for user profile
  if (!user.profileId) {
    throw new Error("User profile not found");
  }

  // Find profile
  const profile = await Profile.findByPk(user.profileId);
  
  if (!profile) {
    throw new Error("Profile not found");
  }

  // Check for aggregators
  if (!profile.aggregators || !Array.isArray(profile.aggregators)) {
    return { internal: [], external: [] };
  }

  // Get aggregator IDs
  const aggregatorIds = profile.aggregators
    .map((agg: any) => agg.aggregator)
    .filter((id: any) => id);

  if (aggregatorIds.length === 0) {
    return { internal: [], external: [] };
  }

  // Fetch aggregators
  const aggregators = await Aggregator.findAll({
    where: { id: aggregatorIds }
  });

  const credData = cred.toJSON() as any;

  // Helper function to match aggregators with job sites
  const matchAggregators = (jobSites: any[]) => {
    const results: { name: string; imageUrl: string; status: boolean }[] = [];

    for (const jobSite of jobSites) {
      if (!jobSite.value || jobSite.value === 'all') {
        continue;
      }

      const statusKey = statusField[jobSite.value.toLowerCase()];
      const status = credData[statusKey] || false;
      
      const matchingAggregator = aggregators.find(
        (agg: any) => agg.name && agg.name.toLowerCase() === jobSite.value.toLowerCase()
      );

      if (matchingAggregator) {
        results.push({
          name: matchingAggregator.name,
          imageUrl: matchingAggregator.picture?.fileUrl || '',
          status
        });
      }
    }

    return results;
  };

  const internalResults = matchAggregators(internalJobSites);
  const externalResults = matchAggregators(externalJobSites);

  logger.info(`Found ${internalResults.length} internal and ${externalResults.length} external aggregators for client: ${clientId}`);

  return {
    internal: internalResults,
    external: externalResults
  };
};

/**
 * Toggle aggregator status for client
 */
export const toggleAggregatorStatus = async (clientId: string, jobSite: string) => {
  logger.info(`Toggling aggregator status for client: ${clientId}, job site: ${jobSite}`);

  // Find user credentials
  const cred = await Credentials.findOne({ where: { clientId: clientId } });
  if (!cred) {
    throw new Error("Credentials not found");
  }

  const statusKey = statusField[jobSite.toLowerCase()];
  if (!statusKey) {
    throw new Error("Invalid job site");
  }

  const credData = cred.toJSON() as any;
  const currentStatus = credData[statusKey];
  const newStatus = !currentStatus;

  // Update status
  await Credentials.update(
    { [statusKey]: newStatus } as any,
    { where: { id: clientId } }
  );

  logger.info(`Aggregator status updated for ${jobSite}: ${currentStatus} -> ${newStatus}`);

  return {
    jobSite,
    previousStatus: currentStatus,
    newStatus
  };
};

/**
 * Get user profile with plan and craft information
 */
export const getUserProfileDetails = async (userId: string) => {
  logger.info(`Fetching user profile details for user ID: ${userId}`);

  // Fetch user with plan data
  const user = await User.findByPk(userId, {
    include: [
      {
        association: 'activePlan',
        attributes: ['id', 'userId', 'title', 'expiresAt']
      }
    ]
  });

  if (!user) {
    logger.warn(`User not found for ID: ${userId}`);
    throw new Error("User not found");
  }

  // Fetch profile for craft information
  const Profile = require("../models/v1/profile.model").Profile;
  const profile = await Profile.findByPk(user.profile);

  const userData = user.toJSON() as any;
  const profileData = profile ? profile.toJSON() as any : {};

  // Application Statistics
  const totalApplications = profileData.totalApplications || 0;
  const successfulApplications = profileData.successfulApplications || 0;
  const failedApplications = profileData.failedApplications || 0;

  const response = {
    id: user.id,
    name: `${user.firstName} ${user.lastName}`,
    email: user.email,
    plan: userData.plan || userData.planName || null,
    plans: userData.activePlan ? {
      userId: userData.activePlan.userId,
      title: userData.activePlan.title,
      selectedAt: userData.activePlan.selectedAt,
      isActive: userData.activePlan.isActive,
      raw: userData.activePlan.raw
    } : null,
    craft: profileData.craft || profileData.profession || null,
    statistics: {
      totalApplications,
      successfulApplications,
      failedApplications,
      successRate: totalApplications > 0 ? Math.round((successfulApplications / totalApplications) * 100) : 0
    }
  };

  logger.info(`Successfully retrieved profile details for user: ${user.email}`);

  return response;
};

/**
 * Client Sample Queue Redis key constants
 */
const CLIENT_SAMPLE_QUEUE_KEY = (agg: string, environment: string) => {
  if (environment === '_TEST') {
    return `${agg.toUpperCase()}_CLIENT_SAMPLE_QUEUE_TEST`;
  } else {
    return `${agg.toUpperCase()}_CLIENT_SAMPLE_QUEUE`;
  }
};

const CLIENT_SAMPLE_CURRENT_PROCESSING_KEY = (agg: string, environment: string) => {
  if (environment === '_TEST') {
    return `${agg.toUpperCase()}_CLIENT_SAMPLE_CURRENT_PROCESSING_TEST`;
  } else {
    return `${agg.toUpperCase()}_CLIENT_SAMPLE_CURRENT_PROCESSING`;
  }
};

/**
 * Extract base value from queue element
 */
const extractValueFromQueueElement = (element: string): string => {
  return element.split(':;')[0];
};

/**
 * Get client sample queue status
 */
export const getClientSampleQueueStatus = async (agg: string, environment: string) => {
  logger.info(`Fetching queue status for aggregator: ${agg}, environment: ${environment}`);
  
  const redis = await getConnectedRedis();
  if (!redis) {
    throw new Error("Redis connection unavailable");
  }

  const isTestEnvironment = environment === '_TEST';
  const currentKey = CLIENT_SAMPLE_CURRENT_PROCESSING_KEY(agg, isTestEnvironment ? environment : '');
  const queueKey = CLIENT_SAMPLE_QUEUE_KEY(agg, isTestEnvironment ? environment : '');

  const current = await redis.get(currentKey);
  let result = await redis.lrange(queueKey as string, 0, -1);
  result = result.map(extractValueFromQueueElement);

  logger.info(`Retrieved ${result.length} items from queue: ${queueKey}`);

  return {
    result,
    current
  };
};

/**
 * Remove item from client sample queue
 */
export const removeFromClientSampleQueue = async (queue: string, input: string, environment: string) => {
  logger.info(`Removing item from queue: ${queue}, value: ${input}`);
  
  const redis = await getConnectedRedis();
  if (!redis) {
    throw new Error("Redis connection unavailable");
  }

  let queueKey;
  if(queue.includes("_stage") && environment === "TEST"){
    const prosQueueKey = queue?.replace(/_/g, '').replace(/stage/gi, '');
    queueKey = CLIENT_SAMPLE_QUEUE_KEY(prosQueueKey, "_TEST");
  } else {
    queueKey = CLIENT_SAMPLE_QUEUE_KEY(queue, "_LIVE");
  }

  const values = await redis.lrange(queueKey as string, 0, -1);

  if (values.length === 0) {
    return {
        deleted: 0,
        message: 'The queue is empty'
    };
  }

  const value = values.find((e) => e.includes(input));

  if (!value) {
    throw new Error(`Element "${input}" not found in the queue`);
  }

  const result = await redis.lrem(queueKey as string, 1, value);

  logger.info(`Removed ${result} item(s) from queue: ${queueKey}`);

  return {
    deleted: result,
    message: `Deleted ${result} occurrence(s) of "${input}" from queue`
  };
};

/**
 * Add item to client sample queue
 */
export const addToClientSampleQueue = async (queue: string, environment: string, aggregator?: string, clientId?: string, input?: string) => {
  logger.info(`Adding item to queue: ${queue}`);
  
  const redis = await getConnectedRedis();
  if (!redis) {
    throw new Error("Redis connection unavailable");
  }

  let queueKey;
  if(queue.includes("_stage") && environment === "TEST"){
    const prosQueueKey = queue?.replace(/_/g, '').replace(/stage/gi, '');
    queueKey = CLIENT_SAMPLE_QUEUE_KEY(prosQueueKey, "_TEST");
  } else {
    queueKey = CLIENT_SAMPLE_QUEUE_KEY(queue, "_LIVE");
  }

  let finalInput: string = input || '';

  // If no input provided, lookup client alias email from database
  if(!finalInput && clientId && aggregator) {
    const cred = await Credentials.findOne({
      where: { id: clientId },
      attributes: ['seekEmail'],
    });
    
    if (!cred) {
      throw new Error("Client not found");
    }
    
    const credData = cred.toJSON() as any;
    const aliasEmail = credData.seekEmail;
    
    if (!aliasEmail) {
      throw new Error("Alias email not found for the client");
    }
    
    const inputObject = {
      email : aliasEmail,
      process: aggregator.includes("stage") ? 'staging' : 'production'
    };

    finalInput = JSON.stringify(inputObject);
  }

  if (!finalInput) {
    throw new Error("No valid input provided for queue");
  }

  const values = await redis.lrange(queueKey as string, 0, -1);

  if (values.includes(finalInput)) {
    return {
      saved: false,
      queue: values,
      message: `Element already exists in the queue`
    };
  }

  await redis.lpush(queueKey as string, finalInput);

  logger.info(`Added item to queue: ${queueKey}`);

  return {
    saved: true,
    queue: [...values, finalInput],
    message: `Element added to queue successfully`
  };
};

/**
 * CAMPAIGN SHEET MANAGEMENT
 */

/**
 * Get aggregator records for campaign sheets
 */
export const getCampaignAggregatorData = async (clientId: string, active: boolean = true) => {
  logger.info(`Fetching campaign aggregator data for client: ${clientId}`);

  const whereClause = {
    userId: clientId,
    isDeleted: !active
  };

  const totalCount = await Aggregator.count({ where: whereClause });
  const records = await Aggregator.findAll({ where: whereClause });

  logger.info(`Retrieved ${records.length} aggregator records for client: ${clientId}`);

  return {
    records,
    totalCount
  };
};

/**
 * Soft delete or restore aggregator record
 */
export const toggleAggregatorRecordStatus = async (recordId: number, action: "soft-delete" | "restore") => {
  logger.info(`Toggling aggregator record: ${recordId}, action: ${action}`);

  const updateClause = {
    isDeleted: action === "soft-delete"
  };

  await Aggregator.update(updateClause, {
    where: { id: recordId }
  });

  logger.info(`Successfully ${action} record: ${recordId}`);

  return {
    success: true,
    recordId,
    action,
    newStatus: updateClause.isDeleted
  };
};

/**
 * Copy aggregator records between staging and production
 */
export const syncAggregatorRecords = async (clientId: string, syncType: "override" | "increment", fromStage: boolean) => {
  logger.info(`Syncing aggregator records for client: ${clientId}, type: ${syncType}, fromStage: ${fromStage}`);

  // Get source records
  const sourceRecords = await Aggregator.findAll({
    where: {
      userId: clientId,
      isStage: fromStage,
      isDeleted: false
    },
    raw: true
  });

  if (sourceRecords.length === 0) {
    logger.info(`No records found to sync for client: ${clientId}`);
    return {
      success: true,
      recordsSynced: 0,
      message: "No records found to sync"
    };
  }

  // For override mode, delete existing target records first
  if (syncType === "override") {
    await Aggregator.destroy({
      where: {
        userId: clientId,
        isStage: !fromStage
      }
    });
    logger.info(`Cleared existing target records for override`);
  }

  // Prepare records for target environment
  const targetRecords = sourceRecords.map(record => ({
    ...record,
    id: undefined,
    isStage: !fromStage,
    createdAt: new Date(),
    updatedAt: new Date()
  }));

  // Bulk create records in target
  await Aggregator.bulkCreate(targetRecords, {
    ignoreDuplicates: syncType === "increment"
  });

  logger.info(`Successfully synced ${targetRecords.length} records for client: ${clientId}`);

  return {
    success: true,
    recordsSynced: targetRecords.length,
    syncType,
    fromStage
  };
};

/**
 * Get all aggregator records for a specific user ID
 */
export const getAggregatorsByUserId = async (userId: string) => {
  logger.info(`Fetching aggregator records for user ID: ${userId}`);

  const aggregators = await Aggregator.findAll({
    where: {
      userId: userId,
      isDeleted: false
    },
    order: [['createdAt', 'DESC']]
  });

  logger.info(`Found ${aggregators.length} aggregator records for user: ${userId}`);

  return {
    success: true,
    count: aggregators.length,
    records: aggregators
  };
};

/**
 * AI Job Extraction Service
 * 
 * Accepts job link and page content, forwards to external AI service
 * Returns extracted job data for user review before saving
 */
export const extractJobData = async (clientId: string, joblink: string, pageContent: string, user: any) => {
  logger.info(`Processing AI job extraction for client: ${clientId}`);

  // Validate required fields
  if (!clientId) throw new Error("Client ID is required");
  if (!joblink) throw new Error("Job link is required");
  if (!pageContent) throw new Error("Page content is required");

  // Validate that user exists
  logger.info(`Looking up user with ID: ${clientId}`);
  
  const userExists = await User.findOne({
    where: { id: clientId },
    raw: true
  });

  logger.info(`User lookup result:`, userExists);

  if (!userExists) {
    throw new Error(`Client not found with ID: ${clientId}`);
  }

  if (userExists.isDeleted) {
    throw new Error(`Client account is deleted: ${clientId}`);
  }

  const fullName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim();

  let environment = process.env.NODE_ENV || 'development';
  if (environment === 'preview') {
    environment = 'staging';
  }

  const requestData = {
    environment,
    submitted_by: fullName,
    va_email: user?.email || '',
    job_url: joblink,
    page_content: pageContent,
    client_id: clientId,
  };

  logger.info(`AI Extraction Payload for user: ${clientId} (${user?.email || ''})`, requestData);

  // Call Flask AI Extraction API
  const axios = require('axios');
  const flaskResponse = await axios.post(
    `http://${process.env.JOB_APPLICATION_API_IP}/api/ai-extract-job`, 
    requestData,
    { timeout: 60000 }
  );

  if (!flaskResponse.data.success) {
    throw new Error(flaskResponse.data.message || 'Failed to extract job data from the provided content.');
  }

  logger.info(`AI extraction completed successfully for client: ${clientId}`);

  return {
    success: true,
    message: 'AI extraction completed. Please review and edit the data before saving.',
    job_data: flaskResponse.data.job_data,
    requires_confirmation: true
  };
};

/**
 * Save Edited Job Application Service
 * 
 * Accepts edited job data after user review
 * Forwards to external application API to save to database
 */
export const saveEditedJob = async (clientId: string, joblink: string, jobData: any, user: any) => {
  logger.info(`Saving edited job application for client: ${clientId}`);

  // Validate required fields
  if (!clientId) throw new Error("Client ID is required");
  if (!jobData) throw new Error("Job data is required");
  if (!joblink) throw new Error("Job link is required");

  // Validate that client exists
  const clientExists = await User.findOne({
    where: { 
      id: clientId, 
      isDeleted: false 
    }
  });

  if (!clientExists) {
    throw new Error(`Client not found with ID: ${clientId}`);
  }

  const fullName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim();

  let environment = process.env.NODE_ENV || 'development';
  if (environment === 'preview') {
    environment = 'staging';
  }

  // Prepare data for Flask API
  const requestData = {
    environment,
    client_id: clientId,
    submitted_by: fullName,
    vaEmail: user?.email || '',
    job_data: {
      job_title: jobData.job_title,
      company: jobData.company,
      location: jobData.location,
      job_url: joblink,
      job_id: jobData.job_id,
      job_type: jobData.job_type,
      country: jobData.country,
      internal_jobsite: jobData.internal_jobsite || 'C2C',
      external_jobsite: jobData.external_jobsite,
    },
  };

  // Log payload with user information
  logger.info(`Save Application Payload for user: ${user?.id || 'N/A'} (${user?.email || ''})`, requestData);

  // Call Flask Save Application API
  const axios = require('axios');
  const flaskResponse = await axios.post(
    `http://${process.env.JOB_APPLICATION_API_IP}/api/save-application`, 
    requestData,
    { timeout: 30000 }
  );

  if (!flaskResponse.data.success) {
    throw new Error(flaskResponse.data.message || 'Failed to save application to database.');
  }

  logger.info(`Job application saved successfully for client: ${clientId}`);

  return {
    success: true,
    message: 'Application saved successfully to database.',
    data: flaskResponse.data
  };
};

/**
 * Assign or Unassign VA to client profile
 */
export const assignVAToClient = async (credId: string, vaEmail: string | null, host: string) => {
  logger.info(`Processing VA assignment for credId=${credId}, vaEmail=${vaEmail}`);


  if (!vaEmail) {
    logger.info(`Unassigning VA for credId=${credId}`);
    
    const targetCred = await Credentials.findOne({ where: { id: credId } });
    if (!targetCred) {
      logger.warn(`Client profile not found for credId=${credId}`);
      throw new Error("Client profile not found");
    }

    const targetVa = await User.findOne({ where: { email: targetCred.AssignedPCEmail } });
    if (!targetVa) {
      logger.warn(`TPA not found for email=${targetCred.AssignedPCEmail}`);
      throw new Error("TPA not found");
    }

    const slackId = targetCred.AssignedPCEmail ? await getSlackIdByEmail(targetCred.AssignedPCEmail) : null;
    const tagName = slackId ? `<@${slackId}>` : `${targetVa?.firstName} ${targetVa?.lastName}`;

    const message = `VA Unassignment for ${targetCred?.AssignedPCName}.
*Success*: ${tagName} has been unassigned specifically from this client profile.
*Immediate Impact*: ${tagName} no longer has responsibility for this client's tasks.
*Next Step*: TPA to hand over any pending items if applicable.`;
    
    await SlackService.notify({
      location: getEnvironmentFromHost(host || ''),
      host: host || '',
      node: SlackNode.HUMAN_RESOURCE,
      provider: SlackProvider.HUBSTAFF,
      severity: SlackSeverity.INFO,
      trigger: `VA unassigned from client`,
      type: SlackEventType.USER_TRIGGERED,
      channel: SlackChannel.VA,
      body: message
    });

    await Credentials.update(
      { 
        AssignedPCName: null,
        AssignedPCEmail: null
      } as any,
      { where: { id: credId } }
    );
    
    logger.info(`VA unassigned successfully for credId=${credId}`);
    
    return {
      success: true,
      message: "TPA unassigned successfully"
    };
  }

  const targetCred = await Credentials.findOne({ where: { id: credId } });
  if (!targetCred) {
    logger.warn(`Client profile not found for credId=${credId}`);
    throw new Error("Client profile not found");
  }

  const targetVa = await User.findOne({ where: { email: vaEmail } });
  if (!targetVa) {
    logger.warn(`TPA not found for email=${vaEmail}`);
    throw new Error("TPA not found");
  }

  await Credentials.update(
    { 
      AssignedPCEmail: vaEmail, 
      AssignedPCName: `${targetVa?.firstName} ${targetVa?.lastName}` 
    } as any,
    { where: { clientId: credId } }
  );

  const slackId = vaEmail ? await getSlackIdByEmail(vaEmail) : null;
  const tagName = slackId ? `<@${slackId}>` : `${targetVa?.firstName} ${targetVa?.lastName}`;
  
  const message = `VA Assignment for ${targetCred?.AssignedPCName}.
*Success*: ${tagName} has been assigned to this client profile.
*Immediate Impact*: ${tagName} now has responsibility for this client's tasks.
*Next Step*: ${tagName} should review the client's profile and begin support.`;
  
  await SlackService.notify({
    location: getEnvironmentFromHost(host || ''),
    host: host || '',
    node: SlackNode.HUMAN_RESOURCE,
    provider: SlackProvider.HUBSTAFF,
    severity: SlackSeverity.INFO,
    trigger: `VA assigned to client`,
    type: SlackEventType.USER_TRIGGERED,
    channel: SlackChannel.VA,
    body: message
  });

  logger.info(`VA assigned successfully for credId=${credId} to ${vaEmail}`);

  return {
    success: true,
    message: "TPA updated successfully",
    vaName: `${targetVa?.firstName} ${targetVa?.lastName}`,
    vaEmail: vaEmail
  };
};

type FilterType = 'date' | 'range' | 'first' | 'custom';
type Samples = 'successful' | 'unattended' | 'all';

interface TriggerOptions {
  filterType: FilterType;
  sampleType: Samples;
  clientId: string;
  filter?: string;
  date?: string | null;
  dateRange?: [string, string] | null;
  sampleSize?: number;
  customRange?: [string | null, string | null];
  requestor?: string;
}

/**
 * Submit job match processing request to Redis queue
 */
export const submitJobMatchRequest = async (options: TriggerOptions, requestorId?: string) => {
  logger.info(`Submitting job match request for client: ${options.clientId}`);

  const redis = await getConnectedRedis();
  if (!redis) {
    throw new Error("Redis connection unavailable");
  }

  const payload: TriggerOptions = {
    ...options,
    requestor: requestorId || ''
  };

  const redisQueue = 'JOB_MATCH';
  const redisValue = JSON.stringify(payload);

  await redis.lpush(redisQueue, redisValue);
  
  logger.info(`Job match request added to Redis queue: ${redisQueue}`);

  return {
    success: true,
    message: 'Job match submitted for processing',
    payload
  };
};

/**
 * CAMPAIGN CLIENT CRUD OPERATIONS
 */

/**
 * Get campaign clients list with filters
 */
export const getCampaignClients = async (active: string = 'true', searchQuery?: string, page: number = 1, limit: number = 20) => {
  logger.info(`Fetching campaign clients, active: ${active}, search: ${searchQuery || 'none'}, page: ${page}, limit: ${limit}`);

  let whereClause: any = {};

  if (active === "all") {
    whereClause = {};
  } else if (active === "false") {
    whereClause = { isDeleted: true };
  } else {
    whereClause = { isDeleted: false };
  }

  // Working PostgreSQL JSONB search implementation
  if (searchQuery) {
    const searchTerm = `%${searchQuery}%`;
    whereClause = {
      ...whereClause,
      [Op.or]: [
        // Search inside seekExternalCredentials JSON fields
        Sequelize.where(
          Sequelize.fn('LOWER', Sequelize.literal(`"seekExternalCredentials"->>'First_Name'`)),
          Op.like,
          searchTerm.toLowerCase()
        ),
        Sequelize.where(
          Sequelize.fn('LOWER', Sequelize.literal(`"seekExternalCredentials"->>'Last_Name'`)),
          Op.like,
          searchTerm.toLowerCase()
        ),
        Sequelize.where(
          Sequelize.fn('LOWER', Sequelize.literal(`"seekExternalCredentials"->>'Full_Name'`)),
          Op.like,
          searchTerm.toLowerCase()
        ),
        // Also search top level fields
        { seekEmail: { [Op.iLike]: searchTerm } },
      ]
    };
  }

  const offset = (page - 1) * limit;

  const campaigns = await Credentials.findAll({
    where: whereClause,
    order: [["createdAt", "DESC"]],
    limit: limit,
    offset: offset,
    raw: true
  });

  const totalCount = await Credentials.count({ where: whereClause });

  logger.info(`Found ${campaigns.length} campaign clients (total: ${totalCount})`);

  return {
    campaigns,
    totalCount,
    currentPage: page,
    totalPages: Math.ceil(totalCount / limit),
    limit
  };
};

/**
 * Get single campaign client by ID
 */
export const getCampaignClientById = async (clientId: string) => {
  logger.info(`Fetching campaign client: ${clientId}`);

  if (!clientId) {
    throw new Error("Client ID is required");
  }

  const clientData = await Credentials.findByPk(clientId, { raw: true });

  if (!clientData) {
    throw new Error("Client not found");
  }

  // Fetch associated user and profile for application statistics
  const user = await User.findOne({ where: { id: clientId } });
  let applicationCounts = {
    totalApplications: 0,
    successfulApplications: 0,
    failedApplications: 0
  };

  if (user && user.profileId) {
    const profile = await Profile.findByPk(user.profileId);
    if (profile) {
      const profileData = profile.toJSON() as any;
      applicationCounts = {
        totalApplications: profileData.totalApplications || 0,
        successfulApplications: profileData.successfulApplications || 0,
        failedApplications: profileData.failedApplications || 0
      };
    }
  }

  // Combine client data with application counts
  return {
    ...clientData,
    ...applicationCounts
  };
};

/**
 * Get user preferences by user ID
 * @param userId User ID
 * @param preferenceType Optional preference type: 'primary' | 'secondary'
 * @returns Requested preference fields or complete profile including both primary and secondary fields
 */
export const getUserPreferencesByUserId = async (userId: string, preferenceType?: 'primary' | 'secondary') => {
  logger.info(`Fetching ${preferenceType || 'all'} user preferences for user ID: ${userId}`);

  if (!userId) {
    throw new Error("User ID is required");
  }

  const user = await User.findOne({ where: { id: userId } });
  
  if (!user) {
    throw new Error("User not found");
  }

  if (!user.profileId) {
    throw new Error("User profile not found");
  }

  // Fetch profile and cast to any to bypass TypeScript field checking
  const profile = await Profile.findByPk(user.profileId, { raw: true }) as any;

  if (!profile) {
    throw new Error("Profile not found for user");
  }

  // If specific preference type requested, return only those fields
  if (preferenceType === 'primary') {
    return {
      userId,
      preferenceType: 'primary',
      profile
    };
  }

  if (preferenceType === 'secondary') {
    return {
      userId,
      preferenceType: 'secondary',
      profile
    };
  }

  // Return complete profile including ALL fields (both primary and secondary)
  return profile;
};

/**
 * Toggle campaign flight status (Launch / Land)
 * Toggles between INFLIGHT and HOLD status with all associated fields
 */
export const landOrLaunchCampaign = async (clientId: string) => {
  logger.info(`Toggling campaign flight status for client: ${clientId}`);

  if (!clientId) {
    throw new Error("Client ID is required");
  }

  const cred = await Credentials.findOne({
    where: { id: clientId }
  });

  if (!cred) {
    throw new Error("Credential not found");
  }

  let message: string;
  const credData = cred.toJSON() as any;
  
  if (credData.capitalized !== 'INFLIGHT') {
    await cred.update({
      capitalized: 'INFLIGHT',
      Active: true,
      SeekAnswerPriority: true,
      SeekAggregator: true,
      SeekSubStartDate: new Date().toISOString()
    });
    message = "Campaign launched successfully!";
  } else {
    await cred.update({
      capitalized: 'HOLD',
      Active: false,
      SeekAnswerPriority: false,
      SeekAggregator: false,
      SeekSubStartDate: null
    });
    message = "Campaign landed successfully!";
  }

  logger.info(`Campaign status updated: ${message} for client: ${clientId}`);

  return {
    success: true,
    message,
    clientId,
    newStatus: credData.capitalized !== 'INFLIGHT' ? 'FLIGHT' : 'HOLD'
  };
};

/**
 * Get user documents with preferences for document review
 * Returns user uploaded documents and profile preferences
 */
export const getDocumentReviewData = async (userId: string) => {
  logger.info(`Fetching document review data for user: ${userId}`);

  if (!userId) {
    throw new Error("User ID is required");
  }

  // Retrieve user uploaded documents
  const userDocs = await Upload.findAll({
    where: { userId, isDeleted: false }
  });

  // Retrieve user profile preferences
  const userData = await User.findByPk(userId, { attributes: ['profileId', 'country'] });
  
  let userPreference: any = null;
  if (userData && userData.profileId) {
    userPreference = await Profile.findByPk(userData.profileId, { raw: true }) as any;
    if (userPreference && !userPreference.country) {
      userPreference.country = userData.country;
    }
  }

  logger.info(`Document review data retrieved successfully for user: ${userId}`);

  return {
    userDocs: userDocs || [],
    userPreference
  };
};

/**
 * Create new campaign client record
 */
export const createCampaignClient = async (data: any) => {
  logger.info(`Creating new campaign client`);

  const response = await Credentials.create(data);

  logger.info(`Created campaign client: ${response.id}`);

  return response.toJSON();
};

/**
 * Update campaign client record
 */
export const updateCampaignClient = async (id: string, data: any, requestorName?: string) => {
  logger.info(`Updating campaign client: ${id} for data: ${JSON.stringify(data)}`);

  if (!data || Object.keys(data).length === 0) {
    throw new Error("Data is required for update");
  }
  if (!id) {
    throw new Error("ID is required");
  }

  const userInfo = await Credentials.findOne({ where: { id } });
  if (!userInfo) {
    throw new Error("Client not found");
  }

  // Use ONLY the fields that were actually provided for update
  // Handle nested data payload structure (if fields are inside .data property)
  const actualData = data.data || data;
  const updateData = { ...actualData };

  // IMPORTANT: Never update clientId foreign key or immutable fields!
  delete updateData.clientId;
  delete updateData.id;
  delete updateData.createdAt;

  // Trim string fields
  for (const key in updateData) {
    if (typeof updateData[key] === "string") {
      updateData[key] = updateData[key].trim();
    }
  }

  // Add audit field
  updateData.updatedBy = requestorName || "System";

  // Use static update() to bypass dirty checking - ensures ALL provided fields are updated
  // This fixes boolean/number type mismatch issues (0 vs false, 1 vs true)
  await Credentials.update(updateData, {
    where: { id }
  });

  // Fetch updated record to return
  const updatedRecord = await Credentials.findByPk(id);

  logger.info(`Updated campaign client: ${id}`);

  return updatedRecord!.toJSON();
};

/**
 * Delete single campaign client
 */
export const deleteCampaignClient = async (id: string) => {
  logger.info(`Deleting campaign client: ${id}`);

  if (!id) {
    throw new Error("ID is required");
  }

  const response = await Credentials.destroy({
    where: { id },
  });

  logger.info(`Deleted campaign client: ${id}`);

  return response;
};

/**
 * Soft delete campaign client (set isDeleted=true)
 */
export const softDeleteCampaignClient = async (id: string) => {
  logger.info(`Soft deleting campaign client: ${id}`);

  if (!id) {
    throw new Error("ID is required");
  }

  const response = await Credentials.update(
    { isDeleted: true },
    { where: { id } }
  );

  logger.info(`Soft deleted campaign client: ${id}`);

  return response;
};

/**
 * Restore soft deleted campaign client
 */
export const restoreCampaignClient = async (id: string) => {
  logger.info(`Restoring campaign client: ${id}`);

  if (!id) {
    throw new Error("ID is required");
  }

  const response = await Credentials.update(
    { isDeleted: false },
    { where: { id } }
  );

  logger.info(`Restored campaign client: ${id}`);

  return response;
};

/**
 * Permanently delete campaign client (hard delete - cannot be restored)
 */
export const permanentDeleteCampaignClient = async (id: string) => {
  logger.info(`PERMANENTLY deleting campaign client: ${id}`);

  if (!id) {
    throw new Error("ID is required");
  }

  const response = await Credentials.destroy({
    where: { id },
    force: true
  });

  logger.info(`PERMANENTLY deleted campaign client: ${id}`);

  return response;
};

/**
 * Bulk delete multiple campaign clients
 */
export const deleteCampaignClientsBulk = async (ids: string[]) => {
  logger.info(`Bulk deleting ${ids.length} campaign clients`);

  if (!ids || ids.length === 0) {
    throw new Error("IDs are required for bulk delete");
  }

  const response = await Credentials.destroy({
    where: { id: ids },
  });

  logger.info(`Deleted ${response} campaign clients`);

  return response;
};

/**
 * Dispatch sample job results to client
 */
export const dispatchSampleResults = async (clientId: string, host?: string) => {
  logger.info(`Dispatching sample results for client: ${clientId}`);

  // Find user
  const user = await User.findOne({ 
    where: { id: clientId },
    raw: true 
  });

  if (!user) {
    throw new Error("User not found");
  }

  // Find credentials record
  const credentials = await Credentials.findOne({
    where: { clientId: clientId }
  });

  if (!credentials) {
    throw new Error("Client credentials not found");
  }

  // Find sample test applications
  const Application = require("../models/v1/application.model").Application;
  
  const sampleApps = await Application.findAll({
    where: { 
      client_id: credentials.id, 
      Sample_Type: 'Sample Test', 
      isDeleted: false
    },
    limit: 10,
    order: [['createdAt', 'DESC']],
    raw: true
  });

  if(!sampleApps || sampleApps.length === 0) {
    throw new Error("No samples to dispatch");
  }

  // Update sample status from Test to Live
  const updateResult = await Application.update(
    { Sample_Type: 'Sample' },
    {
      where: {
        client_id: credentials.id,
        Sample_Type: 'Sample Test',
      },
    }
  );

  if (updateResult[0] === 0) {
    throw new Error("Samples already dispatched");
  }

  // Update user profile with sample status
  const Profile = require("../models/v1/profile.model").Profile;
  await Profile.update(
    {
      isSampleDispatched: true,
      isSampleAccepted: false,
      isSampleResultsAccepted: false,
      progress: "Sample Results Dispatched"
    },
    {
      where: { userId: clientId }
    }
  );

  // Send client notification email
  await sendMail({
    email: user.email,
    subject: 'Your Sample Results are Ready for Review',
    templateName: 'DispatchPreference.ejs',
    templateDir: mailDirectory,
    templateData: {
      firstname: user.firstName,
      link: `${process.env.FRONTEND_URL}/dashboard/view-preference`,
      results: sampleApps
    }
  });

  // Send admin notification email
  await sendMail({
    email: "deliveryteam@cvtocareer.com",
    subject: `${user.firstName} ${user.lastName} Sample Results are Ready for Review`,
    templateName: 'AdminNotificationTemplate.ejs',
    templateDir: mailDirectory,
    templateData: {
      firstname: user.firstName,
      link: `${process.env.FRONTEND_URL}/admin/campaign-mgt/client/${clientId}`,
      email: user.email
    }
  });

  // Send Slack notification
  const location = getEnvironmentFromHost(host || '');
  
  await SlackService.notify({
    location,
    host: host || '',
    node: SlackNode.MESSAGING,
    provider: SlackProvider.SENDGRID,
    severity: SlackSeverity.INFO,
    trigger: `Sample results dispatched`,
    type: SlackEventType.ADMIN_ACTION,
    channel: SlackChannel.CRY_WOLF,
    body: `${user.firstName} has been notified of their sample test results for review.
*Success*: Sample results successfully dispatched to the user.
*Immediate Impact*: User can now review and provide feedback on the samples.
*Next Step*: Admin to wait for user acceptance or feedback.`
  });

  logger.info(`Successfully dispatched ${sampleApps.length} samples for client: ${user.email}`);

  return {
    success: true,
    message: "Samples dispatched successfully",
    samplesCount: sampleApps.length,
    updatedRecords: updateResult[0]
  };
};
