import { Request, Response } from "express";
import catchAsyncError from "../../utils/catchAsyncError";
import { getServiceLogger } from "../../utils/createLogger";
import { getSequelize } from "../../utils/sequelize";

const logger = getServiceLogger("client-allocation-controller");

interface TPAStats {
  daily: number;
  weekly: number;
  monthly: number;
  quarterly: number;
  yearly: number;
}

interface TPAAllocation {
  name: string;
  clients: string[];
  stats: TPAStats;
}

async function getActivePCs() {
  try {
    const sequelize = getSequelize();
    
    // Only get users with 'assistant' role (Placement Controllers)
    // You can add more roles here if needed, like 'pc', 'placement_controller'
    const sql = `
      SELECT id, "firstName", "lastName", email, role
      FROM users
      WHERE role IN ('assistant', 'pc', 'placement_controller')
        AND "isActive" = true
      ORDER BY "firstName", "lastName"
    `;
    
    const [results] = await sequelize.query(sql);
    logger.info(`Found ${results.length} active Placement Controllers`);
    
    return (results as any[]).map((user: any) => ({
      name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
      email: user.email || '',
      role: user.role,
      id: user.id
    })).filter((pc: any) => pc.name && pc.name.trim() !== '');
    
  } catch (error) {
    logger.error("Error getting active PCs:", error);
    return [];
  }
}

async function getClientStats(clientNames: string[]): Promise<Map<string, TPAStats>> {
  try {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfQuarter = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    
    if (clientNames.length === 0) {
      return new Map();
    }
    
    const sequelize = getSequelize();
    const placeholders = clientNames.map((_, i) => `$${i + 1}`).join(',');
    const appQuery = `
      SELECT "Client", "createdAt"
      FROM applications
      WHERE "Client" IN (${placeholders})
        AND "Status" = 'Successful'
      ORDER BY "createdAt" DESC
    `;
    
    const [applications] = await sequelize.query(appQuery, { bind: clientNames });
    
    const statsMap = new Map<string, TPAStats>();
    
    clientNames.forEach(clientName => {
      statsMap.set(clientName, {
        daily: 0, weekly: 0, monthly: 0, quarterly: 0, yearly: 0
      });
    });
    
    (applications as any[]).forEach((app: any) => {
      const stats = statsMap.get(app.Client);
      const timestamp = new Date(app.createdAt);
      if (stats) {
        if (timestamp >= startOfDay) stats.daily++;
        if (timestamp >= startOfWeek) stats.weekly++;
        if (timestamp >= startOfMonth) stats.monthly++;
        if (timestamp >= startOfQuarter) stats.quarterly++;
        if (timestamp >= startOfYear) stats.yearly++;
      }
    });
    
    return statsMap;
  } catch (error) {
    logger.error("Error fetching client stats:", error);
    return new Map();
  }
}

export const getClientAllocation = catchAsyncError(
  async (req: Request, res: Response) => {
    logger.info("Processing client allocation request");
    
    const sequelize = getSequelize();
    
    // Get all clients with their assigned PC
    const credentialsQuery = `
      SELECT 
        id,
        "seekExternalCredentials"->>'Full_Name' as full_name,
        "AssignedPCName",
        "AssignedPCEmail"
      FROM credentials
      WHERE "deletedAt" IS NULL
        AND "isDeleted" = false
        AND "seekExternalCredentials"->>'Active' = 'true'
        AND "seekExternalCredentials"->>'Full_Name' IS NOT NULL
      ORDER BY "AssignedPCName" NULLS LAST, full_name
    `;
    
    const [credentials] = await sequelize.query(credentialsQuery);
    logger.info(`Found ${credentials.length} active clients`);
    
    if (credentials.length === 0) {
      return res.apiSuccess(
        {
          parsedData: {
            result: [],
            unAllocatedClients: [],
          },
          metadata: {
            totalInflightClients: 0,
            allocatedCount: 0,
            unallocatedCount: 0,
            activePCsWithClientsCount: 0,
            totalActivePCsCount: 0,
            viewMode: 'admin',
          },
        },
        "No clients found"
      );
    }
    
    // Get all active Placement Controllers (only assistant role)
    const activePCs = await getActivePCs();
    logger.info(`Found ${activePCs.length} active Placement Controllers`);
    
    if (activePCs.length > 0) {
      logger.info("Active PCs:", activePCs.map(pc => ({ name: pc.name, email: pc.email, role: pc.role })));
    }
    
    // Group clients by assigned PC
    const pcClientMap = new Map<string, string[]>();
    const unAllocatedClients: string[] = [];
    
    for (const client of credentials as any[]) {
      const clientName = client.full_name;
      const assignedPCName = client.AssignedPCName;
      
      if (!clientName) continue;
      
      if (assignedPCName && assignedPCName.trim() !== '') {
        // Client is assigned to a PC
        if (!pcClientMap.has(assignedPCName)) {
          pcClientMap.set(assignedPCName, []);
        }
        pcClientMap.get(assignedPCName)!.push(clientName);
        logger.debug(`Allocated: ${clientName} → ${assignedPCName}`);
      } else {
        // Client is unallocated
        unAllocatedClients.push(clientName);
        logger.debug(`Unallocated: ${clientName}`);
      }
    }
    
    // Get all client names that are allocated to calculate stats
    const allAllocatedClients: string[] = [];
    pcClientMap.forEach(clients => {
      allAllocatedClients.push(...clients);
    });
    
    // Get stats for all allocated clients
    const clientStatsMap = await getClientStats(allAllocatedClients);
    
    // Build allocations for PCs
    const allocations: TPAAllocation[] = [];
    
    // First, add PCs that have clients assigned
    for (const [pcName, clients] of pcClientMap.entries()) {
      const aggregatedStats: TPAStats = {
        daily: 0, weekly: 0, monthly: 0, quarterly: 0, yearly: 0
      };
      
      clients.forEach(clientName => {
        const clientStats = clientStatsMap.get(clientName);
        if (clientStats) {
          aggregatedStats.daily += clientStats.daily;
          aggregatedStats.weekly += clientStats.weekly;
          aggregatedStats.monthly += clientStats.monthly;
          aggregatedStats.quarterly += clientStats.quarterly;
          aggregatedStats.yearly += clientStats.yearly;
        }
      });
      
      allocations.push({
        name: pcName,
        clients: clients,
        stats: aggregatedStats
      });
    }
    
    // Add PCs that exist in the system but have no clients
    for (const pc of activePCs) {
      if (!pcClientMap.has(pc.name)) {
        allocations.push({
          name: pc.name,
          clients: [],
          stats: { daily: 0, weekly: 0, monthly: 0, quarterly: 0, yearly: 0 }
        });
      }
    }
    
    allocations.sort((a, b) => a.name.localeCompare(b.name));
    
    res.apiSuccess(
      {
        parsedData: {
          result: allocations,
          unAllocatedClients,
        },
        metadata: {
          totalInflightClients: credentials.length,
          allocatedCount: credentials.length - unAllocatedClients.length,
          unallocatedCount: unAllocatedClients.length,
          activePCsWithClientsCount: pcClientMap.size,
          totalActivePCsCount: activePCs.length,
          viewMode: 'admin',
        },
      },
      "Client allocation retrieved successfully"
    );
  }
);
