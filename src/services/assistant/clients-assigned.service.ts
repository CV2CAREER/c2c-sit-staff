import { User } from "../../models/v1/user.model";
import { Credentials } from "../../models/v1/credentials.model";
import { Application } from "../../models/v1/application.model";
import { Op } from "sequelize";

/**
 * Service to fetch clients assigned to the current assistant.
 * Assignment is stored in the Credentials table via AssignedPCEmail
 * (the assistant's email) which links clients to their assistant.
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

    // Query all Credentials where the assistant's email matches AssignedPCEmail
    const credentials = await Credentials.findAll({
      where: {
        AssignedPCEmail: assistant.email,
        isDeleted: false
      },
      attributes: ['id', 'clientId', 'seekEmail', 'currentCity', 'onboardingDate', 'referrer', 'AssignedPCName', 'AssignedPCEmail', 'capitalized', 'Active', 'SeekAnswerPriority', 'SeekAggregator', 'SeekSubStartDate', 'blacklisted'],
      raw: true
    });

    const clientIds = credentials
      .map(cred => cred.clientId)
      .filter(Boolean) as string[];

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

    // Build a map of clientId -> credentials for quick lookup
    const credentialsMap = new Map<string, any>();
    for (const cred of credentials) {
      if (cred.clientId) {
        credentialsMap.set(cred.clientId, cred);
      }
    }

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

    // Enrich client data with credentials
    const clientData = clients.map(client => {
      const creds = credentialsMap.get(client.id);
      return {
        id: client.id,
        firstName: client.firstName,
        lastName: client.lastName,
        email: client.email,
        uniqueId: client.uniqueId,
        applicationStatus: client.applicationStatus,
        progress: client.progress,
        createdAt: client.createdAt,
        credentials: creds ? {
          id: creds.id,
          seekEmail: creds.seekEmail,
          currentCity: creds.currentCity,
          onboardingDate: creds.onboardingDate,
          referrer: creds.referrer,
          AssignedPCName: creds.AssignedPCName,
          AssignedPCEmail: creds.AssignedPCEmail,
          capitalized: creds.capitalized,
          Active: creds.Active,
          SeekAnswerPriority: creds.SeekAnswerPriority,
          SeekAggregator: creds.SeekAggregator,
          SeekSubStartDate: creds.SeekSubStartDate,
          blacklisted: creds.blacklisted
        } : null,
        displayName: `${client.firstName} ${client.lastName} - ${client.uniqueId || client.email}`
      };
    });

    // Format client names list for dropdown
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