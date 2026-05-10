import { SubscriptionAllocation } from "../../models/v1/subscription-allocation.model";
import { User } from "../../models/v1/user.model";
import { Credentials } from "../../models/v1/credentials.model";
import { Plan } from "../../models/v1/plan.model";
import { Application } from "../../models/v1/application.model";
import { Op } from "sequelize";

/**
 * Optimized service to fetch clients assigned to current assistant
 * Uses efficient database queries with proper joins and indexes
 */
export class ClientsAssignedService {
  /**
   * Get all assigned clients and statistics for authenticated assistant
   * @param assistantId - ID of the authenticated staff user
   */
  static async getAssignedClients(assistantId: string) {
    // Get active allocations with plan data - planId links to Plan which has userId (the actual client)
    const allocations = await SubscriptionAllocation.findAll({
      where: {
        staffUserId: assistantId,
        isActive: true,
        endedAt: null
      },
      include: [
        {
          model: Plan,
          attributes: ['userId'],
          required: true
        }
      ],
      attributes: ['id', 'planId', 'assignedAt'],
    });

    const clientIds = allocations
      .map(alloc => (alloc as any).plan?.userId)
      .filter(Boolean);

    if (clientIds.length === 0) {
      return {
        clients: [],
        clientsApplication: [],
        totalApplications: 0,
        totalUnattended: 0
      };
    }

    // Get all clients with their credentials in a single query
    const clients = await User.findAll({
      where: {
        id: {
          [Op.in]: clientIds
        },
        deletedAt: null
      },
      include: [
        {
          model: Credentials,
          as: 'credentials',
          required: false,
          attributes: [
            'id',
            'seekEmail',
            'currentCity',
            'onboardingDate',
            'referrer',
            'AssignedPCName',
            'AssignedPCEmail',
            'capitalized',
            'Active',
            'SeekAnswerPriority',
            'SeekAggregator',
            'SeekSubStartDate',
            'blacklisted'
          ]
        }
      ],
      attributes: ['id', 'firstName', 'lastName', 'email', 'uniqueId', 'applicationStatus', 'progress', 'createdAt'],
      order: [['firstName', 'ASC']],
    });

    const clientUserIds = clients.map(c => c.id);

    // Get applications count for these clients in one query
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

    // Format client list with credentials data
    const clientData = clients.map(client => {
      const creds = (client as any).credentials;
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
