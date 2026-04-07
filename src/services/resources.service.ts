import { Resource } from "../models/v1/resources.model";
import { getServiceLogger } from "../utils/createLogger";
import { Op } from "sequelize";

const logger = getServiceLogger("resources-service");

export class ResourcesService {
  /**
   * Get all resources or a specific resource by name
   */
  static async getResources(type?: string) {
    try {
      if (type) {
        return await Resource.findOne({
          where: { name: type.toUpperCase().replace(/ /g, "_") }
        });
      } else {
        return await Resource.findAll({
          order: [['createdAt', 'DESC']]
        });
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
      // Format resource name
      const formattedName = resourceName.replace(/ /g, "_").toUpperCase();

      // Check for duplicate resource
      const existingResource = await Resource.findOne({
        where: { name: formattedName }
      });

      if (existingResource) {
        throw new Error("Duplicate Resource, Resource already exists!");
      }

      // Create new resource
      return await Resource.create({
        name: formattedName,
        value: value
      });
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
      // Format resource name
      const formattedName = resourceName.replace(/ /g, "_").toUpperCase();

      // Find existing resource
      let resource = await Resource.findOne({
        where: { name: formattedName }
      });

      if (resource) {
        // Update existing resource
        await resource.update({ value });
      } else {
        // Create new resource if it doesn't exist
        resource = await Resource.create({
          name: formattedName,
          value: value
        });
      }

      return resource;
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
      const result = await Resource.destroy({
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