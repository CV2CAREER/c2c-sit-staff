import { SLACK_USERS_TOKEN } from '../config/env';
import { getConnectedRedis } from '../config/redis';
import { getSlackClient } from '../config/slack';
import { StandardSlackNotification } from '../types/slack.types';
import { getServiceLogger } from './createLogger';
import { SlackChannel, SlackLocation } from './enum';
import { isRedisUsable } from './helpers';
import axios from 'axios';

const logger = getServiceLogger('slack-helpers');

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

    // Auto-detect location for channel routing
    const location = params.location ?? getEnvironmentFromHost(params.host);

    let channel = params.channel ?? SlackChannel.CRY_WOLF;
    if (
      channel === SlackChannel.CRY_WOLF &&
      location === SlackLocation.PRODUCTION
    ) {
      channel = SlackChannel.TOWN_CRIER;
    }

    // Add mentions if teammate mentions are requested
    let mentions;
    if (params.teamMentions === 'CSM') {
      const csmSlackMentions = await getSlackUserIdsFromQueue('CSM');
      mentions =
        (csmSlackMentions ?? []).length > 0
          ? csmSlackMentions?.map((id) => `<@${id}>`).join(' ')
          : '';
    } else if (params.teamMentions === 'DEVOPS') {
      const devopsSlackMentions = await getSlackUserIdsFromQueue('DEVOPS');
      mentions =
        (devopsSlackMentions ?? []).length > 0
          ? devopsSlackMentions?.map((id) => `<@${id}>`).join(' ')
          : '';
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
  const host = params.host || process.env.NEXTAUTH_URL || 'localhost';

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
