import { connectDB } from '../config/database';
import { User } from '../models/v1/user.model';
import { Upload } from '../models/v1/upload.model';
import { Profile } from '../models/v1/profile.model';
import { Aggregator } from '../models/v1/aggregator.model';
import { getFullName } from '../utils/helpers';
import { uploadToDrive, updateInDrive } from '../utils/gDriveClient';
import { getServiceLogger } from '../utils/createLogger';
import ErrorHandler from '../utils/errorHandler';

const logger = getServiceLogger('event-handlers');

// Type definitions
interface ClientData {
  profile: Record<string, any>;
  documents: any[];
}

interface JobPreference {
  role?: string;
  titles?: string[];
  titlesExcluded?: string[];
  advertisers?: string[];
  advertisersExcluded?: string[];
  jobTypes?: string[];
  minSalary?: number;
  maxSalary?: number;
  classifications?: any[];
  classificationsExcluded?: any[];
  workingRight?: string[];
  country?: string;
  locations?: string[];
  locationsExcluded?: string[];
  body?: string[];
  bodyExcluded?: string[];
  coverletterIncluded?: boolean;
  roleKeywordExclusive?: boolean;
  isActive?: boolean;
  isSuspended?: boolean;
  isApproved?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  [key: string]: any;
}

type UserType = 'admin' | 'sales' | 'partner' | 'coach' | 'guest' | 'client' | 'test' | 'probono';

/**
 * Retrieve client documents and profile information
 * @param id - User/Document ID
 * @param updateDrive - Whether this is an update operation
 * @param userType - Type of user (guest, admin, sales, partner, coach)
 * @returns Client data object containing profile and documents
 */
export const getClientDoc = async (
  id: string,
  updateDrive: boolean,
  userType: UserType = 'guest'
): Promise<ClientData> => {
  await connectDB();

  const clientData: ClientData = { profile: {}, documents: [] };

  try {
    if (updateDrive) {
      logger.debug(`[getClientDoc] Retrieving client doc for update operation. ID: ${id}`);

      const clientDoc = await Upload.findByPk(id, {
        include: [{
          model: User,
          as: 'user',
          attributes: ['firstName', 'lastName', 'isUserSubscribed'],
        }],
      });

      if (!clientDoc || !clientDoc.user) {
        logger.error(`[getClientDoc] Client document or user not found for ID: ${id}`);
        throw new ErrorHandler('Client document not found', 404);
      }

      const user = clientDoc.user as User;
      clientData.profile = {
        firstName: user.firstName,
        lastName: user.lastName,
        isUserSubscribed: user.isUserSubscribed,
      };
      clientData.documents = [clientDoc.document];

      logger.info(`[getClientDoc] Client document retrieved successfully for ID: ${id}`);
      return clientData;
    }

    logger.debug(`[getClientDoc] Retrieving info for user type: ${userType}, ID: ${id}`);

    switch (userType) {
      case 'admin': {
        const adminInfo = await User.findByPk(id, {
          attributes: ['firstName', 'lastName', 'middleName', 'email', 'phoneNumber', 'country', 'role', 'createdAt', 'updatedAt'],
        });

        if (!adminInfo) {
          logger.error(`[getClientDoc] Admin not found for ID: ${id}`);
          throw new ErrorHandler('Admin not found', 404);
        }

        clientData.profile = adminInfo.toJSON();
        logger.info(`[getClientDoc] Admin info retrieved for ID: ${id}`);
        return clientData;
      }

      case 'sales': {
        const salesInfo = await User.findByPk(id, {
          attributes: ['firstName', 'lastName', 'middleName', 'businessName', 'email', 'phoneNumber', 'country', 'role', 'isUserSubscribed', 'createdAt', 'updatedAt'],
        });

        if (!salesInfo) {
          logger.error(`[getClientDoc] Sales info not found for ID: ${id}`);
          throw new ErrorHandler('Sales information not found', 404);
        }

        const referralsCount = await User.count({ where: { id } });
        const salesData = salesInfo.toJSON() as any;
        salesData.referrals = referralsCount;
        clientData.profile = salesData;

        logger.info(`[getClientDoc] Sales info retrieved for ID: ${id}. Referrals: ${referralsCount}`);
        return clientData;
      }

      case 'partner': {
        const partnerInfo = await User.findByPk(id, {
          attributes: ['firstName', 'lastName', 'middleName', 'businessName', 'email', 'phoneNumber', 'country', 'role', 'createdAt', 'updatedAt'],
        });

        if (!partnerInfo) {
          logger.error(`[getClientDoc] Partner not found for ID: ${id}`);
          throw new ErrorHandler('Partner not found', 404);
        }

        clientData.profile = partnerInfo.toJSON();
        logger.info(`[getClientDoc] Partner info retrieved for ID: ${id}`);
        return clientData;
      }

      case 'coach': {
        const coachInfo = await User.findByPk(id, {
          attributes: ['firstName', 'lastName', 'middleName', 'email', 'phoneNumber', 'country', 'role', 'isUserSubscribed', 'createdAt', 'updatedAt'],
        });

        if (!coachInfo) {
          logger.error(`[getClientDoc] Coach not found for ID: ${id}`);
          throw new ErrorHandler('Coach not found', 404);
        }

        clientData.profile = coachInfo.toJSON();
        logger.info(`[getClientDoc] Coach info retrieved for ID: ${id}`);
        return clientData;
      }

      case 'guest':
      case 'client':
      case 'test':
      case 'probono': {
        logger.debug(`[getClientDoc] Processing ${userType} user. ID: ${id}`);

        const clientDocuments = await Upload.findAll({ where: { userId: id } });
        clientData.documents = clientDocuments.map(doc => doc.document);

        clientData.profile = {};

        const fullDetails = await User.findByPk(id, {
          attributes: ['firstName', 'lastName', 'middleName', 'email', 'phoneNumber', 'country', 'isUserSubscribed'],
          include: [{ model: Profile, as: 'profile' }],
        });

        if (!fullDetails) {
          logger.error(`[getClientDoc] User not found for ID: ${id}`);
          throw new ErrorHandler('User not found', 404);
        }

        let jobPreference: JobPreference = {};
        const userProfile = (fullDetails as any).profile;

        if (userProfile) {
          jobPreference = {
            role: userProfile.role,
            titles: userProfile.titles,
            titlesExcluded: userProfile.titlesExcluded,
            advertisers: userProfile.advertisers,
            advertisersExcluded: userProfile.advertisersExcluded,
            jobTypes: userProfile.jobTypes,
            minSalary: userProfile.minSalary,
            maxSalary: userProfile.maxSalary,
            classifications: userProfile.classifications,
            classificationsExcluded: userProfile.classificationsExcluded,
            workingRight: userProfile.workingRight,
            country: userProfile.country,
            locations: userProfile.locations,
            locationsExcluded: userProfile.locationsExcluded,
            body: userProfile.body,
            bodyExcluded: userProfile.bodyExcluded,
            coverletterIncluded: userProfile.coverletterIncluded,
            roleKeywordExclusive: userProfile.roleKeywordExclusive,
            isActive: userProfile.isActive,
            isSuspended: userProfile.isSuspended,
            isApproved: userProfile.isApproved,
            createdAt: userProfile.createdAt,
            updatedAt: userProfile.updatedAt,
          };
        }

        if (userProfile?.id) {
          const profileWithAggregators = await Profile.findByPk(userProfile.id, {
            include: [{ model: Aggregator, as: 'aggregators' }],
          });

          logger.debug(`[getClientDoc] Aggregators lookup for profile ID: ${userProfile.id}`);

          const aggregators = (profileWithAggregators as any)?.aggregators || [];
          if (aggregators.length > 0) {
            const clientCreds = aggregators.map((cred: any) => ({
              aggregatorName: cred.aggregator?.name || 'N/A',
              aggregatorEmail: cred.username || 'N/A',
              aggregatorPassword: cred.password || 'N/A',
              aggregatorStatus: cred.isVerified ? 'Verified' : 'Not verified',
            }));

            const transformedCreds: Record<string, string> = {};
            for (const item of clientCreds) {
              for (const key in item) {
                if (transformedCreds[key] === undefined) {
                  transformedCreds[key] = String(item[key as keyof typeof item]);
                } else {
                  transformedCreds[key] += `\r\n${item[key as keyof typeof item]}`;
                }
              }
            }

            Object.assign(jobPreference, transformedCreds);
            logger.info(`[getClientDoc] ${aggregators.length} aggregator(s) found for user ID: ${id}`);
          }
        }

        const userDetails = fullDetails.toJSON() as any;
        delete userDetails.profile;
        Object.assign(clientData.profile, userDetails, jobPreference);

        logger.info(`[getClientDoc] Client data compiled successfully for ID: ${id}`);
        return clientData;
      }

      default:
        logger.warn(`[getClientDoc] Unknown user type: ${userType}`);
        throw new ErrorHandler(`Unknown user type: ${userType}`, 400);
    }
  } catch (error) {
    if (error instanceof ErrorHandler) throw error;

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`[getClientDoc] Error retrieving client doc: ${errorMessage}`);
    throw new ErrorHandler(`Failed to retrieve client document: ${errorMessage}`, 500);
  }
};

/**
 * Internal function to handle upload or update document operations
 * @param id - User/Document ID
 * @param updateDrive - Whether this is an update operation
 */
const uploadOrUpdateDocument = async (id: string, updateDrive: boolean): Promise<void> => {
  try {
    logger.info(`[uploadOrUpdateDocument] Starting ${updateDrive ? 'update' : 'upload'} operation for ID: ${id}`);

    const client = await getClientDoc(id, updateDrive);
    logger.debug(`[uploadOrUpdateDocument] Client document retrieved for ID: ${id}`);

    const clientDocFolderName = getFullName(client.profile);
    logger.info(`[uploadOrUpdateDocument] Client folder name: "${clientDocFolderName}"`);

    const docs = [...client.documents];
    const operationName = updateDrive ? 'Update' : 'Upload';

    const result = updateDrive
      ? await updateInDrive(clientDocFolderName, docs, client.profile)
      : await uploadToDrive(clientDocFolderName, docs, client.profile);

    if (!result) {
      logger.error(`[uploadOrUpdateDocument] Failed to ${operationName.toLowerCase()} client file in drive for ID: ${id}`);
      throw new ErrorHandler(`Failed to ${operationName.toLowerCase()} document in Drive`, 500);
    }

    logger.info(`[uploadOrUpdateDocument] ${operationName} to Drive operation completed for ID: ${id}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`[uploadOrUpdateDocument] Operation failed: ${errorMessage}`);

    if (error instanceof ErrorHandler) throw error;
    throw new ErrorHandler(`Document operation failed: ${errorMessage}`, 500);
  }
};

/**
 * Update an existing client document in Google Drive
 * @param docId - Document ID to update
 */
export const updateClientDocumentInDrive = async (docId: string): Promise<void> => {
  logger.info(`[updateClientDocumentInDrive] Triggered for document ID: ${docId}`);
  await uploadOrUpdateDocument(docId, true);
};