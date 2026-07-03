import { User } from "../../models/v1/user.model";
import { Credentials } from "../../models/v1/credentials.model";
import { Application } from "../../models/v1/application.model";
import { Op } from "sequelize";

/**
 * Service to fetch clients assigned to the current assistant.
 * Assignment is stored in the Credentials table via:
 * - AssignedPCEmail (DPC clients)
 * - AssignedVetEmail (VPC clients)
 * - AssignedCompletedEmail (SPC clients)
 */
export class ClientsAssignedService {
  /**
   * Get all assigned clients and statistics for authenticated assistant
   * @param assistantId - ID of the authenticated staff user
   */
  static async getAssignedClients(assistantId: string) {
    // First get the assistant's email from their user record
    const assistant = await User.findByPk(assistantId, {
      attributes: ['id', 'email'],
      raw: true
    });

    if (!assistant || !assistant.email) {
      return {
        clients: [],
        clientDetails: [],
        clientsApplication: [],
        totalApplications: 0,
        totalUnattended: 0
      };
    }

    // Query all Credentials where the assistant's email matches any assigned field
    const credentials = await Credentials.findAll({
      where: {
        [Op.or]: [
          { AssignedPCEmail: assistant.email },
          { AssignedVetEmail: assistant.email },
          { AssignedCompletedEmail: assistant.email }
        ],
        isDeleted: false
      },
      attributes: [
        'id', 'clientId', 'seekEmail', 'currentCity', 'onboardingDate', 
        'referrer', 'AssignedPCName', 'AssignedPCEmail', 
        'AssignedVetName', 'AssignedVetEmail',
        'AssignedCompletedName', 'AssignedCompletedEmail',
        'capitalized', 'Active', 'SeekAnswerPriority', 
        'SeekAggregator', 'SeekSubStartDate', 'blacklisted'
      ],
      raw: true
    });

    // Group credentials by clientId and determine assignment types
    const credentialsMap = new Map<string, {
      credential: any,
      assignedTypes: string[]
    }>();

    for (const cred of credentials) {
      if (!cred.clientId) continue;

      const types: string[] = [];
      
      if (cred.AssignedPCEmail === assistant.email) {
        types.push('DPC');
      }
      if (cred.AssignedVetEmail === assistant.email) {
        types.push('VPC');
      }
      if (cred.AssignedCompletedEmail === assistant.email) {
        types.push('SPC');
      }

      // If this client already exists, merge the types
      if (credentialsMap.has(cred.clientId)) {
        const existing = credentialsMap.get(cred.clientId)!;
        const mergedTypes = [...new Set([...existing.assignedTypes, ...types])];
        // Keep the most complete credential record (prefer the one with more fields)
        // Or keep the first one - whichever logic you prefer
        credentialsMap.set(cred.clientId, {
          credential: existing.credential,
          assignedTypes: mergedTypes
        });
      } else {
        credentialsMap.set(cred.clientId, {
          credential: cred,
          assignedTypes: types
        });
      }
    }

    const clientIds = Array.from(credentialsMap.keys());

    if (clientIds.length === 0) {
      return {
        clients: [],
        clientDetails: [],
        clientsApplication: [],
        totalApplications: 0,
        totalUnattended: 0
      };
    }

    // Fetch the actual client user records
    const clients = await User.findAll({
      where: {
        id: {
          [Op.in]: clientIds
        },
        deletedAt: null
      },
      attributes: ['id', 'firstName', 'lastName', 'email', 'uniqueId', 'applicationStatus', 'progress', 'createdAt'],
      order: [['firstName', 'ASC']],
      raw: true
    });

    const clientUserIds = clients.map(c => c.id);

    // Get applications for these clients
    const applications = await Application.findAll({
      where: {
        client_id: {
          [Op.in]: clientUserIds
        },
        isDeleted: false
      },
      attributes: ['id', 'client_id', 'Status', 'createdAt', 'Application_Mode'],
      raw: true
    });

    // Calculate statistics
    const totalApplications = applications.length;
    const totalUnattended = applications.filter(app => 
      app.Status === 'PENDING' || app.Status === 'NEW' || app.Application_Mode === 'UNATTENDED'
    ).length;

    // Enrich client data with credentials and assignment types
    const clientData = clients.map(client => {
      const credentialData = credentialsMap.get(client.id);
      const cred = credentialData?.credential;
      const assignedTypes = credentialData?.assignedTypes || [];

      // Create a display name for the assignment type
      const assignmentTypeDisplay = assignedTypes.join(', ') + (assignedTypes.length > 1 ? ' Client' : ' Client');

      return {
        id: client.id,
        firstName: client.firstName,
        lastName: client.lastName,
        email: client.email,
        uniqueId: client.uniqueId,
        applicationStatus: client.applicationStatus,
        progress: client.progress,
        createdAt: client.createdAt,
        assignedTypes: assignedTypes, // ['DPC', 'VPC', 'SPC']
        assignmentTypeDisplay: assignmentTypeDisplay,
        credentials: cred ? {
          id: cred.id,
          seekEmail: cred.seekEmail,
          currentCity: cred.currentCity,
          onboardingDate: cred.onboardingDate,
          referrer: cred.referrer,
          AssignedPCName: cred.AssignedPCName,
          AssignedPCEmail: cred.AssignedPCEmail,
          AssignedVetName: cred.AssignedVetName,
          AssignedVetEmail: cred.AssignedVetEmail,
          AssignedCompletedName: cred.AssignedCompletedName,
          AssignedCompletedEmail: cred.AssignedCompletedEmail,
          capitalized: cred.capitalized,
          Active: cred.Active,
          SeekAnswerPriority: cred.SeekAnswerPriority,
          SeekAggregator: cred.SeekAggregator,
          SeekSubStartDate: cred.SeekSubStartDate,
          blacklisted: cred.blacklisted
        } : null,
        displayName: `${client.firstName} ${client.lastName} - ${client.uniqueId || client.email} (${assignmentTypeDisplay})`
      };
    });

    // Format client names list for dropdown with assignment type tags
    const clientNames = clientData.map(c => c.displayName);

    return {
      clients: clientNames,
      clientDetails: clientData,
      clientsApplication: applications,
      totalApplications,
      totalUnattended
    };
  }
}