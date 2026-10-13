import { getServiceLogger } from "../../../../utils/createLogger";
import ErrorHandler from "../../../../utils/errorHandler";
import { getTargetSnapshot } from "../../schema-diff.application.service";
import { qn, quoteIdent } from "../../schema-diff.engine";
import type { RelationSnap, SchemaSnapshot } from "../../schema-diff.snapshot.service";
import { withTargetConnection } from "../../schema-diff.snapshot.service";
import { systemConfigApplicationService } from "../../system-config.application.service";
import type { OperationInput } from "../operations";
import { isSensitiveColumn, primaryKeyOf } from "../row-filter";

// Reads a change-request sheet (one row per requested change — e.g.
// "Delete Row | Users Management | Row ID 20250130011 | Full Name = Aaran
// Test") and works out what each row means against a real database.
//
// It resolves, in order, and stops at the first layer it can't resolve
// confidently — that becomes a question for the admin:
//   column roles → statuses → action types → tables → ID column →
//   verification column → (updates) target column → per-row checks.
// Every answer an admin gives is remembered, so the next sheet in the same
// format needs no questions.

const logger = getServiceLogger("sheet-import-interpret");
const MEMORY_KEY = "schema_import.memory";

export type Role =
  | "action"
  | "table"
  | "column"
  | "row_id"
  | "verify_field"
  | "verify_value"
  | "previous_value"
  | "proposed_value"
  | "status"
  | "requester"
  | "ignore";

export type ActionKind = "delete_row" | "update_value" | "skip";

export interface ImportAnswers {
  roleColumns?: Partial<Record<Role, number>>; // role -> header index
  actions?: Record<string, ActionKind>;
  tables?: Record<string, string>; // sheet value -> "schema.table" ("" = skip these rows)
  idColumns?: Record<string, string>; // "schema.table" -> column
  verifyColumns?: Record<string, string>; // "schema.table|field" -> column | "concat:a,b" | "skip"
  updateColumns?: Record<string, string>; // "schema.table|sheet column" -> column
  statuses?: Record<string, boolean>;
  excludeRows?: number[];
}

interface Memory {
  headerRoles: Record<string, Role>;
  actions: Record<string, ActionKind>;
  tables: Record<string, string>;
  idColumns: Record<string, string>;
  verifyColumns: Record<string, string>;
  updateColumns: Record<string, string>;
}

export interface Question {
  id: string;
  kind: "role" | "action" | "table" | "idColumn" | "verify" | "updateColumn";
  key: string; // what the answer is stored under
  prompt: string;
  detail?: string;
  options: { value: string; label: string; description?: string }[];
  suggested?: string;
}

export type RowState = "ready" | "not_found" | "mismatch" | "skipped" | "unresolved" | "invalid" | "duplicate";

export interface InterpretedRow {
  rowNumber: number;
  action: ActionKind | null;
  table: string | null;
  id: string | null;
  summary: string;
  state: RowState;
  message: string;
  include: boolean;
}

export interface Interpretation {
  understood: boolean;
  roles: { index: number; header: string; role: Role; source: "answer" | "memory" | "header" | "none" }[];
  questions: Question[];
  statuses: { value: string; count: number; include: boolean }[];
  rows: InterpretedRow[];
  summary: Record<RowState, number> & { total: number; included: number };
  plan: { operations: OperationInput[]; title: string; reason: string } | null;
  notes: string[];
}

// ---------------------------------------------------------------------------
// text helpers

const norm = (v: string) => v.toLowerCase().replace(/[^a-z0-9]/g, "");
const words = (v: string) => v.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
const isEmptyCell = (v: string | undefined) => /^(n\/?a|none|null|nil|-|—|tbd|)$/i.test((v ?? "").trim());
const sameText = (a: string | null | undefined, b: string | null | undefined) =>
  (a ?? "").replace(/\s+/g, " ").trim().toLowerCase() === (b ?? "").replace(/\s+/g, " ").trim().toLowerCase();

const ROLE_SYNONYMS: Record<Exclude<Role, "ignore">, string[]> = {
  action: ["type", "action", "requesttype", "changetype", "operation", "actiontype"],
  table: ["table", "tablename", "entity", "module", "screen", "area", "section"],
  column: ["columnname", "column", "field", "fieldname", "attribute"],
  row_id: ["rowid", "id", "recordid", "rowidentifier", "uniqueid", "userid", "identifier", "key", "recordkey"],
  verify_field: ["justificationheader", "verificationheader", "verifyheader", "checkfield", "identifierfield", "matchfield"],
  verify_value: ["justificationvalue", "verificationvalue", "verifyvalue", "checkvalue", "identifiervalue", "matchvalue"],
  previous_value: ["previousvalue", "oldvalue", "currentvalue", "from", "fromvalue", "before"],
  proposed_value: ["proposedvalue", "newvalue", "to", "tovalue", "after", "value"],
  status: ["status", "state", "progress"],
  requester: ["requester", "requestedby", "owner", "raisedby"],
};

const ROLE_QUESTIONS: Partial<Record<Role, string>> = {
  action: "Which column says what should happen to each row (e.g. “Delete Row”)?",
  table: "Which column says which table/area each row is about?",
  row_id: "Which column holds the ID of the row to change?",
  column: "Which column names the field to update?",
  proposed_value: "Which column holds the new value?",
};

const DONE_STATUS = /(done|complete|implement|closed|resolved|cancel|reject|duplicate|wont|won't|declin|void)/i;
const TABLE_STOPWORDS = new Set(["management", "table", "list", "data", "records", "record", "screen", "page", "tab", "module", "admin", "the"]);

const singular = (w: string) => (w.endsWith("ies") ? `${w.slice(0, -3)}y` : w.endsWith("s") ? w.slice(0, -1) : w);

// ---------------------------------------------------------------------------
// memory

const loadMemory = async (): Promise<Memory> => {
  const empty: Memory = { headerRoles: {}, actions: {}, tables: {}, idColumns: {}, verifyColumns: {}, updateColumns: {} };
  try {
    const cfg = await systemConfigApplicationService.getOrCreate<Memory>(MEMORY_KEY, empty);
    return { ...empty, ...(cfg.value || {}) };
  } catch (err: any) {
    logger.warn(`Could not load import memory: ${err?.message}`);
    return empty;
  }
};

const remember = async (memory: Memory, answers: ImportAnswers, headers: string[], actorUserId: string) => {
  const next: Memory = JSON.parse(JSON.stringify(memory));
  for (const [role, idx] of Object.entries(answers.roleColumns ?? {})) {
    if (typeof idx === "number" && headers[idx]) next.headerRoles[norm(headers[idx])] = role as Role;
  }
  Object.assign(next.actions, answers.actions ?? {});
  Object.assign(next.tables, answers.tables ?? {});
  Object.assign(next.idColumns, answers.idColumns ?? {});
  Object.assign(next.verifyColumns, answers.verifyColumns ?? {});
  Object.assign(next.updateColumns, answers.updateColumns ?? {});
  if (JSON.stringify(next) === JSON.stringify(memory)) return;
  await systemConfigApplicationService
    .set({ key: MEMORY_KEY, value: next, updatedByUserId: actorUserId })
    .catch((err) => logger.warn(`Could not save import memory: ${err?.message}`));
};

// ---------------------------------------------------------------------------
// resolution steps

const resolveRoles = (headers: string[], answers: ImportAnswers, memory: Memory) => {
  const roles: Interpretation["roles"] = headers.map((header, index) => ({ index, header, role: "ignore" as Role, source: "none" as const }));
  const taken = new Set<Role>();
  // 1. explicit answers
  for (const [role, idx] of Object.entries(answers.roleColumns ?? {})) {
    if (typeof idx === "number" && roles[idx]) {
      roles[idx] = { ...roles[idx], role: role as Role, source: "answer" };
      taken.add(role as Role);
    }
  }
  // 2. remembered header meanings, 3. header synonyms
  for (const r of roles) {
    if (r.source === "answer") continue;
    const n = norm(r.header);
    const remembered = memory.headerRoles[n];
    if (remembered && !taken.has(remembered)) {
      roles[r.index] = { ...r, role: remembered, source: "memory" };
      if (remembered !== "ignore") taken.add(remembered);
      continue;
    }
    const hit = (Object.keys(ROLE_SYNONYMS) as Exclude<Role, "ignore">[]).find((role) => ROLE_SYNONYMS[role].includes(n));
    if (hit && !taken.has(hit)) {
      roles[r.index] = { ...r, role: hit, source: "header" };
      taken.add(hit);
    }
  }
  const col = (role: Role) => roles.find((r) => r.role === role)?.index;
  return { roles, col };
};

const tableKey = (rel: RelationSnap) => `${rel.schema}.${rel.name}`;

const suggestTables = (value: string, snapshot: SchemaSnapshot) => {
  const tokens = words(value).filter((w) => !TABLE_STOPWORDS.has(w)).map(singular);
  const tables = Object.values(snapshot.relations).filter((r) => r.kind === "table" || r.kind === "partitioned_table");
  const scored = tables
    .map((rel) => {
      const nameWords = words(rel.name.replace(/([a-z])([A-Z])/g, "$1 $2")).map(singular);
      const joined = singular(norm(rel.name));
      let score = 0;
      if (tokens.length && singular(tokens.join("")) === joined) score = 4;
      else if (tokens.length && tokens.every((t) => nameWords.includes(t))) score = 3 - Math.min(2, nameWords.length - tokens.length) * 0.5;
      else if (tokens.some((t) => nameWords.includes(t))) score = 1;
      if (rel.schema === "public") score += 0.1;
      return { rel, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.rel.name.length - b.rel.name.length);
  return scored;
};

const idCandidates = (rel: RelationSnap) => {
  const pk = primaryKeyOf(rel);
  const unique = rel.constraints
    .filter((c) => c.type === "u")
    .map((c) => c.definition.match(/\(([^),]+)\)/)?.[1]?.replace(/"/g, "").trim())
    .filter(Boolean) as string[];
  const named = rel.columns.filter((c) => /(^id$|id$|_id$|uniqueid|code$|number$|ref$|reference)/i.test(c.name)).map((c) => c.name);
  return [...new Set([...pk, ...unique, ...named])].filter((c) => rel.columns.some((x) => x.name === c)).slice(0, 12);
};

const shape = (v: string) => v.replace(/[0-9]/g, "9").replace(/[a-z]/gi, "a");

// ---------------------------------------------------------------------------

export interface InterpretInput {
  targetKey: string;
  source: string;
  sheetName: string;
  headers: string[];
  rows: { rowNumber: number; cells: string[] }[];
  answers?: ImportAnswers;
  actorUserId: string;
}

export const interpretSheet = async (input: InterpretInput): Promise<Interpretation> => {
  const headers = Array.isArray(input.headers) ? input.headers.map(String) : [];
  const rows = Array.isArray(input.rows) ? input.rows : [];
  if (!headers.length || !rows.length) throw new ErrorHandler("That sheet has no rows to read.", 400);
  if (rows.length > 5000) throw new ErrorHandler("At most 5,000 rows per import.", 400);
  const answers = input.answers ?? {};
  const memory = await loadMemory();
  const questions: Question[] = [];
  const notes: string[] = [];

  // --- 1. what each column means -----------------------------------------------
  const { roles, col } = resolveRoles(headers, answers, memory);
  const cell = (r: { cells: string[] }, role: Role) => {
    const i = col(role);
    return i === undefined ? "" : String(r.cells[i] ?? "").trim();
  };
  for (const role of ["action", "table", "row_id"] as Role[]) {
    if (col(role) === undefined) {
      questions.push({
        id: `role:${role}`,
        kind: "role",
        key: role,
        prompt: ROLE_QUESTIONS[role]!,
        options: headers.map((h, i) => ({ value: String(i), label: h, description: rows.slice(0, 3).map((r) => r.cells[i]).filter(Boolean).join(" · ").slice(0, 80) })),
      });
    }
  }

  const empty: Interpretation["summary"] = { total: rows.length, included: 0, ready: 0, not_found: 0, mismatch: 0, skipped: 0, unresolved: 0, invalid: 0, duplicate: 0 };
  const finish = (partial: Partial<Interpretation>): Interpretation => {
    const out: Interpretation = {
      understood: false,
      roles,
      questions,
      statuses: [],
      rows: [],
      summary: empty,
      plan: null,
      notes,
      ...partial,
    };
    return out;
  };
  if (questions.length) {
    await remember(memory, answers, headers, input.actorUserId);
    return finish({});
  }

  // --- 2. statuses -----------------------------------------------------------------
  const statusCounts = new Map<string, number>();
  if (col("status") !== undefined) for (const r of rows) statusCounts.set(cell(r, "status"), (statusCounts.get(cell(r, "status")) ?? 0) + 1);
  const statusInclude = (v: string) => answers.statuses?.[v] ?? !DONE_STATUS.test(v);
  const statuses = [...statusCounts.entries()].map(([value, count]) => ({ value, count, include: statusInclude(value) }));
  const active = rows.filter((r) => col("status") === undefined || statusInclude(cell(r, "status")));

  // --- 3. action types --------------------------------------------------------------
  const actionOf = new Map<string, ActionKind>();
  for (const raw of new Set(active.map((r) => cell(r, "action")))) {
    const n = norm(raw);
    const known = answers.actions?.[n] ?? memory.actions[n];
    if (known) {
      actionOf.set(n, known);
      continue;
    }
    if (/(delete|remove|purge|erase)/.test(n) && !/(column|field|table)/.test(n)) actionOf.set(n, "delete_row");
    else if (/(update|change|edit|amend|correct|modify|replace|set)/.test(n)) actionOf.set(n, "update_value");
    else {
      questions.push({
        id: `action:${n}`,
        kind: "action",
        key: n,
        prompt: `What should “${raw || "(blank)"}” do?`,
        detail: `${active.filter((r) => norm(cell(r, "action")) === n).length} row(s) use this type.`,
        options: [
          { value: "delete_row", label: "Delete the row" },
          { value: "update_value", label: "Change one value in the row" },
          { value: "skip", label: "Skip these rows" },
        ],
      });
    }
  }
  if (col("column") === undefined && [...actionOf.values()].includes("update_value")) {
    questions.push({ id: "role:column", kind: "role", key: "column", prompt: ROLE_QUESTIONS.column!, options: headers.map((h, i) => ({ value: String(i), label: h })) });
  }
  if (col("proposed_value") === undefined && [...actionOf.values()].includes("update_value")) {
    questions.push({ id: "role:proposed_value", kind: "role", key: "proposed_value", prompt: ROLE_QUESTIONS.proposed_value!, options: headers.map((h, i) => ({ value: String(i), label: h })) });
  }

  // --- 4. tables --------------------------------------------------------------------
  const { snapshot } = await getTargetSnapshot(input.targetKey, [], false);
  const allTables = Object.values(snapshot.relations).filter((r) => r.kind === "table" || r.kind === "partitioned_table");
  const tableOf = new Map<string, RelationSnap | null>(); // null = skip
  const actionable = active.filter((r) => actionOf.get(norm(cell(r, "action"))) && actionOf.get(norm(cell(r, "action"))) !== "skip");
  for (const raw of new Set(actionable.map((r) => cell(r, "table")))) {
    const n = norm(raw);
    const chosen = answers.tables?.[n] ?? memory.tables[n];
    if (chosen !== undefined) {
      tableOf.set(n, chosen ? snapshot.relations[chosen] ?? null : null);
      if (chosen && !snapshot.relations[chosen]) notes.push(`“${raw}” was mapped to ${chosen}, which doesn't exist in ${snapshot.database}.`);
      continue;
    }
    const suggestions = suggestTables(raw, snapshot);
    const top = suggestions[0];
    if (top && top.score >= 3 && (!suggestions[1] || suggestions[1].score < top.score)) {
      tableOf.set(n, top.rel);
      notes.push(`“${raw}” → table ${tableKey(top.rel)}.`);
      continue;
    }
    questions.push({
      id: `table:${n}`,
      kind: "table",
      key: n,
      prompt: `Which table is “${raw || "(blank)"}”?`,
      detail: `${actionable.filter((r) => norm(cell(r, "table")) === n).length} row(s) refer to it.`,
      suggested: top ? tableKey(top.rel) : undefined,
      options: [
        ...suggestions.slice(0, 6).map((s) => ({ value: tableKey(s.rel), label: s.rel.name, description: `${s.rel.schema} · ~${s.rel.rowEstimate.toLocaleString()} rows · suggested` })),
        ...allTables
          .filter((t) => !suggestions.slice(0, 6).some((s) => s.rel === t))
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((t) => ({ value: tableKey(t), label: t.name, description: `${t.schema} · ~${t.rowEstimate.toLocaleString()} rows` })),
        { value: "", label: "None of these — skip these rows" },
      ],
    });
  }

  if (questions.length) {
    await remember(memory, answers, headers, input.actorUserId);
    return finish({ statuses });
  }

  // --- 5–7. per table: ID column, verification column, update columns ----------------
  const byTable = new Map<RelationSnap, typeof actionable>();
  for (const r of actionable) {
    const rel = tableOf.get(norm(cell(r, "table")));
    if (!rel) continue;
    byTable.set(rel, [...(byTable.get(rel) ?? []), r]);
  }

  const idColumnOf = new Map<RelationSnap, string>();
  const verifyOf = new Map<string, string>(); // "schema.table|field" -> spec
  const updateColOf = new Map<string, string>(); // "schema.table|sheetcol" -> column
  const found = new Map<RelationSnap, Map<string, Record<string, string | null>>>();

  await withTargetConnection(
    input.targetKey,
    async (client) => {
      await client.query("BEGIN TRANSACTION READ ONLY; SET LOCAL statement_timeout = '20s'");
      try {
        for (const [rel, tRows] of byTable) {
          const tk = tableKey(rel);
          const ids = [...new Set(tRows.map((r) => cell(r, "row_id")).filter((v) => !isEmptyCell(v)))];
          if (!ids.length) continue;

          // ID column
          let idCol = answers.idColumns?.[tk] ?? memory.idColumns[tk];
          if (!idCol || !rel.columns.some((c) => c.name === idCol)) {
            const candidates = idCandidates(rel);
            const counts: { col: string; hits: number }[] = [];
            for (const c of candidates) {
              const res = await client.query(`SELECT count(DISTINCT ${quoteIdent(c)}::text)::int AS n FROM ${qn(rel.schema, rel.name)} WHERE ${quoteIdent(c)}::text = ANY($1)`, [ids]);
              counts.push({ col: c, hits: res.rows[0].n });
            }
            counts.sort((a, b) => b.hits - a.hits);
            // Accept automatically only on strong evidence: most IDs found, in
            // one column more than any other. A few coincidental matches (an
            // internal id that happens to equal another system's ID) must
            // not decide which rows get changed.
            if (counts[0]?.hits && counts[0].hits > (counts[1]?.hits ?? 0) && counts[0].hits / ids.length >= 0.8) {
              idCol = counts[0].col;
              notes.push(`IDs for ${tk} are in “${idCol}” (${counts[0].hits} of ${ids.length} found).`);
            } else {
              // Not found in this database — guess by the shape of the values.
              const idShapes = new Set(ids.map(shape));
              const shapeScores: { col: string; ratio: number }[] = [];
              for (const c of candidates) {
                const res = await client.query(`SELECT ${quoteIdent(c)}::text AS v FROM ${qn(rel.schema, rel.name)} WHERE ${quoteIdent(c)} IS NOT NULL LIMIT 50`);
                const hits = res.rows.filter((x) => idShapes.has(shape(String(x.v)))).length;
                if (hits) shapeScores.push({ col: c, ratio: hits / res.rows.length });
              }
              shapeScores.sort((a, b) => b.ratio - a.ratio);
              const shapeMatches = shapeScores.map((s) => s.col);
              const bestShape = shapeScores[0] && (!shapeScores[1] || shapeScores[0].ratio > shapeScores[1].ratio) ? shapeScores[0].col : undefined;
              questions.push({
                id: `idColumn:${tk}`,
                kind: "idColumn",
                key: tk,
                prompt: `Which ${rel.name} column holds IDs like “${ids[0]}”?`,
                detail: counts[0]?.hits
                  ? counts[0].hits === counts[1]?.hits
                    ? `Several columns match equally — pick the right one.`
                    : `Only ${counts[0].hits} of ${ids.length} ID(s) were found, in “${counts[0].col}”${shapeMatches.length ? `; values in ${shapeMatches.join(", ")} look similar` : ""}. A few matches can be coincidence — make sure this is the right column and database.`
                  : `None of the ${ids.length} ID(s) exist in ${snapshot.database}${shapeMatches.length ? ` — values in ${shapeMatches.join(", ")} look similar` : ""}. They may belong to another database.`,
                // Weak evidence: no pre-selection, so the admin picks deliberately.
                suggested: counts[0]?.hits ? undefined : bestShape,
                options: rel.columns.map((c) => ({ value: c.name, label: c.name, description: `${c.type}${candidates.includes(c.name) ? " · likely" : ""}` })),
              });
              continue;
            }
          }
          idColumnOf.set(rel, idCol);

          // Verification columns
          const verifyExprs: { key: string; expr: string }[] = [];
          if (col("verify_field") !== undefined) {
            for (const field of new Set(tRows.map((r) => cell(r, "verify_field")).filter((v) => !isEmptyCell(v)))) {
              const vk = `${tk}|${norm(field)}`;
              let spec = answers.verifyColumns?.[vk] ?? memory.verifyColumns[vk];
              if (!spec) {
                const direct = rel.columns.find((c) => norm(c.name) === norm(field));
                const has = (n: string) => rel.columns.some((c) => c.name === n);
                if (direct) spec = direct.name;
                else if (/^(fullname|name|clientname|username|customername)$/.test(norm(field)) && has("firstName") && has("lastName")) {
                  spec = has("middleName") ? "concat:firstName,middleName,lastName" : "concat:firstName,lastName";
                }
              }
              if (!spec) {
                questions.push({
                  id: `verify:${vk}`,
                  kind: "verify",
                  key: vk,
                  prompt: `Which ${rel.name} column is “${field}”?`,
                  detail: "Used to double-check each row before changing it (so the wrong record is never touched).",
                  options: [
                    ...rel.columns.map((c) => ({ value: c.name, label: c.name, description: c.type })),
                    { value: "skip", label: "Don't verify — trust the IDs" },
                  ],
                });
                continue;
              }
              verifyOf.set(vk, spec);
              if (spec !== "skip") {
                const expr = spec.startsWith("concat:")
                  ? `concat_ws(' ', ${spec.slice(7).split(",").map((c) => `NULLIF(trim(${quoteIdent(c)}::text), '')`).join(", ")})`
                  : `${quoteIdent(spec)}::text`;
                verifyExprs.push({ key: vk, expr });
                if (spec.startsWith("concat:") && spec.includes("middleName")) {
                  // Also accept the name without the middle name.
                  verifyExprs.push({ key: `${vk}#short`, expr: `concat_ws(' ', NULLIF(trim("firstName"::text), ''), NULLIF(trim("lastName"::text), ''))` });
                }
              }
            }
          }

          // Update target columns
          const updateExprs: { key: string; col: string }[] = [];
          for (const r of tRows.filter((x) => actionOf.get(norm(cell(x, "action"))) === "update_value")) {
            const sheetCol = cell(r, "column");
            if (isEmptyCell(sheetCol)) continue;
            const uk = `${tk}|${norm(sheetCol)}`;
            if (updateColOf.has(uk) || questions.some((q) => q.id === `updateColumn:${uk}`)) continue;
            const chosen = answers.updateColumns?.[uk] ?? memory.updateColumns[uk] ?? rel.columns.find((c) => norm(c.name) === norm(sheetCol))?.name;
            if (chosen && rel.columns.some((c) => c.name === chosen)) {
              updateColOf.set(uk, chosen);
              updateExprs.push({ key: uk, col: chosen });
            } else {
              questions.push({
                id: `updateColumn:${uk}`,
                kind: "updateColumn",
                key: uk,
                prompt: `Which ${rel.name} column is “${sheetCol}”?`,
                options: rel.columns.map((c) => ({ value: c.name, label: c.name, description: c.type })),
              });
            }
          }

          // Fetch the referenced rows once.
          const selects = [
            `${quoteIdent(idCol)}::text AS "__id"`,
            ...verifyExprs.map((v, i) => `${v.expr} AS "__v${i}"`),
            ...updateExprs.map((u, i) => `${quoteIdent(u.col)}::text AS "__u${i}"`),
          ];
          const res = await client.query(`SELECT ${selects.join(", ")} FROM ${qn(rel.schema, rel.name)} WHERE ${quoteIdent(idCol)}::text = ANY($1)`, [ids]);
          const map = new Map<string, Record<string, string | null>>();
          for (const row of res.rows) {
            const rec: Record<string, string | null> = {};
            verifyExprs.forEach((v, i) => (rec[`v:${v.key}`] = row[`__v${i}`]));
            updateExprs.forEach((u, i) => (rec[`u:${u.key}`] = row[`__u${i}`]));
            rec.__count = String(Number(map.get(row.__id)?.__count ?? 0) + 1);
            map.set(row.__id, rec);
          }
          found.set(rel, map);
        }
      } finally {
        await client.query("ROLLBACK").catch(() => undefined);
      }
    },
    { queryTimeoutMs: 60_000 },
  );

  // --- 8. per-row results --------------------------------------------------------------
  const seen = new Set<string>();
  const exclude = new Set(answers.excludeRows ?? []);
  const outRows: InterpretedRow[] = rows.map((r) => {
    const actionRaw = cell(r, "action");
    const action = actionOf.get(norm(actionRaw)) ?? null;
    const id = cell(r, "row_id");
    const tableRaw = cell(r, "table");
    const rel = tableOf.get(norm(tableRaw)) ?? null;
    const base = { rowNumber: r.rowNumber, action, table: rel ? tableKey(rel) : null, id: isEmptyCell(id) ? null : id, include: false };
    const label = `${actionRaw || "?"} · ${tableRaw || "?"} · ${id || "?"}`;
    const out = (state: RowState, message: string, summary = label): InterpretedRow => ({ ...base, summary, state, message, include: state === "ready" && !exclude.has(r.rowNumber) });

    if (col("status") !== undefined && !statusInclude(cell(r, "status"))) return out("skipped", `Status “${cell(r, "status")}” — not processed.`);
    if (action === "skip") return out("skipped", `Type “${actionRaw}” is set to be skipped.`);
    if (!action) return out("unresolved", `Type “${actionRaw}” isn't understood yet.`);
    if (!rel) return out(tableOf.has(norm(tableRaw)) ? "skipped" : "unresolved", tableOf.has(norm(tableRaw)) ? `“${tableRaw}” is set to be skipped.` : `Table “${tableRaw}” isn't resolved yet.`);
    if (isEmptyCell(id)) return out("invalid", "No row ID given.");
    const idCol = idColumnOf.get(rel);
    if (!idCol) return out("unresolved", `Waiting for the ID column of ${rel.name}.`);

    const dupKey = `${tableKey(rel)}|${id}|${action}|${action === "update_value" ? norm(cell(r, "column")) : ""}`;
    if (seen.has(dupKey)) return out("duplicate", "Same request appears earlier in the sheet.");
    seen.add(dupKey);

    const rec = found.get(rel)?.get(id);
    if (!rec) return out("not_found", `No ${rel.name} row has ${idCol} = ${id} in ${snapshot.database}.`);
    if (Number(rec.__count) > 1) notes.push(`${idCol} = ${id} matches ${rec.__count} ${rel.name} rows.`);

    // verification
    if (col("verify_field") !== undefined && !isEmptyCell(cell(r, "verify_field"))) {
      const vk = `${tableKey(rel)}|${norm(cell(r, "verify_field"))}`;
      const spec = verifyOf.get(vk);
      if (!spec) return out("unresolved", `Waiting for which column “${cell(r, "verify_field")}” is.`);
      if (spec !== "skip") {
        const expected = cell(r, "verify_value");
        const actual = rec[`v:${vk}`];
        const sensitive = !spec.startsWith("concat:") && isSensitiveColumn(spec);
        if (!sameText(actual, expected) && !sameText(rec[`v:${vk}#short`], expected)) {
          return out("mismatch", `${cell(r, "verify_field")} is ${sensitive ? "different" : `“${actual ?? "empty"}”`}, but the sheet says “${expected}” — not touched.`);
        }
      }
    }

    if (action === "delete_row") return out("ready", `Will delete ${rel.name} row ${idCol} = ${id}${col("verify_value") !== undefined && cell(r, "verify_value") ? ` (${cell(r, "verify_value")})` : ""}.`);

    // update
    const sheetCol = cell(r, "column");
    if (isEmptyCell(sheetCol)) return out("invalid", "No column named for the update.");
    const uk = `${tableKey(rel)}|${norm(sheetCol)}`;
    const target = updateColOf.get(uk);
    if (!target) return out("unresolved", `Waiting for which column “${sheetCol}” is.`);
    const proposed = cell(r, "proposed_value");
    if (isEmptyCell(proposed)) return out("invalid", "No new value given.");
    const previous = cell(r, "previous_value");
    const current = rec[`u:${uk}`];
    if (!isEmptyCell(previous) && !sameText(current, previous)) {
      return out("mismatch", `${target} is currently ${isSensitiveColumn(target) ? "different" : `“${current ?? "empty"}”`}, not “${previous}” — it may already have been changed.`);
    }
    if (sameText(current, proposed)) return out("skipped", `${target} is already “${proposed}”.`);
    return out("ready", `Will set ${rel.name}.${target} to “${proposed}” for ${idCol} = ${id}.`);
  });

  const summary = { ...empty };
  for (const r of outRows) {
    summary[r.state]++;
    if (r.include) summary.included++;
  }

  // --- 9. the change -------------------------------------------------------------------
  let plan: Interpretation["plan"] = null;
  if (!questions.length && summary.included > 0) {
    const included = outRows.filter((r) => r.include);
    const operations: OperationInput[] = [];
    const deletesByTable = new Map<string, string[]>();
    for (const r of included.filter((x) => x.action === "delete_row")) {
      deletesByTable.set(r.table!, [...(deletesByTable.get(r.table!) ?? []), r.id!]);
    }
    for (const [tk, ids] of deletesByTable) {
      const rel = snapshot.relations[tk];
      operations.push({
        kind: "delete_rows",
        schema: rel.schema,
        table: rel.name,
        mode: "filter",
        conditions: [{ column: idColumnOf.get(rel)!, op: "in", value: ids }],
      });
    }
    for (const r of included.filter((x) => x.action === "update_value")) {
      const rel = snapshot.relations[r.table!];
      const sheetRow = rows.find((x) => x.rowNumber === r.rowNumber)!;
      const previous = cell(sheetRow, "previous_value");
      operations.push({
        kind: "update_value",
        schema: rel.schema,
        table: rel.name,
        keyColumn: idColumnOf.get(rel)!,
        keyValue: r.id!,
        column: updateColOf.get(`${r.table}|${norm(cell(sheetRow, "column"))}`)!,
        newValue: cell(sheetRow, "proposed_value"),
        expectedOld: isEmptyCell(previous) ? undefined : previous,
      });
    }
    const requesters = [...new Set(included.map((r) => cell(rows.find((x) => x.rowNumber === r.rowNumber)!, "requester")).filter((v) => !isEmptyCell(v)))];
    const deletes = included.filter((r) => r.action === "delete_row").length;
    const updates = included.length - deletes;
    plan = {
      operations,
      title: `Import “${input.sheetName}”: ${[deletes ? `${deletes} delete(s)` : "", updates ? `${updates} update(s)` : ""].filter(Boolean).join(", ")}`.slice(0, 200),
      reason: [
        `Imported from ${input.source} › ${input.sheetName}, sheet rows ${included.map((r) => r.rowNumber).join(", ")}.`,
        requesters.length ? `Requested by ${requesters.join(", ")}.` : "",
      ]
        .filter(Boolean)
        .join(" ")
        .slice(0, 4000),
    };
  }

  await remember(memory, answers, headers, input.actorUserId);
  return {
    understood: questions.length === 0,
    roles,
    questions,
    statuses,
    rows: outRows,
    summary,
    plan,
    notes: [...new Set(notes)],
  };
};
