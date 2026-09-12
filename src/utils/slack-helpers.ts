import {
  IAT_FRONTEND_URL,
  LOCAL_FRONTEND_URL,
  NODE_ENV,
  PROD_FRONTEND_URL,
  RAT_FRONTEND_URL,
  SIT_FRONTEND_URL,
  SLACK_USERS_TOKEN,
  UAT_FRONTEND_URL,
} from '../config/env';
import { getConnectedRedis } from '../config/redis';
import { getSlackClient } from '../config/slack';
import { StandardSlackNotification } from '../types/slack.types';
import { getServiceLogger } from './createLogger';
import { SlackChannel, SlackLocation } from './enum';
import { isRedisUsable } from './helpers';
import axios from 'axios';

const logger = getServiceLogger('slack-helpers');

/**
 * Resolve the LOC host for notifications that do not pass an explicit request
 * host. Maps the currently running NODE_ENV to the matching frontend URL so
 * pre-prod deployments never leak a bare "localhost" into Slack.
 */
const getDefaultHost = (): string => {
  const envHostMap: Record<string, string | undefined> = {
    rat: RAT_FRONTEND_URL,
    iat: IAT_FRONTEND_URL,
    sit: SIT_FRONTEND_URL,
    uat: UAT_FRONTEND_URL,
    prod: PROD_FRONTEND_URL,
    production: PROD_FRONTEND_URL,
    development: LOCAL_FRONTEND_URL,
    local: LOCAL_FRONTEND_URL,
  };
  const env = (NODE_ENV || '').toLowerCase();
  return envHostMap[env] || LOCAL_FRONTEND_URL || 'localhost';
};

export const getEnvironmentFromHost = (host?: string): SlackLocation => {
  const currentHost = host || process.env.NEXTAUTH_URL || '';
  const hostLower = currentHost.toLowerCase();

  if (
    hostLower.includes('localhost') ||
    hostLower.includes('127.0.0.1') ||
    hostLower.includes('3000')
  ) {
    return SlackLocation.LOCALHOST;
  }

  if (
    hostLower.includes('staging') ||
    hostLower.includes('iat') ||
    hostLower.includes('stg') ||
    hostLower.includes('uat') ||
    hostLower.includes('rat') ||
    hostLower.includes('sit')
  ) {
    return SlackLocation.PRODUCTION;
  }

  return SlackLocation.PRODUCTION;
};

export const sendStandardSlackNotification = async (
  params: StandardSlackNotification
): Promise<boolean> => {
  try {
    const formattedMessage = formatStandardNotification(params);

    // Routing is driven by the ACTUAL running environment (NODE_ENV), not the
    // request host — host-based detection was unreliable and let staging
    // noise drown out real production alerts.
    const isProductionEnv = NODE_ENV === 'prod';

    // Outside of true production, EVERYTHING is forced into Cry Wolf —
    // even calls that pass an explicit channel — so pre-prod noise never
    // leaks into channels meant for real alerts. Only in production does
    // the caller's explicit channel (or the Town Crier default) apply.
    let channel: SlackChannel | string;
    if (!isProductionEnv) {
      channel = SlackChannel.CRY_WOLF;
    } else {
      channel = params.channel ?? SlackChannel.TOWN_CRIER;
    }

    // Add mentions if team mentions are requested — only tag real people
    // in production so local/pre-production runs never ping anyone. Split
    // on comma and loop against the whitelist so callers can request
    // multiple teams (e.g. "CSM,WFC"); unknown tags are dropped so a typo
    // can't page an unexpected channel.
    let mentions = '';
    if (NODE_ENV === 'prod' && params.teamMentions) {
      const teams = params.teamMentions
        .split(',')
        .map((t) => t.trim().toUpperCase())
        .filter((t) => ['CSM', 'DEVOPS', 'WFC', 'SPC'].includes(t));

      const mentionParts: string[] = [];
      for (const team of teams) {
        const slackMentions = await getSlackUserIdsFromQueue(team);
        if ((slackMentions ?? []).length > 0) {
          mentionParts.push(...(slackMentions ?? []).map((id) => `<@${id}>`));
        }
      }
      mentions = mentionParts.join(' ');
    }

    const finalMessage = mentions
      ? `${formattedMessage}\n\n${mentions}`
      : formattedMessage;

    await getSlackClient().chat.postMessage({
      channel: channel,
      text: finalMessage,
      username: 'C2C UI Alerter',
      unfurl_links: false,
    });

    return true;
  } catch (error) {
    logger.error('Error sending standardized Slack notification:', error);
    return false;
  }
};

/**
 * Format a StandardSlackNotification into the MANDATORY required message format
 *
 * Target Template Format:
 * [NODE] [PROVIDER] [SEVERITY] [TYPE]
 * LOC: https://uat.cvtocareer.com
 * TRIGGER: Victor Oladimeji
 * DETAILS:
 * Missing Information Request Created
 * • User: victor sit
 * • Email: pretrotrezuju-2406@yopmail.com
 * • Missing Fields:
 *   - Your Address
 * • Job URL: https://www.cvtocareer.com
 * • Action Link: https://cvtocareer.com/missing-info/696fda...
 * TIMESTAMP: 20/01/2026, 20:41:26 (WAT) | 21/01/2026, 06:41:26 (AEST)
 */
export const formatStandardNotification = (
  params: StandardSlackNotification
): string => {
  // Get protocol and host
  const protocol = params.protocol || 'https';
  const host = params.host || process.env.NEXTAUTH_URL || getDefaultHost();

  // Clean up host value
  const cleanHost = host.replace(/^https?:\/\//, '');

  // Build full URL
  const locValue =
    cleanHost.includes('localhost') || cleanHost.includes('127.0.0.1')
      ? 'localhost'
      : cleanHost.includes('://')
        ? cleanHost
        : `${protocol}://${cleanHost}`;

  // Generate timestamps
  const now = new Date();
  const options: Intl.DateTimeFormatOptions = {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  };

  const watTime = new Intl.DateTimeFormat('en-GB', {
    ...options,
    timeZone: 'Africa/Lagos',
  }).format(now);

  const aestTime = new Intl.DateTimeFormat('en-GB', {
    ...options,
    timeZone: 'Australia/Sydney',
  }).format(now);

  // Determine trigger
  let trigger = params.trigger || 'System Action';
  if (params.user) {
    trigger = `${params.user.firstName} ${params.user.lastName}`;
  }

  const header = `[${params.node.toUpperCase()}] [${params.provider.toUpperCase()}] [${params.severity.toUpperCase()}] [${params.type.toUpperCase()}]`;

  const formattedBody = params.body
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join('\n');

  return `${header}
*LOC:* \`${locValue}\`
*TRIGGER:* \`${trigger}\`
*DETAILS:*
${formattedBody}
*TIMESTAMP:* \`${watTime} (WAT) | ${aestTime} (AEST)\``;
};

export const getEmailsFromQueue = async (
  team: string
): Promise<string[] | null> => {
  const redisClient = await getConnectedRedis();

  if (!isRedisUsable(redisClient)) {
    logger.warn('⚠️ Redis not usable, skipping cache lookup');
    return null;
  }

  if (!redisClient) {
    return null;
  }

  const key = team.toUpperCase();
  const values = await redisClient.lrange(key, 0, -1);
  return values.map((e) => e.split(':;')[0]);
};

export const getSlackUserIdsFromQueue = async (team: string) => {
  try {
    const emailsInQueue = await getEmailsFromQueue(team);

    // Fetch Slack user IDs for each email using the Slack API
    const slackIdsPromises = emailsInQueue?.map(async (email: string) => {
      const slackResponse = await axios.post(
        'https://slack.com/api/users.lookupByEmail',
        new URLSearchParams({ email }),
        {
          headers: {
            Authorization: `Bearer ${SLACK_USERS_TOKEN}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      if (slackResponse?.data?.ok) {
        return `${slackResponse?.data?.user?.id}`;
      } else {
        logger.error(
          `Error fetching Slack ID for ${email}:`,
          slackResponse?.data?.error
        );
        return null;
      }
    });

    // Wait for all Slack ID lookups to finish
    const slackIds = slackIdsPromises && (await Promise.all(slackIdsPromises));
    return slackIds?.filter((id) => id !== null);
  } catch (error) {
    console.error('Error fetching users from queue:', error);
    return [];
  }
};

export const getSlackIdByEmail = async (
  email: string
): Promise<string | null> => {
  try {
    const slackResponse = await axios.post(
      'https://slack.com/api/users.lookupByEmail',
      new URLSearchParams({ email }),
      {
        headers: {
          Authorization: `Bearer ${SLACK_USERS_TOKEN}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    if (slackResponse?.data?.ok) {
      return `${slackResponse?.data?.user?.id}`;
    } else {
      logger.error(
        `Error fetching Slack ID for ${email}:`,
        slackResponse?.data?.error
      );
      return null;
    }
  } catch (error) {
    logger.error('Error fetching Slack ID by email:', error);
    return null;
  }
};

export const getSlackIdOrName = async (
  email?: string,
  name?: string
): Promise<string> => {
  if (!email) return '';
  const slackId = await getSlackIdByEmail(email);
  return slackId ? `<@${slackId}>` : `${name || ''}`;
};
