import { Request, Response } from "express";
import catchAsyncError from "../../utils/catchAsyncError";
import { getServiceLogger } from "../../utils/createLogger";
import { getSequelize } from "../../utils/sequelize";
import { User } from "../../models/v1/user.model";
import { Op } from "sequelize";

const logger = getServiceLogger("client-allocation-controller");

interface TPAStats {
  total: number;
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
    const results = await User.findAll({
      where: {
        role: { [Op.in]: ["assistant", "pc", "placement_controller"] },
        isActive: true,
      },
      order: [["firstName", "ASC"], ["lastName", "ASC"]],
    });
    logger.info(`Found ${results.length} active Placement Controllers`);
    
    return results.map((user: any) => ({
      name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
      email: (user as any).email || '',
      role: user.role,
      id: user.id
    })).filter((pc: any) => pc.name && pc.name.trim() !== '');
    
  } catch (error) {
    logger.error("Error getting active PCs:", error);
    return [];
  }
}

async function getClientStats(clientIds: string[]): Promise<Map<string, TPAStats>> {
  try {
    if (clientIds.length === 0) {
      return new Map();
    }

    const now = new Date();
    const startOfDay     = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek    = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const startOfMonth   = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfQuarter = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
    const startOfYear    = new Date(now.getFullYear(), 0, 1);

    const sequelize = getSequelize();

    // Placeholders $1..$N for client IDs, then $N+1..$N+5 for date params
    const n = clientIds.length;
    const idPlaceholders = clientIds.map((_, i) => `$${i + 1}`).join(',');

    // CTE safely casts the string Timestamp column (default "N/A") to a real timestamp.
    // The CASE guard prevents cast errors on non-date values.
    const appQuery = `
      WITH apps AS (
        SELECT
          client_id::text AS cid,
          CASE
            WHEN "Timestamp" ~ '^\\d{4}'
            THEN "Timestamp"::timestamp
            ELSE NULL
          END AS submitted_at
        FROM applications
        WHERE client_id::text IN (${idPlaceholders})
          AND "Status" = 'Successful'
      )
      SELECT
        cid                                                                  AS client_id,
        COUNT(*)::int                                                        AS total,
        COUNT(*) FILTER (WHERE submitted_at >= $${n + 1})::int              AS daily,
        COUNT(*) FILTER (WHERE submitted_at >= $${n + 2})::int              AS weekly,
        COUNT(*) FILTER (WHERE submitted_at >= $${n + 3})::int              AS monthly,
        COUNT(*) FILTER (WHERE submitted_at >= $${n + 4})::int              AS quarterly,
        COUNT(*) FILTER (WHERE submitted_at >= $${n + 5})::int              AS yearly
      FROM apps
      GROUP BY cid
    `;

    const [rows] = await sequelize.query(appQuery, {
      bind: [
        ...clientIds,
        startOfDay.toISOString(),
        startOfWeek.toISOString(),
        startOfMonth.toISOString(),
        startOfQuarter.toISOString(),
        startOfYear.toISOString(),
      ],
    });

    const statsMap = new Map<string, TPAStats>();

    // Seed every requested ID with zeros so unmatched ones stay 0
    clientIds.forEach(id => {
      statsMap.set(id, { total: 0, daily: 0, weekly: 0, monthly: 0, quarterly: 0, yearly: 0 });
    });

    (rows as any[]).forEach((row: any) => {
      statsMap.set(String(row.client_id), {
        total:     Number(row.total)     || 0,
        daily:     Number(row.daily)     || 0,
        weekly:    Number(row.weekly)    || 0,
        monthly:   Number(row.monthly)   || 0,
        quarterly: Number(row.quarterly) || 0,
        yearly:    Number(row.yearly)    || 0,
      });
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
    // credentials.id is the value stored as applications.client_id
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
    
    // Group clients by assigned PC — track display names and client IDs separately
    const pcClientMap = new Map<string, { names: string[]; ids: string[] }>();
    const unAllocatedClients: string[] = [];

    for (const client of credentials as any[]) {
      const clientName = client.full_name;
      const credentialId = String(client.id); // credentials.id == applications.client_id
      const assignedPCName = client.AssignedPCName;

      if (!clientName) continue;

      if (assignedPCName && assignedPCName.trim() !== '') {
        if (!pcClientMap.has(assignedPCName)) {
          pcClientMap.set(assignedPCName, { names: [], ids: [] });
        }
        const entry = pcClientMap.get(assignedPCName)!;
        entry.names.push(clientName);
        entry.ids.push(credentialId);
        logger.debug(`Allocated: ${clientName} (credentialId=${credentialId}) → ${assignedPCName}`);
      } else {
        unAllocatedClients.push(clientName);
        logger.debug(`Unallocated: ${clientName}`);
      }
    }

    // Collect all allocated client IDs for the stats query
    const allAllocatedClientIds: string[] = [];
    pcClientMap.forEach(clients => {
      allAllocatedClientIds.push(...clients.ids);
    });

    // Get stats keyed by client_id
    const clientStatsMap = await getClientStats(allAllocatedClientIds);

    // Build allocations for PCs
    const allocations: TPAAllocation[] = [];

    // First, add PCs that have clients assigned
    for (const [pcName, clients] of pcClientMap.entries()) {
      const aggregatedStats: TPAStats = {
        total: 0, daily: 0, weekly: 0, monthly: 0, quarterly: 0, yearly: 0
      };

      clients.ids.forEach(clientId => {
        const clientStats = clientStatsMap.get(clientId);
        if (clientStats) {
          aggregatedStats.total     += clientStats.total;
          aggregatedStats.daily     += clientStats.daily;
          aggregatedStats.weekly    += clientStats.weekly;
          aggregatedStats.monthly   += clientStats.monthly;
          aggregatedStats.quarterly += clientStats.quarterly;
          aggregatedStats.yearly    += clientStats.yearly;
        }
      });

      allocations.push({
        name: pcName,
        clients: clients.names,
        stats: aggregatedStats
      });
    }
    
    // Add PCs that exist in the system but have no clients
    for (const pc of activePCs) {
      if (!pcClientMap.has(pc.name)) {
        allocations.push({
          name: pc.name,
          clients: [],
          stats: { total: 0, daily: 0, weekly: 0, monthly: 0, quarterly: 0, yearly: 0 }
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
