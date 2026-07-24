import { ENVIRONMENTNAME } from '../constants/constants';
import { setDbReady } from '../middlewares/dbReady';
import { ensureInFlightIndexes } from '../services/admin/in-flight.index-bootstrap.service';
import { getServiceLogger } from '../utils/createLogger';
import { ensureAnalyticsIndexes } from '../services/admin/analytics.index-bootstrap.service';
import { ensureCampaignIndexes } from '../services/admin/campaign.index-bootstrap.service';
import { getSequelize, resetSequelize } from '../utils/sequelize';
import { NODE_ENV } from './env';
import { ClientContentService } from '../services/admin/client-content.service';
import { ClientSupportDocument } from '../models/v1/client-support-document.model';
import { EmailLog } from "../models/v1/email-log.model";
import { EmailTemplate } from "../models/v1/email-template.model";
import { VCS, VCSPrompt } from "../models/v1/keyword-population.model";
import { InterviewPackProcess } from "../models/v1/interview-pack-process.model";
import { TourCount } from '../models/v1/tour-count.model';

// import { ManualApplication } from '../models/v1/manual-application.model';
// import { TrainingTrackerSession } from "../models/v1/training-tracker-session.model";
// import { AccessLevelService } from "../services/admin/access-level.service";
// import { CommunicationTemplateService } from "../services/admin/communication-template.service";

const logger = getServiceLogger(`${ENVIRONMENTNAME} database`);

const isProduction = NODE_ENV !== 'local';

// const ensureTrainingTrackerSessions = async () => {
//   await TrainingTrackerSession.sync({ force: false });

//   for (const sessionNumber of [1, 2, 3, 4]) {
//     await TrainingTrackerSession.findOrCreate({
//       where: { sessionNumber },
//       defaults: {
//         sessionNumber,
//         name: `Session ${sessionNumber}`,
//       },
//     });
//   }
// };

// const ensureCRTrackingHistoryTable = async () => {
//   await CRTrackingHistory.sync({ force: false });
// };

// const ensureAccessLevelTables = async () => {
//   await AccessLevelService.ensureAccessLevelTablesAndSeed();
// };

// const ensureCommunicationTemplatesTable = async () => {
//   await CommunicationTemplateService.ensureTemplatesTable();
// };

const ensureClientContentTable = async () => {
  await ClientContentService.ensureClientContentTable();
};

// Creates `client_support_documents` (and its category ENUM) on existing
// databases, where the full sync below is skipped. `alter` so that columns
// added after the table was first created (roleTitles, clientConfirmed) land
// too — remove once every environment is up to date.
// const ensureClientSupportDocumentsTable = async () => {
//   logger.info('Ensuring client_support_documents table exists');
//   await ClientSupportDocument.sync({ force: false });
//   await EmailLog.sync({ force: false });
//   logger.info('client_support_documents table ensured');
// };

// Creates `email_templates` on existing databases and seeds it from the .ejs
// files under views/emails on every boot — seeding is upsert-by-name so it's
// safe to run repeatedly and never overwrites a template an admin has edited
// via the DB unless SEED_EMAIL_TEMPLATES_FORCE=true is set. `alter` so columns
// added after the table first existed (e.g. `variables`) land on deploy too.
// const ensureEmailTemplatesTable = async () => {
//   logger.info('Ensuring email_templates table exists');
//   await EmailTemplate.sync({ alter: true });
//   logger.info('email_templates table ensured');
// };

// Creates `vcs_prompts`/`vcs_configurations` on existing databases and seeds
// the AI-generation prompts stored there (cover letter, role title
// recommendations), each under its own `key` so they don't collide with the
// `upload_role_titles_prompt` config already stored in the same tables.
// `alter` so the `key` column added to VCS lands on deploy too.
// const ensureVcsPromptsTable = async () => {
//   logger.info('Ensuring vcs_prompts/vcs_configurations tables exist');
//   await VCSPrompt.sync({ alter: true });
//   await VCS.sync({ alter: true });
//   logger.info('vcs_prompts/vcs_configurations tables ensured');
// };

// Creates `interview_pack_processes` on existing databases — remove once
// every environment is up to date.
// const ensureInterviewPackProcessesTable = async () => {
//   logger.info('Ensuring interview_pack_processes table exists');
//   await InterviewPackProcess.sync({ force: false });
//   logger.info('interview_pack_processes table ensured');
// };

// Creates `tour_counts` on existing databases — remove once every
// environment is up to date.
// const ensureTourCountsTable = async () => {
//   logger.info('Ensuring tour_counts table exists');
//   await TourCount.sync({ force: false });
//   logger.info('tour_counts table ensured');
// };

export const connectDB = async (): Promise<void> => {
  const initialDelay = 5000; // 5s
  const maxDelay = 30000; // 30s
  const factor = 2;
  let delay = initialDelay;

  while (true) {
    try {
      // 🟢 Always create a fresh Sequelize instance
      const newSequelize = getSequelize();

      logger.info(`📊 Attempting ${ENVIRONMENTNAME} DB connection...`);

      await newSequelize.authenticate();
      logger.info(`✅ ${ENVIRONMENTNAME} Database CONNECTED`);

      setDbReady(true);

      // Optional sync for dev environments
      if (isProduction) {
        logger.info(`${ENVIRONMENTNAME} Database syncing...`);
        const start = Date.now();

        const queryInterface = newSequelize.getQueryInterface();
        const tablesBefore: string[] = await queryInterface.showAllTables();

        // ✅ ADD YOUR TARGETED SYNCS HERE — remove after deployment
        // await ManualApplication.sync({ alter: true }); // new schema
        // await TrainingTracker.sync({ alter: true });
        // await Profile.sync({ alter: true });
        // await Upload.sync({ alter: true }); // new isActive column

        // await ensureTrainingTrackerSessions();
        // await ensureCRTrackingHistoryTable();
        // await ensureAccessLevelTables();
        // await ensureCommunicationTemplatesTable();
        await ensureClientContentTable();
        // await ensureClientSupportDocumentsTable();
        // await ensureEmailTemplatesTable();
        // await ensureVcsPromptsTable();
        // await ensureInterviewPackProcessesTable();
        // await ensureTourCountsTable();

        // 📸 Snapshot AFTER your targeted syncs
        const tablesAfterSync: string[] = await queryInterface.showAllTables();

        const alteredTables: string[] = []; // just note it manually

        const newlyCreated = tablesAfterSync.filter(
          (table) => !tablesBefore.includes(table)
        );

        // Only sync on first deploy when tables don't exist yet
        if (tablesBefore.length === 0) {
          await newSequelize.sync({ force: false });

          const tablesAfter: string[] = await queryInterface.showAllTables();
          logger.info(
            `${ENVIRONMENTNAME}: ${tablesAfter.length} new table(s) created: [${tablesAfter.join(', ')}]`
          );
          logger.info(
            `${ENVIRONMENTNAME}: Total tables in DB: ${tablesAfter.length}`
          );
        } else {
          if (newlyCreated.length > 0) {
            logger.info(
              `${ENVIRONMENTNAME}: ${newlyCreated.length} new table(s) added: [${newlyCreated.join(', ')}]`
            );
          }
          if (alteredTables.length > 0) {
            logger.info(
              `${ENVIRONMENTNAME}: ${alteredTables.length} table(s) altered: [${alteredTables.join(', ')}]`
            );
          }

          logger.info(
            `${ENVIRONMENTNAME}: Tables already exist, skipping sync`
          );
          logger.info(
            `${ENVIRONMENTNAME}: Total tables in DB: ${tablesAfterSync.length} tables`
          );
        }

        const duration = ((Date.now() - start) / 1000).toFixed(2);
        logger.info(`${ENVIRONMENTNAME}: Database synced (took ${duration}s)`);
      } else {
        logger.info('LOCAL: Database syncing...');
        const start = Date.now();
        const queryInterface = newSequelize.getQueryInterface();

        // Get tables BEFORE sync
        const tablesBefore: string[] = await queryInterface.showAllTables();

        await newSequelize.sync({ alter: true });
        // await ensureTrainingTrackerSessions();
        // await ensureCRTrackingHistoryTable();
        // await ensureAccessLevelTables();
        // await ensureCommunicationTemplatesTable();
        await ensureClientContentTable();
        // await ensureClientSupportDocumentsTable();
        // await ensureEmailTemplatesTable();
        // await ensureVcsPromptsTable();
        // await ensureInterviewPackProcessesTable();
        // await ensureTourCountsTable();

        // Get tables AFTER sync
        const tablesAfter: string[] = await queryInterface.showAllTables();

        const newlyCreated = tablesAfter.filter(
          (table) => !tablesBefore.includes(table)
        );
        const duration = ((Date.now() - start) / 1000).toFixed(2);

        if (newlyCreated.length > 0) {
          logger.info(
            `LOCAL: ${newlyCreated.length} new table(s) created: [${newlyCreated.join(', ')}]`
          );
        }

        logger.info(
          `LOCAL: Total tables in DB: ${tablesAfter.length} Tables (took ${duration}s)`
        );
      }

      await ensureAnalyticsIndexes();
      await ensureInFlightIndexes();
      await ensureCampaignIndexes();

      return; // ✅ exit once connected
    } catch (error: any) {
      let friendlyMessage = 'Unknown DB connection error';

      if (error?.name === 'SequelizeConnectionRefusedError') {
        friendlyMessage =
          'Database is still sleeping or refusing connections ❌';
      } else if (error?.name === 'SequelizeConnectionTimedOutError') {
        friendlyMessage = 'Database connection attempt timed out ⏱️';
      } else if (error?.name === 'SequelizeHostNotFoundError') {
        friendlyMessage =
          'Database host not found 🔍 — check your DATABASE_URL';
      } else if (error?.name === 'SequelizeHostNotReachableError') {
        friendlyMessage =
          'Database host not reachable 🌐 — possible network/VPC issue';
      } else if (error?.name === 'SequelizeInvalidConnectionError') {
        friendlyMessage = 'Invalid DB connection parameters ⚙️';
      }

      logger.error(`❌ DB connection failed: ${friendlyMessage}`);
      logger.warn('Full error details:', error);
      setDbReady(false);

      logger.warn(`🔄 Retrying in ${delay / 1000}s...`);
      await new Promise((resolve) => setTimeout(resolve, delay));

      delay = Math.min(delay * factor, maxDelay);
    }
  }
};

let reconnecting = false;

let watchdogInterval: NodeJS.Timeout | null = null;

export const startDbWatchdog = (
  interval = isProduction ? 120000 : 15000,
  pingTimeout = 10000
) => {
  const pingLoop = async () => {
    try {
      // ✅ Get FRESH instance every time
      const sequelize = getSequelize();

      // Ping DB with timeout protection
      await Promise.race([
        sequelize.query('SELECT 1'),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('DB ping timeout')), pingTimeout)
        ),
      ]);

      setDbReady(true);
      logger.info('✅ Database is alive');
    } catch (err: any) {
      logger.error('⚠️ Database ping failed. Reconnecting...');

      if (reconnecting) {
        logger.warn('⏳ Reconnect already in progress, skipping...');
        return; // ← Use return instead of else
      }

      reconnecting = true;
      setDbReady(false);

      try {
        await resetSequelize();

        // ✅ Verify the new connection works
        const newSequelize = getSequelize();
        await newSequelize.query('SELECT 1');

        logger.info('🔄 Database reconnected successfully');
        setDbReady(true);
      } catch (reconnectErr: any) {
        logger.error('❌ Failed to reconnect:', reconnectErr.message);
        setDbReady(false);
      } finally {
        reconnecting = false;
      }
    }
  };

  // Start the loop immediately
  pingLoop();
  watchdogInterval = setInterval(pingLoop, interval);
};

export const stopDbWatchdog = () => {
  if (watchdogInterval) {
    clearInterval(watchdogInterval);
    watchdogInterval = null;
    logger.info('🛑 Database watchdog stopped');
  }
};

export const disconnectDB = async () => {
  const sequelize = getSequelize();
  try {
    logger.warn('Attempting to shutdown database connection...');
    await sequelize.close();
    logger.warn('Database connection closed');
  } catch (error) {
    logger.error('Failed to disconnect database' + error);
    throw new Error('Database FAILED to disconnect');
  }
};
