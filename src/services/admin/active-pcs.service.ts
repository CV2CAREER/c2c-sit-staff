import { Op } from "sequelize";
import { User } from "../../models/v1/user.model";
import { getServiceLogger } from "../../utils/createLogger";
import { Role } from "../../utils/enum";

const logger = getServiceLogger("active-pcs-service");

export type ActivePC = {
  name: string;
  email: string;
  role: string;
  id: string;
};

/**
 * Shared lookup for active Placement Controllers.
 *
 * Extracted from the private getActivePCs() in client-allocation.controller
 * (SPR-21-51-002): the Staff-queue owner dropdown and System-queue routing
 * resolve against this roster, exposed via GET /api/v1/admin/active-pcs.
 */
export class ActivePcsService {
  async getActivePCs(): Promise<ActivePC[]> {
    try {
      const results = await User.findAll({
        where: {
          // "assistant" is the only PC role in enum_users_role. Listing labels the
          // enum lacks (e.g. "pc") makes Postgres reject the whole query.
          role: { [Op.in]: [Role.ASSISTANT] },
          isActive: true,
        },
        order: [["firstName", "ASC"], ["lastName", "ASC"]],
      });
      logger.info(`Found ${results.length} active Placement Controllers`);

      return results
        .map((user: any) => ({
          name: `${user.firstName || ""} ${user.lastName || ""}`.trim(),
          email: (user as any).email || "",
          role: user.role,
          id: user.id,
        }))
        .filter((pc: ActivePC) => pc.name && pc.name.trim() !== "");
    } catch (error) {
      logger.error("Error getting active PCs:", error);
      return [];
    }
  }
}

export const activePcsService = new ActivePcsService();
