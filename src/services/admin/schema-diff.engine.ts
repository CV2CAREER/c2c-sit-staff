import {
  ColumnSnap,
  ConstraintSnap,
  ConstraintType,
  IndexSnap,
  EnumSnap,
  RelationSnap,
  SchemaSnapshot,
} from "./schema-diff.snapshot.service";

// Pure diff engine for Admin > Database Evaluation — no I/O, so it can be unit
// tested with hand-built snapshots.
//
// Direction: SOURCE is the reference ("what it should look like", e.g. IAT
// after a release), TARGET is the database being checked (e.g. PROD). Every
// item is phrased relative to the target, and the generated SQL would bring
// the target in line with the source. The SQL is for review only — nothing
// in this feature executes it.

export type DiffSeverity = "critical" | "warning" | "info";
export type DiffCategory =
  | "table"
  | "view"
  | "column"
  | "constraint"
  | "index"
  | "trigger"
  | "enum"
  | "extension";
export type DiffChange =
  | "missing_in_target"
  | "extra_in_target"
  | "modified"
  | "renamed"
  | "duplicate";

export interface DiffItem {
  id: string;
  category: DiffCategory;
  change: DiffChange;
  severity: DiffSeverity;
  object: string; // qualified table/view/enum name, or extension name
  name: string; // column/constraint/index/trigger name, or the object itself
  message: string;
  source?: string | null;
  target?: string | null;
  sql?: string;
  destructive?: boolean;
  // Set when the object is a migrated/unused table (or one of its enums) and
  // legacy objects were explicitly included — always severity "info".
  legacy?: string;
}

export interface LegacyObject {
  object: string;
  table: string;
  kind: "table" | "view" | "enum";
  reason: string;
  inSource: boolean;
  inTarget: boolean;
  rowEstimate: number;
  differences: number;
}

export interface DiffOptions {
  // Returns why a table is not used by the app (migrated/legacy), or null if
  // it is used. Differences on such tables are hidden unless includeLegacy.
  legacyReason?: (table: string, schema: string) => string | null;
  includeLegacy?: boolean;
}

export interface DiffSummary {
  identical: boolean;
  total: number;
  bySeverity: Record<DiffSeverity, number>;
  byCategory: Record<DiffCategory, number>;
  byChange: Record<DiffChange, number>;
  objectsCompared: { source: number; target: number };
  objectsAffected: number;
}

export interface DiffResult {
  summary: DiffSummary;
  items: DiffItem[];
  sql: string;
  legacy: {
    included: boolean;
    hiddenDifferences: number;
    objects: LegacyObject[];
  };
}

// SQL is assembled in dependency order.
enum Phase {
  Extensions = 0,
  Enums,
  Tables,
  Columns,
  AlterColumns,
  Constraints,
  Indexes,
  ForeignKeys,
  Views,
  Triggers,
  Destructive,
}

interface SqlStep {
  phase: Phase;
  sql: string;
}

const PHASE_TITLES: Record<Phase, string> = {
  [Phase.Extensions]: "Extensions",
  [Phase.Enums]: "Enum types",
  [Phase.Tables]: "New tables",
  [Phase.Columns]: "New columns",
  [Phase.AlterColumns]: "Column changes",
  [Phase.Constraints]: "Constraints",
  [Phase.Indexes]: "Indexes",
  [Phase.ForeignKeys]: "Foreign keys",
  [Phase.Views]: "Views",
  [Phase.Triggers]: "Triggers (the trigger functions must already exist)",
  [Phase.Destructive]:
    "DESTRUCTIVE — objects that exist only in the target. Commented out on purpose; uncomment only after confirming nothing uses them",
};

const SEVERITY_ORDER: Record<DiffSeverity, number> = { critical: 0, warning: 1, info: 2 };

const CONSTRAINT_LABEL: Record<ConstraintType, string> = {
  p: "primary key",
  u: "unique constraint",
  f: "foreign key",
  c: "check constraint",
  x: "exclusion constraint",
  t: "constraint trigger",
  n: "not-null constraint",
};

export const quoteIdent = (name: string) => `"${name.replace(/"/g, '""')}"`;
export const qn = (schema: string, name: string) => `${quoteIdent(schema)}.${quoteIdent(name)}`;
export const quoteLiteral = (value: string) => `'${value.replace(/'/g, "''")}'`;
const comment = (sql: string) =>
  sql
    .split("\n")
    .map((line) => `-- ${line}`)
    .join("\n");

const ws = (value: string | null | undefined) =>
  value == null ? null : value.replace(/\s+/g, " ").trim();

// An index definition with its own name blanked, so "same index, different
// name" can be recognised.
const normalizeIndexDef = (def: string) =>
  ws(def)!.replace(
    /^CREATE (UNIQUE )?INDEX (?:CONCURRENTLY )?(?:IF NOT EXISTS )?("(?:[^"]|"")+"|\S+) ON /i,
    "CREATE $1INDEX ? ON ",
  );

const constraintKey = (c: ConstraintSnap) => `${c.type}|${ws(c.definition)}`;

// --- type change classification ---------------------------------------------

const VARCHAR_RE = /^character varying\((\d+)\)$/;

const classifyTypeChange = (
  sourceType: string,
  targetType: string,
): { severity: DiffSeverity; note: string } => {
  const s = VARCHAR_RE.exec(sourceType);
  const t = VARCHAR_RE.exec(targetType);
  if (s && t) {
    return Number(t[1]) > Number(s[1])
      ? { severity: "info", note: "target allows longer values" }
      : { severity: "critical", note: "target is shorter — values that fit in the source would be rejected" };
  }
  if ((s || sourceType === "character varying") && targetType === "text") {
    return { severity: "info", note: "target is unbounded text" };
  }
  if (sourceType === "text" && t) {
    return { severity: "warning", note: "target has a length limit the source does not" };
  }
  return { severity: "critical", note: "different data types" };
};

// --- builder -----------------------------------------------------------------

class DiffBuilder {
  items: DiffItem[] = [];
  steps: SqlStep[] = [];
  private seq = 0;

  // A child builder collects one legacy object's differences in isolation
  // (so they can be counted/hidden as a unit) while sharing the root's ids.
  constructor(private root?: DiffBuilder) {}

  private nextId(): string {
    return this.root ? this.root.nextId() : `d${++this.seq}`;
  }

  add(item: Omit<DiffItem, "id">, phase?: Phase) {
    this.items.push({ ...item, id: this.nextId() });
    if (item.sql && phase !== undefined) this.steps.push({ phase, sql: item.sql });
  }
}

const columnDdl = (col: ColumnSnap) => {
  let ddl = `${quoteIdent(col.name)} ${col.type}`;
  if (col.generated === "s" && col.default) {
    return `${ddl} GENERATED ALWAYS AS (${col.default}) STORED`;
  }
  if (col.identity) {
    ddl += ` GENERATED ${col.identity === "a" ? "ALWAYS" : "BY DEFAULT"} AS IDENTITY`;
  } else if (col.default) {
    ddl += ` DEFAULT ${col.default}`;
  }
  if (!col.nullable) ddl += " NOT NULL";
  return ddl;
};

const describeColumn = (col: ColumnSnap) =>
  `${col.type}${col.nullable ? "" : " NOT NULL"}${col.default ? ` DEFAULT ${col.default}` : ""}`;

const isRelationTable = (rel: RelationSnap) =>
  rel.kind === "table" || rel.kind === "partitioned_table";

// Missing table → CREATE TABLE + its constraints, indexes, triggers.
const emitCreateTable = (b: DiffBuilder, key: string, rel: RelationSnap) => {
  const table = qn(rel.schema, rel.name);
  const cols = rel.columns.map((c) => `  ${columnDdl(c)}`).join(",\n");
  const sql = `CREATE TABLE ${table} (\n${cols}\n);`;

  b.add(
    {
      category: "table",
      change: "missing_in_target",
      severity: "critical",
      object: key,
      name: rel.name,
      message: `Table ${key} (${rel.columns.length} columns) exists only in the source.`,
      source: `${rel.columns.length} columns, ~${rel.rowEstimate} rows`,
      target: null,
      sql,
    },
    Phase.Tables,
  );

  for (const con of rel.constraints) {
    if (con.type === "n") continue; // PG18 not-null constraints are covered by NOT NULL
    b.steps.push({
      phase: con.type === "f" ? Phase.ForeignKeys : Phase.Constraints,
      sql: `ALTER TABLE ${table} ADD CONSTRAINT ${quoteIdent(con.name)} ${con.definition};`,
    });
  }
  for (const idx of rel.indexes) {
    if (!idx.constraintBacked) b.steps.push({ phase: Phase.Indexes, sql: `${idx.definition};` });
  }
  for (const trg of rel.triggers) {
    b.steps.push({ phase: Phase.Triggers, sql: `${trg.definition};` });
  }
};

const diffColumns = (b: DiffBuilder, key: string, s: RelationSnap, t: RelationSnap) => {
  const table = qn(s.schema, s.name);
  const tCols = new Map(t.columns.map((c) => [c.name, c]));
  const sCols = new Map(s.columns.map((c) => [c.name, c]));

  for (const sc of s.columns) {
    const tc = tCols.get(sc.name);
    if (!tc) {
      // NOT NULL without a default fails on a table that already has rows —
      // add it nullable and leave the tightening as an explicit follow-up.
      const needsBackfill = !sc.nullable && !sc.default && !sc.identity && t.rowEstimate > 0;
      const sql = needsBackfill
        ? `ALTER TABLE ${table} ADD COLUMN ${columnDdl({ ...sc, nullable: true })};\n` +
          `-- Table has ~${t.rowEstimate} rows: backfill ${quoteIdent(sc.name)}, then:\n` +
          `-- ALTER TABLE ${table} ALTER COLUMN ${quoteIdent(sc.name)} SET NOT NULL;`
        : `ALTER TABLE ${table} ADD COLUMN ${columnDdl(sc)};`;
      b.add(
        {
          category: "column",
          change: "missing_in_target",
          severity: "critical",
          object: key,
          name: sc.name,
          message: `Column ${sc.name} is missing in the target — queries that use it will fail.`,
          source: describeColumn(sc),
          target: null,
          sql,
        },
        Phase.Columns,
      );
      continue;
    }

    const col = `ALTER TABLE ${table} ALTER COLUMN ${quoteIdent(sc.name)}`;

    if (sc.type !== tc.type) {
      const { severity, note } = classifyTypeChange(sc.type, tc.type);
      b.add(
        {
          category: "column",
          change: "modified",
          severity,
          object: key,
          name: sc.name,
          message: `Type differs (${note}).`,
          source: sc.type,
          target: tc.type,
          sql:
            `-- Review: may rewrite the table and fail if existing data does not convert.\n` +
            `${col} TYPE ${sc.type} USING ${quoteIdent(sc.name)}::${sc.type};`,
        },
        Phase.AlterColumns,
      );
    }

    // Default before nullability, so a SET NOT NULL runs after the default exists.
    if (ws(sc.default) !== ws(tc.default) && !sc.identity && !tc.identity) {
      b.add(
        {
          category: "column",
          change: "modified",
          severity: "warning",
          object: key,
          name: sc.name,
          message: "Default value differs.",
          source: sc.default ?? "(no default)",
          target: tc.default ?? "(no default)",
          sql: sc.default ? `${col} SET DEFAULT ${sc.default};` : `${col} DROP DEFAULT;`,
        },
        Phase.AlterColumns,
      );
    }

    if (sc.nullable !== tc.nullable) {
      const targetStricter = !tc.nullable;
      b.add(
        {
          category: "column",
          change: "modified",
          severity: targetStricter ? "critical" : "warning",
          object: key,
          name: sc.name,
          message: targetStricter
            ? "Target is NOT NULL but the source allows NULL — inserts without this value will fail in the target."
            : "Source is NOT NULL but the target allows NULL.",
          source: sc.nullable ? "NULL allowed" : "NOT NULL",
          target: tc.nullable ? "NULL allowed" : "NOT NULL",
          sql: sc.nullable
            ? `${col} DROP NOT NULL;`
            : `-- Fails if the target already holds NULLs in this column.\n${col} SET NOT NULL;`,
        },
        Phase.AlterColumns,
      );
    }

    if ((sc.identity || null) !== (tc.identity || null) || (sc.generated || null) !== (tc.generated || null)) {
      b.add({
        category: "column",
        change: "modified",
        severity: "warning",
        object: key,
        name: sc.name,
        message: "Identity / generated-column setting differs.",
        source: `identity=${sc.identity ?? "none"}, generated=${sc.generated ?? "none"}`,
        target: `identity=${tc.identity ?? "none"}, generated=${tc.generated ?? "none"}`,
      });
    }
  }

  for (const tc of t.columns) {
    if (sCols.has(tc.name)) continue;
    const blocksInserts = !tc.nullable && !tc.default && !tc.identity;
    b.add(
      {
        category: "column",
        change: "extra_in_target",
        severity: blocksInserts ? "warning" : "info",
        object: key,
        name: tc.name,
        message: blocksInserts
          ? `Column ${tc.name} exists only in the target and is NOT NULL without a default — inserts written for the source schema will fail.`
          : `Column ${tc.name} exists only in the target.`,
        source: null,
        target: describeColumn(tc),
        sql: comment(`ALTER TABLE ${table} DROP COLUMN ${quoteIdent(tc.name)};`),
        destructive: true,
      },
      Phase.Destructive,
    );
  }

  // Column order is cosmetic but often signals a table that was hand-built.
  const shared = s.columns.filter((c) => tCols.has(c.name)).map((c) => c.name);
  const sharedTargetOrder = t.columns.filter((c) => sCols.has(c.name)).map((c) => c.name);
  if (shared.join(",") !== sharedTargetOrder.join(",")) {
    b.add({
      category: "column",
      change: "modified",
      severity: "info",
      object: key,
      name: "(column order)",
      message: "Columns are in a different physical order (harmless unless code relies on SELECT * ordering).",
      source: shared.join(", "),
      target: sharedTargetOrder.join(", "),
    });
  }
};

const findDuplicates = <T>(list: T[], keyOf: (x: T) => string) => {
  const groups = new Map<string, T[]>();
  for (const x of list) {
    const k = keyOf(x);
    groups.set(k, [...(groups.get(k) || []), x]);
  }
  return [...groups.values()].filter((g) => g.length > 1);
};

const diffConstraints = (b: DiffBuilder, key: string, s: RelationSnap, t: RelationSnap) => {
  const table = qn(s.schema, s.name);
  const sList = s.constraints.filter((c) => c.type !== "n");
  const tList = t.constraints.filter((c) => c.type !== "n");
  const tByName = new Map(tList.map((c) => [c.name, c]));
  const sByName = new Map(sList.map((c) => [c.name, c]));

  const unmatchedS: ConstraintSnap[] = [];
  for (const sc of sList) {
    const tc = tByName.get(sc.name);
    if (!tc) {
      unmatchedS.push(sc);
    } else if (constraintKey(sc) !== constraintKey(tc)) {
      b.add(
        {
          category: "constraint",
          change: "modified",
          severity: "warning",
          object: key,
          name: sc.name,
          message: `The ${CONSTRAINT_LABEL[sc.type]} has a different definition.`,
          source: sc.definition,
          target: tc.definition,
          sql:
            `ALTER TABLE ${table} DROP CONSTRAINT ${quoteIdent(sc.name)};\n` +
            `ALTER TABLE ${table} ADD CONSTRAINT ${quoteIdent(sc.name)} ${sc.definition};`,
        },
        sc.type === "f" ? Phase.ForeignKeys : Phase.Constraints,
      );
    }
  }
  const unmatchedT = tList.filter((c) => !sByName.has(c.name));

  // Pair up "same constraint, different name" before calling anything
  // missing/extra.
  const pool = new Map<string, ConstraintSnap[]>();
  for (const tc of unmatchedT) {
    const k = constraintKey(tc);
    pool.set(k, [...(pool.get(k) || []), tc]);
  }
  const renamedTargets = new Set<ConstraintSnap>();
  // A source constraint whose definition the target already has (under any
  // name), or that repeats one already reported, is a source-side duplicate —
  // not something the target is missing. Reported once further down.
  const targetKeys = new Set(tList.map(constraintKey));
  const reportedKeys = new Set<string>();

  for (const sc of unmatchedS) {
    const candidates = pool.get(constraintKey(sc));
    const match = candidates?.shift();
    if (match) {
      renamedTargets.add(match);
      b.add(
        {
          category: "constraint",
          change: "renamed",
          severity: "info",
          object: key,
          name: sc.name,
          message: `Same ${CONSTRAINT_LABEL[sc.type]}, different name.`,
          source: sc.name,
          target: match.name,
          sql: `ALTER TABLE ${table} RENAME CONSTRAINT ${quoteIdent(match.name)} TO ${quoteIdent(sc.name)};`,
        },
        Phase.Constraints,
      );
      continue;
    }
    if (targetKeys.has(constraintKey(sc)) || reportedKeys.has(constraintKey(sc))) continue;
    reportedKeys.add(constraintKey(sc));
    b.add(
      {
        category: "constraint",
        change: "missing_in_target",
        severity: sc.type === "p" ? "critical" : "warning",
        object: key,
        name: sc.name,
        message:
          sc.type === "p"
            ? "Primary key is missing in the target — upserts and replication by key will break."
            : `The ${CONSTRAINT_LABEL[sc.type]} is missing in the target — the target accepts data the source would reject.`,
        source: sc.definition,
        target: null,
        sql: `ALTER TABLE ${table} ADD CONSTRAINT ${quoteIdent(sc.name)} ${sc.definition};`,
      },
      sc.type === "f" ? Phase.ForeignKeys : Phase.Constraints,
    );
  }

  // Keys of target constraints already paired with a source one — another
  // unmatched target constraint with the same key is a duplicate, reported
  // once below rather than also as "extra".
  const accounted = new Set(
    [...tList.filter((c) => sByName.has(c.name)), ...renamedTargets].map(constraintKey),
  );
  for (const tc of unmatchedT) {
    if (renamedTargets.has(tc) || accounted.has(constraintKey(tc))) continue;
    const rejectsWrites = tc.type === "u" || tc.type === "c" || tc.type === "f" || tc.type === "x";
    b.add(
      {
        category: "constraint",
        change: "extra_in_target",
        severity: rejectsWrites ? "warning" : "info",
        object: key,
        name: tc.name,
        message: rejectsWrites
          ? `The ${CONSTRAINT_LABEL[tc.type]} exists only in the target — it can reject writes the source accepts.`
          : `The ${CONSTRAINT_LABEL[tc.type]} exists only in the target.`,
        source: null,
        target: tc.definition,
        sql: comment(`ALTER TABLE ${table} DROP CONSTRAINT ${quoteIdent(tc.name)};`),
        destructive: true,
      },
      Phase.Destructive,
    );
  }

  // Sequelize `sync({ alter: true })` is known to stack up copies of the
  // same unique constraint (email_key, email_key1, ...). Flag them on the
  // target side — they slow every write.
  for (const group of findDuplicates(tList, constraintKey)) {
    const [keep, ...extra] = group;
    b.add(
      {
        category: "constraint",
        change: "duplicate",
        severity: "warning",
        object: key,
        name: keep.name,
        message: `${group.length} identical copies of this ${CONSTRAINT_LABEL[keep.type]} exist in the TARGET (${extra.map((c) => c.name).join(", ")}). Each one slows every write.`,
        source: null,
        target: keep.definition,
        sql: extra
          .map((c) => comment(`ALTER TABLE ${table} DROP CONSTRAINT ${quoteIdent(c.name)};`))
          .join("\n"),
        destructive: true,
      },
      Phase.Destructive,
    );
  }

  for (const group of findDuplicates(sList, constraintKey)) {
    b.add({
      category: "constraint",
      change: "duplicate",
      severity: "info",
      object: key,
      name: group[0].name,
      message: `${group.length} identical copies of this ${CONSTRAINT_LABEL[group[0].type]} exist in the SOURCE (${group.map((c) => c.name).join(", ")}). Not a target problem — counted once, but worth cleaning up on the source.`,
      source: group[0].definition,
      target: null,
    });
  }
};

const diffIndexes = (b: DiffBuilder, key: string, s: RelationSnap, t: RelationSnap) => {
  // Constraint-backed indexes are already covered by the constraint diff.
  const sList = s.indexes.filter((i) => !i.constraintBacked);
  const tList = t.indexes.filter((i) => !i.constraintBacked);
  const tByName = new Map(tList.map((i) => [i.name, i]));
  const sByName = new Map(sList.map((i) => [i.name, i]));
  const tByDef = new Map<string, IndexSnap[]>();
  for (const ti of tList) {
    if (sByName.has(ti.name)) continue;
    const k = normalizeIndexDef(ti.definition);
    tByDef.set(k, [...(tByDef.get(k) || []), ti]);
  }
  const renamed = new Set<IndexSnap>();
  const targetDefs = new Set(tList.map((i) => normalizeIndexDef(i.definition)));
  const reportedDefs = new Set<string>();

  for (const si of sList) {
    const ti = tByName.get(si.name);
    if (ti) {
      if (ws(si.definition) !== ws(ti.definition)) {
        b.add(
          {
            category: "index",
            change: "modified",
            severity: si.unique || ti.unique ? "warning" : "info",
            object: key,
            name: si.name,
            message: "Index definition differs.",
            source: si.definition,
            target: ti.definition,
            sql: `DROP INDEX ${qn(t.schema, ti.name)};\n${si.definition};`,
          },
          Phase.Indexes,
        );
      }
      continue;
    }
    const match = tByDef.get(normalizeIndexDef(si.definition))?.shift();
    if (match) {
      renamed.add(match);
      b.add(
        {
          category: "index",
          change: "renamed",
          severity: "info",
          object: key,
          name: si.name,
          message: "Same index, different name.",
          source: si.name,
          target: match.name,
          sql: `ALTER INDEX ${qn(t.schema, match.name)} RENAME TO ${quoteIdent(si.name)};`,
        },
        Phase.Indexes,
      );
      continue;
    }
    const def = normalizeIndexDef(si.definition);
    if (targetDefs.has(def) || reportedDefs.has(def)) continue; // source-side duplicate
    reportedDefs.add(def);
    b.add(
      {
        category: "index",
        change: "missing_in_target",
        severity: si.unique ? "warning" : "info",
        object: key,
        name: si.name,
        message: si.unique
          ? "Unique index is missing in the target — duplicates can slip in."
          : "Index is missing in the target — queries relying on it may be slow.",
        source: si.definition,
        target: null,
        sql: `${si.definition};`,
      },
      Phase.Indexes,
    );
  }

  const accounted = new Set(
    [...tList.filter((i) => sByName.has(i.name)), ...renamed].map((i) => normalizeIndexDef(i.definition)),
  );
  for (const ti of tList) {
    if (sByName.has(ti.name) || renamed.has(ti)) continue;
    if (accounted.has(normalizeIndexDef(ti.definition))) continue; // reported as duplicate
    b.add(
      {
        category: "index",
        change: "extra_in_target",
        severity: ti.unique ? "warning" : "info",
        object: key,
        name: ti.name,
        message: ti.unique
          ? "Unique index exists only in the target — it can reject writes the source accepts."
          : "Index exists only in the target.",
        source: null,
        target: ti.definition,
        sql: comment(`DROP INDEX ${qn(t.schema, ti.name)};`),
        destructive: true,
      },
      Phase.Destructive,
    );
  }

  for (const group of findDuplicates(tList, (i) => normalizeIndexDef(i.definition))) {
    const [keep, ...extra] = group;
    b.add(
      {
        category: "index",
        change: "duplicate",
        severity: "warning",
        object: key,
        name: keep.name,
        message: `${group.length} identical indexes exist in the target (${group.map((i) => i.name).join(", ")}). Extra copies cost write time and disk.`,
        source: null,
        target: keep.definition,
        sql: extra.map((i) => comment(`DROP INDEX ${qn(t.schema, i.name)};`)).join("\n"),
        destructive: true,
      },
      Phase.Destructive,
    );
  }

  for (const group of findDuplicates(sList, (i) => normalizeIndexDef(i.definition))) {
    b.add({
      category: "index",
      change: "duplicate",
      severity: "info",
      object: key,
      name: group[0].name,
      message: `${group.length} identical indexes exist in the SOURCE (${group.map((i) => i.name).join(", ")}). Not a target problem — counted once.`,
      source: group[0].definition,
      target: null,
    });
  }
};

const diffTriggers = (b: DiffBuilder, key: string, s: RelationSnap, t: RelationSnap) => {
  const table = qn(s.schema, s.name);
  const tByName = new Map(t.triggers.map((x) => [x.name, x]));
  const sByName = new Map(s.triggers.map((x) => [x.name, x]));

  for (const st of s.triggers) {
    const tt = tByName.get(st.name);
    if (!tt) {
      b.add(
        {
          category: "trigger",
          change: "missing_in_target",
          severity: "warning",
          object: key,
          name: st.name,
          message: "Trigger is missing in the target — side effects it performs will not happen there.",
          source: st.definition,
          target: null,
          sql: `${st.definition};`,
        },
        Phase.Triggers,
      );
    } else if (ws(st.definition) !== ws(tt.definition)) {
      b.add(
        {
          category: "trigger",
          change: "modified",
          severity: "warning",
          object: key,
          name: st.name,
          message: "Trigger definition differs.",
          source: st.definition,
          target: tt.definition,
          sql: `DROP TRIGGER ${quoteIdent(st.name)} ON ${table};\n${st.definition};`,
        },
        Phase.Triggers,
      );
    }
  }
  for (const tt of t.triggers) {
    if (sByName.has(tt.name)) continue;
    b.add(
      {
        category: "trigger",
        change: "extra_in_target",
        severity: "warning",
        object: key,
        name: tt.name,
        message: "Trigger exists only in the target — it may change data in ways the source does not.",
        source: null,
        target: tt.definition,
        sql: comment(`DROP TRIGGER ${quoteIdent(tt.name)} ON ${table};`),
        destructive: true,
      },
      Phase.Destructive,
    );
  }
};

const viewCreateSql = (rel: RelationSnap, replace: boolean) => {
  const name = qn(rel.schema, rel.name);
  if (rel.kind === "materialized_view") {
    return `CREATE MATERIALIZED VIEW ${name} AS\n${rel.viewDefinition}`;
  }
  return `CREATE ${replace ? "OR REPLACE " : ""}VIEW ${name} AS\n${rel.viewDefinition}`;
};

const diffRelation = (
  b: DiffBuilder,
  key: string,
  s: RelationSnap | undefined,
  t: RelationSnap | undefined,
) => {
  if (s && !t) {
    if (isRelationTable(s) || s.kind === "foreign_table") {
      emitCreateTable(b, key, s);
    } else {
      b.add(
        {
          category: "view",
          change: "missing_in_target",
          severity: "critical",
          object: key,
          name: s.name,
          message: `${s.kind === "materialized_view" ? "Materialized view" : "View"} ${key} exists only in the source.`,
          source: s.viewDefinition,
          target: null,
          sql: viewCreateSql(s, false),
        },
        Phase.Views,
      );
    }
    return;
  }

  if (!s && t) {
    const isTable = isRelationTable(t) || t.kind === "foreign_table";
    const dropSql = isTable
      ? `DROP TABLE ${qn(t.schema, t.name)};`
      : `DROP ${t.kind === "materialized_view" ? "MATERIALIZED VIEW" : "VIEW"} ${qn(t.schema, t.name)};`;
    b.add(
      {
        category: isTable ? "table" : "view",
        change: "extra_in_target",
        severity: "info",
        object: key,
        name: t.name,
        message: isTable
          ? `Table ${key} exists only in the target (~${t.rowEstimate} rows).`
          : `View ${key} exists only in the target.`,
        source: null,
        target: isTable ? `${t.columns.length} columns, ~${t.rowEstimate} rows` : t.viewDefinition,
        sql: comment(dropSql),
        destructive: true,
      },
      Phase.Destructive,
    );
    return;
  }

  if (!s || !t) return;

  if (s.kind !== t.kind) {
    b.add({
      category: isRelationTable(s) ? "table" : "view",
      change: "modified",
      severity: "critical",
      object: key,
      name: s.name,
      message: `Object kind differs: ${s.kind.replace("_", " ")} in the source, ${t.kind.replace("_", " ")} in the target.`,
      source: s.kind,
      target: t.kind,
    });
    return;
  }

  if (s.kind === "view" || s.kind === "materialized_view") {
    if (ws(s.viewDefinition) !== ws(t.viewDefinition)) {
      b.add(
        {
          category: "view",
          change: "modified",
          severity: "warning",
          object: key,
          name: s.name,
          message: "View definition differs.",
          source: s.viewDefinition,
          target: t.viewDefinition,
          sql:
            s.kind === "materialized_view"
              ? `DROP MATERIALIZED VIEW ${qn(s.schema, s.name)};\n${viewCreateSql(s, false)}`
              : `-- CREATE OR REPLACE cannot drop or reorder columns; use DROP VIEW first if it fails.\n${viewCreateSql(s, true)}`,
        },
        Phase.Views,
      );
    }
    return;
  }

  diffColumns(b, key, s, t);
  diffConstraints(b, key, s, t);
  diffIndexes(b, key, s, t);
  diffTriggers(b, key, s, t);
};

const diffEnum = (b: DiffBuilder, key: string, s: EnumSnap | undefined, t: EnumSnap | undefined) => {
  if (s && !t) {
    b.add(
      {
        category: "enum",
        change: "missing_in_target",
        severity: "critical",
        object: key,
        name: s.name,
        message: `Enum type ${key} exists only in the source.`,
        source: s.labels.join(", "),
        target: null,
        sql: `CREATE TYPE ${qn(s.schema, s.name)} AS ENUM (${s.labels.map(quoteLiteral).join(", ")});`,
      },
      Phase.Enums,
    );
    return;
  }
  if (!s && t) {
    b.add(
      {
        category: "enum",
        change: "extra_in_target",
        severity: "info",
        object: key,
        name: t.name,
        message: `Enum type ${key} exists only in the target.`,
        source: null,
        target: t.labels.join(", "),
        sql: comment(`DROP TYPE ${qn(t.schema, t.name)};`),
        destructive: true,
      },
      Phase.Destructive,
    );
    return;
  }
  if (!s || !t) return;

  const tSet = new Set(t.labels);
  const sSet = new Set(s.labels);
  const missing = s.labels.filter((l) => !tSet.has(l));
  const extra = t.labels.filter((l) => !sSet.has(l));

  if (missing.length) {
    b.add(
      {
        category: "enum",
        change: "modified",
        severity: "critical",
        object: key,
        name: s.name,
        message: `Target is missing value(s) ${missing.map((v) => `'${v}'`).join(", ")} — writing them will fail.`,
        source: s.labels.join(", "),
        target: t.labels.join(", "),
        sql: missing
          .map((v) => `ALTER TYPE ${qn(s.schema, s.name)} ADD VALUE IF NOT EXISTS ${quoteLiteral(v)};`)
          .join("\n"),
      },
      Phase.Enums,
    );
  }
  if (extra.length) {
    b.add({
      category: "enum",
      change: "modified",
      severity: "info",
      object: key,
      name: s.name,
      message: `Target has extra value(s) ${extra.map((v) => `'${v}'`).join(", ")}.`,
      source: s.labels.join(", "),
      target: t.labels.join(", "),
    });
  }
  if (!missing.length && !extra.length && s.labels.join("|") !== t.labels.join("|")) {
    b.add({
      category: "enum",
      change: "modified",
      severity: "info",
      object: key,
      name: s.name,
      message: "Same values in a different order (affects ORDER BY / comparisons on this type).",
      source: s.labels.join(", "),
      target: t.labels.join(", "),
    });
  }
};

const diffExtensions = (b: DiffBuilder, source: SchemaSnapshot, target: SchemaSnapshot) => {
  const names = new Set([...Object.keys(source.extensions), ...Object.keys(target.extensions)]);
  for (const name of [...names].sort()) {
    const s = source.extensions[name];
    const t = target.extensions[name];
    if (s && !t) {
      b.add(
        {
          category: "extension",
          change: "missing_in_target",
          severity: "warning",
          object: name,
          name,
          message: `Extension ${name} is not installed in the target.`,
          source: s,
          target: null,
          sql: `CREATE EXTENSION IF NOT EXISTS ${quoteIdent(name)};`,
        },
        Phase.Extensions,
      );
    } else if (!s && t) {
      b.add({
        category: "extension",
        change: "extra_in_target",
        severity: "info",
        object: name,
        name,
        message: `Extension ${name} is installed only in the target.`,
        source: null,
        target: t,
      });
    } else if (s && t && s !== t) {
      b.add({
        category: "extension",
        change: "modified",
        severity: "info",
        object: name,
        name,
        message: `Extension ${name} is at a different version.`,
        source: s,
        target: t,
      });
    }
  }
};

const buildSqlScript = (
  steps: SqlStep[],
  source: SchemaSnapshot,
  target: SchemaSnapshot,
): string => {
  if (!steps.length) return "";
  const header = [
    `-- Database Evaluation — generated ${new Date().toISOString()}`,
    `-- Brings TARGET  ${target.label} (${target.database})`,
    `-- in line with SOURCE ${source.label} (${source.database})`,
    `--`,
    `-- REVIEW BEFORE RUNNING. This script was generated from catalog metadata only;`,
    `-- it was NOT executed and has not been tested against the target's data.`,
    `-- Run it in a maintenance window, against a backup/snapshot first where possible.`,
  ].join("\n");

  const byPhase = new Map<Phase, string[]>();
  for (const step of steps) {
    byPhase.set(step.phase, [...(byPhase.get(step.phase) || []), step.sql]);
  }

  const sections = [...byPhase.keys()]
    .sort((a, b) => a - b)
    .map((phase) => {
      const title = `-- ===== ${PHASE_TITLES[phase]} =====`;
      return `${title}\n${byPhase.get(phase)!.join("\n\n")}`;
    });

  return `${header}\n\n${sections.join("\n\n")}\n`;
};

const countRelations = (snap: SchemaSnapshot) =>
  Object.keys(snap.relations).length + Object.keys(snap.enums).length;

export const diffSnapshots = (
  source: SchemaSnapshot,
  target: SchemaSnapshot,
  options: DiffOptions = {},
): DiffResult => {
  const b = new DiffBuilder();
  const includeLegacy = Boolean(options.includeLegacy);
  const legacyObjects: LegacyObject[] = [];
  let hiddenDifferences = 0;

  // Runs one object's diff in a child builder when it is legacy, so its
  // differences can be hidden as a unit — or shown, downgraded to info and
  // kept out of the SQL script (never create/alter a table nothing uses).
  const diffObject = (
    object: string,
    meta: Omit<LegacyObject, "differences" | "object">,
    run: (builder: DiffBuilder) => void,
  ) => {
    if (!meta.reason) return run(b);
    const child = new DiffBuilder(b);
    run(child);
    if (!child.items.length) return;
    legacyObjects.push({ ...meta, object, differences: child.items.length });
    if (includeLegacy) {
      for (const item of child.items) b.items.push({ ...item, severity: "info", legacy: meta.reason });
    } else {
      hiddenDifferences += child.items.length;
    }
  };

  diffExtensions(b, source, target);

  const relationKeys = [...new Set([...Object.keys(source.relations), ...Object.keys(target.relations)])].sort();
  const relationReason = new Map<string, string | null>();
  for (const key of relationKeys) {
    const rel = source.relations[key] ?? target.relations[key];
    relationReason.set(key, options.legacyReason?.(rel.name, rel.schema) ?? null);
  }

  // Sequelize names enum types enum_<table>_<column>; an enum belongs to an
  // unused table if its name starts with that table's prefix (longest wins).
  const enumOwner = (schema: string, enumName: string) => {
    let best: string | null = null;
    for (const key of relationKeys) {
      const rel = source.relations[key] ?? target.relations[key];
      if (rel.schema !== schema || !enumName.startsWith(`enum_${rel.name}_`)) continue;
      if (!best || key.length > best.length) best = key;
    }
    return best;
  };

  const enumKeys = [...new Set([...Object.keys(source.enums), ...Object.keys(target.enums)])].sort();
  for (const key of enumKeys) {
    const s = source.enums[key];
    const t = target.enums[key];
    const e = (s ?? t)!;
    const owner = enumOwner(e.schema, e.name);
    const ownerReason = owner ? relationReason.get(owner) : null;
    diffObject(
      key,
      {
        table: owner ? owner.split(".").slice(1).join(".") : e.name,
        kind: "enum",
        reason: ownerReason ? `Enum of unused table ${owner}` : "",
        inSource: !!s,
        inTarget: !!t,
        rowEstimate: 0,
      },
      (builder) => diffEnum(builder, key, s, t),
    );
  }

  for (const key of relationKeys) {
    const s = source.relations[key];
    const t = target.relations[key];
    const rel = (s ?? t)!;
    diffObject(
      key,
      {
        table: rel.name,
        kind: rel.kind === "view" || rel.kind === "materialized_view" ? "view" : "table",
        reason: relationReason.get(key) || "",
        inSource: !!s,
        inTarget: !!t,
        rowEstimate: Math.max(s?.rowEstimate ?? 0, t?.rowEstimate ?? 0),
      },
      (builder) => diffRelation(builder, key, s, t),
    );
  }

  const items = b.items.sort(
    (x, y) =>
      SEVERITY_ORDER[x.severity] - SEVERITY_ORDER[y.severity] ||
      x.object.localeCompare(y.object) ||
      x.name.localeCompare(y.name),
  );

  const bySeverity: Record<DiffSeverity, number> = { critical: 0, warning: 0, info: 0 };
  const byCategory = {
    table: 0,
    view: 0,
    column: 0,
    constraint: 0,
    index: 0,
    trigger: 0,
    enum: 0,
    extension: 0,
  } as Record<DiffCategory, number>;
  const byChange = {
    missing_in_target: 0,
    extra_in_target: 0,
    modified: 0,
    renamed: 0,
    duplicate: 0,
  } as Record<DiffChange, number>;
  for (const item of items) {
    bySeverity[item.severity]++;
    byCategory[item.category]++;
    byChange[item.change]++;
  }

  return {
    summary: {
      identical: items.length === 0,
      total: items.length,
      bySeverity,
      byCategory,
      byChange,
      objectsCompared: { source: countRelations(source), target: countRelations(target) },
      objectsAffected: new Set(items.map((i) => i.object)).size,
    },
    items,
    sql: buildSqlScript(b.steps, source, target),
    legacy: {
      included: includeLegacy,
      hiddenDifferences,
      objects: legacyObjects.sort((x, y) => y.differences - x.differences || x.object.localeCompare(y.object)),
    },
  };
};
