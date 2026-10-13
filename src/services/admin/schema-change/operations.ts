import ErrorHandler from "../../../utils/errorHandler";
import { diffSnapshots, qn, quoteIdent, quoteLiteral } from "../schema-diff.engine";
import type { ColumnSnap, ConstraintSnap, RelationSnap, SchemaSnapshot } from "../schema-diff.snapshot.service";
import { ImpactKind, ImpactReport, assessImpact } from "./impact";
import {
  RowCondition,
  buildKeyWhere,
  buildWhere,
  childSubquery,
  describeConditions,
  displayValue,
  incomingForeignKeys,
  isSensitiveColumn as isSensitiveColumnName,
  primaryKeyOf,
} from "./row-filter";

// Guided schema operations for Admin > Database Modifications.
//
// Nothing here accepts SQL from the browser. Each operation is validated
// (identifiers, an allow-list of types, safe default values), checked
// against the target's live catalog, and turned into SQL whose every
// identifier is quoted. "Apply a Database Evaluation difference" is resolved
// server-side into the same guided operations, or — for definitions that
// only exist as catalog DDL (an index, a CHECK) — into statements built from
// the SOURCE database's own catalog, never from client input.

// ---------------------------------------------------------------------------
// input types

export type DefaultInput =
  | { kind: "none" }
  | { kind: "literal"; value: string | number | boolean }
  | { kind: "expression"; value: string };

export interface ColumnInput {
  name: string;
  type: string;
  nullable: boolean;
  default?: DefaultInput;
}

export type OperationInput =
  | { kind: "add_column"; schema?: string; table: string; column: string; type: string; nullable: boolean; default?: DefaultInput }
  | { kind: "drop_column"; schema?: string; table: string; column: string }
  | { kind: "alter_column_type"; schema?: string; table: string; column: string; type: string }
  | { kind: "set_nullable"; schema?: string; table: string; column: string; nullable: boolean }
  | { kind: "set_default"; schema?: string; table: string; column: string; default: DefaultInput }
  | { kind: "create_index"; schema?: string; table: string; name: string; columns: string[]; unique: boolean }
  | { kind: "drop_index"; schema?: string; table: string; name: string }
  | { kind: "add_unique"; schema?: string; table: string; name: string; columns: string[] }
  | {
      kind: "add_foreign_key";
      schema?: string;
      table: string;
      name: string;
      columns: string[];
      refSchema?: string;
      refTable: string;
      refColumns: string[];
      onDelete: string;
    }
  | { kind: "drop_constraint"; schema?: string; table: string; name: string }
  | { kind: "create_table"; schema?: string; table: string; columns: ColumnInput[]; primaryKey: string[] }
  | { kind: "drop_table"; schema?: string; table: string }
  | { kind: "add_enum_value"; schema?: string; enum: string; value: string }
  | {
      kind: "update_value";
      schema?: string;
      table: string;
      keyColumn: string; // column identifying the row (e.g. uniqueId)
      keyValue: string;
      column: string;
      newValue: string | null; // null = set to NULL
      expectedOld?: string | null; // refuse unless the current value matches (undefined = don't check)
    }
  | {
      kind: "delete_rows";
      schema?: string;
      table: string;
      mode: "selection" | "filter";
      keys?: Record<string, string>[];
      conditions?: RowCondition[];
      allRows?: boolean;
    }
  | {
      kind: "apply_diff";
      sourceKey: string;
      schemas: string[];
      item: { object: string; category: string; change: string; name: string };
    };

// Server-produced operations. `trusted` fields come only from catalogs read
// by this server (never from a request body) — see stripUntrusted().
export type ResolvedOperation =
  | (Exclude<OperationInput, { kind: "apply_diff" }> & {
      origin?: string;
      trustedType?: string;
      trustedDefault?: string | null;
    })
  | {
      kind: "trusted_sql";
      origin?: string;
      title: string;
      table: string | null; // qualified, for impact
      statements: string[];
      undoStatements: string[];
      impactKind: ImpactKind;
      risk: Risk;
      verify: VerifySpec[];
    };

export type Risk = "safe" | "caution" | "destructive";

export interface CheckResult {
  status: "pass" | "warn" | "fail";
  label: string;
  message: string;
  // Part of the plan hash: if it differs at apply time, nothing runs.
  fingerprint?: string;
  // The exact number of rows the operation's DELETE must affect.
  expectedRows?: number;
  // A few (masked) rows for the review screen — never sent to the AI.
  preview?: { columns: string[]; rows: (string | null)[][] };
}

export type VerifySpec =
  | { type: "column_exists"; table: string; column: string; dataType?: string }
  | { type: "column_absent"; table: string; column: string }
  | { type: "column_nullable"; table: string; column: string; nullable: boolean }
  | { type: "column_default"; table: string; column: string; hasDefault: boolean }
  | { type: "table_exists"; table: string }
  | { type: "table_absent"; table: string }
  | { type: "index_exists"; table: string; name: string }
  | { type: "index_absent"; table: string; name: string }
  | { type: "constraint_exists"; table: string; name: string }
  | { type: "constraint_absent"; table: string; name: string }
  | { type: "enum_has_value"; enum: string; value: string }
  | { type: "rows_absent"; table: string; where: string; description: string }
  | { type: "value_equals"; table: string; where: string; column: string; value: string | null };

type Query = (sql: string, params?: unknown[]) => Promise<any[]>;
type CheckFn = (q: Query) => Promise<CheckResult>;

export interface BuiltOperation {
  title: string;
  risk: Risk;
  table: string | null; // qualified
  statements: string[];
  backupStatements: string[];
  backups: { table: string; description: string }[];
  undoStatements: string[];
  undoNote?: string;
  checks: CheckFn[];
  impact: ImpactReport;
  // Rewrites/scans the whole table while holding a lock — skipped in the dry
  // run for big tables so the review never locks PROD for long.
  heavy: boolean;
  rowEstimate: number;
  verify: VerifySpec[];
  notes: string[];
}

export interface BuildContext {
  snapshot: SchemaSnapshot;
  backupPrefix: string; // e.g. _sb_2610121530_ab12cd
  serverMajor: number;
  opIndex?: number; // keeps backup names unique when two operations touch one table
}

// ---------------------------------------------------------------------------
// validation helpers

const NEW_IDENT = /^[A-Za-z_][A-Za-z0-9_]{0,62}$/;
const ON_DELETE = new Set(["NO ACTION", "RESTRICT", "CASCADE", "SET NULL", "SET DEFAULT"]);
const HEAVY_ROWS = 50_000;

const bad = (message: string) => new ErrorHandler(message, 400);

const requireNewIdent = (value: unknown, what: string): string => {
  const v = String(value ?? "").trim();
  if (!NEW_IDENT.test(v)) {
    throw bad(`${what} "${v}" is not allowed. Use letters, digits and underscores (max 63), not starting with a digit.`);
  }
  return v;
};

const schemaOf = (raw: unknown) => {
  const v = String(raw ?? "public").trim() || "public";
  if (!NEW_IDENT.test(v)) throw bad(`Invalid schema "${v}".`);
  return v;
};

const BASE_TYPES: Record<string, string> = {
  text: "text",
  uuid: "uuid",
  boolean: "boolean",
  bool: "boolean",
  integer: "integer",
  int: "integer",
  int4: "integer",
  bigint: "bigint",
  int8: "bigint",
  smallint: "smallint",
  int2: "smallint",
  real: "real",
  "double precision": "double precision",
  float8: "double precision",
  date: "date",
  jsonb: "jsonb",
  json: "json",
  bytea: "bytea",
  inet: "inet",
  timestamptz: "timestamp with time zone",
  "timestamp with time zone": "timestamp with time zone",
  timestamp: "timestamp without time zone",
  "timestamp without time zone": "timestamp without time zone",
  time: "time without time zone",
  "time without time zone": "time without time zone",
};

export const TYPE_CHOICES = [
  "text",
  "character varying(255)",
  "integer",
  "bigint",
  "numeric(18,4)",
  "boolean",
  "uuid",
  "jsonb",
  "date",
  "timestamp with time zone",
  "text[]",
];

interface NormalizedType {
  sql: string;
  family: "text" | "number" | "boolean" | "json" | "uuid" | "time" | "enum" | "other";
  varcharLength?: number;
}

const normalizeType = (raw: unknown, snapshot: SchemaSnapshot, schema: string): NormalizedType => {
  let v = String(raw ?? "").trim().toLowerCase().replace(/\s+/g, " ");
  if (!v) throw bad("A data type is required.");
  let array = "";
  if (v.endsWith("[]")) {
    array = "[]";
    v = v.slice(0, -2).trim();
  }
  let m = v.match(/^(?:character varying|varchar)(?:\((\d{1,8})\))?$/);
  if (m) {
    const n = m[1] ? Number(m[1]) : null;
    if (n !== null && (n < 1 || n > 10485760)) throw bad("varchar length must be between 1 and 10485760.");
    return { sql: `character varying${n ? `(${n})` : ""}${array}`, family: "text", varcharLength: n ?? undefined };
  }
  m = v.match(/^(?:numeric|decimal)(?:\((\d{1,4})(?:,\s*(\d{1,4}))?\))?$/);
  if (m) {
    const p = m[1] ? Number(m[1]) : null;
    const s = m[2] ? Number(m[2]) : 0;
    if (p !== null && (p < 1 || p > 1000 || s > p)) throw bad("numeric(p,s) needs 1 ≤ p ≤ 1000 and 0 ≤ s ≤ p.");
    return { sql: `numeric${p ? `(${p},${s})` : ""}${array}`, family: "number" };
  }
  if (BASE_TYPES[v]) {
    const sql = BASE_TYPES[v];
    const family: NormalizedType["family"] =
      sql === "text"
        ? "text"
        : ["integer", "bigint", "smallint", "real", "double precision"].includes(sql)
          ? "number"
          : sql === "boolean"
            ? "boolean"
            : sql.startsWith("json")
              ? "json"
              : sql === "uuid"
                ? "uuid"
                : sql.startsWith("timestamp") || sql.startsWith("time") || sql === "date"
                  ? "time"
                  : "other";
    return { sql: sql + array, family: array ? "other" : family };
  }
  // An existing enum type in the target (case-sensitive name as typed).
  const original = String(raw).trim().replace(/\[\]$/, "").replace(/^"|"$/g, "");
  const enumKey = Object.keys(snapshot.enums).find(
    (k) => snapshot.enums[k].name === original && snapshot.enums[k].schema === schema,
  );
  if (enumKey) {
    const e = snapshot.enums[enumKey];
    return { sql: qn(e.schema, e.name) + array, family: array ? "other" : "enum" };
  }
  throw bad(
    `Unsupported type "${raw}". Use one of: ${TYPE_CHOICES.join(", ")}, varchar(n), numeric(p,s), or an existing enum type of this database.`,
  );
};

const EXPRESSIONS: Record<string, string> = {
  "now()": "now()",
  current_timestamp: "CURRENT_TIMESTAMP",
  current_date: "CURRENT_DATE",
  "gen_random_uuid()": "gen_random_uuid()",
  "uuid_generate_v4()": "uuid_generate_v4()",
};

export const DEFAULT_EXPRESSIONS = Object.keys(EXPRESSIONS);

const renderDefault = (input: DefaultInput | undefined, type: NormalizedType): string | null => {
  if (!input || input.kind === "none") return null;
  if (input.kind === "expression") {
    const key = String(input.value ?? "").trim().toLowerCase();
    const sql = EXPRESSIONS[key];
    if (!sql) throw bad(`Default expression must be one of: ${DEFAULT_EXPRESSIONS.join(", ")}.`);
    return sql;
  }
  const value = input.value;
  switch (type.family) {
    case "boolean": {
      const s = String(value).toLowerCase();
      if (s !== "true" && s !== "false") throw bad("A boolean default must be true or false.");
      return s === "true" ? "true" : "false";
    }
    case "number": {
      const s = String(value).trim();
      if (!/^-?\d+(\.\d+)?$/.test(s)) throw bad(`"${s}" is not a valid number.`);
      return s;
    }
    case "json": {
      let parsed: unknown;
      try {
        parsed = typeof value === "string" ? JSON.parse(value) : value;
      } catch {
        throw bad("A JSON default must be valid JSON, e.g. {} or [].");
      }
      return `${quoteLiteral(JSON.stringify(parsed))}::${type.sql}`;
    }
    default:
      return `${quoteLiteral(String(value))}::${type.sql}`;
  }
};

// ---------------------------------------------------------------------------
// catalog helpers

const relKey = (schema: string, table: string) => `${schema}.${table}`;

const getTable = (snapshot: SchemaSnapshot, schema: string, table: string): RelationSnap => {
  const rel = snapshot.relations[relKey(schema, String(table))];
  if (!rel) throw bad(`Table ${schema}.${table} does not exist in ${snapshot.database}.`);
  if (rel.kind !== "table" && rel.kind !== "partitioned_table") throw bad(`${schema}.${table} is a ${rel.kind}, not a table.`);
  return rel;
};

const getColumn = (rel: RelationSnap, column: string): ColumnSnap => {
  const col = rel.columns.find((c) => c.name === column);
  if (!col) throw bad(`Column "${column}" does not exist on ${rel.schema}.${rel.name}.`);
  return col;
};

const IDENT_LIST = /\(([^)]*)\)/;
const parseIdentList = (text: string): string[] =>
  text
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => (s.startsWith('"') ? s.slice(1, -1).replace(/""/g, '"') : s));

const pkColumns = (rel: RelationSnap): string[] => {
  const pk = rel.constraints.find((c) => c.type === "p");
  const m = pk?.definition.match(IDENT_LIST);
  return m ? parseIdentList(m[1]) : [];
};

const backupName = (ctx: BuildContext, ...parts: string[]) =>
  `${ctx.backupPrefix}${ctx.opIndex ? `o${ctx.opIndex}` : ""}_${parts.join("_")}`.replace(/[^A-Za-z0-9_]/g, "_").slice(0, 63);

const regclass = (schema: string, table: string) => quoteLiteral(qn(schema, table));

// Sample values in check messages are masked — they are shown in the UI,
// stored with the request and sent to the AI review, and may be PII,
// password hashes or tokens.
const maskedSql = (expr: string) =>
  `CASE WHEN length(${expr}) <= 4 THEN repeat('•', length(${expr})) ELSE left(${expr}, 4) || '…(' || length(${expr}) || ' chars)' END`;

const count = async (q: Query, sql: string, params?: unknown[]) => Number((await q(sql, params))[0]?.n ?? 0);

const pass = (label: string, message: string): CheckResult => ({ status: "pass", label, message });
const warn = (label: string, message: string): CheckResult => ({ status: "warn", label, message });
const fail = (label: string, message: string): CheckResult => ({ status: "fail", label, message });

const blockerCheck = (impact: ImpactReport): CheckFn[] =>
  impact.level === "blocker"
    ? [async () => fail("Application code", impact.headline + (impact.notes[0] ? ` ${impact.notes[0]}` : ""))]
    : [];

const sizeCheck = (rel: RelationSnap, what: string): CheckFn => async () =>
  rel.rowEstimate > HEAVY_ROWS
    ? warn(
        "Table size",
        `~${rel.rowEstimate.toLocaleString()} rows: ${what} holds a lock on ${rel.name} for the whole operation — run it at a quiet time.`,
      )
    : pass("Table size", `~${rel.rowEstimate.toLocaleString()} rows — quick.`);

const dependentViewsCheck = (rel: RelationSnap, column?: string): CheckFn => async (q) => {
  const rows = await q(
    `SELECT DISTINCT v.oid::regclass::text AS name
     FROM pg_depend d
     JOIN pg_rewrite r ON r.oid = d.objid
     JOIN pg_class v ON v.oid = r.ev_class
     WHERE d.refobjid = ${regclass(rel.schema, rel.name)}::regclass
       AND v.oid <> ${regclass(rel.schema, rel.name)}::regclass
       ${column ? `AND d.refobjsubid = (SELECT attnum FROM pg_attribute WHERE attrelid = ${regclass(rel.schema, rel.name)}::regclass AND attname = $1)` : ""}`,
    column ? [column] : [],
  );
  return rows.length
    ? fail("Dependent views", `Used by view(s) ${rows.map((r) => r.name).join(", ")} — change or drop those first.`)
    : pass("Dependent views", "No views depend on it.");
};

const incomingFkCheck = (rel: RelationSnap, column?: string): CheckFn => async (q) => {
  const rows = await q(
    `SELECT c.conname AS name, c.conrelid::regclass::text AS from_table
     FROM pg_constraint c
     WHERE c.contype = 'f'
       AND c.confrelid = ${regclass(rel.schema, rel.name)}::regclass
       AND c.conrelid <> ${regclass(rel.schema, rel.name)}::regclass
       ${column ? `AND (SELECT attnum FROM pg_attribute WHERE attrelid = c.confrelid AND attname = $1) = ANY (c.confkey)` : ""}`,
    column ? [column] : [],
  );
  return rows.length
    ? fail(
        "Referenced by other tables",
        `Foreign key(s) ${rows.map((r) => `${r.from_table}.${r.name}`).join(", ")} point at it — drop those first.`,
      )
    : pass("Referenced by other tables", "No other table references it.");
};

const duplicatesCheck = (rel: RelationSnap, columns: string[]): CheckFn => async (q) => {
  const cols = columns.map(quoteIdent).join(", ");
  const n = await count(
    q,
    `SELECT count(*)::bigint AS n FROM (
       SELECT 1 FROM ${qn(rel.schema, rel.name)}
       WHERE ${columns.map((c) => `${quoteIdent(c)} IS NOT NULL`).join(" AND ")}
       GROUP BY ${cols} HAVING count(*) > 1) d`,
  );
  return n
    ? fail("Existing duplicates", `${n} value(s) of (${columns.join(", ")}) appear more than once — clean them up first.`)
    : pass("Existing duplicates", `No duplicate (${columns.join(", ")}) values.`);
};

const nullsCheck = (rel: RelationSnap, column: string): CheckFn => async (q) => {
  const n = await count(q, `SELECT count(*)::bigint AS n FROM ${qn(rel.schema, rel.name)} WHERE ${quoteIdent(column)} IS NULL`);
  return n
    ? fail("Existing NULLs", `${n.toLocaleString()} row(s) have no "${column}" — fill them in (or set a default and backfill) before making it required.`)
    : pass("Existing NULLs", `Every row already has a "${column}".`);
};

// ---------------------------------------------------------------------------
// builders

// Table name for titles: schema-qualified unless it's the usual "public".
const disp = (rel: { schema: string; name: string }) => (rel.schema === "public" ? rel.name : `${rel.schema}.${rel.name}`);

const baseBuilt = (partial: Partial<BuiltOperation> & Pick<BuiltOperation, "title" | "risk" | "table" | "statements" | "impact">): BuiltOperation => ({
  backupStatements: [],
  backups: [],
  undoStatements: [],
  checks: [],
  heavy: false,
  rowEstimate: 0,
  verify: [],
  notes: [],
  ...partial,
});

const buildAddColumn = (
  op: Extract<ResolvedOperation, { kind: "add_column" }>,
  ctx: BuildContext,
): BuiltOperation => {
  const schema = schemaOf(op.schema);
  const rel = getTable(ctx.snapshot, schema, op.table);
  const column = op.trustedType ? String(op.column) : requireNewIdent(op.column, "Column name");
  if (rel.columns.some((c) => c.name === column)) throw bad(`Column "${column}" already exists on ${rel.name}.`);
  const type = op.trustedType ? { sql: op.trustedType, family: "other" as const } : normalizeType(op.type, ctx.snapshot, schema);
  const def = op.trustedType ? op.trustedDefault ?? null : renderDefault(op.default, type);
  const nullable = Boolean(op.nullable);
  const table = qn(schema, rel.name);

  const notNullNoDefault = !nullable && !def;
  const impact = assessImpact("add_column", rel.name, column, { notNullWithoutDefault: notNullNoDefault });
  const checks: CheckFn[] = [];
  if (notNullNoDefault) {
    checks.push(async (q) => {
      const rows = await q(`SELECT EXISTS (SELECT 1 FROM ${table}) AS has_rows`);
      return rows[0]?.has_rows
        ? fail("Required column on a table with data", `${rel.name} already has rows, so a NOT NULL column needs a default. Add a default, or add it as nullable, backfill, then make it required.`)
        : pass("Required column on a table with data", "Table is empty — NOT NULL without a default is fine.");
    });
  }
  if (def && rel.rowEstimate > HEAVY_ROWS && /now\(\)|CURRENT_|gen_random|uuid_generate/i.test(def)) {
    checks.push(sizeCheck(rel, "a volatile default rewrites every row and"));
  }

  return baseBuilt({
    title: `Add column ${disp(rel)}.${column} (${type.sql}${nullable ? "" : ", required"}${def ? `, default ${def}` : ""})`,
    risk: "safe",
    table: `${schema}.${rel.name}`,
    statements: [`ALTER TABLE ${table} ADD COLUMN ${quoteIdent(column)} ${type.sql}${def ? ` DEFAULT ${def}` : ""}${nullable ? "" : " NOT NULL"};`],
    undoStatements: [`ALTER TABLE ${table} DROP COLUMN ${quoteIdent(column)};`],
    checks: [...checks],
    impact,
    rowEstimate: rel.rowEstimate,
    verify: [
      { type: "column_exists", table: `${schema}.${rel.name}`, column },
      { type: "column_nullable", table: `${schema}.${rel.name}`, column, nullable },
    ],
  });
};

const columnBackup = (ctx: BuildContext, rel: RelationSnap, col: ColumnSnap) => {
  const table = qn(rel.schema, rel.name);
  const pk = pkColumns(rel).filter((c) => c !== col.name);
  const name = backupName(ctx, rel.name, col.name);
  if (pk.length) {
    return {
      name,
      pk,
      statements: [
        `CREATE TABLE ${qn(rel.schema, name)} AS SELECT ${pk.map(quoteIdent).join(", ")}, ${quoteIdent(col.name)} FROM ${table};`,
      ],
      description: `${rel.name}.${col.name} values keyed by ${pk.join(", ")}`,
    };
  }
  return {
    name,
    pk: [],
    statements: [`CREATE TABLE ${qn(rel.schema, name)} AS TABLE ${table};`],
    description: `full copy of ${rel.name} (it has no primary key)`,
  };
};

const restoreFromBackup = (rel: RelationSnap, col: ColumnSnap, backup: { name: string; pk: string[] }) =>
  backup.pk.length
    ? `UPDATE ${qn(rel.schema, rel.name)} AS t SET ${quoteIdent(col.name)} = b.${quoteIdent(col.name)} FROM ${qn(rel.schema, backup.name)} AS b WHERE ${backup.pk
        .map((c) => `t.${quoteIdent(c)} = b.${quoteIdent(c)}`)
        .join(" AND ")};`
    : null;

const buildDropColumn = (op: Extract<ResolvedOperation, { kind: "drop_column" }>, ctx: BuildContext): BuiltOperation => {
  const schema = schemaOf(op.schema);
  const rel = getTable(ctx.snapshot, schema, op.table);
  const col = getColumn(rel, String(op.column));
  const table = qn(schema, rel.name);
  const backup = columnBackup(ctx, rel, col);
  const impact = assessImpact("drop_column", rel.name, col.name);
  const restore = restoreFromBackup(rel, col, backup);

  return baseBuilt({
    title: `Drop column ${disp(rel)}.${col.name}`,
    risk: "destructive",
    table: `${schema}.${rel.name}`,
    statements: [`ALTER TABLE ${table} DROP COLUMN ${quoteIdent(col.name)};`],
    backupStatements: backup.statements,
    backups: [{ table: `${schema}.${backup.name}`, description: backup.description }],
    undoStatements: restore
      ? [
          `ALTER TABLE ${table} ADD COLUMN ${quoteIdent(col.name)} ${col.type};`,
          restore,
          ...(col.default ? [`ALTER TABLE ${table} ALTER COLUMN ${quoteIdent(col.name)} SET DEFAULT ${col.default};`] : []),
          ...(!col.nullable ? [`ALTER TABLE ${table} ALTER COLUMN ${quoteIdent(col.name)} SET NOT NULL;`] : []),
        ]
      : [],
    undoNote: restore ? undefined : `${rel.name} has no primary key, so values can't be matched back automatically — restore manually from ${backup.name}.`,
    checks: [...blockerCheck(impact), dependentViewsCheck(rel, col.name), incomingFkCheck(rel, col.name)],
    impact,
    rowEstimate: rel.rowEstimate,
    verify: [{ type: "column_absent", table: `${schema}.${rel.name}`, column: col.name }],
    notes: ["Indexes and constraints that include only this column are dropped with it."],
  });
};

const isWidening = (from: string, to: NormalizedType) => {
  const a = from.match(/^character varying\((\d+)\)$/);
  if (a && (to.sql === "text" || to.sql === "character varying")) return true;
  if (a && to.varcharLength && to.varcharLength >= Number(a[1])) return true;
  if (from === "integer" && (to.sql === "bigint" || to.sql.startsWith("numeric"))) return true;
  if (from === "smallint" && ["integer", "bigint"].includes(to.sql)) return true;
  return false;
};

const buildAlterType = (op: Extract<ResolvedOperation, { kind: "alter_column_type" }>, ctx: BuildContext): BuiltOperation => {
  const schema = schemaOf(op.schema);
  const rel = getTable(ctx.snapshot, schema, op.table);
  const col = getColumn(rel, String(op.column));
  const type: NormalizedType = op.trustedType
    ? { sql: op.trustedType, family: "other", varcharLength: Number(op.trustedType.match(/^character varying\((\d+)\)$/)?.[1]) || undefined }
    : normalizeType(op.type, ctx.snapshot, schema);
  if (type.sql === col.type) throw bad(`${rel.name}.${col.name} is already ${col.type}.`);
  const table = qn(schema, rel.name);
  const widening = isWidening(col.type, type);
  const backup = widening ? null : columnBackup(ctx, rel, col);
  const restore = backup ? restoreFromBackup(rel, col, backup) : null;
  const impact = assessImpact("alter_type", rel.name, col.name);

  const checks: CheckFn[] = [sizeCheck(rel, "changing the type rewrites the table and"), dependentViewsCheck(rel, col.name)];
  // Cast through the base type (no length/precision): PostgreSQL's explicit
  // cast to varchar(n) silently TRUNCATES, but the implicit assignment to the
  // column type raises "value too long" — so data can never be cut silently.
  const baseType = type.sql.replace(/\(\d+(?:,\s*\d+)?\)/g, "");
  if (!widening) {
    if (type.varcharLength) {
      checks.push(async (q) => {
        const n = await count(
          q,
          `SELECT count(*)::bigint AS n FROM ${table} WHERE length(${quoteIdent(col.name)}::text) > ${type.varcharLength}`,
        );
        return n
          ? fail("Values too long", `${n} value(s) are longer than ${type.varcharLength} characters and would not fit — shorten them or choose a bigger length.`)
          : pass("Values too long", `Every value fits in ${type.varcharLength} characters.`);
      });
    }
    // Text-like columns are converted by parsing their text, so each value
    // must be valid input for the new type. Other types (numeric → integer,
    // timestamp → date, …) go through PostgreSQL's own cast — the same one the
    // ALTER uses — so we only report values whose stored form would change.
    const textSource = /^(text|character varying|character|varchar|char|citext)\b/.test(col.type);
    const colRef = quoteIdent(col.name);
    const converted = `(${colRef}::${baseType})::${type.sql}`;
    checks.push(async (q) => {
      const typeName = type.sql.replace(/^"public"\./, "");
      if (textSource) {
        if (ctx.serverMajor < 16) {
          return warn("Convertible values", "This server is older than PostgreSQL 16, so values are only validated by the dry run.");
        }
        const rows = await q(
          `SELECT count(*)::bigint AS n, (array_agg(${maskedSql(`${colRef}::text`)}))[1:3] AS samples
           FROM ${table}
           WHERE ${colRef} IS NOT NULL AND NOT pg_input_is_valid(${colRef}::text, $1)`,
          [typeName],
        );
        const n = Number(rows[0]?.n ?? 0);
        if (n) {
          return fail("Convertible values", `${n} value(s) can't be converted to ${type.sql}, e.g. ${(rows[0].samples || []).map((v: string) => JSON.stringify(v)).join(", ")}. Fix them first.`);
        }
      }
      // Would the stored value change (e.g. 12.34 → 12)? CASE keeps invalid
      // text values (already reported above) from being cast at all.
      const guard = textSource && ctx.serverMajor >= 16 ? `pg_input_is_valid(${colRef}::text, $1)` : "true";
      const changed = await q(
        `SELECT count(*)::bigint AS n,
                (array_agg(${maskedSql(`${colRef}::text`)} || ' → ' || ${maskedSql(`${converted}::text`)}))[1:3] AS samples
         FROM ${table}
         WHERE ${colRef} IS NOT NULL
           AND CASE WHEN ${guard} THEN ${converted}::text IS DISTINCT FROM ${colRef}::text ELSE false END`,
        textSource && ctx.serverMajor >= 16 ? [typeName] : [],
      );
      const c = Number(changed[0]?.n ?? 0);
      return c
        ? warn("Values change", `${c} value(s) will be stored differently, e.g. ${(changed[0].samples || []).join(", ")}. The original values are backed up.`)
        : pass("Convertible values", `Every existing value converts to ${type.sql} unchanged.`);
    });
  }

  return baseBuilt({
    title: `Change ${disp(rel)}.${col.name} type: ${col.type} → ${type.sql}`,
    risk: widening ? "caution" : "destructive",
    table: `${schema}.${rel.name}`,
    statements: [`ALTER TABLE ${table} ALTER COLUMN ${quoteIdent(col.name)} TYPE ${type.sql} USING ${quoteIdent(col.name)}::${baseType};`],
    backupStatements: backup?.statements ?? [],
    backups: backup ? [{ table: `${schema}.${backup.name}`, description: backup.description }] : [],
    undoStatements: [
      `ALTER TABLE ${table} ALTER COLUMN ${quoteIdent(col.name)} TYPE ${col.type} USING ${quoteIdent(col.name)}::${col.type.replace(/\(\d+(?:,\s*\d+)?\)/g, "")};`,
      ...(restore ? [restore] : []),
    ],
    checks,
    impact,
    heavy: true,
    rowEstimate: rel.rowEstimate,
    verify: [{ type: "column_exists", table: `${schema}.${rel.name}`, column: col.name, dataType: type.sql }],
  });
};

const buildSetNullable = (op: Extract<ResolvedOperation, { kind: "set_nullable" }>, ctx: BuildContext): BuiltOperation => {
  const schema = schemaOf(op.schema);
  const rel = getTable(ctx.snapshot, schema, op.table);
  const col = getColumn(rel, String(op.column));
  const nullable = Boolean(op.nullable);
  if (col.nullable === nullable) throw bad(`${rel.name}.${col.name} is already ${nullable ? "nullable" : "NOT NULL"}.`);
  const table = qn(schema, rel.name);
  const ref = `ALTER TABLE ${table} ALTER COLUMN ${quoteIdent(col.name)}`;
  return baseBuilt({
    title: nullable ? `Allow NULL in ${disp(rel)}.${col.name}` : `Make ${disp(rel)}.${col.name} required (NOT NULL)`,
    risk: nullable ? "safe" : "caution",
    table: `${schema}.${rel.name}`,
    statements: [nullable ? `${ref} DROP NOT NULL;` : `${ref} SET NOT NULL;`],
    undoStatements: [nullable ? `${ref} SET NOT NULL;` : `${ref} DROP NOT NULL;`],
    undoNote: nullable ? "Undo fails if NULLs were written after this change." : undefined,
    checks: nullable ? [] : [nullsCheck(rel, col.name), sizeCheck(rel, "checking every row")],
    impact: assessImpact(nullable ? "drop_not_null" : "set_not_null", rel.name, col.name),
    heavy: !nullable,
    rowEstimate: rel.rowEstimate,
    verify: [{ type: "column_nullable", table: `${schema}.${rel.name}`, column: col.name, nullable }],
  });
};

const buildSetDefault = (op: Extract<ResolvedOperation, { kind: "set_default" }>, ctx: BuildContext): BuiltOperation => {
  const schema = schemaOf(op.schema);
  const rel = getTable(ctx.snapshot, schema, op.table);
  const col = getColumn(rel, String(op.column));
  const typeForDefault: NormalizedType = (() => {
    try {
      return normalizeType(col.type, ctx.snapshot, schema);
    } catch {
      return { sql: col.type, family: "other" };
    }
  })();
  const def = op.trustedType !== undefined || op.trustedDefault !== undefined ? op.trustedDefault ?? null : renderDefault(op.default, typeForDefault);
  if ((def ?? null) === (col.default ?? null)) throw bad(`${rel.name}.${col.name} already has that default.`);
  const ref = `ALTER TABLE ${qn(schema, rel.name)} ALTER COLUMN ${quoteIdent(col.name)}`;
  return baseBuilt({
    title: def ? `Set default of ${disp(rel)}.${col.name} to ${def}` : `Remove default of ${disp(rel)}.${col.name}`,
    risk: "safe",
    table: `${schema}.${rel.name}`,
    statements: [def ? `${ref} SET DEFAULT ${def};` : `${ref} DROP DEFAULT;`],
    undoStatements: [col.default ? `${ref} SET DEFAULT ${col.default};` : `${ref} DROP DEFAULT;`],
    impact: assessImpact("set_default", rel.name, col.name),
    rowEstimate: rel.rowEstimate,
    verify: [{ type: "column_default", table: `${schema}.${rel.name}`, column: col.name, hasDefault: !!def }],
    notes: ["Only affects new rows; existing values are unchanged."],
  });
};

const columnsExist = (rel: RelationSnap, cols: unknown): string[] => {
  if (!Array.isArray(cols) || !cols.length) throw bad("Pick at least one column.");
  const list = cols.map((c) => String(c));
  for (const c of list) getColumn(rel, c);
  if (new Set(list).size !== list.length) throw bad("A column is listed twice.");
  return list;
};

const nameFree = (ctx: BuildContext, schema: string, name: string) => {
  for (const rel of Object.values(ctx.snapshot.relations)) {
    if (rel.schema !== schema) continue;
    if (rel.name === name) throw bad(`"${name}" is already used by a table or view.`);
    if (rel.indexes.some((i) => i.name === name)) throw bad(`An index named "${name}" already exists.`);
    if (rel.constraints.some((c) => c.name === name)) throw bad(`A constraint named "${name}" already exists.`);
  }
};

const buildCreateIndex = (op: Extract<ResolvedOperation, { kind: "create_index" }>, ctx: BuildContext): BuiltOperation => {
  const schema = schemaOf(op.schema);
  const rel = getTable(ctx.snapshot, schema, op.table);
  const name = requireNewIdent(op.name, "Index name");
  nameFree(ctx, schema, name);
  const cols = columnsExist(rel, op.columns);
  const unique = Boolean(op.unique);
  return baseBuilt({
    title: `Create ${unique ? "unique " : ""}index ${name} on ${disp(rel)} (${cols.join(", ")})`,
    risk: unique ? "caution" : "safe",
    table: `${schema}.${rel.name}`,
    statements: [`CREATE ${unique ? "UNIQUE " : ""}INDEX ${quoteIdent(name)} ON ${qn(schema, rel.name)} (${cols.map(quoteIdent).join(", ")});`],
    undoStatements: [`DROP INDEX ${qn(schema, name)};`],
    checks: [...(unique ? [duplicatesCheck(rel, cols)] : []), sizeCheck(rel, "building the index blocks writes and")],
    impact: assessImpact("create_index", rel.name, undefined, { unique }),
    heavy: true,
    rowEstimate: rel.rowEstimate,
    verify: [{ type: "index_exists", table: `${schema}.${rel.name}`, name }],
  });
};

const buildDropIndex = (op: Extract<ResolvedOperation, { kind: "drop_index" }>, ctx: BuildContext): BuiltOperation => {
  const schema = schemaOf(op.schema);
  const rel = getTable(ctx.snapshot, schema, op.table);
  const idx = rel.indexes.find((i) => i.name === String(op.name));
  if (!idx) throw bad(`Index "${op.name}" does not exist on ${rel.name}.`);
  if (idx.constraintBacked) throw bad(`Index "${idx.name}" backs a constraint — drop the constraint instead.`);
  return baseBuilt({
    title: `Drop index ${idx.name} on ${disp(rel)}`,
    risk: idx.unique ? "caution" : "safe",
    table: `${schema}.${rel.name}`,
    statements: [`DROP INDEX ${qn(schema, idx.name)};`],
    undoStatements: [`${idx.definition};`],
    impact: assessImpact("drop_index", rel.name),
    rowEstimate: rel.rowEstimate,
    verify: [{ type: "index_absent", table: `${schema}.${rel.name}`, name: idx.name }],
    notes: idx.unique ? ["This index enforces uniqueness — duplicates will be accepted afterwards."] : [],
  });
};

const buildAddUnique = (op: Extract<ResolvedOperation, { kind: "add_unique" }>, ctx: BuildContext): BuiltOperation => {
  const schema = schemaOf(op.schema);
  const rel = getTable(ctx.snapshot, schema, op.table);
  const name = op.trustedType !== undefined ? String(op.name) : requireNewIdent(op.name, "Constraint name");
  nameFree(ctx, schema, name);
  const cols = columnsExist(rel, op.columns);
  return baseBuilt({
    title: `Add unique constraint ${name} on ${disp(rel)} (${cols.join(", ")})`,
    risk: "caution",
    table: `${schema}.${rel.name}`,
    statements: [`ALTER TABLE ${qn(schema, rel.name)} ADD CONSTRAINT ${quoteIdent(name)} UNIQUE (${cols.map(quoteIdent).join(", ")});`],
    undoStatements: [`ALTER TABLE ${qn(schema, rel.name)} DROP CONSTRAINT ${quoteIdent(name)};`],
    checks: [duplicatesCheck(rel, cols), sizeCheck(rel, "building the unique index blocks writes and")],
    impact: assessImpact("add_unique", rel.name),
    heavy: true,
    rowEstimate: rel.rowEstimate,
    verify: [{ type: "constraint_exists", table: `${schema}.${rel.name}`, name }],
  });
};

const buildAddForeignKey = (op: Extract<ResolvedOperation, { kind: "add_foreign_key" }>, ctx: BuildContext): BuiltOperation => {
  const schema = schemaOf(op.schema);
  const rel = getTable(ctx.snapshot, schema, op.table);
  const refSchema = schemaOf(op.refSchema ?? schema);
  const ref = getTable(ctx.snapshot, refSchema, op.refTable);
  const name = op.trustedType !== undefined ? String(op.name) : requireNewIdent(op.name, "Constraint name");
  nameFree(ctx, schema, name);
  const cols = columnsExist(rel, op.columns);
  const refCols = columnsExist(ref, op.refColumns);
  if (cols.length !== refCols.length) throw bad("Pick the same number of columns on both sides of the foreign key.");
  const onDelete = String(op.onDelete || "NO ACTION").toUpperCase();
  if (!ON_DELETE.has(onDelete)) throw bad(`ON DELETE must be one of ${[...ON_DELETE].join(", ")}.`);

  const refUnique = ref.constraints.some((c) => {
    if (c.type !== "p" && c.type !== "u") return false;
    const m = c.definition.match(IDENT_LIST);
    const list = m ? parseIdentList(m[1]) : [];
    return list.length === refCols.length && list.every((x) => refCols.includes(x));
  });

  const checks: CheckFn[] = [
    async () =>
      refUnique
        ? pass("Referenced key", `${ref.name} (${refCols.join(", ")}) is a primary/unique key.`)
        : fail("Referenced key", `${ref.name} (${refCols.join(", ")}) is not a primary key or unique constraint — a foreign key must point at one.`),
    async (q) => {
      const n = await count(
        q,
        `SELECT count(*)::bigint AS n FROM ${qn(schema, rel.name)} c
         WHERE ${cols.map((c) => `c.${quoteIdent(c)} IS NOT NULL`).join(" AND ")}
           AND NOT EXISTS (SELECT 1 FROM ${qn(refSchema, ref.name)} p WHERE ${cols
             .map((c, i) => `p.${quoteIdent(refCols[i])} = c.${quoteIdent(c)}`)
             .join(" AND ")})`,
      );
      return n
        ? fail("Orphan rows", `${n} row(s) in ${rel.name} point at ${ref.name} rows that don't exist — fix or remove them first.`)
        : pass("Orphan rows", `Every ${rel.name} row points at an existing ${ref.name} row.`);
    },
    sizeCheck(rel, "validating every row"),
  ];

  return baseBuilt({
    title: `Add foreign key ${name}: ${disp(rel)}(${cols.join(", ")}) → ${disp(ref)}(${refCols.join(", ")})`,
    risk: "caution",
    table: `${schema}.${rel.name}`,
    statements: [
      `ALTER TABLE ${qn(schema, rel.name)} ADD CONSTRAINT ${quoteIdent(name)} FOREIGN KEY (${cols.map(quoteIdent).join(", ")}) REFERENCES ${qn(refSchema, ref.name)} (${refCols
        .map(quoteIdent)
        .join(", ")}) ON DELETE ${onDelete};`,
    ],
    undoStatements: [`ALTER TABLE ${qn(schema, rel.name)} DROP CONSTRAINT ${quoteIdent(name)};`],
    checks,
    impact: assessImpact("add_foreign_key", rel.name),
    heavy: true,
    rowEstimate: rel.rowEstimate,
    verify: [{ type: "constraint_exists", table: `${schema}.${rel.name}`, name }],
  });
};

const buildDropConstraint = (op: Extract<ResolvedOperation, { kind: "drop_constraint" }>, ctx: BuildContext): BuiltOperation => {
  const schema = schemaOf(op.schema);
  const rel = getTable(ctx.snapshot, schema, op.table);
  const con = rel.constraints.find((c) => c.name === String(op.name));
  if (!con) throw bad(`Constraint "${op.name}" does not exist on ${rel.name}.`);
  if (con.type === "n") throw bad("Use “Allow NULL” to remove a NOT NULL constraint.");
  const checks: CheckFn[] = [];
  if (con.type === "p" || con.type === "u") {
    checks.push(async (q) => {
      const rows = await q(
        `SELECT f.conname AS name, f.conrelid::regclass::text AS from_table
         FROM pg_constraint k JOIN pg_constraint f ON f.contype = 'f' AND f.conindid = k.conindid
         WHERE k.conrelid = ${regclass(schema, rel.name)}::regclass AND k.conname = $1`,
        [con.name],
      );
      return rows.length
        ? fail("Referenced by foreign keys", `${rows.map((r) => `${r.from_table}.${r.name}`).join(", ")} depend on it — drop those first.`)
        : pass("Referenced by foreign keys", "No foreign key depends on it.");
    });
  }
  return baseBuilt({
    title: `Drop constraint ${con.name} on ${disp(rel)}`,
    risk: con.type === "p" ? "destructive" : "caution",
    table: `${schema}.${rel.name}`,
    statements: [`ALTER TABLE ${qn(schema, rel.name)} DROP CONSTRAINT ${quoteIdent(con.name)};`],
    undoStatements: [`ALTER TABLE ${qn(schema, rel.name)} ADD CONSTRAINT ${quoteIdent(con.name)} ${con.definition};`],
    checks,
    impact: assessImpact("drop_constraint", rel.name),
    rowEstimate: rel.rowEstimate,
    verify: [{ type: "constraint_absent", table: `${schema}.${rel.name}`, name: con.name }],
  });
};

const buildCreateTable = (op: Extract<ResolvedOperation, { kind: "create_table" }>, ctx: BuildContext): BuiltOperation => {
  const schema = schemaOf(op.schema);
  const name = requireNewIdent(op.table, "Table name");
  nameFree(ctx, schema, name);
  if (!Array.isArray(op.columns) || !op.columns.length) throw bad("A new table needs at least one column.");
  const seen = new Set<string>();
  const cols = op.columns.map((c) => {
    const colName = requireNewIdent(c.name, "Column name");
    if (seen.has(colName)) throw bad(`Column "${colName}" is listed twice.`);
    seen.add(colName);
    const type = normalizeType(c.type, ctx.snapshot, schema);
    const def = renderDefault(c.default, type);
    return `  ${quoteIdent(colName)} ${type.sql}${def ? ` DEFAULT ${def}` : ""}${c.nullable ? "" : " NOT NULL"}`;
  });
  const pk = Array.isArray(op.primaryKey) ? op.primaryKey.map(String) : [];
  for (const c of pk) if (!seen.has(c)) throw bad(`Primary key column "${c}" is not one of the table's columns.`);
  if (pk.length) cols.push(`  CONSTRAINT ${quoteIdent(`${name}_pkey`.slice(0, 63))} PRIMARY KEY (${pk.map(quoteIdent).join(", ")})`);

  return baseBuilt({
    title: `Create table ${name} (${op.columns.length} columns${pk.length ? `, primary key ${pk.join(", ")}` : ""})`,
    risk: "safe",
    table: `${schema}.${name}`,
    statements: [`CREATE TABLE ${qn(schema, name)} (\n${cols.join(",\n")}\n);`],
    undoStatements: [`DROP TABLE ${qn(schema, name)};`],
    undoNote: "Undo drops the table — only safe while it is still empty.",
    impact: assessImpact("create_table", name),
    verify: [{ type: "table_exists", table: `${schema}.${name}` }],
    notes: pk.length ? [] : ["No primary key — Sequelize models generally need one."],
  });
};

const buildDropTable = (op: Extract<ResolvedOperation, { kind: "drop_table" }>, ctx: BuildContext): BuiltOperation => {
  const schema = schemaOf(op.schema);
  const rel = getTable(ctx.snapshot, schema, op.table);
  const backup = backupName(ctx, rel.name);
  const outgoingFks = rel.constraints.filter((c) => c.type === "f");
  const impact = assessImpact("drop_table", rel.name);

  // "Drop" = rename to a backup table, then detach its outgoing foreign keys
  // so the backup can never block deletes elsewhere. Fully reversible.
  return baseBuilt({
    title: `Drop table ${disp(rel)} (~${rel.rowEstimate.toLocaleString()} rows) — kept as backup ${backup}`,
    risk: "destructive",
    table: `${schema}.${rel.name}`,
    statements: [
      `ALTER TABLE ${qn(schema, rel.name)} RENAME TO ${quoteIdent(backup)};`,
      ...outgoingFks.map((fk) => `ALTER TABLE ${qn(schema, backup)} DROP CONSTRAINT ${quoteIdent(fk.name)};`),
    ],
    backups: [{ table: `${schema}.${backup}`, description: `the whole ${rel.name} table, renamed (data, indexes and constraints intact)` }],
    undoStatements: [
      `ALTER TABLE ${qn(schema, backup)} RENAME TO ${quoteIdent(rel.name)};`,
      ...outgoingFks.map((fk) => `ALTER TABLE ${qn(schema, rel.name)} ADD CONSTRAINT ${quoteIdent(fk.name)} ${fk.definition};`),
    ],
    checks: [...blockerCheck(impact), incomingFkCheck(rel), dependentViewsCheck(rel)],
    impact,
    rowEstimate: rel.rowEstimate,
    verify: [
      { type: "table_absent", table: `${schema}.${rel.name}` },
      { type: "table_exists", table: `${schema}.${backup}` },
    ],
    notes: ["Delete the backup table once you're sure nothing needs it."],
  });
};

const buildAddEnumValue = (op: Extract<ResolvedOperation, { kind: "add_enum_value" }>, ctx: BuildContext): BuiltOperation => {
  const schema = schemaOf(op.schema);
  const e = ctx.snapshot.enums[relKey(schema, String(op.enum))];
  if (!e) throw bad(`Enum type ${schema}.${op.enum} does not exist in ${ctx.snapshot.database}.`);
  const value = String(op.value ?? "");
  if (!value || value.length > 63) throw bad("Enum values must be 1–63 characters.");
  if (e.labels.includes(value)) throw bad(`'${value}' is already a value of ${e.name}.`);
  return baseBuilt({
    title: `Add value '${value}' to enum ${e.name}`,
    risk: "safe",
    table: null,
    statements: [`ALTER TYPE ${qn(schema, e.name)} ADD VALUE ${quoteLiteral(value)};`],
    undoNote: "PostgreSQL can't remove an enum value; it stays (unused) if this change is reverted.",
    impact: assessImpact("enum_or_extension", null),
    verify: [{ type: "enum_has_value", enum: `${schema}.${e.name}`, value }],
  });
};

const normalizeText = (v: string | null | undefined) => (v ?? "").replace(/\s+/g, " ").trim().toLowerCase();

const buildUpdateValue = (op: Extract<ResolvedOperation, { kind: "update_value" }>, ctx: BuildContext): BuiltOperation => {
  const schema = schemaOf(op.schema);
  const rel = getTable(ctx.snapshot, schema, op.table);
  const keyCol = getColumn(rel, String(op.keyColumn));
  const col = getColumn(rel, String(op.column));
  if (col.generated) throw bad(`${rel.name}.${col.name} is a generated column and can't be set.`);
  if (col.name === keyCol.name) throw bad("Changing the identifying column itself isn't supported here.");
  const keyValue = String(op.keyValue ?? "").trim();
  if (!keyValue) throw bad("The row's ID is empty.");
  const newValue = op.newValue === null || op.newValue === undefined ? null : String(op.newValue);
  if (newValue === null && !col.nullable) throw bad(`${rel.name}.${col.name} is required, so it can't be emptied.`);

  const table = qn(schema, rel.name);
  const where = `${quoteIdent(keyCol.name)}::text = ${quoteLiteral(keyValue)}`;
  const newSql = newValue === null ? "NULL" : `${quoteLiteral(newValue)}::${col.type}`;
  const sensitive = isSensitiveColumnName(col.name);
  const show = (v: string | null) => (v === null ? "empty" : sensitive ? "(hidden)" : `“${v.length > 60 ? `${v.slice(0, 57)}…` : v}”`);

  const pk = pkColumns(rel);
  const keyCols = pk.length ? pk : [keyCol.name];
  const backup = backupName(ctx, rel.name, col.name);

  const checks: CheckFn[] = [
    async (q) => {
      const rows = await q(
        `SELECT count(*) OVER () AS n, ${quoteIdent(col.name)}::text AS current, md5(coalesce(${quoteIdent(col.name)}::text, '<null>')) AS fp FROM ${table} WHERE ${where} LIMIT 2`,
      );
      const n = Number(rows[0]?.n ?? 0);
      const label = "Row to update";
      if (n === 0) return fail(label, `No ${rel.name} row has ${keyCol.name} = ${keyValue}.`);
      if (n > 1) return fail(label, `${n} ${rel.name} rows have ${keyCol.name} = ${keyValue} — it doesn't identify a single row.`);
      const current = rows[0].current as string | null;
      if (op.expectedOld !== undefined && normalizeText(current) !== normalizeText(op.expectedOld)) {
        return {
          ...fail(label, `The current value is ${show(current)} but the request says it should be ${show(op.expectedOld)} — it may already have been changed.`),
          fingerprint: `fp=${rows[0].fp}`,
        };
      }
      if (normalizeText(current) === normalizeText(newValue)) {
        return { ...fail(label, `It's already ${show(newValue)} — nothing to change.`), fingerprint: `fp=${rows[0].fp}` };
      }
      return { ...pass(label, `${keyCol.name} = ${keyValue}: ${show(current)} → ${show(newValue)}.`), fingerprint: `fp=${rows[0].fp}`, expectedRows: 1 };
    },
  ];
  if (newValue !== null && ctx.serverMajor >= 16) {
    checks.push(async (q) => {
      const rows = await q(`SELECT pg_input_is_valid($1, $2) AS ok`, [newValue, col.type.replace(/^"public"\./, "")]);
      return rows[0]?.ok
        ? pass("Valid value", `${show(newValue)} is a valid ${col.type}.`)
        : fail("Valid value", `${show(newValue)} isn't a valid ${col.type}.`);
    });
  }

  return baseBuilt({
    title: `Set ${disp(rel)}.${col.name} = ${show(newValue)} where ${keyCol.name} = ${keyValue}`,
    risk: "caution",
    table: `${schema}.${rel.name}`,
    statements: [`UPDATE ${table} SET ${quoteIdent(col.name)} = ${newSql} WHERE ${where};`],
    backupStatements: [
      `CREATE TABLE ${qn(schema, backup)} AS SELECT ${[...new Set([...keyCols, col.name])].map(quoteIdent).join(", ")} FROM ${table} WHERE ${where};`,
    ],
    backups: [{ table: `${schema}.${backup}`, description: `the previous ${col.name} value` }],
    undoStatements: [
      `UPDATE ${table} AS t SET ${quoteIdent(col.name)} = b.${quoteIdent(col.name)} FROM ${qn(schema, backup)} AS b WHERE ${keyCols
        .map((c) => `t.${quoteIdent(c)} = b.${quoteIdent(c)}`)
        .join(" AND ")};`,
    ],
    checks,
    impact: assessImpact("update_value", rel.name, col.name),
    rowEstimate: rel.rowEstimate,
    verify: [{ type: "value_equals", table: `${schema}.${rel.name}`, where, column: col.name, value: newValue }],
  });
};

export const MAX_DELETE_ROWS = 50_000;
const MAX_CASCADE_DEPTH = 3;

const insertFromBackup = (rel: RelationSnap, backupTable: string) => {
  const cols = rel.columns.filter((c) => !c.generated).map((c) => quoteIdent(c.name));
  const overriding = rel.columns.some((c) => c.identity === "a") ? " OVERRIDING SYSTEM VALUE" : "";
  return `INSERT INTO ${qn(rel.schema, rel.name)} (${cols.join(", ")})${overriding} SELECT ${cols.join(", ")} FROM ${qn(rel.schema, backupTable)};`;
};

const buildDeleteRows = (op: Extract<ResolvedOperation, { kind: "delete_rows" }>, ctx: BuildContext): BuiltOperation => {
  const schema = schemaOf(op.schema);
  const rel = getTable(ctx.snapshot, schema, op.table);
  const table = qn(schema, rel.name);

  let where: string;
  let what: string;
  if (op.mode === "selection") {
    const keyed = buildKeyWhere(rel, op.keys);
    where = keyed.where;
    what = `${keyed.count} selected row(s)`;
  } else if (op.mode === "filter") {
    const conditions = Array.isArray(op.conditions) ? op.conditions : [];
    if (!conditions.length && op.allRows !== true) {
      throw bad("Add at least one condition — or explicitly choose to delete every row.");
    }
    where = buildWhere(rel, conditions);
    what = conditions.length ? `rows where ${describeConditions(conditions)}` : "EVERY row";
  } else {
    throw bad('Delete mode must be "selection" or "filter".');
  }

  // Rows in other tables that point at the deleted rows: CASCADE deletes them
  // too, SET NULL/DEFAULT clears the reference, anything else would make the
  // DELETE fail.
  interface Node {
    rel: RelationSnap;
    where: string;
    depth: number;
    action: "delete" | "nullify";
    via?: string;
    fkCols?: string[];
  }
  const nodes: Node[] = [{ rel, where, depth: 0, action: "delete" }];
  const blocking: { child: RelationSnap; where: string; via: string; action: string }[] = [];
  const walk = (parent: Node) => {
    if (parent.depth >= MAX_CASCADE_DEPTH) return;
    for (const edge of incomingForeignKeys(ctx.snapshot, parent.rel)) {
      const sub = childSubquery(edge, parent.rel, parent.where);
      const via = `${edge.child.name}.${edge.name}`;
      if (edge.action === "CASCADE") {
        const node: Node = { rel: edge.child, where: sub, depth: parent.depth + 1, action: "delete", via };
        nodes.push(node);
        walk(node);
      } else if (edge.action === "SET NULL" || edge.action === "SET DEFAULT") {
        nodes.push({ rel: edge.child, where: sub, depth: parent.depth + 1, action: "nullify", via, fkCols: edge.childCols });
      } else {
        blocking.push({ child: edge.child, where: sub, via, action: edge.action });
      }
    }
  };
  walk(nodes[0]);

  const backups = nodes.map((n, i) => ({ node: n, name: backupName(ctx, n.rel.name, "rows", String(i)) }));
  const backupStatements = backups.map(
    (b) => `CREATE TABLE ${qn(b.node.rel.schema, b.name)} AS SELECT * FROM ${qn(b.node.rel.schema, b.node.rel.name)} WHERE ${b.node.where};`,
  );

  // Undo: re-insert parents before children, then restore cleared references.
  const undoStatements: string[] = [];
  const undoGaps: string[] = [];
  for (const b of [...backups].filter((x) => x.node.action === "delete").sort((a, z) => a.node.depth - z.node.depth)) {
    undoStatements.push(insertFromBackup(b.node.rel, b.name));
  }
  for (const b of backups.filter((x) => x.node.action === "nullify")) {
    const pk = primaryKeyOf(b.node.rel);
    if (!pk.length || !b.node.fkCols) {
      undoGaps.push(`${b.node.rel.name} has no primary key — restore its cleared references manually from ${b.name}.`);
      continue;
    }
    undoStatements.push(
      `UPDATE ${qn(b.node.rel.schema, b.node.rel.name)} AS t SET ${b.node.fkCols.map((c) => `${quoteIdent(c)} = b.${quoteIdent(c)}`).join(", ")} FROM ${qn(b.node.rel.schema, b.name)} AS b WHERE ${pk.map((c) => `t.${quoteIdent(c)} = b.${quoteIdent(c)}`).join(" AND ")};`,
    );
  }

  const checks: CheckFn[] = [
    async (q) => {
      let n: number;
      try {
        n = await count(q, `SELECT count(*)::bigint AS n FROM ${table} WHERE ${where}`);
      } catch (err: any) {
        return fail("Rows to delete", `The conditions can't be evaluated: ${err?.message || err}. Check the values match each column's type.`);
      }
      if (n === 0) return fail("Rows to delete", "No rows match — nothing would be deleted.", );
      if (n > MAX_DELETE_ROWS) {
        return fail("Rows to delete", `${n.toLocaleString()} rows match — the limit is ${MAX_DELETE_ROWS.toLocaleString()} per operation. Narrow the conditions and delete in batches.`);
      }
      const sample = await q(`SELECT * FROM ${table} WHERE ${where} LIMIT 5`);
      const columns = rel.columns.map((c) => c.name);
      return {
        status: n === rel.rowEstimate && n > 10 ? "warn" : "pass",
        label: "Rows to delete",
        message: `${n.toLocaleString()} row(s) in ${disp(rel)} will be deleted${n >= rel.rowEstimate && rel.rowEstimate > 10 ? " — that looks like the whole table" : ""}.`,
        fingerprint: `rows=${n}`,
        expectedRows: n,
        preview: { columns, rows: sample.map((r) => columns.map((c) => displayValue(c, r[c]))) },
      };
    },
    ...nodes.slice(1).map((node): CheckFn => async (q) => {
      const n = await count(q, `SELECT count(*)::bigint AS n FROM ${qn(node.rel.schema, node.rel.name)} WHERE ${node.where}`);
      const label = node.action === "delete" ? `Also deleted from ${disp(node.rel)}` : `References cleared in ${disp(node.rel)}`;
      if (!n) return { ...pass(label, `No ${node.rel.name} rows are affected (via ${node.via}).`), fingerprint: `${label}=0` };
      return {
        ...warn(
          label,
          node.action === "delete"
            ? `${n.toLocaleString()} ${node.rel.name} row(s) will be deleted too (ON DELETE CASCADE via ${node.via}). They are backed up.`
            : `${n.toLocaleString()} ${node.rel.name} row(s) will have their reference cleared (ON DELETE SET NULL via ${node.via}). Backed up.`,
        ),
        fingerprint: `${label}=${n}`,
      };
    }),
    ...blocking.map((b): CheckFn => async (q) => {
      const n = await count(q, `SELECT count(*)::bigint AS n FROM ${qn(b.child.schema, b.child.name)} WHERE ${b.where}`);
      const label = `Referenced by ${disp(b.child)}`;
      return n
        ? {
            ...fail(
              label,
              `${n.toLocaleString()} ${b.child.name} row(s) still point at these rows (${b.via}, ON DELETE ${b.action}) — the delete would fail. Delete or reassign them first (you can add that as an earlier operation in this change).`,
            ),
            fingerprint: `${label}=${n}`,
          }
        : { ...pass(label, `No ${b.child.name} rows point at these rows.`), fingerprint: `${label}=0` };
    }),
  ];
  const deleteTriggers = rel.triggers.filter((t) => /\bDELETE\b/i.test(t.definition));
  if (deleteTriggers.length) {
    checks.push(async () =>
      warn("Delete triggers", `${deleteTriggers.map((t) => t.name).join(", ")} run for every deleted row — their side effects are not undone by a revert.`),
    );
  }

  const cascaded = nodes.filter((n) => n.depth > 0);
  return baseBuilt({
    title: `Delete ${what} from ${disp(rel)}`,
    risk: "destructive",
    table: `${schema}.${rel.name}`,
    statements: [`DELETE FROM ${table} WHERE ${where};`],
    backupStatements,
    backups: backups.map((b) => ({
      table: `${b.node.rel.schema}.${b.name}`,
      description:
        b.node.depth === 0
          ? `the deleted ${rel.name} rows`
          : b.node.action === "delete"
            ? `${b.node.rel.name} rows deleted by cascade`
            : `${b.node.rel.name} rows whose reference was cleared`,
    })),
    undoStatements,
    undoNote: undoGaps.length ? undoGaps.join(" ") : "Re-inserts the backed-up rows. Fails (safely, in the revert's dry run) if rows with the same keys were created since.",
    checks,
    impact: assessImpact("delete_rows", rel.name),
    rowEstimate: rel.rowEstimate,
    verify: [{ type: "rows_absent", table: `${schema}.${rel.name}`, where, description: what }],
    notes: cascaded.length ? [`Also affects: ${[...new Set(cascaded.map((n) => n.rel.name))].join(", ")} (via foreign keys).`] : [],
  });
};

const buildTrusted = (op: Extract<ResolvedOperation, { kind: "trusted_sql" }>): BuiltOperation =>
  baseBuilt({
    title: op.title,
    risk: op.risk,
    table: op.table,
    statements: op.statements,
    undoStatements: op.undoStatements,
    impact: assessImpact(op.impactKind, op.table ? op.table.split(".").slice(1).join(".") : null),
    verify: op.verify,
  });

export const buildOperation = (op: ResolvedOperation, ctx: BuildContext): BuiltOperation => {
  switch (op.kind) {
    case "add_column":
      return buildAddColumn(op, ctx);
    case "drop_column":
      return buildDropColumn(op, ctx);
    case "alter_column_type":
      return buildAlterType(op, ctx);
    case "set_nullable":
      return buildSetNullable(op, ctx);
    case "set_default":
      return buildSetDefault(op, ctx);
    case "create_index":
      return buildCreateIndex(op, ctx);
    case "drop_index":
      return buildDropIndex(op, ctx);
    case "add_unique":
      return buildAddUnique(op, ctx);
    case "add_foreign_key":
      return buildAddForeignKey(op, ctx);
    case "drop_constraint":
      return buildDropConstraint(op, ctx);
    case "create_table":
      return buildCreateTable(op, ctx);
    case "drop_table":
      return buildDropTable(op, ctx);
    case "add_enum_value":
      return buildAddEnumValue(op, ctx);
    case "delete_rows":
      return buildDeleteRows(op, ctx);
    case "update_value":
      return buildUpdateValue(op, ctx);
    case "trusted_sql":
      return buildTrusted(op);
    default:
      throw bad(`Unknown operation "${(op as { kind?: string }).kind}".`);
  }
};

// ---------------------------------------------------------------------------
// request body → operations

const CLIENT_KINDS = new Set([
  "add_column",
  "drop_column",
  "alter_column_type",
  "set_nullable",
  "set_default",
  "create_index",
  "drop_index",
  "add_unique",
  "add_foreign_key",
  "drop_constraint",
  "create_table",
  "drop_table",
  "add_enum_value",
  "delete_rows",
  "update_value",
  "apply_diff",
]);

// Only whitelisted kinds and never any trusted* field from a request body.
export const stripUntrusted = (raw: unknown): OperationInput[] => {
  if (!Array.isArray(raw) || !raw.length) throw bad("Add at least one operation.");
  if (raw.length > 50) throw bad("At most 50 operations per change.");
  return raw.map((r, i) => {
    if (!r || typeof r !== "object") throw bad(`Operation ${i + 1} is not valid.`);
    const kind = String((r as { kind?: unknown }).kind);
    if (!CLIENT_KINDS.has(kind)) throw bad(`Operation ${i + 1}: "${kind}" is not a supported operation.`);
    const clean: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(r as Record<string, unknown>)) {
      if (!k.startsWith("trusted") && k !== "origin" && k !== "statements" && k !== "undoStatements") clean[k] = v;
    }
    return clean as unknown as OperationInput;
  });
};

// ---------------------------------------------------------------------------
// "apply a Database Evaluation difference" → guided / catalog-built operations

const constraintColumns = (con: ConstraintSnap) => {
  const m = con.definition.match(IDENT_LIST);
  return m ? parseIdentList(m[1]) : [];
};

export const resolveDiffOperation = (
  item: { object: string; category: string; change: string; name: string },
  source: SchemaSnapshot,
  target: SchemaSnapshot,
): ResolvedOperation[] => {
  const diff = diffSnapshots(source, target, { includeLegacy: true });
  const found = diff.items.find(
    (i) => i.object === item.object && i.category === item.category && i.change === item.change && i.name === item.name,
  );
  if (!found) {
    throw bad(`The difference "${item.category} ${item.name} on ${item.object}" no longer exists — re-run the comparison.`);
  }
  const origin = `Database Evaluation: ${source.database} → ${target.database}`;
  const [schema, ...rest] = item.object.split(".");
  const tableName = rest.join(".");
  const s = source.relations[item.object];
  const t = target.relations[item.object];
  const unsupported = () =>
    bad(`"${found.message}" can't be applied automatically — use a guided operation or fix it by hand.`);

  switch (`${found.category}:${found.change}`) {
    case "column:missing_in_target": {
      const col = s!.columns.find((c) => c.name === found.name)!;
      const needsBackfill = !col.nullable && !col.default && (t?.rowEstimate ?? 0) > 0;
      return [
        {
          kind: "add_column",
          schema,
          table: tableName,
          column: col.name,
          type: col.type,
          nullable: needsBackfill ? true : col.nullable,
          trustedType: col.type,
          trustedDefault: col.default,
          origin: needsBackfill ? `${origin} (added as nullable: target has rows — backfill, then make it required)` : origin,
        },
      ];
    }
    case "column:extra_in_target":
      return [{ kind: "drop_column", schema, table: tableName, column: found.name, origin }];
    case "column:modified": {
      const sc = s!.columns.find((c) => c.name === found.name)!;
      const tc = t!.columns.find((c) => c.name === found.name)!;
      if (found.message.startsWith("Type differs")) {
        return [{ kind: "alter_column_type", schema, table: tableName, column: sc.name, type: sc.type, trustedType: sc.type, origin }];
      }
      if (sc.nullable !== tc.nullable && /NOT NULL/.test(found.message)) {
        return [{ kind: "set_nullable", schema, table: tableName, column: sc.name, nullable: sc.nullable, origin }];
      }
      if (found.message.startsWith("Default value differs")) {
        return [
          { kind: "set_default", schema, table: tableName, column: sc.name, default: { kind: "none" }, trustedDefault: sc.default, origin },
        ];
      }
      throw unsupported();
    }
    case "table:missing_in_target": {
      const rel = s!;
      const qt = qn(rel.schema, rel.name);
      const cols = rel.columns.map(
        (c) => `  ${quoteIdent(c.name)} ${c.type}${c.identity ? ` GENERATED ${c.identity === "a" ? "ALWAYS" : "BY DEFAULT"} AS IDENTITY` : c.default ? ` DEFAULT ${c.default}` : ""}${c.nullable ? "" : " NOT NULL"}`,
      );
      const statements = [`CREATE TABLE ${qt} (\n${cols.join(",\n")}\n);`];
      for (const con of rel.constraints.filter((c) => c.type !== "n" && c.type !== "f")) {
        statements.push(`ALTER TABLE ${qt} ADD CONSTRAINT ${quoteIdent(con.name)} ${con.definition};`);
      }
      for (const idx of rel.indexes.filter((i) => !i.constraintBacked)) statements.push(`${idx.definition};`);
      for (const fk of rel.constraints.filter((c) => c.type === "f")) {
        statements.push(`ALTER TABLE ${qt} ADD CONSTRAINT ${quoteIdent(fk.name)} ${fk.definition};`);
      }
      return [
        {
          kind: "trusted_sql",
          origin,
          title: `Create table ${disp(rel)} as in ${source.database} (${rel.columns.length} columns, ${rel.constraints.length} constraints, ${rel.indexes.filter((i) => !i.constraintBacked).length} indexes)`,
          table: `${rel.schema}.${rel.name}`,
          statements,
          undoStatements: [`DROP TABLE ${qt};`],
          impactKind: "create_table",
          risk: "safe",
          verify: [{ type: "table_exists", table: `${rel.schema}.${rel.name}` }],
        },
      ];
    }
    case "table:extra_in_target":
      return [{ kind: "drop_table", schema, table: tableName, origin }];
    case "constraint:missing_in_target": {
      const con = s!.constraints.find((c) => c.name === found.name)!;
      if (con.type === "u") return [{ kind: "add_unique", schema, table: tableName, name: con.name, columns: constraintColumns(con), trustedType: "", origin }];
      if (con.type === "f") {
        const m = con.definition.match(/FOREIGN KEY \(([^)]*)\) REFERENCES (?:"?[\w$]+"?\.)?"?([\w$ -]+?)"?\(([^)]*)\)(?:.*ON DELETE (CASCADE|SET NULL|SET DEFAULT|RESTRICT|NO ACTION))?/i);
        if (m) {
          return [
            {
              kind: "add_foreign_key",
              schema,
              table: tableName,
              name: con.name,
              columns: parseIdentList(m[1]),
              refTable: m[2],
              refColumns: parseIdentList(m[3]),
              onDelete: (m[4] || "NO ACTION").toUpperCase(),
              trustedType: "",
              origin,
            },
          ];
        }
      }
      const qt = qn(schema, tableName);
      return [
        {
          kind: "trusted_sql",
          origin,
          title: `Add ${con.type === "p" ? "primary key" : con.type === "c" ? "check constraint" : "constraint"} ${con.name} on ${tableName}`,
          table: `${schema}.${tableName}`,
          statements: [`ALTER TABLE ${qt} ADD CONSTRAINT ${quoteIdent(con.name)} ${con.definition};`],
          undoStatements: [`ALTER TABLE ${qt} DROP CONSTRAINT ${quoteIdent(con.name)};`],
          impactKind: con.type === "p" ? "add_unique" : "add_foreign_key",
          risk: "caution",
          verify: [{ type: "constraint_exists", table: `${schema}.${tableName}`, name: con.name }],
        },
      ];
    }
    case "constraint:extra_in_target":
      return [{ kind: "drop_constraint", schema, table: tableName, name: found.name, origin }];
    case "constraint:duplicate":
    case "index:duplicate": {
      if (!t || found.target === null) throw bad("Duplicates on the source side can't be fixed from here — fix them on the source database.");
      if (found.category === "constraint") {
        const keep = t.constraints.find((c) => c.name === found.name)!;
        const extras = t.constraints.filter((c) => c !== keep && c.type === keep.type && c.definition === keep.definition);
        return extras.map((c) => ({ kind: "drop_constraint" as const, schema, table: tableName, name: c.name, origin: `${origin} (duplicate of ${keep.name})` }));
      }
      const keep = t.indexes.find((i) => i.name === found.name)!;
      const norm = (d: string) => d.replace(/INDEX\s+("(?:[^"]|"")+"|\S+)\s+ON/i, "INDEX ? ON");
      const extras = t.indexes.filter((i) => i !== keep && !i.constraintBacked && norm(i.definition) === norm(keep.definition));
      return extras.map((i) => ({ kind: "drop_index" as const, schema, table: tableName, name: i.name, origin: `${origin} (duplicate of ${keep.name})` }));
    }
    case "constraint:renamed":
    case "index:renamed": {
      const isIndex = found.category === "index";
      const from = String(found.target);
      const to = found.name;
      const qt = qn(schema, tableName);
      return [
        {
          kind: "trusted_sql",
          origin,
          title: `Rename ${isIndex ? "index" : "constraint"} ${from} → ${to} on ${tableName}`,
          table: `${schema}.${tableName}`,
          statements: [
            isIndex
              ? `ALTER INDEX ${qn(schema, from)} RENAME TO ${quoteIdent(to)};`
              : `ALTER TABLE ${qt} RENAME CONSTRAINT ${quoteIdent(from)} TO ${quoteIdent(to)};`,
          ],
          undoStatements: [
            isIndex
              ? `ALTER INDEX ${qn(schema, to)} RENAME TO ${quoteIdent(from)};`
              : `ALTER TABLE ${qt} RENAME CONSTRAINT ${quoteIdent(to)} TO ${quoteIdent(from)};`,
          ],
          impactKind: "drop_constraint",
          risk: "safe",
          verify: [{ type: isIndex ? "index_exists" : "constraint_exists", table: `${schema}.${tableName}`, name: to }],
        },
      ];
    }
    case "index:missing_in_target": {
      const idx = s!.indexes.find((i) => i.name === found.name)!;
      return [
        {
          kind: "trusted_sql",
          origin,
          title: `Create ${idx.unique ? "unique " : ""}index ${idx.name} on ${tableName} (as in ${source.database})`,
          table: `${schema}.${tableName}`,
          statements: [`${idx.definition};`],
          undoStatements: [`DROP INDEX ${qn(schema, idx.name)};`],
          impactKind: "create_index",
          risk: idx.unique ? "caution" : "safe",
          verify: [{ type: "index_exists", table: `${schema}.${tableName}`, name: idx.name }],
        },
      ];
    }
    case "index:extra_in_target":
      return [{ kind: "drop_index", schema, table: tableName, name: found.name, origin }];
    case "enum:missing_in_target": {
      const e = source.enums[item.object];
      return [
        {
          kind: "trusted_sql",
          origin,
          title: `Create enum type ${e.name} (${e.labels.join(", ")})`,
          table: null,
          statements: [`CREATE TYPE ${qn(e.schema, e.name)} AS ENUM (${e.labels.map(quoteLiteral).join(", ")});`],
          undoStatements: [`DROP TYPE ${qn(e.schema, e.name)};`],
          impactKind: "enum_or_extension",
          risk: "safe",
          verify: [],
        },
      ];
    }
    case "enum:modified": {
      const se = source.enums[item.object];
      const te = target.enums[item.object];
      const missing = se.labels.filter((l) => !te.labels.includes(l));
      if (!missing.length) throw unsupported();
      return missing.map((value) => ({ kind: "add_enum_value" as const, schema: se.schema, enum: se.name, value, origin }));
    }
    case "extension:missing_in_target":
      return [
        {
          kind: "trusted_sql",
          origin,
          title: `Install extension ${found.name}`,
          table: null,
          statements: [`CREATE EXTENSION IF NOT EXISTS ${quoteIdent(found.name)};`],
          undoStatements: [`DROP EXTENSION IF EXISTS ${quoteIdent(found.name)};`],
          impactKind: "enum_or_extension",
          risk: "safe",
          verify: [],
        },
      ];
    default:
      throw unsupported();
  }
};
