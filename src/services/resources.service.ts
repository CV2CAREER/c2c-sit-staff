import { Setting } from "../models/v1/settings.model";
import { getServiceLogger } from "../utils/createLogger";
import { Op } from "sequelize";
import { MASTER_KEY_SETTING_KEYS } from "./admin/settings.service";

const logger = getServiceLogger("resources-service");

const normalizeResourceName = (resourceName: string) =>
  resourceName.replace(/ /g, "_").toUpperCase();

const toLegacyResource = (setting: Setting | null) => {
  if (!setting) return null;

  return {
    id: setting.id,
    name: setting.key,
    value: setting.value,
    createdAt: setting.createdAt,
    updatedAt: setting.updatedAt,
  };
};

export class ResourcesService {
  /**
   * Get all resources or a specific resource by name
   */
  static async getResources(type?: string) {
    try {
      if (type) {
        const setting = await Setting.findOne({
          where: { key: normalizeResourceName(type) },
        });

        return toLegacyResource(setting);
      } else {
        const settings = await Setting.findAll({
          where: {
            key: {
              [Op.notIn]: MASTER_KEY_SETTING_KEYS,
            },
          },
          order: [["createdAt", "DESC"]],
        });

        return settings.map((setting) => toLegacyResource(setting));
      }
    } catch (error: any) {
      logger.error(`Failed to retrieve resources: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create a new resource
   */
  static async createResource(resourceName: string, value: string) {
    try {
      const formattedName = normalizeResourceName(resourceName);

      const existingResource = await Setting.findOne({
        where: { key: formattedName }
      });

      if (existingResource) {
        throw new Error("Duplicate Resource, Resource already exists!");
      }

      const createdResource = await Setting.create({
        key: formattedName,
        value,
      });

      return toLegacyResource(createdResource);
    } catch (error: any) {
      logger.error(`Failed to create resource: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update an existing resource or create if it doesn't exist
   */
  static async updateResource(resourceName: string, value: string) {
    try {
      const formattedName = normalizeResourceName(resourceName);

      let resource = await Setting.findOne({
        where: { key: formattedName }
      });

      if (resource) {
        await resource.update({ value });
      } else {
        resource = await Setting.create({
          key: formattedName,
          value,
        });
      }

      return toLegacyResource(resource);
    } catch (error: any) {
      logger.error(`Failed to update resource: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete a resource by ID
   */
  static async deleteResource(resourceId: string) {
    try {
      const result = await Setting.destroy({
        where: { id: resourceId }
      });

      if (result === 0) {
        throw new Error("Resource not found");
      }

      return { deletedCount: result };
    } catch (error: any) {
      logger.error(`Failed to delete resource: ${error.message}`);
      throw error;
    }
  }
}
