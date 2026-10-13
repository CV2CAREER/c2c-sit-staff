import { createHash, randomBytes } from "crypto";
import type { Client } from "pg";
import { Op } from "sequelize";
import { SCHEMA_CHANGE_PROTECTED_DATABASES } from "../../../config/env";
import { SchemaChangeRequest, SchemaChangeStatus } from "../../../models/v1/schema-change-request.model";
import { User } from "../../../models/v1/user.model";
import { getServiceLogger } from "../../../utils/createLogger";
import ErrorHandler from "../../../utils/errorHandler";
import { auditTrailApplicationService } from "../audit-trail.application.service";
import { SettingService } from "../settings.service";
import { getTargetSnapshot, invalidateTargetSnapshots } from "../schema-diff.application.service";
import type { SchemaSnapshot } from "../schema-diff.snapshot.service";
import { resolveTarget, withTargetConnection } from "../schema-diff.snapshot.service";
import { qn, quoteIdent } from "../schema-diff.engine";
import { buildWhere, displayValue, isSensitiveColumn, primaryKeyOf } from "./row-filter";
import { IMPACT_RANK, ImpactLevel, ImpactReport, impactIndexInfo } from "./impact";
import {
  BuiltOperation,
  CheckResult,
  DEFAULT_EXPRESSIONS,
  OperationInput,
  ResolvedOperation,
  Risk,
  TYPE_CHOICES,
  VerifySpec,
  buildOperation,
  resolveDiffOperation,
  stripUntrusted,
} from "./operations";

// Admin > Database Modifications: review → (approve) → apply → verify → revert.
//
// Guarantees:
//   * nothing is applied unless every pre-flight check passes and the dry
//     run (the real statements in a transaction that is rolled back)
//     succeeded or was deliberately skipped for a big table;
//   * apply re-plans first and refuses if the database or the code impact
//     changed since review (planHash) — an approval can't go stale;
//   * the whole change runs in ONE transaction with a lock timeout: it
//     either fully applies or leaves the database exactly as it was;
//   * destructive operations back the affected data up inside that same
//     transaction, and every operation records how to undo it;
//   * protected databases (PROD) need a second admin's approval.

const logger = getServiceLogger("schema-change-service");

const DRY_RUN_HEAVY_ROWS = 50_000;
const APPLY_STATEMENT_TIMEOUT_MS = 10 * 60 * 1000;
const STALE_RUNNING_MS = 15 * 60 * 1000;
const ADVISORY_LOCK_KEY = "c2c-staff-schema-change";

export const isProtectedDatabase = (database: string) =>
  /prod/i.test(database) || SCHEMA_CHANGE_PROTECTED_DATABASES.includes(database.toLowerCase());

// ---------------------------------------------------------------------------
// plan types

export interface PlannedOperation {
  index: number;
  title: string;
  origin?: string;
  risk: Risk;
  table: string | null;
  statements: string[];
  backupStatements: string[];
  backups: { table: string; description: string }[];
  undoStatements: string[];
  undoNote?: string;
  checks: CheckResult[];
  impact: ImpactReport;
  heavy: boolean;
  rowEstimate: number;
  notes: string[];
  dryRun: { status: "passed" | "failed" | "skipped" | "not_run"; message?: string; durationMs?: number };
  verify: VerifySpec[];
  // delete_rows: the DELETE must affect exactly this many rows at apply time.
  expectedRows?: number;
  preview?: { columns: string[]; rows: (string | null)[][] };
}

export interface PlanResult {
  targetKey: string;
  targetDatabase: string;
  targetLabel: string;
  isProtected: boolean;
  serverVersion: string;
  operations: PlannedOperation[];
  summary: {
    risk: Risk;
    impactLevel: ImpactLevel;
    blockers: number;
    warnings: number;
    destructive: number;
    backups: number;
    requiresApproval: boolean;
    requiresTypedConfirmation: boolean;
    canApply: boolean;
    reasonsBlocked: string[];
  };
  dryRun: { status: "passed" | "failed" | "partial" | "not_run"; message: string; durationMs: number };
  sql: string;
  undoSql: string;
  plannedAt: string;
  backupPrefix: string;
  codeIndex: { generatedAt: string; missingRepos: string[] };
}

const RISK_RANK: Record<Risk, number> = { safe: 0, caution: 1, destructive: 2 };

// ---------------------------------------------------------------------------
// snapshot simulation so later operations in one change can build on earlier
// ones (create a table, then index it)

const simulate = (snap: SchemaSnapshot, op: ResolvedOperation, built: BuiltOperation) => {
  const schema = "schema" in op && op.schema ? op.schema : "public";
  const rel = "table" in op && typeof op.table === "string" ? snap.relations[`${schema}.${op.table}`] : undefined;
  switch (op.kind) {
    case "add_column":
      rel?.columns.push({ name: op.column, type: op.trustedType || op.type, nullable: op.nullable, default: null, identity: null, generated: null, position: rel.columns.length + 1 });
      break;
    case "drop_column":
      if (rel) rel.columns = rel.columns.filter((c) => c.name !== op.column);
      break;
    case "set_nullable": {
      const col = rel?.columns.find((c) => c.name === op.column);
      if (col) col.nullable = op.nullable;
      break;
    }
    case "create_index":
      rel?.indexes.push({ name: op.name, definition: built.statements[0], unique: op.unique, primary: false, constraintBacked: false });
      break;
    case "drop_index":
      if (rel) rel.indexes = rel.indexes.filter((i) => i.name !== op.name);
      break;
    case "add_unique":
      rel?.constraints.push({ name: op.name, type: "u", definition: `UNIQUE (${op.columns.join(", ")})` });
      break;
    case "add_foreign_key":
      rel?.constraints.push({ name: op.name, type: "f", definition: "FOREIGN KEY" });
      break;
    case "drop_constraint":
      if (rel) rel.constraints = rel.constraints.filter((c) => c.name !== op.name);
      break;
    case "create_table":
      snap.relations[`${schema}.${op.table}`] = {
        schema,
        name: op.table,
        kind: "table",
        rowEstimate: 0,
        viewDefinition: null,
        columns: op.columns.map((c, i) => ({ name: c.name, type: c.type, nullable: c.nullable, default: null, identity: null, generated: null, position: i + 1 })),
        constraints: op.primaryKey?.length ? [{ name: `${op.table}_pkey`, type: "p", definition: `PRIMARY KEY (${op.primaryKey.join(", ")})` }] : [],
        indexes: [],
        triggers: [],
      };
      break;
    case "drop_table":
      delete snap.relations[`${schema}.${op.table}`];
      break;
    case "add_enum_value":
      snap.enums[`${schema}.${op.enum}`]?.labels.push(op.value);
      break;
    default:
      break;
  }
};

// ---------------------------------------------------------------------------
// helpers

const friendlyPgError = (err: any): string => {
  const code = err?.code as string | undefined;
  const msg = String(err?.message || err);
  if (code === "55P03" || /lock timeout/i.test(msg)) {
    return "The table is busy (another query holds a lock) — nothing was changed. Try again in a moment, ideally at a quiet time.";
  }
  if (code === "57014" || /statement timeout/i.test(msg)) return "The statement took too long and was cancelled — nothing was changed.";
  if (code === "23505") return `Duplicate values prevent this: ${err.detail || msg}`;
  if (code === "23502") return `Rows with empty values prevent this: ${msg}`;
  if (code === "23503") return `Rows that point at missing data prevent this: ${err.detail || msg}`;
  if (code === "42501") return `The database user isn't allowed to do this: ${msg}`;
  return msg;
};

const savepoint = async <T>(client: Client, name: string, fn: () => Promise<T>): Promise<T> => {
  await client.query(`SAVEPOINT ${name}`);
  try {
    const result = await fn();
    await client.query(`RELEASE SAVEPOINT ${name}`);
    return result;
  } catch (err) {
    await client.query(`ROLLBACK TO SAVEPOINT ${name}`).catch(() => undefined);
    throw err;
  }
};

const serverMajor = (version: string) => Number(String(version).match(/^(\d+)/)?.[1] || 0);

const hashPlan = (plan: Omit<PlanResult, "plannedAt">) =>
  createHash("sha256")
    .update(
      JSON.stringify({
        target: plan.targetKey,
        ops: plan.operations.map((o) => ({
          s: o.statements,
          b: o.backupStatements,
          c: o.checks.map((c) => `${c.label}:${c.status}${c.fingerprint ? `:${c.fingerprint}` : ""}`),
          i: o.impact.level,
        })),
      }),
    )
    .digest("hex");

const displaySql = (ops: PlannedOperation[], database: string) => {
  const lines = [
    `-- Schema change for ${database} — generated ${new Date().toISOString()}`,
    `-- Runs as ONE transaction: all of it applies, or none of it does.`,
    `BEGIN;`,
    `SET LOCAL lock_timeout = '5s';`,
    "",
  ];
  for (const op of ops) {
    lines.push(`-- ${op.index + 1}. ${op.title}`);
    if (op.backupStatements.length) lines.push("-- backup first:", ...op.backupStatements);
    lines.push(...op.statements, "");
  }
  lines.push("COMMIT;");
  return lines.join("\n");
};

const displayUndo = (ops: PlannedOperation[]) => {
  const lines: string[] = ["-- Undo, in reverse order (generated before the change ran)."];
  for (const op of [...ops].reverse()) {
    lines.push(`-- ${op.index + 1}. ${op.title}`);
    if (op.undoStatements.length) lines.push(...op.undoStatements);
    if (op.undoNote) lines.push(`-- NOTE: ${op.undoNote}`);
    lines.push("");
  }
  return lines.join("\n");
};

// `id` must be selected too: User's afterFind decrypts the (encrypted) email
// by id, so selecting only "email" always came back empty.
const actorEmail = async (userId: string) => {
  try {
    const user = await User.findByPk(userId, { attributes: ["id", "email"] });
    return (user as any)?.email ?? null;
  } catch {
    return null;
  }
};

const SYSTEM_ACTORS: Record<string, string> = { "claude-code-prepared": "Claude Code (on request)" };

// Display names for everyone on a request, looked up at read time so older
// requests (saved without a name/email) show correctly too.
export const withPeople = async <T extends SchemaChangeRequest>(rows: T[]) => {
  const ids = [
    ...new Set(rows.flatMap((r) => [r.createdById, r.approvedById, r.appliedById, r.rejectedById]).filter((x): x is string => !!x && !SYSTEM_ACTORS[x])),
  ];
  const people = new Map<string, string>();
  if (ids.length) {
    try {
      const users = await User.findAll({ where: { id: ids }, attributes: ["id", "firstName", "lastName", "email"], paranoid: false });
      for (const u of users as any[]) {
        const name = [u.firstName, u.lastName].filter(Boolean).join(" ").trim();
        people.set(u.id, name || u.email || "");
      }
    } catch (err: any) {
      logger.warn(`Could not resolve admin names: ${err?.message}`);
    }
  }
  const nameOf = (id?: string | null, fallback?: string | null) =>
    !id ? null : SYSTEM_ACTORS[id] ?? (people.get(id) || fallback || null);
  return rows.map((r) => ({
    ...r.toJSON(),
    createdByName: nameOf(r.createdById, r.createdByEmail),
    approvedByName: nameOf(r.approvedById, r.approvedByEmail),
    appliedByName: nameOf(r.appliedById, r.appliedByEmail),
    rejectedByName: nameOf(r.rejectedById),
  }));
};

const audit = (action: string, actorUserId: string, request: SchemaChangeRequest, extra: Record<string, unknown> = {}) =>
  auditTrailApplicationService
    .log({
      action,
      actorUserId,
      targetType: "SchemaChange",
      targetKey: `${request.targetDatabase}: ${request.title}`.slice(0, 250),
      metadata: { requestId: request.id, status: request.status, ...extra },
    })
    .catch((err) => logger.warn(`Audit ${action} failed: ${err?.message}`));

// ---------------------------------------------------------------------------
// service

class SchemaChangeService {
  async structure(targetKey: string) {
    const target = await resolveTarget(targetKey);
    const { snapshot } = await getTargetSnapshot(targetKey, [], false);
    return {
      targetKey,
      database: target.database,
      isProtected: isProtectedDatabase(target.database),
      tables: Object.values(snapshot.relations)
        .filter((r) => r.kind === "table" || r.kind === "partitioned_table")
        .map((r) => ({
          schema: r.schema,
          name: r.name,
          rowEstimate: r.rowEstimate,
          columns: r.columns.map((c) => ({ name: c.name, type: c.type, nullable: c.nullable, default: c.default })),
          indexes: r.indexes.map((i) => ({ name: i.name, unique: i.unique, constraintBacked: i.constraintBacked })),
          constraints: r.constraints.filter((c) => c.type !== "n").map((c) => ({ name: c.name, type: c.type, definition: c.definition })),
        }))
        .sort((a, b) => a.name.localeCompare(b.name)),
      enums: Object.values(snapshot.enums).map((e) => ({ schema: e.schema, name: e.name, labels: e.labels })),
      choices: { types: TYPE_CHOICES, defaultExpressions: DEFAULT_EXPRESSIONS, onDelete: ["NO ACTION", "RESTRICT", "CASCADE", "SET NULL"] },
      capturedAt: snapshot.capturedAt,
    };
  }

  // Read-only page of a table's rows for picking rows to delete. Sensitive
  // columns are masked; primary keys come back as exact text.
  async rows(input: { targetKey: string; schema: unknown; table: unknown; conditions: unknown; page: unknown; pageSize: unknown }) {
    const { snapshot } = await getTargetSnapshot(input.targetKey, [], false);
    const schema = String(input.schema || "public");
    const rel = snapshot.relations[`${schema}.${String(input.table)}`];
    if (!rel || (rel.kind !== "table" && rel.kind !== "partitioned_table")) {
      throw new ErrorHandler(`Table ${schema}.${input.table} does not exist in ${snapshot.database}.`, 404);
    }
    const where = buildWhere(rel, Array.isArray(input.conditions) ? input.conditions : []);
    const pageSize = Math.min(Math.max(Number(input.pageSize) || 50, 10), 200);
    const page = Math.max(Number(input.page) || 1, 1);
    const pk = primaryKeyOf(rel);
    const order = pk.length ? pk.map((c) => quoteIdent(c)).join(", ") : "ctid";
    const table = qn(rel.schema, rel.name);

    return withTargetConnection(
      input.targetKey,
      async (client) => {
        await client.query("BEGIN TRANSACTION READ ONLY; SET LOCAL statement_timeout = '15s'");
        try {
          let total: number | null = null;
          let totalIsEstimate = false;
          try {
            total = Number((await client.query(`SELECT count(*)::bigint AS n FROM ${table} WHERE ${where}`)).rows[0]?.n ?? 0);
          } catch {
            await client.query("ROLLBACK; BEGIN TRANSACTION READ ONLY; SET LOCAL statement_timeout = '15s'");
            total = rel.rowEstimate;
            totalIsEstimate = true;
          }
          const keySelect = pk.map((c, i) => `${quoteIdent(c)}::text AS "__pk${i}"`).join(", ");
          const res = await client.query(
            `SELECT *${keySelect ? `, ${keySelect}` : ""} FROM ${table} WHERE ${where} ORDER BY ${order} LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`,
          );
          const columns = rel.columns.map((c) => ({ name: c.name, type: c.type, sensitive: isSensitiveColumn(c.name), isKey: pk.includes(c.name) }));
          return {
            schema: rel.schema,
            table: rel.name,
            primaryKey: pk,
            columns,
            rows: res.rows.map((r) => ({
              key: pk.length ? Object.fromEntries(pk.map((c, i) => [c, r[`__pk${i}`] as string])) : null,
              values: columns.map((c) => displayValue(c.name, r[c.name])),
            })),
            total,
            totalIsEstimate,
            page,
            pageSize,
          };
        } catch (err: any) {
          throw new ErrorHandler(`Couldn't read rows: ${friendlyPgError(err)}. Check the filter values match each column's type.`, 400);
        } finally {
          await client.query("ROLLBACK").catch(() => undefined);
        }
      },
      { queryTimeoutMs: 40_000 },
    );
  }

  private async resolveOperations(inputs: OperationInput[], target: SchemaSnapshot): Promise<ResolvedOperation[]> {
    const out: ResolvedOperation[] = [];
    for (const [i, op] of inputs.entries()) {
      if (op.kind !== "apply_diff") {
        out.push(op);
        continue;
      }
      if (!op.sourceKey || !op.item) throw new ErrorHandler(`Operation ${i + 1}: missing source database or difference.`, 400);
      if (op.sourceKey === target.targetKey) throw new ErrorHandler("The source of a difference can't be the database being changed.", 400);
      const { snapshot: source } = await getTargetSnapshot(op.sourceKey, [], false);
      out.push(...resolveDiffOperation(op.item, source, target));
    }
    if (!out.length) throw new ErrorHandler("Nothing to change.", 400);
    return out;
  }

  // Builds, checks and (optionally) dry-runs a set of resolved operations.
  private async planResolved(
    targetKey: string,
    ops: ResolvedOperation[],
    opts: { backupPrefix: string; dryRun: boolean; snapshot?: SchemaSnapshot },
  ): Promise<PlanResult> {
    const target = await resolveTarget(targetKey);
    const snapshot = opts.snapshot ?? (await getTargetSnapshot(targetKey, [], true)).snapshot;
    const working: SchemaSnapshot = structuredClone(snapshot);
    const ctx = { snapshot: working, backupPrefix: opts.backupPrefix, serverMajor: serverMajor(snapshot.serverVersion) };

    // Build all first (validation errors surface as a clear 400 before any
    // database round trip).
    const built: { op: ResolvedOperation; b: BuiltOperation }[] = [];
    for (const [i, op] of ops.entries()) {
      try {
        const b = buildOperation(op, { ...ctx, opIndex: i });
        simulate(working, op, b);
        built.push({ op, b });
      } catch (err: any) {
        if (err instanceof ErrorHandler) throw new ErrorHandler(`Operation ${i + 1}: ${err.message}`, err.statusCode);
        throw err;
      }
    }

    const planned: PlannedOperation[] = built.map(({ op, b }, index) => ({
      index,
      title: b.title,
      origin: "origin" in op ? op.origin : undefined,
      risk: b.risk,
      table: b.table,
      statements: b.statements,
      backupStatements: b.backupStatements,
      backups: b.backups,
      undoStatements: b.undoStatements,
      undoNote: b.undoNote,
      checks: [],
      impact: b.impact,
      heavy: b.heavy,
      rowEstimate: b.rowEstimate,
      notes: b.notes,
      dryRun: { status: "not_run" },
      verify: b.verify,
    }));

    const started = Date.now();
    let dryRunMessage = "";
    await withTargetConnection(
      targetKey,
      async (client) => {
        const q = async (sql: string, params?: unknown[]) => (await client.query(sql, params as any[])).rows;
        await client.query("BEGIN; SET LOCAL statement_timeout = '30s'; SET LOCAL lock_timeout = '3s'");
        try {
          let stopped = false;
          for (const [i, { b }] of built.entries()) {
            const p = planned[i];
            // Pre-flight checks against the state left by earlier operations.
            for (const [ci, check] of b.checks.entries()) {
              try {
                p.checks.push(await savepoint(client, `chk_${i}_${ci}`, () => check(q)));
              } catch (err: any) {
                p.checks.push({
                  status: "warn",
                  label: "Check could not run",
                  message: `${friendlyPgError(err)} — this point is covered by the dry run only.`,
                });
              }
            }
            if (!p.checks.length) p.checks.push({ status: "pass", label: "Pre-flight", message: "Nothing to check for this operation." });
            for (const c of p.checks) {
              if (c.expectedRows !== undefined) p.expectedRows = c.expectedRows;
              if (c.preview) {
                p.preview = c.preview;
                delete c.preview; // keep previews out of check messages (and the AI prompt)
              }
            }

            if (!opts.dryRun) continue;
            if (stopped) {
              p.dryRun = { status: "not_run", message: "An earlier operation failed or was blocked." };
              continue;
            }
            if (p.checks.some((c) => c.status === "fail")) {
              p.dryRun = { status: "not_run", message: "Blocked by a failed check." };
              stopped = true;
              continue;
            }
            if (b.heavy && b.rowEstimate > DRY_RUN_HEAVY_ROWS) {
              p.dryRun = {
                status: "skipped",
                message: `Not dry-run: it would lock ~${b.rowEstimate.toLocaleString()} rows during review. Pre-flight checks cover it; apply still runs in a transaction.`,
              };
              continue;
            }
            const t0 = Date.now();
            try {
              await savepoint(client, `dry_${i}`, async () => {
                for (const sql of [...b.backupStatements, ...b.statements]) await client.query(sql);
              });
              p.dryRun = { status: "passed", durationMs: Date.now() - t0 };
            } catch (err: any) {
              p.dryRun = { status: "failed", message: friendlyPgError(err), durationMs: Date.now() - t0 };
              dryRunMessage = `Operation ${i + 1} failed in the dry run: ${friendlyPgError(err)}`;
              stopped = true;
            }
          }
        } finally {
          await client.query("ROLLBACK").catch(() => undefined);
        }
      },
      { queryTimeoutMs: 120_000 },
    );

    const checks = planned.flatMap((p) => p.checks);
    const blockers = checks.filter((c) => c.status === "fail").length;
    const warnings = checks.filter((c) => c.status === "warn").length;
    const dryStatuses = planned.map((p) => p.dryRun.status);
    const dryRunStatus: PlanResult["dryRun"]["status"] = !opts.dryRun
      ? "not_run"
      : dryStatuses.includes("failed")
        ? "failed"
        : dryStatuses.every((s) => s === "passed")
          ? "passed"
          : "partial";
    const destructive = planned.filter((p) => p.risk === "destructive").length;
    const isProtected = isProtectedDatabase(target.database);
    const reasonsBlocked: string[] = [];
    if (blockers) reasonsBlocked.push(`${blockers} pre-flight check(s) failed.`);
    if (dryRunStatus === "failed") reasonsBlocked.push(dryRunMessage || "The dry run failed.");

    const result: Omit<PlanResult, "plannedAt"> = {
      targetKey,
      targetDatabase: target.database,
      targetLabel: target.label,
      isProtected,
      serverVersion: snapshot.serverVersion,
      operations: planned,
      summary: {
        risk: planned.reduce<Risk>((r, p) => (RISK_RANK[p.risk] > RISK_RANK[r] ? p.risk : r), "safe"),
        impactLevel: planned.reduce<ImpactLevel>((l, p) => (IMPACT_RANK[p.impact.level] > IMPACT_RANK[l] ? p.impact.level : l), "none"),
        blockers,
        warnings,
        destructive,
        backups: planned.reduce((n, p) => n + p.backups.length, 0),
        requiresApproval: isProtected,
        requiresTypedConfirmation: isProtected || destructive > 0,
        canApply: reasonsBlocked.length === 0,
        reasonsBlocked,
      },
      dryRun: {
        status: dryRunStatus,
        message:
          dryRunStatus === "passed"
            ? "Every statement ran successfully inside a transaction that was then rolled back."
            : dryRunStatus === "partial"
              ? "Statements that were dry-run succeeded; some were skipped (see each operation)."
              : dryRunStatus === "failed"
                ? dryRunMessage
                : "Not run.",
        durationMs: Date.now() - started,
      },
      sql: displaySql(planned, target.database),
      undoSql: displayUndo(planned),
      backupPrefix: opts.backupPrefix,
      codeIndex: (() => {
        const info = impactIndexInfo();
        return { generatedAt: info.generatedAt, missingRepos: info.missingRepos };
      })(),
    };
    return { ...result, plannedAt: new Date().toISOString() };
  }

  private newBackupPrefix() {
    const d = new Date();
    const stamp = `${String(d.getUTCFullYear()).slice(2)}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(d.getUTCDate()).padStart(2, "0")}${String(d.getUTCHours()).padStart(2, "0")}${String(d.getUTCMinutes()).padStart(2, "0")}`;
    return `_sb_${stamp}_${randomBytes(2).toString("hex")}`;
  }

  async preview(targetKey: string, rawOperations: unknown) {
    const inputs = stripUntrusted(rawOperations);
    const { snapshot } = await getTargetSnapshot(targetKey, [], true);
    const ops = await this.resolveOperations(inputs, snapshot);
    return this.planResolved(targetKey, ops, { backupPrefix: this.newBackupPrefix(), dryRun: true, snapshot });
  }

  async create(input: { targetKey: string; operations: unknown; title: unknown; reason: unknown; actorUserId: string }) {
    const title = String(input.title ?? "").trim();
    if (title.length < 3 || title.length > 200) throw new ErrorHandler("Give the change a short title (3–200 characters).", 400);
    const reason = String(input.reason ?? "").trim().slice(0, 4000) || null;

    const inputs = stripUntrusted(input.operations);
    const { snapshot } = await getTargetSnapshot(input.targetKey, [], true);
    const ops = await this.resolveOperations(inputs, snapshot);
    const plan = await this.planResolved(input.targetKey, ops, { backupPrefix: this.newBackupPrefix(), dryRun: true, snapshot });
    if (!plan.summary.canApply) {
      throw new ErrorHandler(`This change can't be submitted: ${plan.summary.reasonsBlocked.join(" ")}`, 409);
    }
    return this.persist({ title, reason, ops, plan, actorUserId: input.actorUserId, kind: "change", revertOfId: null });
  }

  private async persist(input: {
    title: string;
    reason: string | null;
    ops: ResolvedOperation[];
    plan: PlanResult;
    actorUserId: string;
    kind: "change" | "revert";
    revertOfId: string | null;
  }) {
    const { plan } = input;
    const request = await SchemaChangeRequest.create({
      title: input.title,
      reason: input.reason,
      kind: input.kind,
      revertOfId: input.revertOfId,
      targetKey: plan.targetKey,
      targetDatabase: plan.targetDatabase,
      isProtected: plan.isProtected,
      operations: input.ops,
      plan,
      planHash: hashPlan(plan),
      riskLevel: plan.summary.risk,
      status: plan.isProtected ? SchemaChangeStatus.PENDING_APPROVAL : SchemaChangeStatus.READY,
      createdById: input.actorUserId,
      createdByEmail: await actorEmail(input.actorUserId),
    });
    await audit(input.kind === "revert" ? "SCHEMA_CHANGE_REVERT_REQUESTED" : "SCHEMA_CHANGE_REQUESTED", input.actorUserId, request, {
      operations: plan.operations.map((o) => o.title),
    });
    logger.info(`Schema change ${request.id} (${request.status}) created for ${plan.targetDatabase} by ${input.actorUserId}`);
    return request;
  }

  async list(status?: string) {
    await this.expireStale();
    const where = status ? { status } : {};
    const rows = await SchemaChangeRequest.findAll({
      where,
      order: [["createdAt", "DESC"]],
      limit: 200,
      attributes: { exclude: ["plan", "operations", "executionLog", "verification"] },
    });
    return rows;
  }

  async get(id: string) {
    await this.expireStale();
    const request = await SchemaChangeRequest.findByPk(id);
    if (!request) throw new ErrorHandler("Schema change not found.", 404);
    return request;
  }

  // A crashed/restarted server can't leave a request "running" forever —
  // PostgreSQL rolled its transaction back when the connection dropped.
  private async expireStale() {
    await SchemaChangeRequest.update(
      {
        status: SchemaChangeStatus.FAILED,
        error: "Interrupted (the server stopped while applying). PostgreSQL rolled the transaction back — nothing was changed.",
      },
      {
        where: {
          status: SchemaChangeStatus.RUNNING,
          updatedAt: { [Op.lt]: new Date(Date.now() - STALE_RUNNING_MS) },
        },
      },
    ).catch((err) => logger.warn(`expireStale failed: ${err?.message}`));
  }

  // Re-plans a stored request. If anything material changed, the stored plan
  // is replaced and the caller is told to review again.
  private async replan(request: SchemaChangeRequest, dryRun: boolean) {
    const ops = request.operations as ResolvedOperation[];
    const backupPrefix = (request.plan as unknown as PlanResult).backupPrefix;
    const plan = await this.planResolved(request.targetKey, ops, { backupPrefix, dryRun });
    const hash = hashPlan(plan);
    return { plan, hash, changed: hash !== request.planHash };
  }

  // Master-key approvals: limit guessing per admin.
  private masterKeyFailures = new Map<string, { count: number; lockedUntil: number }>();

  private async checkMasterKey(actorUserId: string, masterKey: string, request: SchemaChangeRequest) {
    const MAX_FAILS = 5;
    const LOCK_MS = 15 * 60 * 1000;
    const state = this.masterKeyFailures.get(actorUserId);
    if (state && state.lockedUntil > Date.now()) {
      const minutes = Math.ceil((state.lockedUntil - Date.now()) / 60000);
      throw new ErrorHandler(`Too many wrong master keys. Try again in ${minutes} minute(s), or ask another admin to approve.`, 429);
    }
    const ok = await SettingService.verifyMasterPassword(String(masterKey ?? "")).catch(() => false);
    if (!ok) {
      const count = (state && state.lockedUntil <= Date.now() && state.count >= MAX_FAILS ? 0 : state?.count ?? 0) + 1;
      this.masterKeyFailures.set(actorUserId, { count, lockedUntil: count >= MAX_FAILS ? Date.now() + LOCK_MS : 0 });
      await audit("SCHEMA_CHANGE_MASTER_KEY_FAILED", actorUserId, request, { attempt: count });
      throw new ErrorHandler(
        count >= MAX_FAILS
          ? "Wrong master key. Master-key approval is locked for 15 minutes."
          : `Wrong master key (${MAX_FAILS - count} attempt(s) left).`,
        403,
      );
    }
    this.masterKeyFailures.delete(actorUserId);
  }

  // A protected change is approved either by a different admin, or by any
  // admin (creator included) who provides the master key — recorded as such.
  async approve(id: string, actorUserId: string, opts: { masterKey?: string; host?: string } = {}) {
    const request = await this.get(id);
    if (request.status !== SchemaChangeStatus.PENDING_APPROVAL) {
      throw new ErrorHandler(`Only changes waiting for approval can be approved (this one is ${request.status}).`, 409);
    }
    const viaMasterKey = opts.masterKey !== undefined && opts.masterKey !== null && opts.masterKey !== "";
    if (viaMasterKey) {
      await this.checkMasterKey(actorUserId, opts.masterKey!, request);
    } else if (request.createdById === actorUserId) {
      throw new ErrorHandler("A different admin must approve this change — you created it. Or approve it with the master key.", 403);
    }
    const { plan, hash, changed } = await this.replan(request, true);
    if (changed || !plan.summary.canApply) {
      await request.update({ plan, planHash: hash, riskLevel: plan.summary.risk });
      throw new ErrorHandler(
        plan.summary.canApply
          ? "The database or the code changed since this was requested — the review has been refreshed. Please review it again before approving."
          : `This change can no longer be applied: ${plan.summary.reasonsBlocked.join(" ")}`,
        409,
      );
    }
    const approverEmail = await actorEmail(actorUserId);
    await request.update({
      status: SchemaChangeStatus.APPROVED,
      approvedById: actorUserId,
      approvedByEmail: approverEmail,
      approvedAt: new Date(),
      approvalMethod: viaMasterKey ? "master_key" : "second_admin",
      plan,
    });
    await audit(viaMasterKey ? "SCHEMA_CHANGE_APPROVED_MASTER_KEY" : "SCHEMA_CHANGE_APPROVED", actorUserId, request, {
      approvalMethod: viaMasterKey ? "master_key" : "second_admin",
    });
    if (viaMasterKey) {
      SettingService.notifyMasterPasswordUse(
        opts.host || "localhost",
        `🔑 *MASTER KEY USED TO APPROVE A DATABASE CHANGE* 🔑\n\n` +
          `Change: ${request.title}\nDatabase: ${request.targetDatabase}\n` +
          `Approved by: ${approverEmail || actorUserId} (no second admin review)\n` +
          `Operations: ${(request.plan as unknown as PlanResult).operations?.length ?? "?"}`,
        { id: actorUserId, email: approverEmail },
      )?.catch?.(() => undefined);
    }
    return request;
  }

  async reject(id: string, actorUserId: string, reason: unknown) {
    const request = await this.get(id);
    if (![SchemaChangeStatus.PENDING_APPROVAL, SchemaChangeStatus.APPROVED].includes(request.status)) {
      throw new ErrorHandler(`This change is ${request.status} and can't be rejected.`, 409);
    }
    const text = String(reason ?? "").trim();
    if (text.length < 3) throw new ErrorHandler("Say briefly why it's rejected.", 400);
    await request.update({ status: SchemaChangeStatus.REJECTED, rejectedById: actorUserId, rejectedReason: text.slice(0, 2000) });
    await audit("SCHEMA_CHANGE_REJECTED", actorUserId, request, { reason: text });
    return request;
  }

  async cancel(id: string, actorUserId: string) {
    const request = await this.get(id);
    if (![SchemaChangeStatus.READY, SchemaChangeStatus.PENDING_APPROVAL, SchemaChangeStatus.APPROVED].includes(request.status)) {
      throw new ErrorHandler(`This change is ${request.status} and can't be cancelled.`, 409);
    }
    await request.update({ status: SchemaChangeStatus.CANCELLED });
    await audit("SCHEMA_CHANGE_CANCELLED", actorUserId, request);
    return request;
  }

  async apply(id: string, actorUserId: string, confirmation: unknown) {
    const request = await this.get(id);
    const expected = request.isProtected ? SchemaChangeStatus.APPROVED : SchemaChangeStatus.READY;
    if (request.status !== expected) {
      throw new ErrorHandler(
        request.isProtected && request.status === SchemaChangeStatus.PENDING_APPROVAL
          ? "This change targets a protected database and still needs a second admin's approval."
          : `This change is ${request.status} and can't be applied.`,
        409,
      );
    }
    const storedPlan = request.plan as unknown as PlanResult;
    if (storedPlan.summary.requiresTypedConfirmation && String(confirmation ?? "").trim() !== request.targetDatabase) {
      throw new ErrorHandler(`Type the database name "${request.targetDatabase}" to confirm.`, 400);
    }

    // Claim it atomically — a double click or a second admin can't run it twice.
    const [claimed] = await SchemaChangeRequest.update(
      { status: SchemaChangeStatus.RUNNING, appliedById: actorUserId, appliedByEmail: await actorEmail(actorUserId) },
      { where: { id, status: expected } },
    );
    if (!claimed) throw new ErrorHandler("Someone else is already applying or has changed this request — refresh.", 409);

    try {
      // Re-validate against the live database. The dry run is part of it:
      // later operations' checks must see the state earlier ones create (e.g.
      // a foreign key on a table made by step 1) exactly as at review time.
      const { plan, hash, changed } = await this.replan(request, true);
      if (changed || !plan.summary.canApply) {
        await request.update({
          status: request.isProtected ? SchemaChangeStatus.PENDING_APPROVAL : SchemaChangeStatus.READY,
          plan,
          planHash: hash,
          approvedById: null,
          approvedByEmail: null,
          approvedAt: null,
        });
        throw new ErrorHandler(
          plan.summary.canApply
            ? `The database or the code changed since this was reviewed, so nothing was applied. The review has been refreshed${request.isProtected ? " and needs approval again" : ""}.`
            : `Nothing was applied — the change is no longer safe: ${plan.summary.reasonsBlocked.join(" ")}`,
          409,
        );
      }

      const log: { op: number; sql: string; durationMs: number; ok: boolean; error?: string }[] = [];
      let failure: string | null = null;
      await withTargetConnection(
        request.targetKey,
        async (client) => {
          await client.query(
            `BEGIN; SET LOCAL lock_timeout = '5s'; SET LOCAL statement_timeout = '${APPLY_STATEMENT_TIMEOUT_MS}'`,
          );
          try {
            const locked = await client.query("SELECT pg_try_advisory_xact_lock(hashtext($1)) AS ok", [ADVISORY_LOCK_KEY]);
            if (!locked.rows[0]?.ok) throw new Error("Another schema change is being applied to this database right now.");
            for (const op of plan.operations) {
              const mainStatement = op.statements[op.statements.length - 1];
              for (const sql of [...op.backupStatements, ...op.statements]) {
                const t0 = Date.now();
                try {
                  const res = await client.query(sql);
                  // A DELETE must remove exactly the rows that were reviewed.
                  if (op.expectedRows !== undefined && sql === mainStatement && res.rowCount !== op.expectedRows) {
                    throw new Error(
                      `Expected to delete ${op.expectedRows} row(s) but ${res.rowCount} matched — the data changed since the review.`,
                    );
                  }
                  log.push({ op: op.index, sql, durationMs: Date.now() - t0, ok: true });
                } catch (err: any) {
                  log.push({ op: op.index, sql, durationMs: Date.now() - t0, ok: false, error: friendlyPgError(err) });
                  throw err;
                }
              }
            }
            await client.query("COMMIT");
          } catch (err: any) {
            await client.query("ROLLBACK").catch(() => undefined);
            failure = friendlyPgError(err);
          }
        },
        { queryTimeoutMs: APPLY_STATEMENT_TIMEOUT_MS + 30_000 },
      );

      if (failure) {
        await request.update({
          status: SchemaChangeStatus.FAILED,
          error: `${failure} The transaction was rolled back — the database is unchanged.`,
          executionLog: log,
        });
        await audit("SCHEMA_CHANGE_FAILED", actorUserId, request, { error: failure });
        return request;
      }

      // Verify against a fresh read.
      invalidateTargetSnapshots(request.targetKey);
      const verification = await this.verify(request.targetKey, plan.operations).catch((err) => [
        { ok: false, message: `Could not verify: ${err?.message}` },
      ]);
      await request.update({
        status: SchemaChangeStatus.APPLIED,
        appliedAt: new Date(),
        executionLog: log,
        backups: plan.operations.flatMap((o) => o.backups),
        verification,
        plan,
        error: null,
      });
      await audit("SCHEMA_CHANGE_APPLIED", actorUserId, request, {
        backups: plan.operations.flatMap((o) => o.backups.map((b) => b.table)),
      });
      if (request.kind === "revert" && request.revertOfId) {
        await SchemaChangeRequest.update({ revertedById: request.id }, { where: { id: request.revertOfId } });
      }
      return request;
    } catch (err) {
      // Anything thrown before execution: release the claim.
      if ((await SchemaChangeRequest.findByPk(id))?.status === SchemaChangeStatus.RUNNING) {
        await SchemaChangeRequest.update(
          { status: request.isProtected ? SchemaChangeStatus.APPROVED : SchemaChangeStatus.READY },
          { where: { id, status: SchemaChangeStatus.RUNNING } },
        );
      }
      throw err;
    }
  }

  async verify(targetKey: string, ops: PlannedOperation[]) {
    const { snapshot } = await getTargetSnapshot(targetKey, [], true);
    const rel = (q: string) => snapshot.relations[q];
    const col = (q: string, c: string) => rel(q)?.columns.find((x) => x.name === c);
    const results: { op: number; ok: boolean; message: string }[] = [];
    // "X is gone" only holds if no LATER operation in the same change
    // re-creates X (e.g. drop a foreign key, re-add it with ON DELETE).
    const objectKey = (v: VerifySpec) =>
      "name" in v ? `${v.table}#${v.name}` : "column" in v ? `${v.table}.${v.column}` : "table" in v ? v.table : "";
    const recreatedLater = (opIndex: number, v: VerifySpec) =>
      ops.some(
        (later) =>
          later.index > opIndex &&
          later.verify.some((w) => objectKey(w) === objectKey(v) && w.type.replace("_exists", "") === v.type.replace("_absent", "") && w.type.endsWith("_exists")),
      );
    for (const op of ops) {
      for (const v of op.verify) {
        if (v.type.endsWith("_absent") && recreatedLater(op.index, v)) continue;
        let ok = false;
        let message = "";
        switch (v.type) {
          case "column_exists":
            ok = !!col(v.table, v.column) && (!v.dataType || col(v.table, v.column)!.type === v.dataType.replace(/^"public"\./, "").replace(/"/g, ""));
            message = ok ? `${v.table}.${v.column} exists${v.dataType ? ` as ${v.dataType}` : ""}` : `${v.table}.${v.column} is missing or has another type`;
            break;
          case "column_absent":
            ok = !col(v.table, v.column);
            message = ok ? `${v.table}.${v.column} is gone` : `${v.table}.${v.column} still exists`;
            break;
          case "column_nullable":
            ok = col(v.table, v.column)?.nullable === v.nullable;
            message = `${v.table}.${v.column} ${v.nullable ? "allows NULL" : "is NOT NULL"}${ok ? "" : " — NOT as expected"}`;
            break;
          case "column_default":
            ok = !!col(v.table, v.column)?.default === v.hasDefault;
            message = `${v.table}.${v.column} ${v.hasDefault ? "has a default" : "has no default"}${ok ? "" : " — NOT as expected"}`;
            break;
          case "table_exists":
            ok = !!rel(v.table);
            message = ok ? `${v.table} exists` : `${v.table} is missing`;
            break;
          case "table_absent":
            ok = !rel(v.table);
            message = ok ? `${v.table} is gone` : `${v.table} still exists`;
            break;
          case "index_exists":
          case "index_absent": {
            const has = !!rel(v.table)?.indexes.some((i) => i.name === v.name);
            ok = v.type === "index_exists" ? has : !has;
            message = `index ${v.name} ${has ? "exists" : "is absent"}`;
            break;
          }
          case "constraint_exists":
          case "constraint_absent": {
            const has = !!rel(v.table)?.constraints.some((c) => c.name === v.name);
            ok = v.type === "constraint_exists" ? has : !has;
            message = `constraint ${v.name} ${has ? "exists" : "is absent"}`;
            break;
          }
          case "enum_has_value":
            ok = !!snapshot.enums[v.enum]?.labels.includes(v.value);
            message = `${v.enum} ${ok ? "has" : "lacks"} '${v.value}'`;
            break;
          case "value_equals": {
            const [schemaName, ...rest] = v.table.split(".");
            const current = await withTargetConnection(
              targetKey,
              async (client) =>
                (await client.query(`SELECT ${quoteIdent(v.column)}::text AS v FROM ${qn(schemaName, rest.join("."))} WHERE ${v.where} LIMIT 1`)).rows[0]?.v ?? null,
              { queryTimeoutMs: 60_000 },
            );
            ok = (current ?? null) === v.value || String(current ?? "").trim() === String(v.value ?? "").trim();
            message = ok ? `${v.table}.${v.column} now has the new value` : `${v.table}.${v.column} doesn't have the expected value`;
            break;
          }
          case "rows_absent": {
            const [schemaName, ...rest] = v.table.split(".");
            const remaining = await withTargetConnection(
              targetKey,
              async (client) =>
                Number(
                  (await client.query(`SELECT count(*)::bigint AS n FROM ${qn(schemaName, rest.join("."))} WHERE ${v.where}`)).rows[0]?.n ?? 0,
                ),
              { queryTimeoutMs: 60_000 },
            );
            ok = remaining === 0;
            message = ok ? `No ${v.description} remain in ${v.table}` : `${remaining} matching row(s) still in ${v.table}`;
            break;
          }
        }
        results.push({ op: op.index, ok, message });
      }
    }
    return results;
  }

  async createRevert(id: string, actorUserId: string) {
    const original = await this.get(id);
    if (original.status !== SchemaChangeStatus.APPLIED) throw new ErrorHandler("Only applied changes can be reverted.", 409);
    if (original.revertedById) throw new ErrorHandler("This change has already been reverted.", 409);
    const plan = original.plan as unknown as PlanResult;
    const reversible = [...plan.operations].reverse().filter((o) => o.undoStatements.length);
    if (!reversible.length) throw new ErrorHandler("None of these operations can be undone automatically — see the undo notes.", 409);

    const ops: ResolvedOperation[] = reversible.map((o) => ({
      kind: "trusted_sql",
      origin: `Revert of “${original.title}”`,
      title: `Undo: ${o.title}`,
      table: o.table,
      statements: o.undoStatements,
      undoStatements: [],
      impactKind: "revert",
      risk: "caution",
      verify: [],
    }));
    const revertPlan = await this.planResolved(original.targetKey, ops, { backupPrefix: this.newBackupPrefix(), dryRun: true });
    if (!revertPlan.summary.canApply) {
      throw new ErrorHandler(`The revert can't run safely: ${revertPlan.summary.reasonsBlocked.join(" ")}`, 409);
    }
    const skipped = plan.operations.length - reversible.length;
    return this.persist({
      title: `Revert: ${original.title}`.slice(0, 200),
      reason: skipped ? `${skipped} operation(s) have no automatic undo and are not included.` : null,
      ops,
      plan: revertPlan,
      actorUserId,
      kind: "revert",
      revertOfId: original.id,
    });
  }

  // Plain-English review of a plan by the system's AI. Only schema metadata
  // (names, SQL, check results, impact) is sent — never row data.
  async explain(plan: PlanResult) {
    let mod: typeof import("../../../utils/digital-factory");
    try {
      mod = await import("../../../utils/digital-factory");
    } catch {
      throw new ErrorHandler("The AI assistant is not configured on this server.", 503);
    }
    const lines = plan.operations.map((o) =>
      [
        `${o.index + 1}. ${o.title} [risk: ${o.risk}; code impact: ${o.impact.level}]`,
        `   SQL: ${o.statements.join(" ").slice(0, 400)}`,
        o.checks.length ? `   Checks: ${o.checks.map((c) => `${c.status.toUpperCase()} ${c.label}: ${c.message}`).join(" | ").slice(0, 600)}` : "",
        `   Impact: ${o.impact.headline}`,
        o.impact.endpoints.length ? `   Endpoints: ${o.impact.endpoints.slice(0, 8).map((e) => `${e.app} ${e.method} ${e.path}`).join(", ")}` : "",
        o.impact.screens.length ? `   Screens: ${o.impact.screens.slice(0, 10).map((s) => `${s.app}:${s.route}`).join(", ")}` : "",
        o.backups.length ? `   Backup: ${o.backups.map((b) => b.table).join(", ")}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
    );
    const prompt = [
      "You are a senior PostgreSQL DBA reviewing a schema change for a Node.js/Sequelize app with a staff portal and a customer portal.",
      `Target database: ${plan.targetDatabase}${plan.isProtected ? " (PRODUCTION)" : ""}. Dry run: ${plan.dryRun.status} — ${plan.dryRun.message}`,
      "",
      ...lines,
      "",
      "Explain to a non-DBA admin, in under 200 words: what this change does, what could go wrong for users of the screens listed, and the safest way/time to run it. Base everything strictly on the information above. Format for a narrow chat panel: start with a one-sentence answer, then short sections with a bold title line each, and bullet points under them. Do NOT use Markdown tables. Put SQL only in fenced ```sql code blocks with real line breaks. Keep it under 250 words.",
    ].join("\n");
    try {
      return (await mod.queryDigitalOceanAI(prompt, 1, false, 1200)).trim();
    } catch (err: any) {
      logger.error(`AI explain failed: ${err?.message}`);
      throw new ErrorHandler("The AI assistant could not answer right now. Try again in a moment.", 502);
    }
  }
}

export const schemaChangeService = new SchemaChangeService();
