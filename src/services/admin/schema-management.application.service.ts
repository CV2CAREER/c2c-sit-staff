import { Op, QueryTypes, UUIDV4 } from "sequelize";
import { DataType } from "sequelize-typescript";
import { SCHEMA_MANAGED_TABLES } from "../../config/env";
import { AuditTrail } from "../../models/v1/audit-trail.model";
import { getServiceLogger } from "../../utils/createLogger";
import ErrorHandler from "../../utils/errorHandler";
import { getSequelize } from "../../utils/sequelize";
import { auditTrailApplicationService } from "./audit-trail.application.service";
import { systemConfigApplicationService } from "./system-config.application.service";

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
  isDynamic: boolean;
}

export interface ManagedTableInfo {
  name: string;
  isCodebase: boolean;
}

const CUSTOM_TABLES_CONFIG_KEY = "schema.custom_tables";

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

const getCustomTableNames = async (): Promise<string[]> => {
  try {
    const config = await systemConfigApplicationService.getOrCreate(CUSTOM_TABLES_CONFIG_KEY, []);
    return Array.isArray(config.value) ? (config.value as string[]) : [];
  } catch {
    return [];
  }
};

const ensureTableAllowed = async (tableName: string): Promise<string> => {
  const normalized = tableName.trim();
  if (!IDENTIFIER_REGEX.test(normalized)) {
    throw new ErrorHandler("Invalid tableName.", 400);
  }

  if (SCHEMA_MANAGED_TABLES.includes(normalized)) return normalized;

  const customTables = await getCustomTableNames();
  if (customTables.includes(normalized)) return normalized;

  throw new ErrorHandler(
    `Table '${normalized}' is not allowlisted for schema management.`,
    403,
  );
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
  private async getDynamicColumnNames(tableName: string): Promise<Set<string>> {
    // Use iLike so "Users.col" and "users.col" both match regardless of case used at log time
    const prefix = `${tableName}.`;

    const [added, deleted] = await Promise.all([
      AuditTrail.findAll({
        where: { action: "SCHEMA_EXPAND_COLUMN", targetKey: { [Op.iLike]: `${prefix}%` } },
        attributes: ["targetKey"],
      }),
      AuditTrail.findAll({
        where: { action: "SCHEMA_DELETE_COLUMN", targetKey: { [Op.iLike]: `${prefix}%` } },
        attributes: ["targetKey"],
      }),
    ]);

    const deletedSet = new Set(
      deleted.map((r) => r.targetKey?.slice(prefix.length).toLowerCase()),
    );
    const result = new Set<string>();
    for (const r of added) {
      const col = r.targetKey?.slice(prefix.length).toLowerCase();
      if (col && !deletedSet.has(col)) result.add(col);
    }
    return result;
  }

  private async listAllDatabaseTables(): Promise<string[]> {
    const raw = await getSequelize().query(
      `SELECT tablename AS table_name FROM pg_catalog.pg_tables WHERE schemaname = 'public' ORDER BY tablename`,
      { type: QueryTypes.SELECT },
    );

    const rows: any[] = Array.isArray(raw[0]) ? (raw[0] as any[]) : (raw as any[]);
    const names = rows
      .map((r: any) => r?.table_name)
      .filter((name): name is string => typeof name === "string" && name.length > 0);

    logger.info(`listAllDatabaseTables: found ${names.length} table(s): ${names.join(", ") || "(none)"}`);
    return names;
  }

  async listManagedTables(): Promise<ManagedTableInfo[]> {
    const [allTables, customTables] = await Promise.all([
      this.listAllDatabaseTables(),
      getCustomTableNames(),
    ]);

    const customSet = new Set(customTables.map((t) => t.toLowerCase()));
    return allTables
      .filter((name): name is string => typeof name === "string" && name.length > 0)
      .map((name) => ({
        name,
        isCodebase: !customSet.has(name.toLowerCase()),
      }));
  }

  async listColumns(tableName: string): Promise<SchemaColumnInfo[]> {
    const normalized = tableName.trim();
    if (!IDENTIFIER_REGEX.test(normalized)) {
      throw new ErrorHandler("Invalid tableName.", 400);
    }

    // Step 1: find the table's OID by searching ALL non-system schemas.
    // Prioritise public; fall back to any other user schema (handles tables created without
    // explicit schema before the schema: "public" fix was applied).
    let tableOid: number | null = null;
    try {
      const oidRaw = await getSequelize().query(
        `SELECT c.oid::bigint AS oid, n.nspname AS schema_name
         FROM   pg_catalog.pg_class     c
         JOIN   pg_catalog.pg_namespace n ON n.oid = c.relnamespace
         WHERE  c.relname = '${normalized}'
           AND  c.relkind IN ('r','p')
           AND  n.nspname NOT IN ('pg_catalog','information_schema','pg_toast')
           AND  n.nspname NOT LIKE 'pg_%'
         ORDER BY CASE WHEN n.nspname = 'public' THEN 0 ELSE 1 END
         LIMIT 1`,
        { type: QueryTypes.SELECT },
      );
      const oidRows: any[] = Array.isArray(oidRaw[0]) ? (oidRaw[0] as any[]) : (oidRaw as any[]);
      if (oidRows.length > 0) {
        tableOid = Number(oidRows[0].oid);
      } else {
        logger.warn(`listColumns: table "${normalized}" not found in any schema`);
        return [];
      }
    } catch (e: any) {
      logger.warn(`listColumns OID lookup failed for "${normalized}": ${e?.message}`);
      return [];
    }

    // Step 2: query pg_attribute by OID — no name-matching issues
    let rawCols: any[];
    try {
      const result = await getSequelize().query(
        `SELECT a.attname                                AS column_name,
                format_type(a.atttypid, a.atttypmod)   AS data_type,
                (NOT a.attnotnull)                      AS is_nullable,
                pg_get_expr(d.adbin, d.adrelid)         AS column_default
         FROM   pg_catalog.pg_attribute   a
         LEFT JOIN pg_catalog.pg_attrdef  d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
         WHERE  a.attrelid = ${tableOid}
           AND  a.attnum   > 0
           AND  NOT a.attisdropped
         ORDER BY a.attnum`,
        { type: QueryTypes.SELECT },
      );
      rawCols = Array.isArray(result[0]) ? (result[0] as any[]) : (result as any[]);
    } catch (err: any) {
      logger.warn(`listColumns pg_attribute query failed (OID=${tableOid}): ${err?.message}`);
      return [];
    }

    if (rawCols.length === 0) {
      logger.info(`listColumns: pg_attribute returned 0 columns for "${normalized}" (OID=${tableOid})`);
      return [];
    }

    const dynamicCols = await this.getDynamicColumnNames(normalized);
    return rawCols.map((row: any) => ({
      name: row.column_name,
      type: row.data_type,
      allowNull: Boolean(row.is_nullable),
      defaultValue: row.column_default ?? undefined,
      isDynamic: dynamicCols.has((row.column_name as string)?.toLowerCase()),
    }));
  }

  async createCustomTable(tableName: string, updatedByUserId: string): Promise<{ ok: true }> {
    const normalized = tableName.trim();
    if (!IDENTIFIER_REGEX.test(normalized)) {
      throw new ErrorHandler("Invalid tableName.", 400);
    }
    if (SCHEMA_MANAGED_TABLES.includes(normalized)) {
      throw new ErrorHandler(`Table '${normalized}' is a codebase table and cannot be recreated.`, 409);
    }

    const customTables = await getCustomTableNames();
    if (customTables.includes(normalized)) {
      throw new ErrorHandler(`Table '${normalized}' already exists.`, 409);
    }

    const queryInterface = getSequelize().getQueryInterface();
    await queryInterface.createTable({ tableName: normalized, schema: "public" }, {
      id: { type: DataType.UUID, primaryKey: true, defaultValue: UUIDV4, allowNull: false },
      createdAt: { type: DataType.DATE, allowNull: false },
      updatedAt: { type: DataType.DATE, allowNull: false },
    });

    await systemConfigApplicationService.set({
      key: CUSTOM_TABLES_CONFIG_KEY,
      value: [...customTables, normalized],
      updatedByUserId,
    });

    logger.info(`Created custom table ${normalized} (by=${updatedByUserId})`);

    await auditTrailApplicationService.log({
      action: "SCHEMA_CREATE_TABLE",
      actorUserId: updatedByUserId,
      targetType: "Schema",
      targetKey: normalized,
      before: null,
      after: { tableName: normalized },
    });

    return { ok: true };
  }

  async deleteCustomTable(tableName: string, updatedByUserId: string): Promise<{ ok: true }> {
    const normalized = tableName.trim();
    if (SCHEMA_MANAGED_TABLES.includes(normalized)) {
      throw new ErrorHandler(`Table '${normalized}' is a codebase table and cannot be deleted.`, 403);
    }

    const customTables = await getCustomTableNames();
    if (!customTables.includes(normalized)) {
      throw new ErrorHandler(`Table '${normalized}' not found.`, 404);
    }

    const queryInterface = getSequelize().getQueryInterface();
    await queryInterface.dropTable({ tableName: normalized, schema: "public" });

    await systemConfigApplicationService.set({
      key: CUSTOM_TABLES_CONFIG_KEY,
      value: customTables.filter((t) => t !== normalized),
      updatedByUserId,
    });

    logger.info(`Deleted custom table ${normalized} (by=${updatedByUserId})`);

    await auditTrailApplicationService.log({
      action: "SCHEMA_DELETE_TABLE",
      actorUserId: updatedByUserId,
      targetType: "Schema",
      targetKey: normalized,
      before: { tableName: normalized },
      after: null,
    });

    return { ok: true };
  }

  async expandColumn(input: ExpandColumnInput): Promise<{ ok: true }> {
    const tableName = await ensureTableAllowed(input.tableName);
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

    await auditTrailApplicationService.log({
      action: "SCHEMA_EXPAND_COLUMN",
      actorUserId: input.updatedByUserId,
      targetType: "Schema",
      targetKey: `${tableName}.${columnName}`,
      before: null,
      after: { tableName, columnName, type: input.type },
    });

    return { ok: true };
  }

  async deleteColumn(input: DeleteColumnInput): Promise<{ ok: true }> {
    const tableName = await ensureTableAllowed(input.tableName);
    const columnName = ensureColumnAllowed(input.columnName);

    const queryInterface = getSequelize().getQueryInterface();
    const description = (await queryInterface.describeTable(tableName)) as Record<
      string,
      any
    >;

    if (!description[columnName]) {
      return { ok: true };
    }

    const before = {
      tableName,
      columnName,
      type: description[columnName]?.type,
      allowNull: description[columnName]?.allowNull,
      defaultValue: description[columnName]?.defaultValue,
    };

    await queryInterface.removeColumn(tableName, columnName);

    logger.info(
      `Deleted column ${columnName} from ${tableName} (by=${input.updatedByUserId})`,
    );

    await auditTrailApplicationService.log({
      action: "SCHEMA_DELETE_COLUMN",
      actorUserId: input.updatedByUserId,
      targetType: "Schema",
      targetKey: `${tableName}.${columnName}`,
      before,
      after: null,
    });

    return { ok: true };
  }
}

export const schemaManagementApplicationService =
  new SchemaManagementApplicationService();
