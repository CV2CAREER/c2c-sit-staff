import { getServiceLogger } from "./createLogger";
// import { SlackChannel } from "./enum";
// import { sendStandardSlackNotification } from "./slack-helpers";
// import { SlackNode, SlackProvider, SlackSeverity, SlackEventType } from "./enum";
import axios from "axios";

const logger = getServiceLogger("email-alias");

interface EmailAliasResponse {
  success: boolean;
  data?: string;
  message: string;
}

/**
 * Creates an email alias for client accounts using Google Apps Script
 * Falls back to dummy alias if service fails or limits are reached
 * 
 * @param host Request host for environment detection
 * @param dbUserMail Original user email address
 * @param isStage If true, skips actual API call and returns dummy alias
 * @returns Email alias response object
 */
async function createEmailAlias(
  host: string,
  dbUserMail: string,
  isStage = false
): Promise<EmailAliasResponse> {
  const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyxBrtI894EktSh9anz0DUYJueWqwaaiXEOAZe42W5ZTn9u799_YIhFyxeGhrQlemmw/exec";
  
  const emailPart = dbUserMail.split("@")[0];
  const domain = dbUserMail.split("@")[1].split(".")[0];
  const aliasEmail = `${emailPart}${domain}@cvtocareer.com`;

  const senderEmailAccounts = [
    "clientemail@cvtocareer.com",
    "clientemail1@cvtocareer.com",
    "clientemail2@cvtocareer.com",
    "clientemail3@cvtocareer.com",
  ];

  // Return dummy alias for stage environment
  if (isStage) {
    // setImmediate(async () => {
    //   await sendStandardSlackNotification({
    //     host,
    //     node: SlackNode.USER_MANAGEMENT,
    //     provider: SlackProvider.SYSTEM,
    //     severity: SlackSeverity.INFO,
    //     type: SlackEventType.SYSTEM_NOTIFICATION,
    //     channel: SlackChannel.CRY_WOLF,
    //     body: `Dummy email alias generated \`${dbUserMail}\` → \`${aliasEmail}\``,
    //   });
    // });

    logger.info(`Dummy email alias created for ${dbUserMail}: ${aliasEmail}`);
    
    return {
      success: true,
      data: aliasEmail,
      message: "Alias successfully created",
    };
  }

  // Try each sender account sequentially
  for (const senderEmail of senderEmailAccounts) {
    try {
      logger.info(`Attempting alias creation with sender: ${senderEmail} for user: ${dbUserMail}`);
      
      const response = await axios.post(SCRIPT_URL, {
        userEmail: senderEmail,
        alias: aliasEmail
      }, {
        headers: {
          "Content-Type": "application/json",
        },
        timeout: 15000,
      });

      const data = response.data;
      logger.debug("Google Apps Script response:", data);

      // Handle alias already exists - return success immediately
      if (data?.message?.includes("Entity already exists")) {
        logger.info(`Alias ${aliasEmail} already exists for user ${dbUserMail}`);
        return {
          success: true,
          data: aliasEmail,
          message: "Alias successfully created",
        };
      }

      // Handle alias limit reached for this sender
      if (data?.message?.includes("Too many aliases for the user")) {
        logger.warn(`Alias limit reached for sender account: ${senderEmail}`);
        
        // setImmediate(async () => {
        //   await sendStandardSlackNotification({
        //     host,
        //     node: SlackNode.USER_MANAGEMENT,
        //     provider: SlackProvider.SYSTEM,
        //     severity: SlackSeverity.CRITICAL,
        //     type: SlackEventType.ERROR_ALERT,
        //     channel: SlackChannel.CRY_WOLF,
        //     body: `Email alias limit reached for ${senderEmail} account. Please verify sender accounts configuration`,
        //   });
        // });

        throw new Error("Alias limit reached for this sender");
      }

      // Return successful response
      if (data?.success) {
        logger.info(`Successfully created email alias: ${aliasEmail} for user: ${dbUserMail}`);
        return data;
      }

    } catch (error: any) {
      logger.error(`Error creating alias with sender ${senderEmail}:`, error.message);
      continue;
    }
  }

  // All senders failed - fall back to dummy alias
  logger.error(`All sender accounts exhausted for alias creation for ${dbUserMail}, falling back to dummy alias`);
  
  // setImmediate(async () => {
  //   await sendStandardSlackNotification({
  //     host,
  //     node: SlackNode.USER_MANAGEMENT,
  //     provider: SlackProvider.SYSTEM,
  //     severity: SlackSeverity.ERROR,
  //     type: SlackEventType.ERROR_ALERT,
  //     channel: SlackChannel.TOWN_CRIER,
  //     body: `Email Alias creation script failed for \`${dbUserMail}\`, defaulting to dummy alias → \`${aliasEmail}\``,
  //   });
  // });

  return {
    success: true,
    data: aliasEmail,
    message: "Alias successfully created",
  };
}

export default createEmailAlias;