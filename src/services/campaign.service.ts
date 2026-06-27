import { getServiceLogger } from '../utils/createLogger';
import ErrorHandler from '../utils/errorHandler';
import { User } from '../models/v1/user.model';
import { Credentials } from '../models/v1/credentials.model';
import { Aggregator } from '../models/v1/aggregator.model';
import { Profile } from '../models/v1/profile.model';
import { Plan } from '../models/v1/plan.model';
import { Upload } from '../models/v1/upload.model';
import { Application } from '../models/v1/application.model';
import { ManualApplication } from '../models/v1/manual-application.model';
import { sendMail } from '../config/sendGrid';
import { SlackService } from './slack.service';
import {
  SlackChannel,
  SlackEventType,
  SlackLocation,
  SlackNode,
  SlackProvider,
  SlackSeverity,
} from '../utils/enum';
import {
  getEnvironmentFromHost,
  getSlackIdByEmail,
  getSlackIdOrName,
} from '../utils/slack-helpers';
import { getConnectedRedis } from '../config/redis';
import { Op, Sequelize } from 'sequelize';
import path from 'path';
import { Logger } from 'winston';

const logger = getServiceLogger('campaign-service');
const mailDirectory = path.resolve(__dirname, '../views/emails');

/**
 * Extract active aggregator credentials from credentials object
 */
export const extractAggregatorCredentials = (obj: {
  [key: string]: string;
}) => {
  const aggregatorKeyMap = [
    {
      name: 'SEEK',
      email: 'Alias_Email',
      password: 'Alias_Password',
      active: 'SEEK_Aggregator',
    },
    {
      name: 'Adecco',
      email: 'Alias_Email',
      password: 'Alias_Password',
      active: 'Adecco_Aggregator',
    },
    {
      name: 'Adzuna',
      email: 'Alias_Email',
      password: 'Alias_Password',
      active: 'Adzuna_Aggregator',
    },
    {
      name: 'CareerOne',
      email: 'Alias_Email',
      password: 'Alias_Password',
      active: 'CareerOne_Aggregator',
    },
    {
      name: 'LinkedIn',
      email: 'Alias_Email',
      password: 'Alias_Password',
      active: 'Linkedin_Aggregator',
    },
    {
      name: 'Jora',
      email: 'Alias_Email',
      password: 'Alias_Password',
      active: 'Jora_Aggregator',
    },
  ];

  return aggregatorKeyMap.reduce(
    (acc, curr) => {
      const email = obj[curr.email];
      const password = obj[curr.password];
      const isActive = obj[curr.active];
      if (email && password && isActive && isActive !== 'false') {
        acc.push({ email, password, name: curr.name });
      }
      return acc;
    },
    [] as { email: string; password: string; name: string }[]
  );
};

/**
 * Send job preference update notifications to user and admin
 */
export const sendPreferenceNotifications = async (
  userId: string,
  triggeredBy: string,
  host: string
) => {
  logger.info(`Processing preference notifications for user ID: ${userId}`);

  if (!userId) {
    logger.warn('User ID is required');
    throw new Error('User ID is required');
  }

  const userAccount = await Credentials.findOne({
    where: { id: userId },
    raw: true,
  });

  if (!userAccount) {
    logger.warn('User account not found');
    throw new Error('User account not found');
  }

  const user = await User.findOne({
    where: { id: userAccount.clientId },
    raw: true,
  });
  const firstname = user?.firstName || 'User';
  const email = user?.email || 'unknown email';

  // Send notification email to the user
  await sendMail({
    email: email,
    subject: 'Update on Your Job Preferences',
    templateName: 'DispatchPreference.ejs',
    templateDir: mailDirectory,
    templateData: {
      firstname,
      email,
      link: 'dashboard/profile/job-references',
    },
  });

  // Send notification email to delivery team admins
  await sendMail({
    email: 'deliveryteam@cvtocareer.com',
    subject: 'User Notification of Updated Job Preferences',
    templateName: 'AdminNotificationTemplate.ejs',
    templateDir: mailDirectory,
    templateData: {
      firstname,
      email,
      link: '/admin-dashboard/manage-accounts',
      triggeredBy,
    },
  });

  // Send Slack notification
  setImmediate(async () => {
    try {
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
    *Next Step*: Admin to monitor for user feedback or further preference changes.`,
      });

      logger.info(
        `Preference notifications sent successfully for user: ${firstname} (${email})`
      );
    } catch (err) {
      logger.error(`❌ Slack notification failed: ${err}`);
    }
  });

  return {
    emailSent: true,
    slackNotificationSent: true,
    recipient: email,
    user: { email, firstname },
  };
};

/**
 * Dispatch jobsite credentials to client user
 */
export const dispatchClientCredentials = async (
  clientId: string,
  host: string
) => {
  logger.info(`Processing credentials dispatch for client ID: ${clientId}`);

  // Fetch client credentials
  const client = await Credentials.findOne({ where: { id: clientId } });
  if (!client) {
    logger.warn(`Client not found for ID: ${clientId}`);
    throw new Error('Client not found');
  }

  // Fetch associated user
  const clientUser = await User.findOne({ where: { id: client.clientId } });
  if (!clientUser) {
    logger.warn(`Customer ID not set for client: ${clientId}`);
    throw new Error('Client customer ID not set');
  }

  const clientJson = client.toJSON() as any;
  const credentialsSource = {
    ...clientJson,
    ...(clientJson.seekExternalCredentials || {}),
  };
  const credentials = extractAggregatorCredentials(credentialsSource);

  if (!credentials.length) {
    logger.warn(`No credentials found for client: ${clientId}`);
    throw new Error('No credential(s) set for client');
  }

  // Send credentials email to user
  await sendMail({
    email: clientUser.email,
    subject: 'Your Jobsites Credentials',
    templateName: 'DispatchCredentials.ejs',
    templateDir: mailDirectory,
    templateData: {
      firstname: clientUser.firstName,
      credentials,
    },
  });

  // Send Slack notification
  setImmediate(async () => {
    try {
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
    *Next Step*: Monitor for user support requests regarding login issues.`,
      });

      logger.info(
        `Successfully dispatched ${credentials.length} credentials to ${clientUser.email}`
      );
    } catch (err) {
      logger.error(`❌ Slack notification failed: ${err}`);
    }
  });

  return {
    credentialsDispatched: credentials.length,
    recipient: clientUser.email,
    user: {
      id: clientUser.id,
      email: clientUser.email,
      firstName: clientUser.firstName,
    },
  };
};

/**
 * Generate and set external password for user credentials
 */
export const generateExternalPassword = async (
  userId: string,
  host: string
) => {
  logger.info(`Generating external password for user ID: ${userId}`);

  // Generate secure random password
  const generatePassword = () => {
    const chars =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 16; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  const generatedPassword = generatePassword();

  // Find user credentials
  const userCredentials = await Credentials.findOne({ where: { id: userId } });
  if (!userCredentials) {
    logger.warn(`User credentials not found for ID: ${userId}`);
    throw new Error('User not found');
  }

  const credentialsData = userCredentials.toJSON() as any;
  const existingJsonb = credentialsData.seekExternalCredentials || {};

  // ExternalPassword lives inside the seekExternalCredentials JSONB column
  if (existingJsonb.ExternalPassword) {
    logger.warn(`External password already exists for user: ${userId}`);
    throw new Error('External password already exists');
  }

  // Merge the new password into the existing JSONB object and save via instance update
  await userCredentials.update({
    seekExternalCredentials: {
      ...existingJsonb,
      ExternalPassword: generatedPassword,
    },
  } as any);

  // Sync password to all aggregator links on the user's primary profile

  if (userCredentials.clientId) {
    const primaryProfile = await Profile.findOne({
      where: { userId: userCredentials.clientId, name: 'primary' },
    });
    if (primaryProfile && (primaryProfile.aggregators as any[])?.length) {
      const updatedLinks = (primaryProfile.aggregators as any[]).map(
        (link) => ({
          ...link,
          password: generatedPassword,
        })
      );
      await primaryProfile.update({ aggregators: updatedLinks });
    }
  }

  const userFullName =
    existingJsonb.Full_Name || existingJsonb.fullName || userId;

  logger.info(
    `External password generated successfully for user: ${userFullName} (${userId})`
  );

  // Send Slack notification
  setImmediate(async () => {
    try {
      await SlackService.notify({
        location: SlackLocation.LOCALHOST,
        host,
        node: SlackNode.DATABASE,
        provider: SlackProvider.MYSQL,
        severity: SlackSeverity.INFO,
        trigger: `External password generated for user`,
        type: SlackEventType.USER_TRIGGERED,
        channel: SlackChannel.CRY_WOLF,
        teamMentions: 'CSM',
        body: `Jobsite password for user ${userFullName} has been generated successfully.
    *Success*: ExternalPassword field updated in database with auto-generated password.
    *Immediate Impact*: User can now be dispatched with credentials for automated applications.
    *Next Step*: Proceed with credential dispatch if ready.`,
      });
    } catch (err) {
      logger.error(`❌ Slack notification failed: ${err}`);
    }
  });

  return {
    passwordGenerated: true,
    userId,
    userFullName,
    password: generatedPassword,
  };
};

/**
 * Get user aggregators with status
 */
export const getUserAggregators = async (
  clientId: string,
  internalJobSites: any[] = [],
  externalJobSites: any[] = []
) => {
  logger.info(`Fetching aggregators for client ID: ${clientId}`);

  // clientId may be a Credentials UUID — resolve it to the actual User UUID via the FK
  let userId = clientId;
  const cred = await Credentials.findOne({
    where: { id: clientId },
    attributes: ['clientId'],
  });
  if (cred?.clientId) {
    userId = cred.clientId;
    logger.info(`Resolved clientId ${clientId} → userId ${userId}`);
  }

  const user = await User.findByPk(userId);
  if (!user) throw new Error('User not found');

  const profile = await Profile.findOne({ where: { userId, name: 'primary' } });
  if (!profile) return { aggregators: [] };

  const links: any[] = profile.aggregators || [];

  // Mirrors getUserJobsites: per-link findByPk so each link gets its full aggregator template
  const populated = await Promise.all(
    links.map(async (link: any) => {
      const agg = await Aggregator.findByPk(link.aggregatorId, {
        attributes: ['id', 'name', 'picture', 'isEnabled', 'config'],
      });
      return { ...link, aggregator: agg ? agg.toJSON() : null };
    })
  );

  logger.info(`Found ${populated.length} aggregators for client: ${clientId}`);

  // No job site filter — return all (same shape as getUserJobsites)
  if (internalJobSites.length === 0 && externalJobSites.length === 0) {
    return { aggregators: populated };
  }

  // With job site filter — also split into internal/external buckets
  const matchAggregators = (jobSites: any[]) => {
    const results: {
      name: string;
      imageUrl: string;
      status: boolean;
      aggregatorId: string;
    }[] = [];
    for (const jobSite of jobSites) {
      if (!jobSite.value || jobSite.value === 'all') continue;
      const match = populated.find(
        (p: any) =>
          p.aggregator?.name?.toLowerCase() === jobSite.value.toLowerCase()
      );
      if (match) {
        results.push({
          name: match.aggregator.name,
          imageUrl: match.aggregator.picture?.fileUrl || '',
          status: match.isEnabled ?? match.aggregator.isEnabled ?? false,
          aggregatorId: match.aggregatorId,
        });
      }
    }
    return results;
  };

  return {
    aggregators: populated,
    internal: matchAggregators(internalJobSites),
    external: matchAggregators(externalJobSites),
  };
};

/**
 * Toggle aggregator status for client
 */
export const toggleAggregatorStatus = async (
  clientId: string,
  jobSite: string
) => {
  logger.info(
    `Toggling aggregator status for client: ${clientId}, job site: ${jobSite}`
  );

  // clientId may be a Credentials UUID — resolve it to the actual User UUID via the FK
  let userId = clientId;
  const cred = await Credentials.findOne({
    where: { id: clientId },
    attributes: ['clientId'],
  });
  if (cred?.clientId) {
    userId = cred.clientId;
  }

  const profile = await Profile.findOne({ where: { userId, name: 'primary' } });
  if (!profile) throw new Error('Profile not found for this client');

  const links: any[] = profile.aggregators || [];
  if (links.length === 0)
    throw new Error('No aggregators found for this client');

  // Mirrors updateUserJobsite: populate each link with findByPk so we can match by name
  // and use the aggregator's own isEnabled as the default when the link hasn't been toggled yet
  const populated = await Promise.all(
    links.map(async (link: any) => {
      const agg = await Aggregator.findByPk(link.aggregatorId, {
        attributes: ['id', 'name', 'isEnabled'],
      });
      return { ...link, aggregator: agg ? agg.toJSON() : null };
    })
  );

  const matchedIdx = populated.findIndex(
    (p) => p.aggregator?.name?.toLowerCase() === jobSite.toLowerCase()
  );
  if (matchedIdx === -1)
    throw new Error('Aggregator not found for this client');

  // Use link-level isEnabled first; fall back to the aggregator template's value
  const previousStatus =
    populated[matchedIdx].isEnabled ??
    populated[matchedIdx].aggregator?.isEnabled ??
    true;
  const newStatus = !previousStatus;

  const updatedLinks = links.map((l: any, i: number) =>
    i === matchedIdx ? { ...l, isEnabled: newStatus } : l
  );

  // Mirrors updateUserJobsite: write the whole updated links array back to the profile
  await profile.update({ aggregators: updatedLinks });

  logger.info(
    `Aggregator status updated for ${jobSite}: ${previousStatus} -> ${newStatus}`
  );

  return { jobSite, previousStatus, newStatus };
};

/**
 * Get user profile with plan and craft information
 */
export const getUserProfileDetails = async (userId: string) => {
  logger.info(`Fetching user profile details for user ID: ${userId}`);

  const client = await Credentials.findOne({
    where: { id: userId },
  });

  // Fetch user with plan data
  const user = await User.findByPk(client?.clientId, {
    include: [
      {
        association: 'activePlan',
        attributes: ['id', 'userId', 'title', 'expiresAt'],
      },
    ],
  });

  if (!user) {
    logger.warn(`User not found for ID: ${userId}`);
    throw new ErrorHandler('User not found', 404);
  }

  // Fetch profile for craft and aggregator information
  const profile = await Profile.findByPk(user.profileId);

  const userData = user.toJSON() as any;
  const profileData = profile ? (profile.toJSON() as any) : {};

  // Fetch application statistics directly from the Application model
  const [totalApplications, successfulApplications, failedApplications] =
    await Promise.all([
      Application.count({
        where: { client_id: userId, isDeleted: false },
      }),
      Application.count({
        where: {
          client_id: userId,
          isDeleted: false,
          status: { [Op.iLike]: 'Successful' },
        },
      }),
      Application.count({
        where: {
          client_id: userId,
          isDeleted: false,
          status: { [Op.iLike]: 'Failed' },
        },
      }),
    ]);

  // Count aggregators linked on the profile's aggregators JSONB array
  const aggregatorCount = Array.isArray(profileData.aggregators)
    ? profileData.aggregators.length
    : 0;

  const response = {
    id: user.id,
    name: `${user.firstName} ${user.lastName}`,
    email: user.email,
    plan: userData.plan || userData.planName || null,
    plans: userData.activePlan
      ? {
          userId: userData.activePlan.userId,
          title: userData.activePlan.title,
          selectedAt: userData.activePlan.selectedAt,
          isActive: userData.activePlan.isActive,
          raw: userData.activePlan.raw,
        }
      : null,
    craft:
      profileData.courseOfStudy ||
      profileData.craft ||
      profileData.profession ||
      null,
    statistics: {
      totalApplications,
      successfulApplications,
      failedApplications,
      successRate:
        totalApplications > 0
          ? Math.round((successfulApplications / totalApplications) * 100)
          : 0,
    },
    aggregatorCount,
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

const CLIENT_SAMPLE_CURRENT_PROCESSING_KEY = (
  agg: string,
  environment: string
) => {
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
export const getClientSampleQueueStatus = async (
  agg: string,
  environment: string
) => {
  logger.info(
    `Fetching queue status for aggregator: ${agg}, environment: ${environment}`
  );

  const redis = await getConnectedRedis();
  if (!redis) {
    throw new Error('Redis connection unavailable');
  }

  const isTestEnvironment = environment === '_TEST';
  const currentKey = CLIENT_SAMPLE_CURRENT_PROCESSING_KEY(
    agg,
    isTestEnvironment ? environment : ''
  );
  const queueKey = CLIENT_SAMPLE_QUEUE_KEY(
    agg,
    isTestEnvironment ? environment : ''
  );

  const current = await redis.get(currentKey);
  let result = await redis.lrange(queueKey as string, 0, -1);
  result = result.map(extractValueFromQueueElement);

  logger.info(`Retrieved ${result.length} items from queue: ${queueKey}`);

  return {
    result,
    current,
  };
};

/**
 * Remove item from client sample queue
 */
export const removeFromClientSampleQueue = async (
  queue: string,
  input: string,
  environment: string
) => {
  logger.info(`Removing item from queue: ${queue}, value: ${input}`);

  const redis = await getConnectedRedis();
  if (!redis) {
    throw new Error('Redis connection unavailable');
  }

  let queueKey;
  if (queue.includes('_stage') && environment === 'TEST') {
    const prosQueueKey = queue?.replace(/_/g, '').replace(/stage/gi, '');
    queueKey = CLIENT_SAMPLE_QUEUE_KEY(prosQueueKey, '_TEST');
  } else {
    queueKey = CLIENT_SAMPLE_QUEUE_KEY(queue, '_LIVE');
  }

  const values = await redis.lrange(queueKey as string, 0, -1);

  if (values.length === 0) {
    return {
      deleted: 0,
      message: 'The queue is empty',
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
    message: `Deleted ${result} occurrence(s) of "${input}" from queue`,
  };
};

/**
 * Add item to client sample queue
 */
export const addToClientSampleQueue = async (
  queue: string,
  environment: string,
  aggregator?: string,
  clientId?: string,
  input?: string
) => {
  logger.info(`Adding item to queue: ${queue}`);

  const redis = await getConnectedRedis();
  if (!redis) {
    throw new Error('Redis connection unavailable');
  }

  let queueKey;
  if (queue.includes('_stage') && environment === 'TEST') {
    const prosQueueKey = queue?.replace(/_/g, '').replace(/stage/gi, '');
    queueKey = CLIENT_SAMPLE_QUEUE_KEY(prosQueueKey, '_TEST');
  } else {
    queueKey = CLIENT_SAMPLE_QUEUE_KEY(queue, '_LIVE');
  }

  let finalInput: string = input || '';

  // If no input provided, lookup client alias email from database
  if (!finalInput && clientId && aggregator) {
    const cred = await Credentials.findOne({
      where: { id: clientId },
      attributes: ['seekEmail'],
    });

    if (!cred) {
      throw new Error('Client not found');
    }

    const credData = cred.toJSON() as any;
    const aliasEmail = credData.seekEmail;

    if (!aliasEmail) {
      throw new Error('Alias email not found for the client');
    }

    const inputObject = {
      email: aliasEmail,
      process: aggregator.includes('stage') ? 'staging' : 'production',
    };

    finalInput = JSON.stringify(inputObject);
  }

  if (!finalInput) {
    throw new Error('No valid input provided for queue');
  }

  const values = await redis.lrange(queueKey as string, 0, -1);

  if (values.includes(finalInput)) {
    return {
      saved: false,
      queue: values,
      message: `Element already exists in the queue`,
    };
  }

  await redis.lpush(queueKey as string, finalInput);

  logger.info(`Added item to queue: ${queueKey}`);

  return {
    saved: true,
    queue: [...values, finalInput],
    message: `Element added to queue successfully`,
  };
};

/**
 * CAMPAIGN SHEET MANAGEMENT
 */

/**
 * Get aggregator records for campaign sheets
 */
export const getCampaignAggregatorData = async (
  clientId: string,
  active: boolean = true
) => {
  logger.info(`Fetching campaign aggregator data for client: ${clientId}`);

  const whereClause = {
    userId: clientId,
    isDeleted: !active,
  };

  const totalCount = await Aggregator.count({ where: whereClause });
  const records = await Aggregator.findAll({ where: whereClause });

  logger.info(
    `Retrieved ${records.length} aggregator records for client: ${clientId}`
  );

  return {
    records,
    totalCount,
  };
};

/**
 * Soft delete or restore aggregator record
 */
export const toggleAggregatorRecordStatus = async (
  recordId: number,
  action: 'soft-delete' | 'restore'
) => {
  logger.info(`Toggling aggregator record: ${recordId}, action: ${action}`);

  const updateClause = {
    isDeleted: action === 'soft-delete',
  };

  await Aggregator.update(updateClause, {
    where: { id: recordId },
  });

  logger.info(`Successfully ${action} record: ${recordId}`);

  return {
    success: true,
    recordId,
    action,
    newStatus: updateClause.isDeleted,
  };
};

/**
 * Copy aggregator records between staging and production
 */
export const syncAggregatorRecords = async (
  clientId: string,
  syncType: 'override' | 'increment',
  fromStage: boolean
) => {
  logger.info(
    `Syncing aggregator records for client: ${clientId}, type: ${syncType}, fromStage: ${fromStage}`
  );

  // Get source records
  const sourceRecords = await Aggregator.findAll({
    where: {
      userId: clientId,
      isStage: fromStage,
      isDeleted: false,
    },
    raw: true,
  });

  if (sourceRecords.length === 0) {
    logger.info(`No records found to sync for client: ${clientId}`);
    return {
      success: true,
      recordsSynced: 0,
      message: 'No records found to sync',
    };
  }

  // For override mode, delete existing target records first
  if (syncType === 'override') {
    await Aggregator.destroy({
      where: {
        userId: clientId,
        isStage: !fromStage,
      },
    });
    logger.info(`Cleared existing target records for override`);
  }

  // Prepare records for target environment
  const targetRecords = sourceRecords.map((record) => ({
    ...record,
    id: undefined,
    isStage: !fromStage,
    createdAt: new Date(),
    updatedAt: new Date(),
  }));

  // Bulk create records in target
  await Aggregator.bulkCreate(targetRecords, {
    ignoreDuplicates: syncType === 'increment',
  });

  logger.info(
    `Successfully synced ${targetRecords.length} records for client: ${clientId}`
  );

  return {
    success: true,
    recordsSynced: targetRecords.length,
    syncType,
    fromStage,
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
      isDeleted: false,
    },
    order: [['createdAt', 'DESC']],
  });

  logger.info(
    `Found ${aggregators.length} aggregator records for user: ${userId}`
  );

  return {
    success: true,
    count: aggregators.length,
    records: aggregators,
  };
};

/**
 * AI Job Extraction Service
 *
 * Accepts job link and page content, forwards to external AI service
 * Returns extracted job data for user review before saving
 */
/**
 * AI Job Extraction Service
 */
export const extractJobData = async (
  clientId: string,
  joblink: string,
  pageContent: string,
  user: any
) => {
  logger.info(`Processing AI job extraction for client: ${clientId}`);

  // Validate required fields
  if (!clientId) throw new Error('Client ID is required');
  if (!joblink) throw new Error('Job link is required');
  if (!pageContent) throw new Error('Page content is required');

  // Look up user by credentials.id
  const credentialsRecord = await Credentials.findOne({
    where: { id: clientId },
    raw: true,
  });

  if (!credentialsRecord) {
    logger.error(`No credentials record found for ID: ${clientId}`);
    throw new Error(`Client not found with ID: ${clientId}`);
  }

  // Get the associated user
  const userRecord = await User.findOne({
    where: { id: credentialsRecord.clientId },
    raw: true,
  });

  if (!userRecord) {
    logger.error(`No user found for credentials: ${clientId}`);
    throw new Error(`User associated with credentials not found`);
  }

  // Get full name
  let fullName = `${user.firstName} ${user.middleName} ${user.lastName}`;

  let environment = process.env.NODE_ENV || 'development';
  if (environment === 'preview') {
    environment = 'staging';
  }

  const requestData = {
    environment,
    submitted_by: fullName || 'System',
    va_email: user?.email || userRecord.email,
    job_url: joblink,
    page_content: pageContent,
    client_id: clientId, // ✅ Pass the UUID directly as string
  };

  logger.info(`✅ Using credentials.id UUID: ${clientId}`);
  logger.info(`   User: ${userRecord.email}`);
  logger.info(
    `Job Site: http://${process.env.JOB_APPLICATION_API_IP}/api/ai-extract-job`
  );

  // Call Flask AI Extraction API
  const axios = require('axios');
  const flaskResponse = await axios.post(
    `http://${process.env.JOB_APPLICATION_API_IP}/api/ai-extract-job`,
    requestData,
    { timeout: 60000 }
  );

  if (!flaskResponse.data.success) {
    throw new Error(
      flaskResponse.data.message ||
        'Failed to extract job data from the provided content.'
    );
  }

  logger.info(`AI extraction completed successfully for client: ${clientId}`);

  return {
    success: true,
    message:
      'AI extraction completed. Please review and edit the data before saving.',
    job_data: flaskResponse.data.job_data,
    requires_confirmation: true,
  };
};

/**
 * Save Edited Job Application Service
 *
 * Accepts edited job data after user review
 * Forwards to external application API to save to database
 */
export const saveEditedJob = async (
  clientId: string,
  joblink: string,
  jobData: any,
  user: any
) => {
  logger.info(`Saving edited job application for client: ${clientId}`);

  // Validate required fields
  if (!clientId) throw new Error('Client ID is required');
  if (!jobData) throw new Error('Job data is required');
  if (!joblink) throw new Error('Job link is required');

  // Validate that client exists
  const clientExists = await Credentials.findOne({
    where: {
      id: clientId,
      isDeleted: false,
    },
  });

  if (!clientExists) {
    throw new Error(`Client not found with ID: ${clientId}`);
  }

  const fullName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim();

  let environment = process.env.NODE_ENV || 'development';
  if (environment === 'preview') {
    environment = 'staging';
  }

  logger.info(
    `Saving job application with data: ${JSON.stringify(jobData)} for client: ${clientId} by user: ${fullName}`
  );

  // Prepare data for Flask API
  const requestData = {
    environment,
    client_id: clientId,
    submitted_by: fullName,
    vaEmail: clientExists?.AssignedPCEmail || '',
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
  logger.info(
    `Save Application Payload for user: ${user?.id || 'N/A'} (${user?.email || ''})`,
    requestData
  );

  // Call Flask Save Application API
  const axios = require('axios');
  const flaskResponse = await axios.post(
    `http://${process.env.JOB_APPLICATION_API_IP}/api/save-application`,
    requestData,
    { timeout: 60000 }
  );

  if (!flaskResponse.data.success) {
    throw new Error(
      flaskResponse.data.message || 'Failed to save application to database.'
    );
  }

  logger.info(`Job application saved successfully for client: ${clientId}`);

  return {
    success: true,
    message: 'Application saved successfully to database.',
    data: flaskResponse.data,
  };
};

export const saveManualApplication = async (
  clientId: string,
  joblink: string,
  jobData: any,
  user: any,
  host: string,
  updatedBy?: string
) => {
  logger.info(`Saving manual application for client: ${clientId}`);

  // Validate required fields
  if (!clientId) throw new Error('Client ID is required');
  if (!jobData) throw new Error('Job data is required');
  if (!joblink) throw new Error('Job link is required');

  // Validate that client exists
  const clientExists = await Credentials.findOne({
    where: {
      id: clientId,
      isDeleted: false,
    },
  });

  if (!clientExists) {
    throw new Error(`Client not found with ID: ${clientId}`);
  }

  const fullName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim();

  logger.info(
    `Saving manual application with data: ${JSON.stringify(
      jobData
    )} for client: ${clientId} by user: ${fullName}`
  );

  const manualApplication = await ManualApplication.create({
    client_id: clientExists.clientId,

    Client: clientId || 'N/A',

    Job_Title:
      joblink && jobData.job_title
        ? `=HYPERLINK("${joblink}","${jobData.job_title}")`
        : jobData.job_title || 'N/A',

    JobId: jobData.job_id || 'N/A',
    Internal_Jobsite: jobData.internal_jobsite || 'N/A',

    External_Jobsite: jobData.external_jobsite || 'N/A',

    Job_Type: jobData.job_type || 'N/A',

    Advertiser: jobData.company || 'N/A',

    Location: jobData.location || 'N/A',

    Country: jobData.country || 'N/A',

    Status: 'UNATTENDED',

    // Discovery details
    DiscoveredBy: fullName || null,
    DiscoveryDate: new Date(),

    // Not submitted yet
    ApplicationSubmittedBy: null,
    ApplicationSubmissionDate: null,

    // Not vetted yet
    VettedBy: null,
    VettedDate: null,

    QualityScore: null,

    isDeleted: false,
  });

  logger.info(
    `Manual application saved successfully. ID: ${manualApplication.id}`
  );

  const userObj = await User.findOne({
    where: { id: clientExists.clientId },
  });

  if (!userObj) {
    logger.warn('User not found');
  }

  const dpcName = await getSlackIdOrName(
    clientExists?.AssignedPCEmail,
    clientExists?.AssignedPCName
  );
  const vpcName = await getSlackIdOrName(
    clientExists?.AssignedVetEmail,
    clientExists?.AssignedVetName
  );

  const message = `
    :mag: *JOB DISCOVERED — Awaiting Vetting*

    • *DPC:* ${dpcName}
    • *Client:* ${userObj?.firstName} ${userObj?.middleName} ${userObj?.lastName}
    • *Job:* <${joblink}|${jobData.job_title}>
    • *Company:* ${jobData.company || 'N/A'}
    • *Location:* ${jobData.location || 'N/A'}
    • *Source:* ${jobData.job_site_name || 'N/A'}
    • *Status:* Unattended
    • *Environment:* ${host}

    ${vpcName} please vet within 4 hours.
    `;

  setImmediate(async () => {
    try {
      await SlackService.notify({
        location: getEnvironmentFromHost(host || ''),
        host: host || '',
        node: SlackNode.HUMAN_RESOURCE,
        provider: SlackProvider.HUBSTAFF,
        severity: SlackSeverity.INFO,
        trigger: updatedBy,
        type: SlackEventType.USER_TRIGGERED,
        channel: SlackChannel.CRY_WOLF,
        body: message,
      });
    } catch (err) {
      logger.error(`❌ Slack notification failed: ${err}`);
    }
  });

  return {
    success: true,
    message: 'Manual application saved successfully.',
    data: manualApplication,
  };
};

export const updateJobApplicationStatus = async (
  applicationId: string,
  status: string,
  user: any,
  qualityScore?: string | null,
  host: string,
  updatedBy?: string
) => {
  logger.info(
    `Updating manual application status for applicationId: ${applicationId}`
  );
  console.log(status);

  if (!applicationId) throw new Error('Application ID is required');
  if (!status) throw new Error('Status is required');

  const application = await ManualApplication.findOne({
    where: {
      id: applicationId,
      isDeleted: false,
    },
  });

  if (!application) {
    throw new Error(`Manual application not found with ID: ${applicationId}`);
  }

  const fullName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim();
  const statusUpper = status.toUpperCase();
  const currentDate = new Date();

  const updateData: any = {
    Status: statusUpper,
    updatedAt: currentDate,
  };

  // Validate that client exists
  const clientExists = await Credentials.findOne({
    where: {
      clientId: application.client_id,
      isDeleted: false,
    },
  });

  if (!clientExists) {
    throw new Error(`Client not found with ID: ${application?.client_id}`);
  }

  const userObj = await User.findOne({
    where: { id: clientExists.clientId },
  });

  if (!userObj) {
    logger.warn('User not found');
  }

  const dpcName = await getSlackIdOrName(
    clientExists?.AssignedPCEmail,
    clientExists?.AssignedPCName
  );

  const vpcName = await getSlackIdOrName(
    clientExists?.AssignedVetEmail,
    clientExists?.AssignedVetName
  );

  const spcName = await getSlackIdOrName(
    clientExists?.AssignedCompletedEmail,
    clientExists?.AssignedCompletedName
  );

  const match = application.Job_Title.match(
    /=HYPERLINK\("([^"]+)","([^"]+)"\)/i
  );

  const jobTitleUrl = match
    ? {
        url: match[1],
        title: match[2],
      }
    : null;

  const qualityEmoji =
    qualityScore === 'HQA'
      ? ':large_green_circle:'
      : qualityScore === 'MQA'
        ? ':large_orange_circle:'
        : ':red_circle:';
  const terminalEmoji =
    status.toLowerCase() === 'expired' ? ':hourglass:' : ':arrow_right_hook:';
  const toTitleCase = (value?: string) =>
    value
      ? value.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
      : 'N/A';

  let message = `${terminalEmoji} *JOB ${status}*

    • *VPC:* ${vpcName}
    • *DPC:* ${dpcName}
    • *Client:* ${userObj?.firstName} ${userObj?.middleName} ${userObj?.lastName}
    • *Job:* <${jobTitleUrl?.url || 'N/A'}|${jobTitleUrl?.title || 'N/A'}>
    • *Company:* ${application.Advertiser}
    • *Status:* ${toTitleCase(status)}
    • *Environment:* ${host}

    ${dpcName} please find another job for ${userObj?.firstName} ${userObj?.middleName} ${userObj?.lastName}.`;

  if (statusUpper === 'VETTED') {
    if (qualityScore == null || qualityScore === '') {
      throw new Error('qualityScore is required when status is VETTED');
    }

    updateData.QualityScore = qualityScore;
    updateData.VettedBy = fullName || null;
    updateData.VettedDate = currentDate;

    message = `
      :white_check_mark: *JOB VETTED* — ${qualityScore}

      • *VPC:* ${vpcName}
      • *Client:* ${userObj?.firstName} ${userObj?.middleName} ${userObj?.lastName}
      • *Job:* <${jobTitleUrl?.url || 'N/A'}|${jobTitleUrl?.title || 'N/A'}>
      • *Company:* ${application.Advertiser}
      • *Quality:* ${qualityScore} ${qualityEmoji}
      • *Status:* Vetted
      • *Environment:* ${host}

      ${spcName} please submit.
    `;
  } else if (statusUpper === 'SUBMITTED' || statusUpper === 'SUBMITTTED') {
    updateData.ApplicationSubmittedBy = fullName || null;
    updateData.ApplicationSubmissionDate = currentDate;
  }

  await application.update(updateData);

  if (statusUpper === 'SUBMITTED' || statusUpper === 'SUBMITTTED') {
    message = `
      :inbox_tray: *JOB SUBMITTED* — Lifecycle Complete

      • *SPC:* ${spcName}
      • *Client:* ${userObj?.firstName} ${userObj?.middleName} ${userObj?.lastName}
      • *Job:* <${jobTitleUrl?.url || 'N/A'}|${jobTitleUrl?.title || 'N/A'}>
      • *Company:* ${application.Advertiser}
      • *Location:* ${application.Location}
      • *Source:* N/A
      • *Quality:* ${application.QualityScore}
      • *Status:* Submitted
      • *Environment:* ${host}
    `;

    const fullName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim();

    let environment = process.env.NODE_ENV || 'development';
    if (environment === 'preview') {
      environment = 'staging';
    }

    logger.info(
      `Saving job application for client: ${clientExists.id} by user: ${fullName}`
    );

    // Prepare data for Flask API
    const requestData = {
      environment,
      client_id: clientExists.id,
      submitted_by: fullName,
      vaEmail: clientExists?.AssignedPCEmail || '',
      job_data: {
        job_title: jobTitleUrl?.title || 'N/A',
        company: application.Advertiser,
        location: application.Location,
        job_url: jobTitleUrl?.url || 'N/A',
        job_id: application.JobId,
        job_type: application.Job_Type,
        country: application.Country,
        internal_jobsite: application.Internal_Jobsite || 'C2C',
        external_jobsite: application.External_Jobsite,
      },
    };
    console.log(requestData);

    // Log payload with user information
    logger.info(
      `Save Application Payload for user: ${user?.id || 'N/A'} (${user?.email || ''})`,
      requestData
    );

    // Call Flask Save Application API
    const axios = require('axios');
    const flaskResponse = await axios.post(
      `http://${process.env.JOB_APPLICATION_API_IP}/api/save-application`,
      requestData,
      { timeout: 60000 }
    );

    if (!flaskResponse.data.success) {
      throw new Error(
        flaskResponse.data.message || 'Failed to save application to database.'
      );
    }

    logger.info(
      `Job application saved successfully for client: ${clientExists.id}`
    );
  }

  setImmediate(async () => {
    try {
      await SlackService.notify({
        location: getEnvironmentFromHost(host || ''),
        host: host || '',
        node: SlackNode.HUMAN_RESOURCE,
        provider: SlackProvider.HUBSTAFF,
        severity: SlackSeverity.INFO,
        trigger: updatedBy,
        type: SlackEventType.USER_TRIGGERED,
        channel: SlackChannel.CRY_WOLF,
        body: message,
      });
    } catch (err) {
      logger.error(`❌ Slack notification failed: ${err}`);
    }
  });

  logger.info(
    `Manual application updated successfully for applicationId: ${applicationId}`
  );

  return {
    success: true,
    message: 'Manual application status updated successfully.',
    data: application,
  };
};

/**
 * Assign or Unassign VA (PC / Vet / Completed) to client profile
 * variant can be: 'PC' (default), 'Vet', 'Completed'
 */
export const assignVAToClient = async (
  credId: string,
  vaEmail: string | null,
  host: string,
  updatedBy?: string,
  variant: 'DPC' | 'VPC' | 'SPC' = 'DPC'
) => {
  logger.info(
    `Processing ${variant} assignment for credId=${credId}, vaEmail=${vaEmail}`
  );

  const resolveFieldNames = (v: 'DPC' | 'VPC' | 'SPC') => {
    if (v === 'VPC') {
      return {
        emailField: 'AssignedVetEmail' as const,
        nameField: 'AssignedVetName' as const,
        displayLabel: 'VPC',
        slackChannel: SlackChannel.VA,
      };
    }
    if (v === 'SPC') {
      return {
        emailField: 'AssignedCompletedEmail' as const,
        nameField: 'AssignedCompletedName' as const,
        displayLabel: 'SPC',
        slackChannel: SlackChannel.VA,
      };
    }
    return {
      emailField: 'AssignedPCEmail' as const,
      nameField: 'AssignedPCName' as const,
      displayLabel: 'DPC',
      slackChannel: SlackChannel.VA,
    };
  };

  const fields = resolveFieldNames(variant);

  const isUnassign =
    !vaEmail ||
    vaEmail.trim() === 'Unassigned' ||
    vaEmail.trim() === 'Unassign' ||
    vaEmail.trim() === 'unassign';

  const targetCred = await Credentials.findOne({ where: { id: credId } });
  if (!targetCred) {
    logger.warn(`Client profile not found for credId=${credId}`);
    throw new Error('Client profile not found');
  }

  const user = await User.findOne({
    where: { id: targetCred.clientId },
  });

  if (!user) {
    logger.warn('User not found');
  }

  const fullName = `${user?.firstName} ${user?.middleName} ${user?.lastName}`;

  if (isUnassign) {
    logger.info(`Unassigning ${fields.displayLabel} for credId=${credId}`);

    const currentEmail = (targetCred as any)[fields.emailField];
    let tagName = `Previously assigned ${fields.displayLabel}`;

    if (currentEmail) {
      const targetUser = await User.findOne({
        where: { email: currentEmail },
      });

      if (targetUser) {
        const slackId = await getSlackIdByEmail(currentEmail);
        tagName = slackId
          ? `<@${slackId}>`
          : `${targetUser.firstName} ${targetUser.lastName}`;
      } else {
        logger.warn(
          `${fields.displayLabel} not found for email=${currentEmail}`
        );
        const currentName = (targetCred as any)[fields.nameField];
        tagName = currentName || currentEmail;
      }
    }

    const message = `${fields.displayLabel} Unassignment for ${fullName}.
*Success*: ${tagName} has been unassigned specifically from this client profile.
*Immediate Impact*: ${tagName} no longer has responsibility for this client's tasks.
*Next Step*: Team to hand over any pending items if applicable.`;

    setImmediate(async () => {
      try {
        await SlackService.notify({
          location: getEnvironmentFromHost(host || ''),
          host: host || '',
          node: SlackNode.HUMAN_RESOURCE,
          provider: SlackProvider.HUBSTAFF,
          severity: SlackSeverity.INFO,
          trigger: updatedBy,
          type: SlackEventType.USER_TRIGGERED,
          channel: fields.slackChannel,
          body: message,
        });
      } catch (err) {
        logger.error(`❌ Slack notification failed: ${err}`);
      }
    });

    await targetCred.update({
      [fields.nameField]: null,
      [fields.emailField]: null,
      updatedBy: updatedBy,
    } as any);

    logger.info(
      `${fields.displayLabel} unassigned successfully for credId=${credId}`
    );

    return {
      success: true,
      message: `${fields.displayLabel} unassigned successfully`,
      variant,
    };
  }

  // --- Assignment ---
  const targetVa = await User.findOne({ where: { email: vaEmail } });
  if (!targetVa) {
    logger.warn(`${fields.displayLabel} not found for email=${vaEmail}`);
    throw new Error(`${fields.displayLabel} not found`);
  }

  await targetCred.update({
    [fields.emailField]: vaEmail,
    [fields.nameField]: `${targetVa.firstName} ${targetVa.lastName}`,
    updatedBy: updatedBy,
  } as any);

  const slackId = vaEmail ? await getSlackIdByEmail(vaEmail) : null;
  const tagName = slackId
    ? `<@${slackId}>`
    : `${targetVa?.firstName} ${targetVa?.lastName}`;

  const message = `${fields.displayLabel} Assignment for ${fullName}.
*Success*: ${tagName} has been assigned to this client profile.
*Immediate Impact*: ${tagName} now has responsibility for this client's tasks.
*Next Step*: ${tagName} should review the client's profile and begin support.`;

  setImmediate(async () => {
    try {
      await SlackService.notify({
        location: getEnvironmentFromHost(host || ''),
        host: host || '',
        node: SlackNode.HUMAN_RESOURCE,
        provider: SlackProvider.HUBSTAFF,
        severity: SlackSeverity.INFO,
        trigger: updatedBy,
        type: SlackEventType.USER_TRIGGERED,
        channel: fields.slackChannel,
        body: message,
      });
    } catch (err) {
      logger.error(`❌ Slack notification failed: ${err}`);
    }
  });

  logger.info(
    `${fields.displayLabel} assigned successfully for credId=${credId} to ${vaEmail}`
  );

  return {
    success: true,
    message: `${fields.displayLabel} updated successfully`,
    variant,
    vaName: `${targetVa?.firstName} ${targetVa?.lastName}`,
    vaEmail: vaEmail,
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
export const submitJobMatchRequest = async (
  options: TriggerOptions,
  requestorId?: string
) => {
  logger.info(`Submitting job match request for client: ${options.clientId}`);

  const redis = await getConnectedRedis();
  if (!redis) {
    throw new Error('Redis connection unavailable');
  }

  const payload: TriggerOptions = {
    ...options,
    requestor: requestorId || '',
  };

  const redisQueue = 'JOB_MATCH';
  const redisValue = JSON.stringify(payload);

  await redis.lpush(redisQueue, redisValue);

  logger.info(`Job match request added to Redis queue: ${redisQueue}`);

  return {
    success: true,
    message: 'Job match submitted for processing',
    payload,
  };
};

/**
 * CAMPAIGN CLIENT CRUD OPERATIONS
 */

/**
 * Get campaign clients list with filters
 */
export const getCampaignClients = async (
  active: string = 'true',
  searchQuery?: string,
) => {
  logger.info(
    `Fetching campaign clients, active: ${active}, search: ${searchQuery || "none"}`,
  );

  let whereClause: any = {};

  if (active === 'all') {
    whereClause = {};
  } else if (active === 'false') {
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
          Sequelize.fn(
            'LOWER',
            Sequelize.literal(`"seekExternalCredentials"->>'First_Name'`)
          ),
          Op.like,
          searchTerm.toLowerCase()
        ),
        Sequelize.where(
          Sequelize.fn(
            'LOWER',
            Sequelize.literal(`"seekExternalCredentials"->>'Last_Name'`)
          ),
          Op.like,
          searchTerm.toLowerCase()
        ),
        Sequelize.where(
          Sequelize.fn(
            'LOWER',
            Sequelize.literal(`"seekExternalCredentials"->>'Full_Name'`)
          ),
          Op.like,
          searchTerm.toLowerCase()
        ),
        // Also search top level fields
        { seekEmail: { [Op.iLike]: searchTerm } },
      ],
    };
  }

  const campaigns = await Credentials.findAll({
    where: whereClause,
    order: [["createdAt", "DESC"]],
    raw: true
  });

  // Fetch user profiles and their aggregators for each client
  const campaignsWithAggregators: any[] = [];

  for (const client of campaigns) {
    try {
      let aggregators: any[] = [];
      if (client.clientId) {
        aggregators = await Aggregator.findAll({
          where: { userId: client.clientId, isDeleted: false },
          raw: true,
        });
      }
      campaignsWithAggregators.push({ ...client, aggregators });
    } catch (err) {
      logger.warn(`Could not fetch aggregators for client ${client.id}:`, err);
      campaignsWithAggregators.push({ ...client, aggregators: [] });
    }
  }

  const totalCount = await Credentials.count({ where: whereClause });

  logger.info(
    `Found ${campaigns.length} campaign clients (total: ${totalCount})`
  );

  return {
    campaigns: campaignsWithAggregators,
    totalCount,
  };
};

/**
 * Get single campaign client by ID
 */
export const getCampaignClientById = async (clientId: string) => {
  logger.info(`Fetching campaign client: ${clientId}`);

  if (!clientId) {
    throw new Error('Client ID is required');
  }

  const clientData = await Credentials.findByPk(clientId, { raw: true });

  if (!clientData) {
    throw new Error('Client not found');
  }

  // Fetch associated user and profile for application statistics
  const user = await User.findOne({ where: { id: clientId } });
  let applicationCounts = {
    totalApplications: 0,
    successfulApplications: 0,
    failedApplications: 0,
  };

  if (user && user.profileId) {
    const profile = await Profile.findByPk(user.profileId);
    if (profile) {
      const profileData = profile.toJSON() as any;
      applicationCounts = {
        totalApplications: profileData.totalApplications || 0,
        successfulApplications: profileData.successfulApplications || 0,
        failedApplications: profileData.failedApplications || 0,
      };
    }
  }

  let aggregators: any[] = [];
  if (clientData.clientId) {
    aggregators = await Aggregator.findAll({
      where: { userId: clientData.clientId, isDeleted: false },
      raw: true,
    });
  }

  return {
    ...clientData,
    ...applicationCounts,
    aggregators,
  };
};

/**
 * Get user preferences by user ID
 * @param userId User ID
 * @param preferenceType Optional preference type: 'primary' | 'secondary'
 * @returns Requested preference fields or complete profile including both primary and secondary fields
 */
export const getUserPreferencesByUserId = async (
  userId: string,
  preferenceType?: 'primary' | 'secondary'
) => {
  logger.info(
    `Fetching ${preferenceType || 'all'} user preferences for user ID: ${userId}`
  );

  if (!userId) {
    throw new Error('User ID is required');
  }

  const user = await User.findOne({ where: { id: userId } });

  if (!user) {
    throw new Error('User not found');
  }

  if (!user.profileId) {
    throw new Error('User profile not found');
  }

  // Fetch profile and cast to any to bypass TypeScript field checking
  const profile = (await Profile.findByPk(user.profileId, {
    raw: true,
  })) as any;

  if (!profile) {
    throw new Error('Profile not found for user');
  }

  // If specific preference type requested, return only those fields
  if (preferenceType === 'primary') {
    return {
      userId,
      preferenceType: 'primary',
      profile,
    };
  }

  if (preferenceType === 'secondary') {
    return {
      userId,
      preferenceType: 'secondary',
      profile,
    };
  }

  // Return complete profile including ALL fields (both primary and secondary)
  return profile;
};

/**
 * Toggle campaign flight status (Launch / Land)
 * Toggles between INFLIGHT and HOLD status with all associated fields
 */
export const landOrLaunchCampaign = async (
  clientId: string,
  host: string,
  triggeredBy?: string
) => {
  logger.info(`Toggling campaign flight status for client: ${clientId}`);

  if (!clientId) {
    throw new Error('Client ID is required');
  }

  const cred = await Credentials.findOne({
    where: { id: clientId },
  });

  if (!cred) {
    throw new Error('Credential not found');
  }

  const credData = cred.toJSON() as any;
  const jsonb = credData.seekExternalCredentials || {};
  const clientName =
    `${jsonb.First_Name || ''} ${jsonb.Last_Name || ''}`.trim() ||
    `Client #${clientId}`;
  const clientEmail = jsonb.Alias_Email || credData.seekEmail || 'unknown';
  const planName = jsonb.Plan || 'Unknown';

  let message: string;
  let newStatus: string;
  let slackTrigger: string;
  let slackBody: string;

  if (credData.capitalized !== 'INFLIGHT') {
    await cred.update({
      capitalized: 'INFLIGHT',
      Active: true,
      SeekAnswerPriority: true,
      SeekAggregator: true,
    });
    message = 'Campaign launched successfully!';
    newStatus = 'INFLIGHT';

    slackTrigger = `Campaign launched for ${clientName}`;
    slackBody = `*Client:* ${clientName} (${clientEmail})
*Plan:* ${planName}
*Status:* FLIGHT (Active)
*Triggered By:* ${triggeredBy || 'System'}

*Next Steps:*
• Verify aggregators are submitting applications
• Monitor application return count over the next 24–48 hours
• Confirm Seek credentials are active and not locked
• Check Answer Priority is enabled for queue processing`;
  } else {
    await cred.update({
      capitalized: 'HOLD',
      Active: false,
      SeekAnswerPriority: false,
      SeekAggregator: false,
    });
    message = 'Campaign landed successfully!';
    newStatus = 'HOLD';

    slackTrigger = `Campaign landed for ${clientName}`;
    slackBody = `*Client:* ${clientName} (${clientEmail})
*Plan:* ${planName}
*Status:* HOLD (Inactive)
*Triggered By:* ${triggeredBy || 'System'}

*Next Steps:*
• Confirm with the team the reason for landing (completed, issue, or manual pause)
• If paused due to an issue, log it and assign for resolution
• Update the client record notes if applicable
• Schedule relaunch when ready`;
  }

  setImmediate(async () => {
    try {
      const location = getEnvironmentFromHost(host);
      await SlackService.notify({
        location,
        host,
        node: SlackNode.MESSAGING,
        provider: SlackProvider.CLARITY,
        severity: SlackSeverity.INFO,
        trigger: slackTrigger,
        type: SlackEventType.ADMIN_ACTION,
        channel: SlackChannel.VA,
        teamMentions: 'CSM',
        body: slackBody,
      });
    } catch (err) {
      logger.error(`❌ Slack notification failed: ${err}`);
    }
  });

  logger.info(`Campaign status updated: ${message} for client: ${clientId}`);

  return {
    success: true,
    message,
    clientId,
    newStatus,
  };
};

/**
 * Get user documents with preferences for document review
 * Returns user uploaded documents and profile preferences
 */
export const getDocumentReviewData = async (userId: string) => {
  logger.info(`Fetching document review data for user: ${userId}`);

  if (!userId) {
    throw new Error('User ID is required');
  }

  // Retrieve user uploaded documents
  const userDocs = await Upload.findAll({
    where: { userId, isDeleted: false },
  });

  // Retrieve user profile preferences
  const userData = await User.findByPk(userId, {
    attributes: ['profileId', 'country'],
  });

  let userPreference: any = null;
  if (userData && userData.profileId) {
    userPreference = (await Profile.findByPk(userData.profileId, {
      raw: true,
    })) as any;
    if (userPreference && !userPreference.country) {
      userPreference.country = userData.country;
    }
  }

  logger.info(
    `Document review data retrieved successfully for user: ${userId}`
  );

  return {
    userDocs: userDocs || [],
    userPreference,
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
 *
 * Most editable fields (First_Name, Last_Name, Plan, Country, aggregator flags, etc.)
 * are stored inside the seekExternalCredentials JSONB column. Only a handful of fields
 * exist as direct columns on the Credentials model. This function routes each incoming
 * field to the right destination so the update actually persists.
 */
export interface UpdateCampaignClientPayload {
  First_Name?: string;
  Middle_Name?: string;
  Last_Name?: string;
  Plan?: string;
  Alias_Email?: string;
  Alias_Password?: string;
  ReturnCount?: string;
  Order?: string;
  Assurance?: string;
  SeekSubStartDate?: string;
  SeekSubDurDays?: number;
  GraceDuration?: number;
  Capitalized?: string;
  Country?: string;
  Active?: boolean;
  SeekAnswerPriority?: boolean;
  Seek_Aggregator?: boolean;
  Reed_Aggregator?: boolean;
  Jora_Aggregator?: boolean;
  Adzuna_Aggregator?: boolean;
  CareerOne_Aggregator?: boolean;
  Batch?: string;
  Craft?: string;
  /** Internal wrapper — some callers nest the payload under a .data key */
  data?: Omit<UpdateCampaignClientPayload, 'data'>;
  aggregators?: Array<Record<string, unknown>>;
  updatedBy?: string;
  updatedAt?: string;
}

export const updateCampaignClient = async (
  id: string,
  data: UpdateCampaignClientPayload,
  requestorName?: string,
  host?: string
) => {
  logger.info(`Updating campaign client: ${id}`);

  if (!data || Object.keys(data).length === 0) {
    throw new Error('Data is required for update');
  }
  if (!id) {
    throw new Error('ID is required');
  }

  const userInfo = await Credentials.findOne({ where: { id } });
  if (!userInfo) {
    throw new Error('Client not found');
  }

  // Handle nested data payload structure (fields may be inside a .data wrapper)
  const actualData = data.data || data;

  // Use a loose record so delete and string-trim operations are type-safe
  const updateData: Record<string, unknown> = { ...actualData };

  // Detect flight status trigger before processing
  // When Capitalized is HOLD or FLIGHT/INFLIGHT, landOrLaunchCampaign handles the
  // capitalized column + associated side effects (Active, SeekAnswerPriority, SeekAggregator, Slack)
  const incomingCapitalized = (updateData['Capitalized'] as string | undefined)
    ?.trim()
    .toUpperCase();
  const isFlightTrigger =
    incomingCapitalized === 'HOLD' ||
    incomingCapitalized === 'FLIGHT' ||
    incomingCapitalized === 'INFLIGHT';
  if (isFlightTrigger) {
    delete updateData['Capitalized'];
  }

  // Never touch immutable / foreign-key fields
  delete updateData['clientId'];
  delete updateData['id'];
  delete updateData['createdAt'];

  // Trim string fields
  for (const key in updateData) {
    if (typeof updateData[key] === 'string') {
      updateData[key] = (updateData[key] as string).trim();
    }
  }

  // Pull out non-column fields before processing
  const {
    aggregators: aggregatorUpdates,
    updatedBy: _updatedBy,
    updatedAt: _updatedAt,
    ...fieldsToUpdate
  } = updateData;

  // Fields that exist as direct columns on the Credentials model
  const DIRECT_COLUMN_FIELDS = new Set([
    'Active',
    'SeekAnswerPriority',
    'SeekSubStartDate',
    'seekEmail',
    'seekPassword',
    'seekCredentialsTest',
    'seekCredentialsTestDate',
    'currentCity',
    'onboardingDate',
    'criteriaReviewCompleted',
    'referrer',
    'blacklisted',
    'seekLoginType',
    'AssignedPCName',
    'AssignedPCEmail',
    'AssignedVetName',
    'AssignedVetEmail',
    'AssignedCompletedName',
    'AssignedCompletedEmail',
  ]);

  // Form field names that must be renamed to match the actual Credentials column name
  const COLUMN_NAME_MAP: Record<string, string> = {
    Capitalized: 'capitalized', // form sends PascalCase, column is camelCase
    Seek_Aggregator: 'SeekAggregator', // form uses underscore, column does not
  };

  const directUpdates: Record<string, any> = {};
  const jsonbUpdates: Record<string, any> = {};

  for (const [key, value] of Object.entries(fieldsToUpdate)) {
    if (COLUMN_NAME_MAP[key] !== undefined) {
      // Rename and write to the direct column
      directUpdates[COLUMN_NAME_MAP[key]] = value;
      // Also mirror into JSONB so read queries that pull from seekExternalCredentials stay consistent
      jsonbUpdates[key] = value;
    } else if (DIRECT_COLUMN_FIELDS.has(key)) {
      directUpdates[key] = value;
    } else {
      // Everything else (First_Name, Last_Name, Plan, Country, all aggregator booleans,
      // Alias_Email, Alias_Password, Batch, Craft, Status, VaName, Assurance, etc.)
      // is stored in the seekExternalCredentials JSONB column
      jsonbUpdates[key] = value;
    }
  }

  // Merge JSONB updates into the existing seekExternalCredentials object
  if (Object.keys(jsonbUpdates).length > 0) {
    const existingData = userInfo.toJSON() as any;
    const existingJsonb = existingData.seekExternalCredentials || {};
    directUpdates.seekExternalCredentials = {
      ...existingJsonb,
      ...jsonbUpdates,
    };
  }

  // Record who performed the update
  if (requestorName) {
    directUpdates['updatedBy'] = requestorName;
  }

  // Apply the update
  if (Object.keys(directUpdates).length > 0) {
    await userInfo.update(directUpdates as any, {
      fields: Object.keys(directUpdates),
    });
  }

  // When SeekSubStartDate changes, find the user's plan via Credentials.clientId,
  // use plan.validityPeriod to compute the new end date, and sync all date/duration fields
  if (fieldsToUpdate.SeekSubStartDate && userInfo.clientId) {
    const rawDate = fieldsToUpdate.SeekSubStartDate as string;
    // Accepts DD-MM-YYYY (datepicker) or ISO YYYY-MM-DD
    const parts =
      rawDate.includes('-') && rawDate.split('-')[0].length === 2
        ? rawDate.split('-')
        : null;
    const startDate = parts
      ? new Date(`${parts[2]}-${parts[1]}-${parts[0]}`)
      : new Date(rawDate);

    if (!isNaN(startDate.getTime())) {
      // Use the plan title stored in seekExternalCredentials (e.g. "Bronze", "Silver")
      // so we always match the client's current plan, not an old/different one
      const currentJsonb =
        (userInfo.toJSON() as any).seekExternalCredentials || {};
      const planTitle = currentJsonb.Plan as string | undefined;

      const plan = await Plan.findOne({
        where: {
          userId: userInfo.clientId,
          ...(planTitle ? { title: planTitle } : {}),
        },
        order: [['createdAt', 'DESC']],
      });

      if (plan?.validityPeriod) {
        // validityPeriod examples: "6 months", "12 months", "30 days", "1 year"
        const [rawAmount, rawUnit = ''] = plan.validityPeriod
          .trim()
          .split(/\s+/);
        const amount = parseInt(rawAmount, 10);
        const unit = rawUnit.toLowerCase();
        const expiry = new Date(startDate);

        if (unit.startsWith('day')) {
          expiry.setDate(expiry.getDate() + amount);
        } else if (unit.startsWith('month')) {
          expiry.setMonth(expiry.getMonth() + amount);
        } else {
          expiry.setFullYear(expiry.getFullYear() + amount);
        }

        const durationDays = Math.round(
          (expiry.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        // Format expiry as DD-MM-YYYY to match the existing date style
        const dd = String(expiry.getDate()).padStart(2, '0');
        const mm = String(expiry.getMonth() + 1).padStart(2, '0');
        const yyyy = expiry.getFullYear();
        const endDateStr = `${dd}-${mm}-${yyyy}`;

        await plan.update({ expiresAt: expiry, hasExpired: false });

        await userInfo.update({
          seekExternalCredentials: {
            ...currentJsonb,
            SeekSubDurDays: durationDays,
            SeekSubEndDate: endDateStr,
            CampaignEnd: endDateStr,
          },
        } as any);

        logger.info(
          `Plan expiry set to ${endDateStr} (${durationDays} days) for user ${userInfo.clientId} [${planTitle ?? 'unknown plan'}]`
        );
      } else if (plan) {
        logger.warn(
          `Plan found for user ${userInfo.clientId} but has no validityPeriod — expiry not updated`
        );
      } else {
        logger.warn(
          `No plan found for user ${userInfo.clientId} — expiry not updated`
        );
      }
    }
  }

  // Update aggregator records if provided
  if (
    aggregatorUpdates &&
    Array.isArray(aggregatorUpdates) &&
    aggregatorUpdates.length > 0 &&
    userInfo.clientId
  ) {
    for (const aggUpdate of aggregatorUpdates) {
      const {
        id: aggId,
        userId: _userId,
        createdAt: _aggCreatedAt,
        ...aggFields
      } = aggUpdate;
      if (aggId) {
        await Aggregator.update(aggFields, {
          where: { id: aggId, userId: userInfo.clientId },
        });
      }
    }
  }

  // Trigger flight toggle after the main update so landOrLaunchCampaign
  // reads the original capitalized state and applies all side effects
  if (isFlightTrigger) {
    await landOrLaunchCampaign(id, host || 'localhost', requestorName);
  }

  const updatedRecord = await Credentials.findByPk(id);
  logger.info(
    `Campaign client ${id} updated by: ${requestorName || 'unknown'}`
  );
  return updatedRecord!.toJSON();
};

/**
 * Delete single campaign client
 */
export const deleteCampaignClient = async (id: string) => {
  logger.info(`Deleting campaign client: ${id}`);

  if (!id) {
    throw new Error('ID is required');
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
    throw new Error('ID is required');
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
    throw new Error('ID is required');
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
    throw new Error('ID is required');
  }

  const response = await Credentials.destroy({
    where: { id },
    force: true,
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
    throw new Error('IDs are required for bulk delete');
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
export const dispatchSampleResults = async (
  clientId: string,
  host?: string
) => {
  logger.info(`Dispatching sample results for client: ${clientId}`);

  // Find credentials record
  const credentials = await Credentials.findOne({
    where: { id: clientId },
  });

  if (!credentials) {
    throw new Error('Client credentials not found');
  }

  // Find user
  const user = await User.findOne({
    where: { id: credentials.clientId },
    raw: true,
  });

  if (!user) {
    throw new Error('User not found');
  }

  // Find sample test applications
  const Application = require('../models/v1/application.model').Application;

  const sampleApps = await Application.findAll({
    where: {
      client_id: credentials.id,
      Sample_Type: 'Sample Test',
      isDeleted: false,
    },
    limit: 10,
    order: [['createdAt', 'DESC']],
    raw: true,
  });

  if (!sampleApps || sampleApps.length === 0) {
    throw new Error('No samples to dispatch');
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
    throw new Error('Samples already dispatched');
  }

  // Update user profile with sample status
  const Profile = require('../models/v1/profile.model').Profile;
  await Profile.update(
    {
      isSampleDispatched: true,
      isSampleAccepted: false,
      isSampleResultsAccepted: false,
      progress: 'Sample Results Dispatched',
    },
    {
      where: { userId: clientId },
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
      results: sampleApps,
    },
  });

  // Send admin notification email
  await sendMail({
    email: 'deliveryteam@cvtocareer.com',
    subject: `${user.firstName} ${user.lastName} Sample Results are Ready for Review`,
    templateName: 'AdminNotificationTemplate.ejs',
    templateDir: mailDirectory,
    templateData: {
      firstname: user.firstName,
      link: `${process.env.FRONTEND_URL}/admin/campaign-mgt/client/${clientId}`,
      email: user.email,
    },
  });

  // Send Slack notification
  setImmediate(async () => {
    try {
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
          *Next Step*: Admin to wait for user acceptance or feedback.`,
      });

      logger.info(
        `Successfully dispatched ${sampleApps.length} samples for client: ${user.email}`
      );
    } catch (err) {
      logger.error(`❌ Slack notification failed: ${err}`);
    }
  });

  return {
    success: true,
    message: 'Samples dispatched successfully',
    samplesCount: sampleApps.length,
    updatedRecords: updateResult[0],
  };
};

/**
 * Get all applications for a specific client by their client_id,
 * with optional filters (status, source, aggregator, isDeleted) and pagination.
 */
export const getClientApplicationsByClientId = async (
  clientId: string,
  page: number = 1,
  pageSize: number = 50,
  filters?: {
    isDeleted?: boolean;
    status?: string;
    source?: string;
    aggregator?: string;
  }
) => {
  logger.info(
    `Fetching applications for client_id: ${clientId} (page: ${page}, size: ${pageSize})`
  );

  const where: Record<string, any> = { client_id: clientId };

  where.isDeleted =
    filters?.isDeleted !== undefined ? filters.isDeleted : false;

  if (filters?.status && filters.status !== 'all') {
    where.Status = filters.status;
  }
  if (filters?.source && filters.source !== 'all') {
    where.Run_Source = filters.source;
  }
  if (filters?.aggregator && filters.aggregator !== 'all') {
    where.Internal_Jobsite = filters.aggregator;
  }

  const { count, rows } = await Application.findAndCountAll({
    where,
    include: [
      {
        model: User,
        as: 'user',
        attributes: ['id', 'email', 'firstName', 'lastName'],
      },
    ],
    order: [['createdAt', 'DESC']],
    limit: pageSize,
    offset: (page - 1) * pageSize,
    raw: true,
    nest: true,
  });

  const uniqueCount = await Application.count({
    where,
    distinct: true,
    col: 'JobId',
  });

  logger.info(`Found ${count} applications for client_id ${clientId}`);

  return {
    data: rows,
    pagination: {
      totalCount: count,
      currentPage: page,
      pageSize,
      totalPages: Math.ceil(count / pageSize),
    },
    uniqueCount,
  };
};

export const getClientManualApplicationsByClientId = async (
  clientId: string,
  page: number = 1,
  pageSize: number = 15,
  filters?: {
    isDeleted?: boolean;
    status?: string;
    source?: string;
    aggregator?: string;
  }
) => {
  logger.info(
    `Fetching applications for client_id: ${clientId} (page: ${page}, size: ${pageSize})`
  );

  const where: Record<string, any> = { Client: clientId };

  where.isDeleted =
    filters?.isDeleted !== undefined ? filters.isDeleted : false;

  if (filters?.status && filters.status !== 'all') {
    where.Status = filters.status;
  }
  if (filters?.source && filters.source !== 'all') {
    where.Run_Source = filters.source;
  }
  if (filters?.aggregator && filters.aggregator !== 'all') {
    where.Internal_Jobsite = filters.aggregator;
  }

  const { count, rows } = await ManualApplication.findAndCountAll({
    where,
    include: [
      {
        model: User,
        as: 'user',
        attributes: ['id', 'email', 'firstName', 'lastName'],
      },
    ],
    order: [['createdAt', 'DESC']],
    limit: pageSize,
    offset: (page - 1) * pageSize,
    raw: true,
    nest: true,
  });

  const uniqueCount = await ManualApplication.count({
    where,
    distinct: true,
    col: 'JobId',
  });

  logger.info(`Found ${count} applications for client_id ${clientId}`);

  return {
    data: rows,
    pagination: {
      totalCount: count,
      currentPage: page,
      pageSize,
      totalPages: Math.ceil(count / pageSize),
    },
    uniqueCount,
  };
};
