import { getServiceLogger } from "./createLogger";
import { User } from "../models/v1/user.model";
import { Profile } from "../models/v1/profile.model";
import { Credentials } from "../models/v1/credentials.model";
import { getConnectedRedis } from "../config/redis";
import { isRedisUsable } from "./helpers";
import { sendStandardSlackNotification } from "./slack-helpers";
import { SlackChannel, SlackNode, SlackProvider, SlackSeverity, SlackEventType } from "./enum";
import db from "../database/postgres";
import { getSequelize } from "../utils/sequelize";

const logger = getServiceLogger("aggregator-title-updater");

// External jobsites that are handled separately
const EXTERNAL_JOBSITES = ["randstad", "michaelpage"];

// Seek job type mappings
const seekConstants = {
  Type_Name: ["Full Time", "Part Time", "Contract", "Casual", "Temporary"],
  Type: ["0", "1", "2", "3", "4"]
};

/**
 * Updates job search titles and criteria across all aggregator tables
 * Bulk syncs user profile preferences to job board databases
 * 
 * @param userId User ID
 * @param aggr Optional specific aggregator to update only
 * @param type Update type (null = full sync including staging)
 */
export const updateTitlesV2 = async (userId: string, aggr?: string, type: string | null = null): Promise<void> => {
  if (aggr && EXTERNAL_JOBSITES.includes(aggr.toLowerCase())) {
    logger.debug(`Skipping external jobsite: ${aggr}`);
    return;
  }

  logger.info(`Updating job titles for user: ${userId}`);

  try {
    // Fetch user with profile and aggregators
    const user = await User.findByPk(userId, {
      include: [{
        model: Profile,
        as: 'profile',
        include: ['aggregators']
      }]
    });

    if (!user) {
      logger.error(`User not found for ID: ${userId}`);
      return;
    }

    // Get client credentials
    const sqlClient = await Credentials.findOne({
      where: { CustomerId: user.uniqueId }
    });

    if (!sqlClient) {
      logger.error(`No credentials found for user: ${userId}`);
      return;
    }

    const profile = user.profile;
    if (!profile) {
      logger.error(`No profile found for user: ${userId}`);
      return;
    }

    // Get aggregators to process
    let aggregators: string[];
    if (aggr) {
      aggregators = [aggr.toLowerCase()];
    } else {
      aggregators = profile.aggregators?.map((a: any) => a.name.toLowerCase()) || [];
    }

    // Build common payload
    const titles = [...(profile.titles || []), ...(profile.keywords || [])];
    const Title_Exclude = [...(profile.titlesExcluded || []), ...(profile.keywordsExcluded || [])].join(";");
    
    const advertisers = profile.advertisers || [];
    const Advertiser_Include = advertisers.some((a: string) => a?.toLowerCase() === "all") ? "" : advertisers.join(";");
    const Advertiser_Exclude = profile.advertisersExcluded?.join(";") || "";
    
    const Location = profile.locations?.join(";") || "";
    const Location_Exclude = profile.stateExcluded?.join(";") || "";
    const Country = profile.country || user.country;
    
    const Classification = (profile.classifications ?? []).map((c: any) => c.id?.toString()).join(", ");
    const Classification_Exclude = (profile.classificationsExcluded ?? []).map((c: any) => c.id?.toString()).join(", ");
    
    const industry = profile.industriesInclude?.join("; ") || "";
    
    const Include_Cover_Letter = profile.coverletterIncluded ? 1 : 0;
    
    const Type_Name = profile.jobTypes?.join("; ") || "";
    const Type_Exclude = "";
    
    const Body_Include = profile.body?.join("; ") || "";
    const Body_Exclude = profile.bodyExcluded?.join("; ") || "";
    
    const Include_Criteria = profile.isAiForCriteriaSelectionAllowed ? 1 : 0;
    const Salary_Min = profile.minSalary;
    const Salary_Max = profile.maxSalary;
    const Keyword_Type = profile.keywordsExcluded ? "Unique" : "Default";

    // Process each aggregator
    for (const aggregator of aggregators) {
      let Type = Type_Name;
      
      if (aggregator === "seek") {
        const typeIndex = seekConstants.Type_Name.findIndex(t => 
          t?.toLowerCase().replace(/[/_\s\-]/g, "") === Type_Name?.toLowerCase().replace(/[/_\s\-]/g, "")
        );
        Type = typeIndex > -1 ? seekConstants.Type[typeIndex] : "0";
      }

      // Determine salary key names per aggregator
      const minKey = ["adecco", "adzuna", "indeed", "jora", "linkedin", "monster", "nhs", "reed"].includes(aggregator)
        ? "Salary_Min" : ["careerone"].includes(aggregator) ? "Pay_Min" : "Min";
        
      const maxKey = ["adecco", "adzuna", "indeed", "jora", "linkedin", "monster", "nhs", "reed"].includes(aggregator)
        ? "Salary_Max" : ["careerone"].includes(aggregator) ? "Pay_Max" : "Max";

      const payload: Record<string, any> = {
        Title_Exclude,
        Type_Name,
        Keyword_Type,
        Advertiser_Exclude,
        Advertiser_Include,
        Location,
        Location_Exclude,
        Country,
        Classification,
        Classification_Exclude,
        industry,
        Include_Cover_Letter,
        Type,
        Type_Exclude,
        Body_Include,
        Body_Exclude,
        Include_Criteria,
        [minKey]: Salary_Min,
        [maxKey]: Salary_Max,
      };

      // Get database model
      const model = db[aggregator];
      if (!model) {
        logger.debug(`No model found for aggregator: ${aggregator}`);
        continue;
      }

      // Clear existing records
      await model.destroy({
        where: { Master_Credential_Id: sqlClient.id }
      });

      // Prepare bulk insert data
      const bulkData = titles.map((title: string) => {
        const record: Record<string, any> = {
          Master_Credential_Id: sqlClient.id,
          Title_Include: title.split(" ").join("; "),
          ...payload
        };

        if (["seek", "jobserve", "linkedin", "workforceaustralia", "escapecity"].includes(aggregator)) {
          record["Keyword"] = title;
        } else {
          record["All_Words"] = title;
        }

        return record;
      });

      // Bulk upsert
      if (bulkData.length > 0) {
        await model.bulkCreate(bulkData, {
          updateOnDuplicate: Object.keys(payload)
        });
      }

      logger.debug(`Updated ${bulkData.length} records for ${aggregator}`);

      // Update staging tables if not partial update
      if (!type) {
        const stagingModelName = `${aggregator}_stage`;
        const stagingModel = db[stagingModelName];
        
        if (stagingModel) {
          await stagingModel.destroy({
            where: { Master_Credential_Id: sqlClient.id }
          });

          const stagingBulkData = titles.map((title: string) => {
            const record: Record<string, any> = {
              Master_Credential_Id: sqlClient.id,
              Title_Include: title.split(" ").join("; "),
              ...payload
            };

            if (["seek", "jobserve"].includes(aggregator)) {
              record["Keyword"] = title;
            } else {
              record["All_Words"] = title;
            }

            return record;
          });

          if (stagingBulkData.length > 0) {
            await stagingModel.bulkCreate(stagingBulkData, {
              updateOnDuplicate: Object.keys(payload)
            });
          }
        }
      }
    }

    logger.info(`Successfully updated titles for user: ${userId}`);

  } catch (error: any) {
    logger.error(`Failed to update titles for user ${userId}:`, error.message);
    throw error;
  }
};

/**
 * Adds user to client sample test queue for job board testing
 * 
 * @param userId User ID
 * @param generatedEmail Generated email alias
 * @param aggregator Target aggregator name
 * @param host Host environment
 */
export const runTestClientSamples = async (
  userId: string,
  generatedEmail: string,
  aggregator: string,
  host = "cvtocareer.com"
): Promise<string | void> => {
  if (EXTERNAL_JOBSITES.includes(aggregator.toLowerCase())) {
    return "Data already processed in parent aggregator";
  }

  if (!userId || !generatedEmail || !aggregator) {
    logger.warn("Missing required parameters for test client sample");
    return;
  }

  try {
    // Get Redis connection
    const rdClient = await getConnectedRedis();
    if (!isRedisUsable(rdClient)) {
      logger.warn("Redis not available, skipping sample queue");
      return;
    }

    // Fetch user details
    const user = await User.findByPk(userId, {
      include: [{
        model: Profile,
        as: 'profile'
      }]
    });

    if (!user) {
      logger.error(`User not found for test sample: ${userId}`);
      return;
    }

    // Format queue name
    const queue = `${aggregator.toUpperCase()}_CLIENT_SAMPLE_QUEUE_TEST`;
    const values = await rdClient!.lrange(queue, 0, -1);

    // Check if already in queue
    if (values.includes(generatedEmail)) {
      logger.debug(`Email ${generatedEmail} already in queue: ${queue}`);
      return;
    }

    // Add to queue
    await rdClient!.lpush(queue, generatedEmail);
    logger.info(`Added ${generatedEmail} to ${queue} test queue`);

    // Send non-blocking Slack notification
    setImmediate(async () => {
      await sendStandardSlackNotification({
        host,
        node: SlackNode.USER_MANAGEMENT,
        provider: SlackProvider.SYSTEM,
        severity: SlackSeverity.INFO,
        type: SlackEventType.SYSTEM_NOTIFICATION,
        channel: SlackChannel.CRY_WOLF,
        body: `\`${aggregator.toUpperCase()}\` sample script queued up for \`${user.firstName} ${user.lastName}\`.`,
      });
    });

  } catch (error: any) {
    logger.error(`Failed to queue test sample:`, error.message);
  }
};