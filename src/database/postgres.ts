import { getSequelize } from "../utils/sequelize";
import { Model, ModelStatic } from "sequelize";

/**
 * Database adapter that provides Prisma-like interface for Sequelize models
 * Maps entity names to Sequelize models and translates Prisma-style methods to Sequelize
 */
class DatabaseAdapter {
  /**
   * Translates Prisma-style method calls to Sequelize equivalents
   */
  private createModelProxy(model: ModelStatic<Model>) {
    return new Proxy(model, {
      get: (target: any, prop: string | symbol) => {
        if (prop === "findMany") {
          return async (options: any) => {
            return (target as any).findAll(options);
          };
        }
        if (prop === "findUnique") {
          return async (options: any) => {
            return (target as any).findOne(options);
          };
        }
        if (prop === "deleteMany") {
          return async (options: any) => {
            return (target as any).destroy(options);
          };
        }
        if (prop === "createMany") {
          return async (options: any) => {
            return (target as any).bulkCreate(options.data, {
              ignoreDuplicates: options.skipDuplicates,
            });
          };
        }
        if (prop === "create") {
          return async (options: any) => {
            return (target as any).create(options.data || options, {
              raw: false,
            });
          };
        }
        if (prop === "updateMany") {
          return async (options: any) => {
            return (target as any).update(options.data, options);
          };
        }
        if (prop === "update") {
          return async (options: any) => {
            const { where, data } = options;
            return (target as any).update(data, { where });
          };
        }
        if (prop === "count") {
          return async (options: any) => {
            return (target as any).count(options);
          };
        }
        if (prop === "_name") {
          // Support accessing the table name
          return (target as any).tableName;
        }
        return (target as any)[prop];
      },
    });
  }

  /**
   * Get a model by entity name (table name or alias)
   * Supports dynamic access to models through Sequelize's models registry
   */
  get(entityName: string) {
    const sequelize = getSequelize();
    const models = sequelize.models as Record<string, ModelStatic<Model>>;

    // Try direct lookup first
    if (models[entityName]) {
      return this.createModelProxy(models[entityName]);
    }

    // Try to find by table name
    const foundModel = Object.values(models).find(
      (m: any) =>
        m.tableName === entityName || m.tableName === `${entityName}s`,
    );

    if (foundModel) {
      return this.createModelProxy(foundModel as ModelStatic<Model>);
    }

    // Log available models for debugging
    console.warn(
      `Model '${entityName}' not found. Available models:`,
      Object.keys(models),
    );
    return null;
  }

  /**
   * Proxy handler to intercept property access and return models dynamically
   */
  [key: string]: any;
}

// Create a Proxy to handle dynamic property access
const db = new Proxy(new DatabaseAdapter(), {
  get(target, prop: string) {
    if (typeof prop !== "string") return undefined;

    // If the property is a DatabaseAdapter method, use it
    if (prop in target) {
      return (target as any)[prop];
    }

    // Otherwise treat it as an entity name and get the model
    return target.get(prop);
  },
});

export default db;
