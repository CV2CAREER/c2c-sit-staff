import { QueryTypes } from "sequelize";
import { getServiceLogger } from "../../utils/createLogger";
import { getSequelize } from "../../utils/sequelize";

interface TableExistsRow {
  table_name: string | null;
}

interface ColumnRow {
  column_name: string;
}

export interface ApplicationsTableShape {
  createdAtColumn: string;
  deletedAtColumn?: string;
  statusColumn: string;
  statusColumns: string[]; // all matching status columns (e.g. both "Status" and "status")
}

const logger = getServiceLogger("analytics-table-shape-service");

const APPLICATIONS_TABLE = "applications";
const APPLICATIONS_STATUS_COLUMNS = [
  "status",
  "applicationStatus",
  "application_status",
  "result",
  "outcome",
];

const APPLICATIONS_CREATED_AT_COLUMNS = [
  "createdAt",
  "created_at",
  "createdOn",
  "created_on",
];

const APPLICATIONS_DELETED_AT_COLUMNS = ["deletedAt", "deleted_at"];

let applicationsTableShapeCache: ApplicationsTableShape | null | undefined;
let applicationsTableShapePromise: Promise<ApplicationsTableShape | null> | null =
  null;

const pickColumn = (
  availableColumns: string[],
  preferredColumns: string[],
): string | undefined => {
  const preferredLower = new Set(preferredColumns.map((c) => c.toLowerCase()));
  return availableColumns.find((col) => preferredLower.has(col.toLowerCase()));
};

// Returns ALL columns whose lowercase name matches any preferred name.
// Handles cases where a table has both "Status" and "status" as separate columns.
const pickAllColumns = (
  availableColumns: string[],
  preferredColumns: string[],
): string[] => {
  const preferredLower = new Set(preferredColumns.map((c) => c.toLowerCase()));
  return availableColumns.filter((col) => preferredLower.has(col.toLowerCase()));
};

const readApplicationsTableShape = async (): Promise<ApplicationsTableShape | null> => {
  const sequelize = getSequelize();

  const tableRows = await sequelize.query<TableExistsRow>(
    `
      SELECT COALESCE(
        to_regclass('public.${APPLICATIONS_TABLE}')::text,
        to_regclass('${APPLICATIONS_TABLE}')::text
      ) AS table_name;
    `,
    { type: QueryTypes.SELECT },
  );

  const tableName = tableRows[0]?.table_name;
  if (!tableName) {
    return null;
  }

  const columns = await sequelize.query<ColumnRow>(
    `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = :tableName
    `,
    {
      type: QueryTypes.SELECT,
      replacements: {
        tableName: APPLICATIONS_TABLE,
      },
    },
  );

  const columnNames = columns.map((row) => row.column_name);

  const createdAtColumn = pickColumn(columnNames, APPLICATIONS_CREATED_AT_COLUMNS);
  const statusColumns = pickAllColumns(columnNames, APPLICATIONS_STATUS_COLUMNS);
  const statusColumn = statusColumns[0];
  const deletedAtColumn = pickColumn(columnNames, APPLICATIONS_DELETED_AT_COLUMNS);

  if (!createdAtColumn || !statusColumn) {
    logger.warn(
      "Applications table detected but required analytics columns are missing.",
    );
    return null;
  }

  logger.info(
    `Applications table shape: createdAt=${createdAtColumn}, statusColumns=${statusColumns.join(",")}, deletedAt=${deletedAtColumn ?? "none"}`,
  );

  return {
    createdAtColumn,
    deletedAtColumn,
    statusColumn,
    statusColumns,
  };
};

export const getApplicationsTableShape = async (
  fresh = false,
): Promise<ApplicationsTableShape | null> => {
  if (!fresh && applicationsTableShapeCache !== undefined) {
    return applicationsTableShapeCache;
  }

  if (!fresh && applicationsTableShapePromise) {
    return applicationsTableShapePromise;
  }

  applicationsTableShapePromise = readApplicationsTableShape()
    .then((shape) => {
      applicationsTableShapeCache = shape;
      return shape;
    })
    .finally(() => {
      applicationsTableShapePromise = null;
    });

  return applicationsTableShapePromise;
};

export const clearApplicationsTableShapeCache = () => {
  applicationsTableShapeCache = undefined;
};

