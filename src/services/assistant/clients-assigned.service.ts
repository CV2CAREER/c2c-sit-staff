import { SubscriptionAllocation } from "../../models/v1/subscription-allocation.model";
import { User } from "../../models/v1/user.model";
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
    // Get active allocations with client user data in single query
    const allocations = await SubscriptionAllocation.findAll({
      where: {
        staffUserId: assistantId,
        isActive: true,
        endedAt: null
      },
      attributes: ['id', 'planId', 'assignedAt'],
      raw: true
    });

    const clientIds = allocations.map(alloc => alloc.planId);

    if (clientIds.length === 0) {
      return {
        clients: [],
        clientsApplication: [],
        totalApplications: 0,
        totalUnattended: 0
      };
    }

    // Get all clients in single query
    const clients = await User.findAll({
      where: {
        id: {
          [Op.in]: clientIds
        },
        deletedAt: null
      },
      attributes: ['id', 'firstName', 'lastName', 'email', 'uniqueId', 'applicationStatus', 'progress'],
      order: [['firstName', 'ASC']],
      raw: true
    });

    // Get applications count for these clients in one query
    const applications = await Application.findAll({
      where: {
        client_id: {
          [Op.in]: clientIds
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

    // Format client names list for dropdown
    const clientNames = clients.map(client => 
      `${client.firstName} ${client.lastName} - ${client.uniqueId || client.email}`
    );

    return {
      clients: clientNames,
      clientsApplication: applications,
      totalApplications,
      totalUnattended
    };
  }
}