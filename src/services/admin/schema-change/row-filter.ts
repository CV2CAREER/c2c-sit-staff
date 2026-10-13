import ErrorHandler from "../../../utils/errorHandler";
import { qn, quoteIdent, quoteLiteral } from "../schema-diff.engine";
import type { RelationSnap, SchemaSnapshot } from "../schema-diff.snapshot.service";

// Row filters for Database Modifications (delete rows + the row browser).
//
// Conditions arrive as structured data — never SQL. Columns must exist in
// the live catalog, operators come from a fixed list, and every value is
// rendered as a quoted literal cast to the column's own catalog type, so a
// value can only ever be data.

export const ROW_OPERATORS = {
  eq: { label: "equals", arity: 1 },
  ne: { label: "is not", arity: 1 },
  lt: { label: "less than", arity: 1 },
  lte: { label: "at most", arity: 1 },
  gt: { label: "greater than", arity: 1 },
  gte: { label: "at least", arity: 1 },
  contains: { label: "contains", arity: 1 },
  starts_with: { label: "starts with", arity: 1 },
  ends_with: { label: "ends with", arity: 1 },
  in: { label: "is one of", arity: "list" },
  is_null: { label: "is empty", arity: 0 },
  not_null: { label: "is not empty", arity: 0 },
} as const;

export type RowOperator = keyof typeof ROW_OPERATORS;

export interface RowCondition {
  column: string;
  op: RowOperator;
  value?: string | string[];
}

const MAX_CONDITIONS = 20;
const MAX_IN_VALUES = 500;
export const MAX_SELECTED_ROWS = 1000;

const bad = (message: string) => new ErrorHandler(message, 400);

const literal = (value: unknown, type: string) => `${quoteLiteral(String(value ?? ""))}::${type}`;
// For ILIKE patterns: the value's own % and _ are matched literally.
const likeLiteral = (value: unknown, before: string, after: string) =>
  quoteLiteral(`${before}${String(value ?? "").replace(/[\\%_]/g, (m) => `\\${m}`)}${after}`);

export const describeConditions = (conditions: RowCondition[]) =>
  conditions
    .map((c) => {
      const op = ROW_OPERATORS[c.op];
      if (op.arity === 0) return `${c.column} ${op.label}`;
      const v = Array.isArray(c.value) ? c.value.join(", ") : c.value;
      return `${c.column} ${op.label} "${String(v ?? "").slice(0, 40)}"`;
    })
    .join(" AND ");

export const buildWhere = (rel: RelationSnap, rawConditions: unknown, alias?: string): string => {
  if (!Array.isArray(rawConditions)) throw bad("Conditions must be a list.");
  if (rawConditions.length > MAX_CONDITIONS) throw bad(`At most ${MAX_CONDITIONS} conditions.`);
  const parts = rawConditions.map((raw, i) => {
    const c = raw as RowCondition;
    const col = rel.columns.find((x) => x.name === String(c?.column));
    if (!col) throw bad(`Condition ${i + 1}: column "${c?.column}" does not exist on ${rel.name}.`);
    const op = ROW_OPERATORS[c.op as RowOperator];
    if (!op) throw bad(`Condition ${i + 1}: unsupported operator "${c.op}".`);
    const ref = `${alias ? `${alias}.` : ""}${quoteIdent(col.name)}`;
    const single = () => {
      if (op.arity !== 1 || Array.isArray(c.value)) throw bad(`Condition ${i + 1}: needs one value.`);
      if (c.value === undefined || c.value === null) throw bad(`Condition ${i + 1}: needs a value.`);
      return c.value;
    };
    switch (c.op) {
      case "eq":
        return `${ref} = ${literal(single(), col.type)}`;
      case "ne":
        return `${ref} IS DISTINCT FROM ${literal(single(), col.type)}`;
      case "lt":
        return `${ref} < ${literal(single(), col.type)}`;
      case "lte":
        return `${ref} <= ${literal(single(), col.type)}`;
      case "gt":
        return `${ref} > ${literal(single(), col.type)}`;
      case "gte":
        return `${ref} >= ${literal(single(), col.type)}`;
      case "contains":
        return `${ref}::text ILIKE ${likeLiteral(single(), "%", "%")}`;
      case "starts_with":
        return `${ref}::text ILIKE ${likeLiteral(single(), "", "%")}`;
      case "ends_with":
        return `${ref}::text ILIKE ${likeLiteral(single(), "%", "")}`;
      case "in": {
        const list = Array.isArray(c.value) ? c.value : String(c.value ?? "").split(",").map((v) => v.trim());
        const values = list.filter((v) => v !== "");
        if (!values.length) throw bad(`Condition ${i + 1}: list at least one value.`);
        if (values.length > MAX_IN_VALUES) throw bad(`Condition ${i + 1}: at most ${MAX_IN_VALUES} values.`);
        return `${ref} IN (${values.map((v) => literal(v, col.type)).join(", ")})`;
      }
      case "is_null":
        return `${ref} IS NULL`;
      case "not_null":
        return `${ref} IS NOT NULL`;
      default:
        throw bad(`Condition ${i + 1}: unsupported operator.`);
    }
  });
  return parts.length ? parts.map((p) => `(${p})`).join(" AND ") : "TRUE";
};

export const primaryKeyOf = (rel: RelationSnap): string[] => {
  const pk = rel.constraints.find((c) => c.type === "p");
  const m = pk?.definition.match(/\(([^)]*)\)/);
  return m
    ? m[1]
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s) => (s.startsWith('"') ? s.slice(1, -1).replace(/""/g, '"') : s))
    : [];
};

// Rows picked one by one, identified by their primary key values.
export const buildKeyWhere = (rel: RelationSnap, rawKeys: unknown): { where: string; count: number } => {
  const pk = primaryKeyOf(rel);
  if (!pk.length) throw bad(`${rel.name} has no primary key, so rows can't be picked one by one — use conditions instead.`);
  if (!Array.isArray(rawKeys) || !rawKeys.length) throw bad("Select at least one row.");
  if (rawKeys.length > MAX_SELECTED_ROWS) throw bad(`At most ${MAX_SELECTED_ROWS} selected rows per operation — use conditions for more.`);
  const typeOf = (c: string) => rel.columns.find((x) => x.name === c)!.type;
  const seen = new Set<string>();
  const tuples = rawKeys.map((raw, i) => {
    const key = raw as Record<string, unknown>;
    const values = pk.map((c) => {
      const v = key?.[c];
      if (v === undefined || v === null || v === "") throw bad(`Selected row ${i + 1} is missing its "${c}".`);
      return String(v);
    });
    seen.add(JSON.stringify(values));
    return values;
  });
  if (seen.size !== tuples.length) throw bad("The same row is selected twice.");
  const where =
    pk.length === 1
      ? `${quoteIdent(pk[0])} IN (${tuples.map((t) => literal(t[0], typeOf(pk[0]))).join(", ")})`
      : `(${pk.map(quoteIdent).join(", ")}) IN (${tuples.map((t) => `(${t.map((v, j) => literal(v, typeOf(pk[j]))).join(", ")})`).join(", ")})`;
  return { where, count: tuples.length };
};

// ---------------------------------------------------------------------------
// foreign keys pointing AT a table (what happens to other rows on delete)

export type FkAction = "CASCADE" | "SET NULL" | "SET DEFAULT" | "RESTRICT" | "NO ACTION";

export interface FkEdge {
  name: string;
  child: RelationSnap;
  childCols: string[];
  parentCols: string[];
  action: FkAction;
}

const unquote = (s: string) => (s.startsWith('"') ? s.slice(1, -1).replace(/""/g, '"') : s);
const identList = (s: string) => s.split(",").map((x) => unquote(x.trim())).filter(Boolean);

const FK_RE = /^FOREIGN KEY \(([^)]*)\) REFERENCES (?:((?:"(?:[^"]|"")+")|[\w$]+)\.)?((?:"(?:[^"]|"")+")|[\w$]+)\s*\(([^)]*)\)(.*)$/i;

export const incomingForeignKeys = (snapshot: SchemaSnapshot, parent: RelationSnap): FkEdge[] => {
  const edges: FkEdge[] = [];
  for (const child of Object.values(snapshot.relations)) {
    for (const con of child.constraints) {
      if (con.type !== "f") continue;
      const m = con.definition.match(FK_RE);
      if (!m) continue;
      // pg_get_constraintdef leaves the schema off when it's on the search
      // path — i.e. public.
      const refSchema = m[2] ? unquote(m[2]) : "public";
      const refTable = unquote(m[3]);
      if (refSchema !== parent.schema || refTable !== parent.name) continue;
      const action = (m[5].match(/ON DELETE (CASCADE|SET NULL|SET DEFAULT|RESTRICT|NO ACTION)/i)?.[1]?.toUpperCase() ?? "NO ACTION") as FkAction;
      edges.push({ name: con.name, child, childCols: identList(m[1]), parentCols: identList(m[4]), action });
    }
  }
  return edges;
};

export const childSubquery = (edge: FkEdge, parent: RelationSnap, parentWhere: string) =>
  `(${edge.childCols.map(quoteIdent).join(", ")}) IN (SELECT ${edge.parentCols.map(quoteIdent).join(", ")} FROM ${qn(parent.schema, parent.name)} WHERE ${parentWhere})`;

// ---------------------------------------------------------------------------
// display masking for previews / the row browser

const SENSITIVE = /pass(word)?|secret|token|hash|salt|otp|api_?key|private_?key|credential|cipher|encrypted/i;

export const isSensitiveColumn = (name: string) => SENSITIVE.test(name);

export const displayValue = (column: string, value: unknown): string | null => {
  if (value === null || value === undefined) return null;
  if (isSensitiveColumn(column)) return "••••••";
  if (Buffer.isBuffer(value)) return "[binary]";
  const text = value instanceof Date ? value.toISOString() : typeof value === "object" ? JSON.stringify(value) : String(value);
  return text.length > 120 ? `${text.slice(0, 117)}…` : text;
};
