import { getServiceLogger } from "../utils/createLogger";
import { User } from "../models/v1/user.model";
import { SlackService } from "./slack.service";
import { SlackChannel, SlackEventType, SlackNode, SlackProvider, SlackSeverity } from "../utils/enum";
import { getEnvironmentFromHost } from "../utils/slack-helpers";
import axios from "axios";

const logger = getServiceLogger("dispatch-client-service");

// Dispatch client information to a PC (Placement Control - formerly VA/TPA)
export const dispatchClientToVA = async (
  pcId: string, 
  clientIds: string[], 
  host: string, 
  senderId: string
): Promise<{ successCount: number; failedCount: number; totalClients: number }> => {
  logger.info(`Processing dispatch request for PC ${pcId} with ${clientIds.length} clients`);

  let joinedMessage: string = '';
  let successCount = 0;
  let failedCount = 0;

  for (let i = 0; i < clientIds.length; i++) {
    try {
      const clientId = clientIds[i];
      
      // Get PC (Placement Control) information
      const pc = await User.findByPk(pcId);
      if (!pc) {
        logger.warn(`PC not found: ${pcId}`);
        joinedMessage += `\n Unable to dispatch client ${clientId}: PC not found.`;
        failedCount++;
        continue;
      }

      // Get client information with both primary and secondary profiles
      const client = await User.findByPk(clientId, {
        include: [
          {
            model: User,
            as: 'profile'
          },
          {
            model: User,
            as: 'secondaryProfile'
          }
        ]
      });

      if (!client) {
        logger.warn(`Client not found: ${clientId}`);
        joinedMessage += `\n Unable to dispatch client ${clientId}: Client not found.`;
        failedCount++;
        continue;
      }

      // Get PC Slack ID
      const pcSlackId = await getSlackIdByMail(pc.email);
      
      // Format message for this client
      const message = await formatClientMessage(client, pc, pcSlackId, host, senderId);
      joinedMessage += '\n' + message;
      successCount++;

      logger.info(`Successfully processed client ${clientId} for dispatch to PC ${pcId}`);

    } catch (err: any) {
      logger.error(`Error occurred while dispatching client ${clientIds[i]}: ${err.message}`);
      joinedMessage += `\n Error dispatching client ${clientIds[i]}: ${err.message}`;
      failedCount++;
    }
  }

  // Format the message based on number of clients
  let formattedMessage: string;
  let immediateImpact: string;
  let nextStep: string;

  if (successCount > 0 && failedCount === 0) {
    // All clients dispatched successfully
    immediateImpact = "PC has all necessary details and credentials to begin work for the successful clients.";
    nextStep = "PC to acknowledge receipt and start processing.";
  } else if (successCount > 0 && failedCount > 0) {
    // Some clients dispatched successfully, some failed
    immediateImpact = "PC has all necessary details and credentials to begin work for the successful clients. Some clients failed to dispatch.";
    nextStep = "PC to acknowledge receipt and start processing successful clients. Failed clients need to be retried.";
  } else if (successCount === 0 && failedCount > 0) {
    // All clients failed to dispatch
    immediateImpact = "No clients were successfully dispatched. All dispatch attempts failed.";
    nextStep = "Review the failed dispatches and retry the operation.";
  } else {
    // No clients processed
    immediateImpact = "No clients were processed.";
    nextStep = "No action required.";
  }

  if (clientIds.length === 1) {
    // Single client - show full details
    formattedMessage = `Client dispatch process completed.
*Success*: ${successCount} client(s) successfully formatted and dispatched to PC.
*Failed*: ${failedCount} client(s) failed to dispatch.
*Immediate Impact*: ${immediateImpact}
*Next Step*: ${nextStep}
*Details*:
${joinedMessage}`;
  } else {
    // Multiple clients - show first client details and summarize rest
    const firstClientMessage = joinedMessage.split('\n').slice(0, 15).join('\n'); // Approximate first client details
    const remainingCount = clientIds.length - 1;
    
    formattedMessage = `Client dispatch process completed.
*Success*: ${successCount} client(s) successfully formatted and dispatched to PC.
*Failed*: ${failedCount} client(s) failed to dispatch.
*Immediate Impact*: ${immediateImpact}
*Next Step*: ${nextStep}
*Details*:
${firstClientMessage}
${remainingCount > 0 ? `\n+${remainingCount} more client(s)` : ''}`;
  }

  setImmediate(async () => {
    try {
      await SlackService.notify({
        location: getEnvironmentFromHost(host),
        host,
        node: SlackNode.HUMAN_RESOURCE,
        provider: SlackProvider.GITHUB,
        severity: SlackSeverity.INFO,
        trigger: "Client dispatch",
        type: SlackEventType.USER_TRIGGERED,
        channel: SlackChannel.TOWN_CRIER,
        body: formattedMessage,
        teamMentions: "CSM",
      });
      
      logger.info(`Slack notification sent for dispatch to PC ${pcId}`);
    } catch (err) {
      logger.error(`Failed to send Slack notification: ${err}`);
    }
  });

  return {
    successCount,
    failedCount,
    totalClients: clientIds.length
  };
};

// Helper function to get Slack ID by email
async function getSlackIdByMail(email: string): Promise<string | null> {
  const token = process.env.SLACK_USERS_TOKEN;
  if (!token) {
    logger.warn("SLACK_USERS_TOKEN not configured");
    return null;
  }

  try {
    const response = await axios.get('https://slack.com/api/users.lookupByEmail', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      params: {
        email,
      },
    });

    if (response.data?.ok) {
      return response.data.user?.id;
    }
    return null;
  } catch (err: any) {
    logger.error(`Get Slack ID error for ${email}: ${err.message}`);
    return null;
  }
}

// Helper function to format client message
async function formatClientMessage(client: any, va: any, vaSlackId: string | null, host: string, senderId: string): Promise<string> {
  const vaName = vaSlackId ? `<@${vaSlackId}>` : `${va.firstName} ${va.lastName}`;
  
  let message = `Hello ${vaName}, ${senderId} dispatched a client's information to you.`;
  
  // Determine which profile to use (primary or secondary)
  let profile = client.profile;
  if (!profile && client.secondaryProfile) {
    profile = client.secondaryProfile;
  }
  
  // Add basic client information
  message += `
  
Full Name: \`${client.firstName} ${client.lastName}\`
Craft: ${profile?.role || 'Not specified'}
Min Salary: ${profile?.minSalary || 'Not specified'}
Max Salary: ${profile?.maxSalary || 'Not specified'}
`;

  // Add sample results link if available
  if (client.uniqueId) {
    const sampleUrl = `${host.includes('localhost') ? 'http' : 'https'}://${host}/admin-dashboard/master-sheet/client/${client.uniqueId}?table=sample+Results`;
    message += `Sample Results Link: ${sampleUrl}
`;
  } else {
    message += `Sample Results Link: No Client Profile yet.
`;
  }

  message += `
Aggregators Credentials
`;

  // Add aggregator credentials
  if (profile?.aggregators && Array.isArray(profile.aggregators)) {
    for (const agg of profile.aggregators) {
      const aggregatorName = agg.aggregator?.name || 'Unknown';
      const username = agg.username || '-';
      const password = agg.password || '-';
      
      message += `
\`${aggregatorName}\`
Username: ${username}
Password: ${password}
`;
    }
  } else {
    message += `
No aggregator credentials available.
`;
  }

  return message;
}
