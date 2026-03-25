import { QueryTypes } from "sequelize";
import { TABLE_MANAGER_TABLES } from "../../config/env";
import { getServiceLogger } from "../../utils/createLogger";
import ErrorHandler from "../../utils/errorHandler";
import { getSequelize } from "../../utils/sequelize";

export interface TableColumnHeader {
  key: string;
  label: string;
  type: string;
  allowNull: boolean;
  defaultValue?: any;
}

export interface TableMetadataResponse {
  tableName: string;
  exists: boolean;
  headers: TableColumnHeader[];
  generatedAt: string;
}

const logger = getServiceLogger("table-metadata-service");

const IDENTIFIER_REGEX = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

const ensureAllowedTable = (tableName: string): string => {
  const normalized = tableName.trim();
  if (!IDENTIFIER_REGEX.test(normalized)) {
    throw new ErrorHandler("Invalid tableName.", 400);
  }

  if (!TABLE_MANAGER_TABLES.includes(normalized)) {
    throw new ErrorHandler(
      `Table '${normalized}' is not enabled for Table Manager metadata lookup.`,
      403,
    );
  }

  return normalized;
};

const humanizeHeader = (value: string): string => {
  const spaced = value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim();

  return spaced
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

class TableMetadataApplicationService {
  private async tableExists(tableName: string): Promise<boolean> {
    const sequelize = getSequelize();
    const rows = await sequelize.query<{ table_name: string | null }>(
      `
        SELECT COALESCE(
          to_regclass('public.${tableName}')::text,
          to_regclass('${tableName}')::text
        ) AS table_name;
      `,
      { type: QueryTypes.SELECT },
    );

    return Boolean(rows[0]?.table_name);
  }

  async getTableMetadata(tableNameInput: string): Promise<TableMetadataResponse> {
    const tableName = ensureAllowedTable(tableNameInput);

    const exists = await this.tableExists(tableName);
    if (!exists) {
      throw new ErrorHandler(`Table '${tableName}' is not available.`, 404);
    }

    const queryInterface = getSequelize().getQueryInterface();
    const description = (await queryInterface.describeTable(tableName)) as Record<
      string,
      { type: string; allowNull: boolean; defaultValue?: any }
    >;

    const headers = Object.entries(description).map(([key, meta]) => ({
      key,
      label: humanizeHeader(key),
      type: meta.type,
      allowNull: Boolean(meta.allowNull),
      defaultValue: meta.defaultValue,
    }));

    logger.info(`Table metadata fetched for ${tableName} (cols=${headers.length})`);

    return {
      tableName,
      exists: true,
      headers,
      generatedAt: new Date().toISOString(),
    };
  }
}

export const tableMetadataApplicationService =
  new TableMetadataApplicationService();

