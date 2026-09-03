import { User } from "../models/v1/user.model";
import { Profile } from "../models/v1/profile.model";
import { Upload } from "../models/v1/upload.model";
import { Credentials } from "../models/v1/credentials.model";
import { CvType } from "../utils/enum";
import { getServiceLogger } from "../utils/createLogger";
import { sendStandardSlackNotification } from "../utils/slack-helpers";
import { Aggregator } from "../models/v1/aggregator.model";
import { SlackChannel, SlackSeverity, SlackNode, SlackProvider, SlackEventType } from "../utils/enum";
import { Op } from 'sequelize';
import {
  CampaignClientData,
  CampaignCredentialsData,
} from "../types/campaign.types";

const logger = getServiceLogger("campaign-service");

// Predefined aggregator groups for quick lookup
const AGGREGATOR_GROUPS = {
  global: new Set(['linkedin', 'indeed', 'jora', 'escapecity']),
  australia: new Set(['seek', 'workforceaustralia', 'careerone', 'adzuna', 'michaelpage', 'randstad']),
  'united kingdom': new Set(['monster', 'jobserve', 'reed', 'nhsjobs', 'cvlibrary']),
  canada: new Set(['adecco', 'jobbank']),
};

// Cache for aggregator name to ID mapping
const aggregatorCache = new Map();


/**
 * Get future date from current date by adding days
 */
function getFutureDateFromDays(days: number, formatType: number = 1): string {
  const currentDate = new Date();
  currentDate.setDate(currentDate.getDate() + days);

  const day = String(currentDate.getDate()).padStart(2, "0");
  const month = String(currentDate.getMonth() + 1).padStart(2, "0");
  const year = currentDate.getFullYear();

  switch (formatType) {
    case 2: return `${month}-${day}-${year}`;
    case 3: return `${year}-${month}-${day}`;
    case 4: return `${month}/${day}/${year}`;
    case 5: return `${day}/${month}/${year}`;
    default: return `${day}-${month}-${year}`;
  }
}

/**
 * Resolves a Feature's `validityPeriod` string (e.g. "6 months", "12 months",
 * "14 days", "1 year") into the campaign-management date/day-count pair.
 * Replaces the old hardcoded "Gold = 6 months, everything else = 12 months"
 * guess, which ignored the plan's actual configured duration entirely (e.g.
 * a 6-month Bronze plan was landing on 365 days).
 */
function resolveDurationFromValidityPeriod(
  validityPeriod?: string,
): { campaignEnd: string; subDurDays: number } {
  const [rawValue, rawUnit] = (validityPeriod || "").trim().split(/\s+/);
  const value = parseInt(rawValue, 10);
  const unit = (rawUnit || "").toLowerCase();

  if (!Number.isFinite(value) || value <= 0) {
    // No parseable validityPeriod — fall back to the previous default (12 months)
    return {
      campaignEnd: getFutureDateFromMonth(12) as string,
      subDurDays: getFutureDateFromMonth(12, 1, true) as number,
    };
  }

  if (unit.startsWith("day")) {
    return { campaignEnd: getFutureDateFromDays(value), subDurDays: value };
  }

  const months = unit.startsWith("year") ? value * 12 : value;
  return {
    campaignEnd: getFutureDateFromMonth(months) as string,
    subDurDays: getFutureDateFromMonth(months, 1, true) as number,
  };
}

/**
 * Get future date from current date by adding months
 */
function getFutureDateFromMonth(
  months: number,
  formatType: number = 1,
  days: boolean = false
): string | number {
  const currentDate = new Date();
  currentDate.setMonth(currentDate.getMonth() + months);

  if (days) {
    const today = new Date();
    const difference = Math.ceil(
      (currentDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );
    return difference;
  }

  const day = String(currentDate.getDate()).padStart(2, "0");
  const month = String(currentDate.getMonth() + 1).padStart(2, "0");
  const year = currentDate.getFullYear();

  switch (formatType) {
    case 2:
      return `${month}-${day}-${year}`;
    case 3:
      return `${year}-${month}-${day}`;
    case 4:
      return `${month}/${day}/${year}`;
    case 5:
      return `${day}/${month}/${year}`;
    default:
      return `${day}-${month}-${year}`;
  }
}

/**
 * Check if host is a staging environment
 */
const isStage = (host: string): boolean => {
  const hostLower = host.toLowerCase();
  return (
    hostLower.includes("localhost") ||
    hostLower.includes("127.0.0.1") ||
    hostLower.includes("staging") ||
    hostLower.includes("iat") ||
    hostLower.includes("stg") ||
    hostLower.includes("uat") ||
    hostLower.includes("rat") ||
    hostLower.includes("sit")
  );
};

/**
 * Create email alias - integrates with Google Apps Script email alias service
 */
const createEmailAlias = async (
  host: string,
  email: string,
  isStaging: boolean
): Promise<{ success: boolean; data?: string; message?: string }> => {
  const scriptUrl = 'https://script.google.com/macros/s/AKfycbyxBrtI894EktSh9anz0DUYJueWqwaaiXEOAZe42W5ZTn9u799_YIhFyxeGhrQlemmw/exec';

  let data;

  const emailPart = email.split('@')[0]; // separate the email from the domain
  const domain = email.split('@')[1].split('.')[0]; // get the domain
  const aliasEmail = emailPart + domain + '@cvtocareer.com'; // combine the email with the alias domain

  const userEmail = [
    'clientemail@cvtocareer.com',
    'clientemail1@cvtocareer.com',
    'clientemail2@cvtocareer.com',
    'clientemail3@cvtocareer.com',
  ];

  logger.info(`Creating email alias for ${email} on ${isStaging ? "staging" : "production"} -> ${aliasEmail}`);

//   if (isStaging) {
//     await sendStandardSlackNotification({
//       node: SlackNode.MESSAGING,
//       provider: SlackProvider.SYSTEM,
//       severity: SlackSeverity.INFO,
//       trigger: "Dummy email alias generated (Stage)",
//       type: SlackEventType.SYSTEM_NOTIFICATION,
//       body: `Dummy email alias generated \`${email}\` -> \`${aliasEmail}\`.
// Immediate impact: Staging environment using dummy alias for testing.`,
//       channel: SlackChannel.CRY_WOLF
//     });
//     return {
//       data: aliasEmail,
//       message: 'Alias successfully created',
//       success: true,
//     };
//   }

  for (const adminEmail of userEmail) {
    try {
      const response = await fetch(scriptUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userEmail: adminEmail, alias: aliasEmail }),
      });

      data = await response.json();
      logger.info(`Apps Script response for ${adminEmail}:`, data);

      if (
        data?.message ===
        'Error: API call to directory.users.aliases.insert failed with error: Too many aliases for the user.'
      ) {

        try{
          await sendStandardSlackNotification({
            node: SlackNode.MESSAGING,
            provider: SlackProvider.SYSTEM,
            severity: SlackSeverity.CRITICAL,
            trigger: "Email alias limit reached",
            type: SlackEventType.SYSTEM_NOTIFICATION,
            body: `Email alias limit reached for ${adminEmail} account.
Immediate impact: Alias creation failed for this user. Manual intervention required.`,
            channel: SlackChannel.CRY_WOLF
          });
        }
        catch(error){
          logger.error("An error occurred while sending slack message", error);
        }

        // Raise an error to trigger the try-catch loop
        throw new Error('Alias limit reached');
      }

      if (data?.message === 'Error: API call to directory.users.aliases.insert failed with error: Entity already exists.'){
        return {
          success: true,
          data: aliasEmail,
          message: 'Alias successfully created',
        }
      }

      return data; // Contains success and message fields
    } catch (error: Error | any) {
      logger.error(`Error communicating with Apps Script using ${adminEmail}:`, error.message);
      continue;
    }
  }

  // If all the email accounts in the array have been processed with an actual result then proceed to default to dummy
  if(!isStaging){

//     await sendStandardSlackNotification({
//       node: SlackNode.MESSAGING,
//       provider: SlackProvider.SYSTEM,
//       severity: SlackSeverity.ERROR,
//       trigger: "Email Alias creation script failed",
//       type: SlackEventType.SYSTEM_NOTIFICATION,
//       body: `Email Alias creation script failed for \`${email}\`, defaulting to Dummy creation -> \`${aliasEmail}\`.
// Immediate impact: Using fallback dummy alias.`,
//       channel: SlackChannel.TOWN_CRIER
//     });

    return {
      data: aliasEmail,
      message: 'Alias successfully created',
      success: true,
    };
  }

  return { success: false, message: 'Failed to create email alias' };
};

/**
 * Update aggregator - auto-populates job site aggregators for user
 */
const updateAggregator = async (
  aliasEmail: string,
  originalEmail: string,
  userId: string,
  baseURL: string,
  isStaging: boolean
): Promise<any[]> => {
  try{
    if (!aliasEmail) return [];
  
    const user: any = await User.findByPk(userId);
    if (!user) return [];
  
    const userCountry = user.country?.toLowerCase();
  
    // Get or create profile with Sequelize
    let profile = await Profile.findOne({
      where: { userId: userId },
      include: [{ all: true, nested: true }]
    });

    // If profile doesn't exist, create it
    if (!profile) {
      profile = await Profile.create({ userId: userId });
    }
  
    if (!profile) return [];
  
    // Get all aggregators we might process in a single query
    const aggregatorsToProcess = [
      'seek', 'adzuna', 'careerone', 'jora', 'reed',
      'michaelpage', 'randstad', 'jobbank', 'adecco',
    ].filter(aggr => {
      if (aggr === 'linkedin') return false;
      if (AGGREGATOR_GROUPS.australia.has(aggr) && userCountry !== 'australia') return false;
      if (AGGREGATOR_GROUPS['united kingdom'].has(aggr) && userCountry !== 'united kingdom') return false;
      if (AGGREGATOR_GROUPS.canada.has(aggr) && userCountry !== 'canada') return false;
      return true;
    });
  
  
    // Exit early if no aggregators to process
    if (aggregatorsToProcess.length === 0) return [];
  
    // Pre-fetch all needed aggregator documents
    const aggregators = await Aggregator.findAll({
      where: {
        name: {
          [Op.iLike]: {
            [Op.any]: aggregatorsToProcess
          }
        }
      }
    });
  
    // Create cache for quick lookup
    aggregators.forEach((agg: any) => {
      aggregatorCache.set(agg.name.toLowerCase(), agg._id);
    });
  
    // Get existing aggregator names for quick comparison
    const existingAggregators = new Set(
      (profile.aggregators || []).map((ag: any) => ag.aggregator?.name?.toLowerCase())
    );

    const password = "auto-generated-placeholder"; // use proper generatePassword when available
  
    // Prepare bulk update operations
    const newAggregators = aggregators
      .filter((agg: any) => !existingAggregators.has(agg.name.toLowerCase()))
      .map((agg: any) => ({
        aggregator: agg._id,
        username: originalEmail,
        generatedEmail: aliasEmail,
        password
      }));
  
    // Update profile aggregators if there are new ones
    let processed: string[] = [];
    if (newAggregators.length > 0) {
      // Get current profile aggregators
      const currentAggregators = profile.aggregators || [];

      // Append new aggregator entries to the profile's aggregators array
      await profile.update({
        aggregators: [...currentAggregators, ...newAggregators]
      });

      processed = newAggregators.map((agg: any) =>
        aggregators.find((a: any) => a.id === agg.aggregator)?.name
      ).filter(Boolean) as string[];
    }
  
    // Send Slack notification if any were processed
    if (processed.length > 0) {
      await sendStandardSlackNotification({
        node: SlackNode.MESSAGING,
        provider: SlackProvider.SYSTEM,
        severity: SlackSeverity.INFO,
        trigger: "Jobsite auto-population",
        type: SlackEventType.SYSTEM_NOTIFICATION,
        body: `User ${user.firstName} ${user.lastName}'s Jobsite has been auto-populated for ${processed.join(', ')}.
Immediate impact: Kindly proceed to create Account on Jobsites.`,
        channel: SlackChannel.TOWN_CRIER
      });
    }
  
    logger.info(`Updated aggregators for user ${userId}: ${processed.join(', ')}`);
    return processed;
  } catch(error){
    logger.error("Error in updateAggregator:", error);
    return [];
  }
};

/**
 * Generate Slack message for notification
 */
const generateSlackMessage = async (
  templateId: string,
  data: Record<string, unknown>
): Promise<string> => {
  // Simple message generation - can be expanded with templates
  return `Notification: ${templateId}\nData: ${JSON.stringify(data, null, 2)}`;
};

/**
 * Handle campaign management logic
 */
export const handleCampaignManagement = async (
  host: string,
  updatedClient: CampaignClientData,
  plan: string,
  userId: string,
  baseURL: string,
  validityPeriod?: string,
): Promise<void> => {
  // Get user profile from database
  const user = await User.findByPk(userId);

  if (!user) {
    throw new Error("User not found");
  }

  const profile = await Profile.findOne({
    where: { userId: userId },
  });

  if (!profile) {
    throw new Error("User profile not found");
  }

  // Use user.role since role is stored in the User model, not Profile
  const userCraft = user.role;

  if (!userCraft) {
    logger.warn(`User craft/role not found for user ${userId}, skipping campaign management`);
    // Send notification to alert team about missing role
    setImmediate(() => {
      sendStandardSlackNotification({
        node: SlackNode.APPLICATION,
        provider: SlackProvider.SYSTEM,
        severity: SlackSeverity.INFO,
        type: SlackEventType.SYSTEM_NOTIFICATION,
        host: host,
        channel: SlackChannel.CRY_WOLF,
        teamMentions: "CSM",
        body: `Payment completed but campaign management skipped for user ${updatedClient.email} - missing craft/role in user account. Please update the user's profile with their craft/role.`,
      });
    });
    return; // Exit gracefully instead of throwing error
  }

  const First_Name = updatedClient.firstName;
  const Middle_Name = updatedClient.middleName;
  const Last_Name = updatedClient.lastName;
  const Full_Name = [First_Name, Middle_Name, Last_Name]
    .filter((part) => part !== undefined)
    .map((part) => part.trim())
    .join(" ");
  const Batch = null;
  const CustomerId = updatedClient.uniqueId;
  const Craft = userCraft;
  const Country = updatedClient.country;
  const isCoralPlan = plan?.toLowerCase() === "coral";
  const duration = resolveDurationFromValidityPeriod(validityPeriod);
  const CampaignEnd = isCoralPlan ? getFutureDateFromDays(14) : duration.campaignEnd;
  const SeekSubDurDays = isCoralPlan ? 14 : duration.subDurDays;

  // Check if the customer already exists in credentials (by email OR userId).
  // paranoid: false ensures soft-deleted rows are included — they still occupy unique constraints.
  const existing = await Credentials.findOne({
    where: {
      [Op.or]: [
        { seekEmail: updatedClient.email },
        { clientId: userId },
      ],
    },
    paranoid: false,
  });

  // Create an alias email
  const isAliasCreated = await createEmailAlias(
    host,
    updatedClient.email,
    isStage(host)
  );

  // If the user doesn't exist, create new credentials
  if (!existing) {
    const clientData: CampaignCredentialsData = {
      First_Name,
      Middle_Name,
      Last_Name,
      Full_Name,
      Batch,
      Craft,
      CustomerId,
      Plan: plan,
      CampaignEnd,
      SeekSubDurDays,
      SeekSubEndDate: CampaignEnd,
      Alias_Email: isAliasCreated?.data ?? "",
      Active: true,
    };

    let createdClient: Credentials | null = null;

    if (clientData.First_Name || clientData.Plan) {
      try {
        createdClient = await Credentials.create({
          seekEmail: updatedClient.email,
          seekPassword: "",
          currentCity: Country,
          seekExternalCredentials: clientData as unknown as Record<string, unknown>,
          clientId: userId,
          Active: true,
          capitalized: "INFLIGHT",
          SeekAnswerPriority: true,
          SeekAggregator: true,
          SeekSubStartDate: getFutureDateFromDays(0),
        });

        logger.info(
          `Campaign Management account created successfully for regular plan: ${createdClient.id}`
        );
      } catch (dbError) {
        logger.error(
          `Failed to create Campaign Management account for regular plan: ${dbError}`
        );
        throw dbError;
      }

      // Push client to Answer generation queue section
      const documentData = await Upload.findOne({
        where: {
          userId: userId,
        },
      });

      if (documentData && documentData.cvDataPoints?.cvType === CvType.DEFAULT) {
        const fileUrl = documentData.document?.url;

        if (fileUrl) {
          const titles = [...(profile.titles || []), ...(profile.keywords || [])];

          const pushData = {
            id: createdClient?.id,
            resume: fileUrl,
            keywords: titles,
            range: 1,
          };

          logger.info(`Push data prepared: ${JSON.stringify(pushData)}`);
          // TODO: Push to queue if needed
        }
      } else {
        setImmediate(() => {
          sendStandardSlackNotification({
            node: SlackNode.APPLICATION,
            provider: SlackProvider.SYSTEM,
            severity: SlackSeverity.INFO,
            type: SlackEventType.SYSTEM_NOTIFICATION,
            host: host,
            channel: SlackChannel.CRY_WOLF,
            teamMentions: "CSM",
            body: `No default document found for ${Full_Name} with email ${updatedClient.email}, cannot successfully push to queue\n\nHow to set a default document:\n1. Navigate to Client's profile\n2. Select a document\n3. Click on "default".`,
          });
        });
      }

      if (!isAliasCreated || !isAliasCreated?.success) {
        // setImmediate(() => {
        //   sendStandardSlackNotification({
        //     node: SlackNode.APPLICATION,
        //     provider: SlackProvider.SYSTEM,
        //     severity: SlackSeverity.ERROR,
        //     type: SlackEventType.ERROR_ALERT,
        //     host: host,
        //     channel: SlackChannel.CRY_WOLF,
        //     teamMentions: "CSM",
        //     body: `Alias email creation failed for ${Full_Name} with email ${updatedClient.email}. Use the view as user feature to login to the user account and create this using the add jobsite feature.`,
        //   });
        // });

        throw new Error("Alias mail could not be generated. Please contact admin");
      }

      // Notify for successful alias creation
      // setImmediate(async () => {
      //   sendStandardSlackNotification({
      //     node: SlackNode.APPLICATION,
      //     provider: SlackProvider.SYSTEM,
      //     severity: SlackSeverity.INFO,
      //     type: SlackEventType.SYSTEM_NOTIFICATION,
      //     host: host,
      //     channel: SlackChannel.TOWN_CRIER,
      //     teamMentions: "CSM",
      //     body: await generateSlackMessage("SMID-1025", {
      //       Full_Name,
      //       email: updatedClient.email,
      //       data: isAliasCreated.data,
      //     }),
      //   });
      // });

      const aliasEmail = isAliasCreated.data;

      logger.info("Processing Update Aggregator");
      await updateAggregator(
        aliasEmail || "",
        updatedClient.email,
        userId,
        baseURL,
        isStage(host)
      );
    }
  } else {
    // Row exists (may be soft-deleted) — restore it and update campaign fields.
    await existing.restore();
    await existing.update({
      seekEmail: updatedClient.email,
      clientId: userId,
      Active: true,
      capitalized: "INFLIGHT",
      SeekAnswerPriority: true,
      SeekAggregator: true,
      SeekSubStartDate: getFutureDateFromDays(0),
      seekExternalCredentials: {
        ...(existing.seekExternalCredentials as object),
        Plan: plan,
        Active: true,
        CampaignEnd,
        SeekSubEndDate: CampaignEnd,
        SeekSubDurDays,
      },
    });
  }

  // If the selected plan was gold, create another account for secondary profile
  if (plan.toLowerCase() === "gold") {
    logger.info("Gold Plan is activated");
    const alterlast = Last_Name + "##$£C";
    const altercustomer = CustomerId + "00636";
    const Full_Name_Alter = [First_Name, Middle_Name, alterlast]
      .filter((part) => part !== undefined)
      .map((part) => part.trim())
      .join(" ");

    const clientData: CampaignCredentialsData = {
      First_Name,
      Middle_Name,
      Last_Name: alterlast,
      Full_Name: Full_Name_Alter,
      Batch,
      Craft,
      CustomerId: altercustomer,
      Country,
      Plan: plan,
      CampaignEnd,
      SeekSubDurDays,
      SeekSubEndDate: CampaignEnd,
      Active: true,
    };

    if (clientData.Full_Name && clientData.Plan) {
      await Credentials.create({
        seekEmail: `${updatedClient.email}_secondary`,
        seekPassword: "",
        currentCity: Country,
        seekExternalCredentials: clientData as unknown as Record<string, unknown>,
        clientId: userId,
      });
    }
  }
};