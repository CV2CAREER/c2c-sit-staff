import { DataType } from "sequelize-typescript";
import { SCHEMA_MANAGED_TABLES } from "../../config/env";
import { getServiceLogger } from "../../utils/createLogger";
import ErrorHandler from "../../utils/errorHandler";
import { getSequelize } from "../../utils/sequelize";

export type SchemaColumnType =
  | "text"
  | "string"
  | "integer"
  | "boolean"
  | "jsonb"
  | "timestamp"
  | "date"
  | "numeric";

export interface SchemaColumnInfo {
  name: string;
  type: string;
  allowNull: boolean;
  defaultValue?: any;
}

export interface ExpandColumnInput {
  tableName: string;
  columnName: string;
  type: SchemaColumnType;
  updatedByUserId: string;
}

export interface DeleteColumnInput {
  tableName: string;
  columnName: string;
  updatedByUserId: string;
}

const logger = getServiceLogger("schema-management-service");

const IDENTIFIER_REGEX = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

const ensureTableAllowed = (tableName: string) => {
  const normalized = tableName.trim();
  if (!IDENTIFIER_REGEX.test(normalized)) {
    throw new ErrorHandler("Invalid tableName.", 400);
  }

  if (!SCHEMA_MANAGED_TABLES.includes(normalized)) {
    throw new ErrorHandler(
      `Table '${normalized}' is not allowlisted for schema management.`,
      403,
    );
  }

  return normalized;
};

const ensureColumnAllowed = (columnName: string) => {
  const normalized = columnName.trim();
  if (!IDENTIFIER_REGEX.test(normalized)) {
    throw new ErrorHandler("Invalid columnName.", 400);
  }
  return normalized;
};

const resolveDataType = (type: SchemaColumnType) => {
  switch (type) {
    case "text":
      return DataType.TEXT;
    case "string":
      return DataType.STRING;
    case "integer":
      return DataType.INTEGER;
    case "boolean":
      return DataType.BOOLEAN;
    case "jsonb":
      return DataType.JSONB;
    case "timestamp":
      return DataType.DATE;
    case "date":
      return DataType.DATEONLY;
    case "numeric":
      return DataType.DECIMAL(18, 4);
    default:
      throw new ErrorHandler("Unsupported column type.", 400);
  }
};

class SchemaManagementApplicationService {
  async listColumns(tableName: string): Promise<SchemaColumnInfo[]> {
    const allowedTable = ensureTableAllowed(tableName);
    const queryInterface = getSequelize().getQueryInterface();

    const description = (await queryInterface.describeTable(
      allowedTable,
    )) as Record<
      string,
      { type: string; allowNull: boolean; defaultValue?: any }
    >;

    return Object.entries(description).map(([name, meta]) => ({
      name,
      type: meta.type,
      allowNull: Boolean(meta.allowNull),
      defaultValue: meta.defaultValue,
    }));
  }

  async expandColumn(input: ExpandColumnInput): Promise<{ ok: true }> {
    const tableName = ensureTableAllowed(input.tableName);
    const columnName = ensureColumnAllowed(input.columnName);

    const queryInterface = getSequelize().getQueryInterface();
    const description = (await queryInterface.describeTable(tableName)) as Record<
      string,
      any
    >;

    if (description[columnName]) {
      return { ok: true };
    }

    // We intentionally add nullable columns without defaults to avoid heavy table rewrites.
    await queryInterface.addColumn(tableName, columnName, {
      type: resolveDataType(input.type),
      allowNull: true,
    });

    logger.info(
      `Expanded table ${tableName} with column ${columnName} (type=${input.type}, by=${input.updatedByUserId})`,
    );

    return { ok: true };
  }

  async deleteColumn(input: DeleteColumnInput): Promise<{ ok: true }> {
    const tableName = ensureTableAllowed(input.tableName);
    const columnName = ensureColumnAllowed(input.columnName);

    const queryInterface = getSequelize().getQueryInterface();
    const description = (await queryInterface.describeTable(tableName)) as Record<
      string,
      any
    >;

    if (!description[columnName]) {
      return { ok: true };
    }

    await queryInterface.removeColumn(tableName, columnName);

    logger.info(
      `Deleted column ${columnName} from ${tableName} (by=${input.updatedByUserId})`,
    );

    return { ok: true };
  }
}

export const schemaManagementApplicationService =
  new SchemaManagementApplicationService();

