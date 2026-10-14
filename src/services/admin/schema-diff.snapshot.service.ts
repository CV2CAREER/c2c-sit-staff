import { Client } from "pg";
import { QueryTypes } from "sequelize";
import {
  DATABASE_HOST,
  DATABASE_PASSWORD,
  DATABASE_PORT,
  DATABASE_USERNAME,
  NODE_ENV,
  SCHEMA_DIFF_EXCLUDE_DATABASES,
  SCHEMA_DIFF_EXTRA_TARGETS,
  SCHEMA_DIFF_STATEMENT_TIMEOUT,
} from "../../config/env";
import { getServiceLogger } from "../../utils/createLogger";
import ErrorHandler from "../../utils/errorHandler";
import { getSequelize } from "../../utils/sequelize";

// Read-only schema introspection for Admin > Database Evaluation.
//
// Safety rules, deliberately strict because one of the two sides is often
// PROD:
//   * credentials never leave the server — the UI only ever sees opaque
//     target keys; configured targets name the env var holding their
//     password rather than the password itself;
//   * every snapshot runs inside `BEGIN TRANSACTION READ ONLY` with a
//     `SET LOCAL statement_timeout`, then ROLLBACK — done per-transaction
//     instead of via startup `options` so it also works through pgbouncer;
//   * one short-lived Client per snapshot (no extra pools), and at most
//     MAX_CONCURRENT_SNAPSHOTS open at once, because every environment
//     shares the cluster's max_connections (see DB_POOL_MAX in env.ts).

const logger = getServiceLogger("schema-diff-snapshot");

const MAX_CONCURRENT_SNAPSHOTS = 2;
const CONNECT_TIMEOUT_MS = 20000;
const TARGETS_CACHE_MS = 60 * 1000;
const TARGET_KEY_REGEX = /^[a-zA-Z0-9_-]{1,64}$/;

// DigitalOcean convention: 25061 is the pgbouncer pool port, where the
// "database" is a pool name (e.g. iat-pool) rather than a real database —
// discovered databases (real names from pg_database) must go to the direct
// port instead.
const DO_POOL_PORT = 25061;
const DO_DIRECT_PORT = 25060;
const DIRECT_PORT =
  parseInt(process.env.SCHEMA_DIFF_DIRECT_PORT || "", 10) ||
  (DATABASE_PORT === DO_POOL_PORT ? DO_DIRECT_PORT : DATABASE_PORT);

export type TargetSource = "cluster" | "configured";

interface ResolvedTarget {
  key: string;
  label: string;
  database: string;
  host: string;
  port: number;
  username: string;
  password?: string;
  ssl: boolean;
  source: TargetSource;
  isCurrent: boolean;
  unavailableReason?: string;
}

export interface PublicTarget {
  key: string;
  label: string;
  database: string;
  hostHint: string;
  source: TargetSource;
  isCurrent: boolean;
  available: boolean;
  unavailableReason?: string;
}

export interface TargetsResult {
  targets: PublicTarget[];
  warnings: string[];
}

export type RelationKind =
  | "table"
  | "partitioned_table"
  | "view"
  | "materialized_view"
  | "foreign_table";

export interface ColumnSnap {
  name: string;
  type: string;
  nullable: boolean;
  default: string | null;
  identity: string | null;
  generated: string | null;
  position: number;
}

export type ConstraintType = "p" | "u" | "f" | "c" | "x" | "t" | "n";

export interface ConstraintSnap {
  name: string;
  type: ConstraintType;
  definition: string;
}

export interface IndexSnap {
  name: string;
  definition: string;
  unique: boolean;
  primary: boolean;
  constraintBacked: boolean;
}

export interface TriggerSnap {
  name: string;
  definition: string;
}

export interface RelationSnap {
  schema: string;
  name: string;
  kind: RelationKind;
  rowEstimate: number;
  viewDefinition: string | null;
  columns: ColumnSnap[];
  constraints: ConstraintSnap[];
  indexes: IndexSnap[];
  triggers: TriggerSnap[];
}

export interface EnumSnap {
  schema: string;
  name: string;
  labels: string[];
}

export interface SchemaSnapshot {
  targetKey: string;
  label: string;
  database: string;
  serverVersion: string;
  availableSchemas: string[];
  schemas: string[];
  relations: Record<string, RelationSnap>;
  enums: Record<string, EnumSnap>;
  extensions: Record<string, string>;
  capturedAt: string;
  durationMs: number;
}

export const qualify = (schema: string, name: string) => `${schema}.${name}`;

const RELKIND: Record<string, RelationKind> = {
  r: "table",
  p: "partitioned_table",
  v: "view",
  m: "materialized_view",
  f: "foreign_table",
};

const hostHint = (host: string) => host.split(".")[0] || host;

const useSsl = NODE_ENV !== "local";

// --- concurrency guard -------------------------------------------------------

let activeSnapshots = 0;
const waiters: (() => void)[] = [];

const acquireSlot = async () => {
  if (activeSnapshots < MAX_CONCURRENT_SNAPSHOTS) {
    activeSnapshots++;
    return;
  }
  await new Promise<void>((resolve) => waiters.push(resolve));
  activeSnapshots++;
};

const releaseSlot = () => {
  activeSnapshots--;
  const next = waiters.shift();
  if (next) next();
};

// --- friendly errors ---------------------------------------------------------

// Turns low-level pg/network errors into something an admin can act on.
// Raw messages are still logged server-side.
export const toFriendlyDbError = (err: any, label: string): ErrorHandler => {
  const code = err?.code as string | undefined;
  const msg = String(err?.message || err || "Unknown error");

  let friendly: string;
  if (code === "28P01" || code === "28000") {
    friendly = `Authentication failed for "${label}". Check the username/password configured for this database.`;
  } else if (code === "3D000") {
    friendly = `Database "${label}" does not exist on that server (or was renamed).`;
  } else if (code === "42501") {
    friendly = `The configured user is not allowed to read the catalog of "${label}". Grant CONNECT/USAGE or use a different user.`;
  } else if (code === "57014" || /statement timeout/i.test(msg)) {
    friendly = `Reading the schema of "${label}" took too long and was cancelled. Try narrowing the schema filter, or raise SCHEMA_DIFF_STATEMENT_TIMEOUT.`;
  } else if (code === "53300" || /too many connections|remaining connection slots/i.test(msg)) {
    friendly = `The database server for "${label}" has no free connection slots right now. Wait a moment and retry.`;
  } else if (code === "ENOTFOUND" || code === "EAI_AGAIN") {
    friendly = `The host for "${label}" could not be resolved. The cluster may have been retired or renamed.`;
  } else if (code === "ECONNREFUSED" || code === "ECONNRESET" || code === "EHOSTUNREACH") {
    friendly = `Could not reach the server for "${label}" (${code}). Check that it is running and this backend's IP is in its trusted sources.`;
  } else if (/query read timeout/i.test(msg)) {
    friendly = `Reading "${label}" took too long (the database server is slow or busy right now). Try again in a moment.`;
  } else if (/timeout/i.test(msg)) {
    friendly = `Connecting to "${label}" timed out. Check network access / trusted sources for this backend.`;
  } else {
    friendly = `Could not read the schema of "${label}": ${msg}`;
  }

  logger.warn(`[${label}] ${code || "no-code"}: ${msg}`);
  return new ErrorHandler(friendly, 502);
};

// --- target discovery --------------------------------------------------------

let targetsCache: { at: number; targets: ResolvedTarget[]; warnings: string[] } | null =
  null;

const parseConfiguredTargets = (warnings: string[]): ResolvedTarget[] => {
  if (!SCHEMA_DIFF_EXTRA_TARGETS.trim()) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(SCHEMA_DIFF_EXTRA_TARGETS);
  } catch {
    warnings.push("SCHEMA_DIFF_EXTRA_TARGETS is not valid JSON — extra databases were skipped.");
    return [];
  }
  if (!Array.isArray(parsed)) {
    warnings.push("SCHEMA_DIFF_EXTRA_TARGETS must be a JSON array — extra databases were skipped.");
    return [];
  }

  const out: ResolvedTarget[] = [];
  parsed.forEach((raw: any, index) => {
    const where = `SCHEMA_DIFF_EXTRA_TARGETS[${index}]`;
    if (!raw || typeof raw !== "object") {
      warnings.push(`${where} is not an object — skipped.`);
      return;
    }
    const { key, label, host, port, database, username, passwordEnv, ssl } = raw;
    if (typeof key !== "string" || !TARGET_KEY_REGEX.test(key)) {
      warnings.push(`${where} needs a "key" of letters, digits, _ or - — skipped.`);
      return;
    }
    if (!host || !database || !username) {
      warnings.push(`${where} ("${key}") needs host, database and username — skipped.`);
      return;
    }
    const password = passwordEnv ? process.env[String(passwordEnv)] : undefined;
    out.push({
      key: `cfg:${key}`,
      label: String(label || key),
      database: String(database),
      host: String(host),
      port: Number(port) || DO_DIRECT_PORT,
      username: String(username),
      password,
      ssl: ssl === undefined ? true : Boolean(ssl),
      source: "configured",
      isCurrent: false,
      unavailableReason: password
        ? undefined
        : passwordEnv
          ? `Env var ${passwordEnv} is not set on this server.`
          : `No passwordEnv configured.`,
    });
  });
  return out;
};

const discoverClusterTargets = async (warnings: string[]): Promise<ResolvedTarget[]> => {
  try {
    const rows = (await getSequelize().query(
      `SELECT d.datname::text AS name,
              (d.datname = current_database()) AS is_current
       FROM   pg_database d
       WHERE  d.datallowconn
         AND  NOT d.datistemplate
         AND  has_database_privilege(d.datname, 'CONNECT')
       ORDER BY d.datname`,
      { type: QueryTypes.SELECT },
    )) as { name: string; is_current: boolean }[];

    const excluded = new Set(SCHEMA_DIFF_EXCLUDE_DATABASES.map((d) => d.toLowerCase()));
    return rows
      .filter((r) => r.is_current || !excluded.has(r.name.toLowerCase()))
      .map((r) => ({
        key: `db:${r.name}`,
        label: r.is_current ? `${r.name} (this server)` : r.name,
        database: r.name,
        host: DATABASE_HOST!,
        port: DIRECT_PORT,
        username: DATABASE_USERNAME!,
        password: DATABASE_PASSWORD,
        ssl: useSsl,
        source: "cluster" as const,
        isCurrent: r.is_current,
      }));
  } catch (err: any) {
    logger.error(`Database discovery failed: ${err?.message}`);
    warnings.push(
      "Could not list databases on the current cluster — only explicitly configured databases are shown.",
    );
    return [];
  }
};

const loadTargets = async (force = false) => {
  if (!force && targetsCache && Date.now() - targetsCache.at < TARGETS_CACHE_MS) {
    return targetsCache;
  }
  const warnings: string[] = [];
  const [cluster, configured] = await Promise.all([
    discoverClusterTargets(warnings),
    Promise.resolve(parseConfiguredTargets(warnings)),
  ]);

  // A configured entry pointing at the same host/db as a discovered one
  // would show up twice — keep the configured one (it has the nicer label).
  const configuredIds = new Set(configured.map((t) => `${t.host}|${t.database}`));
  const targets = [
    ...cluster.filter((t) => !configuredIds.has(`${t.host}|${t.database}`)),
    ...configured,
  ];

  targetsCache = { at: Date.now(), targets, warnings };
  return targetsCache;
};

export const listTargets = async (force = false): Promise<TargetsResult> => {
  const { targets, warnings } = await loadTargets(force);
  return {
    warnings,
    targets: targets.map((t) => ({
      key: t.key,
      label: t.label,
      database: t.database,
      hostHint: hostHint(t.host),
      source: t.source,
      isCurrent: t.isCurrent,
      available: !t.unavailableReason,
      unavailableReason: t.unavailableReason,
    })),
  };
};

export const resolveTarget = async (key: string): Promise<ResolvedTarget> => {
  if (typeof key !== "string" || !key) {
    throw new ErrorHandler("A database must be selected on both sides.", 400);
  }
  let { targets } = await loadTargets();
  let target = targets.find((t) => t.key === key);
  if (!target) {
    // Could be a database created since the cache was filled.
    ({ targets } = await loadTargets(true));
    target = targets.find((t) => t.key === key);
  }
  if (!target) {
    throw new ErrorHandler(`Unknown database "${key}". Refresh the page and pick again.`, 404);
  }
  if (target.unavailableReason) {
    throw new ErrorHandler(`"${target.label}" is not usable: ${target.unavailableReason}`, 400);
  }
  return target;
};

// --- introspection -----------------------------------------------------------

const withReadOnlyClient = async <T>(
  target: ResolvedTarget,
  fn: (client: Client) => Promise<T>,
): Promise<T> => {
  await acquireSlot();
  const client = new Client({
    host: target.host,
    port: target.port,
    database: target.database,
    user: target.username,
    password: target.password,
    ssl: target.ssl ? { rejectUnauthorized: false } : undefined,
    connectionTimeoutMillis: CONNECT_TIMEOUT_MS,
    // Client-side backstop in case the server-side timeout is ignored (e.g.
    // by a proxy). It also covers TRANSFER time: the catalog queries finish in
    // milliseconds on the server, but a large catalog (~0.5 MB for c2c_iat,
    // mostly duplicate Sequelize constraints) can take a minute or more over
    // a slow link from a laptop. statement_timeout still caps server work.
    query_timeout: Math.max(SCHEMA_DIFF_STATEMENT_TIMEOUT + 5000, 180_000),
    application_name: "c2c-staff-schema-compare",
  });
  // An idle-connection error after we're done must not crash the process.
  client.on("error", (err) => logger.warn(`[${target.label}] client error: ${err.message}`));

  try {
    await client.connect();
    // One round trip: simple-protocol multi-statement.
    await client.query(
      `BEGIN TRANSACTION READ ONLY; SET LOCAL statement_timeout = ${Math.max(1000, SCHEMA_DIFF_STATEMENT_TIMEOUT)}`,
    );
    try {
      return await fn(client);
    } finally {
      await client.query("ROLLBACK").catch(() => undefined);
    }
  } catch (err) {
    if (err instanceof ErrorHandler) throw err;
    throw toFriendlyDbError(err, target.label);
  } finally {
    await client.end().catch(() => undefined);
    releaseSlot();
  }
};

// A connected client with NO transaction started — for Database Modifications, which
// manages its own transactions (dry run = BEGIN … ROLLBACK, apply = BEGIN …
// COMMIT). Shares the snapshot slot limit and the friendly error mapping.
export const withTargetConnection = async <T>(
  key: string,
  fn: (client: Client, target: { key: string; label: string; database: string }) => Promise<T>,
  options: { queryTimeoutMs: number },
): Promise<T> => {
  const target = await resolveTarget(key);
  await acquireSlot();
  const client = new Client({
    host: target.host,
    port: target.port,
    database: target.database,
    user: target.username,
    password: target.password,
    ssl: target.ssl ? { rejectUnauthorized: false } : undefined,
    connectionTimeoutMillis: CONNECT_TIMEOUT_MS,
    query_timeout: options.queryTimeoutMs,
    application_name: "c2c-staff-schema-changes",
  });
  client.on("error", (err) => logger.warn(`[${target.label}] client error: ${err.message}`));
  try {
    await client.connect();
    return await fn(client, { key: target.key, label: target.label, database: target.database });
  } catch (err) {
    if (err instanceof ErrorHandler) throw err;
    throw toFriendlyDbError(err, target.label);
  } finally {
    await client.end().catch(() => undefined);
    releaseSlot();
  }
};

export const pingTarget = async (key: string) => {
  const target = await resolveTarget(key);
  const started = Date.now();
  return withReadOnlyClient(target, async (client) => {
    const { rows } = await client.query(
      `SELECT current_database() AS database, current_setting('server_version') AS version,
              (SELECT count(*)::int FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
               WHERE c.relkind IN ('r','p') AND n.nspname = 'public') AS public_tables`,
    );
    return {
      key: target.key,
      label: target.label,
      database: rows[0].database as string,
      serverVersion: rows[0].version as string,
      publicTables: rows[0].public_tables as number,
      latencyMs: Date.now() - started,
    };
  });
};

// Shared WHERE clause: user schemas only, optionally narrowed to $1, and
// never objects owned by an extension (postgis etc. would be pure noise).
const SYSTEM_SCHEMA_FILTER = `
  n.nspname NOT IN ('pg_catalog', 'information_schema')
  AND n.nspname NOT LIKE 'pg\\_toast%'
  AND n.nspname NOT LIKE 'pg\\_temp%'`;

// Round trips dominate when the cluster is far away (~400ms each from a
// laptop), so a snapshot is three queries: metadata, the relation list, and
// everything per-relation as JSON aggregates keyed by the relation OIDs.
const RELS_SQL = `
  SELECT c.oid::bigint AS oid, n.nspname::text AS schema, c.relname::text AS name, c.relkind::text AS relkind,
         GREATEST(c.reltuples, 0)::bigint AS row_estimate,
         CASE WHEN c.relkind IN ('v','m') THEN pg_get_viewdef(c.oid, true) END AS view_def
  FROM   pg_class c
  JOIN   pg_namespace n ON n.oid = c.relnamespace
  WHERE  c.relkind IN ('r','p','v','m','f')
    AND  NOT c.relispartition
    AND  ${SYSTEM_SCHEMA_FILTER}
    AND  (cardinality($1::text[]) = 0 OR n.nspname = ANY($1::text[]))
    AND  c.oid NOT IN (SELECT d.objid FROM pg_depend d
                       WHERE d.classid = 'pg_class'::regclass AND d.deptype = 'e')`;

// $1 = relation OIDs, $2 = schema filter (for enums).
const DETAILS_SQL = `
  WITH backing AS (
    -- indexes that exist only to back a PK/unique/exclusion constraint
    SELECT con.conindid FROM pg_constraint con
    WHERE  con.contype IN ('p','u','x') AND con.conrelid = ANY($1::oid[])
  )
  SELECT
    (SELECT COALESCE(json_agg(json_build_object(
              'oid', a.attrelid::bigint, 'name', a.attname, 'type', format_type(a.atttypid, a.atttypmod),
              'notnull', a.attnotnull, 'def', pg_get_expr(d.adbin, d.adrelid),
              'identity', NULLIF(a.attidentity::text, ''), 'generated', NULLIF(a.attgenerated::text, ''),
              'position', a.attnum) ORDER BY a.attrelid, a.attnum), '[]'::json)
     FROM pg_attribute a
     LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
     WHERE a.attrelid = ANY($1::oid[]) AND a.attnum > 0 AND NOT a.attisdropped) AS columns,
    -- Identical definitions are sent once with all their names: Sequelize
    -- bloat can repeat one UNIQUE constraint thousands of times on a table.
    (SELECT COALESCE(json_agg(json_build_object('oid', g.oid, 'type', g.type, 'def', g.def, 'names', g.names) ORDER BY g.oid, g.names[1]), '[]'::json)
     FROM (SELECT con.conrelid::bigint AS oid, con.contype::text AS type, pg_get_constraintdef(con.oid, true) AS def,
                  array_agg(con.conname::text ORDER BY length(con.conname), con.conname) AS names
           FROM pg_constraint con
           WHERE con.conrelid = ANY($1::oid[])
           GROUP BY 1, 2, 3) g) AS constraints,
    (SELECT COALESCE(json_agg(json_build_object(
              -- Indexes that only back a constraint are described by the
              -- constraint itself; skipping their (slow) deparse matters when
              -- a table carries thousands of duplicate Sequelize constraints.
              'oid', i.indrelid::bigint, 'name', ic.relname,
              'def', CASE WHEN i.indexrelid IN (SELECT conindid FROM backing) THEN '' ELSE pg_get_indexdef(i.indexrelid) END,
              'unique', i.indisunique, 'primary', i.indisprimary,
              'backed', i.indexrelid IN (SELECT conindid FROM backing)) ORDER BY i.indrelid, ic.relname), '[]'::json)
     FROM pg_index i
     JOIN pg_class ic ON ic.oid = i.indexrelid
     WHERE i.indrelid = ANY($1::oid[])) AS indexes,
    (SELECT COALESCE(json_agg(json_build_object(
              'oid', t.tgrelid::bigint, 'name', t.tgname, 'def', pg_get_triggerdef(t.oid, true))
              ORDER BY t.tgrelid, t.tgname), '[]'::json)
     FROM pg_trigger t
     WHERE t.tgrelid = ANY($1::oid[]) AND NOT t.tgisinternal) AS triggers,
    (SELECT COALESCE(json_agg(json_build_object('schema', x.schema, 'name', x.name, 'labels', x.labels)), '[]'::json)
     FROM (SELECT n.nspname::text AS schema, t.typname::text AS name,
                  array_agg(e.enumlabel::text ORDER BY e.enumsortorder) AS labels
           FROM   pg_type t
           JOIN   pg_enum e ON e.enumtypid = t.oid
           JOIN   pg_namespace n ON n.oid = t.typnamespace
           WHERE  ${SYSTEM_SCHEMA_FILTER}
             AND  (cardinality($2::text[]) = 0 OR n.nspname = ANY($2::text[]))
             AND  t.oid NOT IN (SELECT d.objid FROM pg_depend d
                                WHERE d.classid = 'pg_type'::regclass AND d.deptype = 'e')
           GROUP BY n.nspname, t.typname) x) AS enums`;

const META_SQL = `
  SELECT current_setting('server_version') AS version,
         (SELECT COALESCE(array_agg(n.nspname::text ORDER BY n.nspname), '{}')
          FROM pg_namespace n
          WHERE ${SYSTEM_SCHEMA_FILTER}
            AND n.oid NOT IN (SELECT d.objid FROM pg_depend d
                              WHERE d.classid = 'pg_namespace'::regclass AND d.deptype = 'e')) AS schemas,
         (SELECT COALESCE(json_object_agg(extname, extversion), '{}'::json) FROM pg_extension) AS extensions`;

export const captureSnapshot = async (
  key: string,
  schemas: string[],
): Promise<SchemaSnapshot> => {
  const target = await resolveTarget(key);
  const started = Date.now();

  return withReadOnlyClient(target, async (client) => {
    const meta = (await client.query(META_SQL)).rows[0];
    const rels = await client.query(RELS_SQL, [schemas]);
    const oids = rels.rows.map((r) => String(r.oid));
    const details = (await client.query(DETAILS_SQL, [oids, schemas])).rows[0];

    // Assemble
    const byOid = new Map<string, RelationSnap>();
    const relations: Record<string, RelationSnap> = {};
    for (const r of rels.rows) {
      const rel: RelationSnap = {
        schema: r.schema,
        name: r.name,
        kind: RELKIND[r.relkind] || "table",
        rowEstimate: Number(r.row_estimate) || 0,
        viewDefinition: r.view_def ? String(r.view_def).trim() : null,
        columns: [],
        constraints: [],
        indexes: [],
        triggers: [],
      };
      byOid.set(String(r.oid), rel);
      relations[qualify(r.schema, r.name)] = rel;
    }
    for (const c of details.columns as any[]) {
      byOid.get(String(c.oid))?.columns.push({
        name: c.name,
        type: c.type,
        nullable: !c.notnull,
        default: c.def ?? null,
        identity: c.identity ?? null,
        generated: c.generated ?? null,
        position: Number(c.position),
      });
    }
    for (const c of details.constraints as any[]) {
      for (const name of c.names as string[]) {
        byOid.get(String(c.oid))?.constraints.push({
          name,
          type: c.type as ConstraintType,
          definition: c.def,
        });
      }
    }
    for (const rel of byOid.values()) rel.constraints.sort((a, b) => a.name.localeCompare(b.name));
    for (const i of details.indexes as any[]) {
      byOid.get(String(i.oid))?.indexes.push({
        name: i.name,
        definition: i.def,
        unique: Boolean(i.unique),
        primary: Boolean(i.primary),
        constraintBacked: Boolean(i.backed),
      });
    }
    for (const t of details.triggers as any[]) {
      byOid.get(String(t.oid))?.triggers.push({ name: t.name, definition: t.def });
    }

    const enumMap: Record<string, EnumSnap> = {};
    for (const e of details.enums as any[]) {
      enumMap[qualify(e.schema, e.name)] = {
        schema: e.schema,
        name: e.name,
        labels: Array.isArray(e.labels) ? e.labels : [],
      };
    }

    const extensions: Record<string, string> = { ...(meta.extensions || {}) };

    const durationMs = Date.now() - started;
    logger.info(
      `Snapshot of ${target.label}: ${rels.rowCount} relations, ${Object.keys(enumMap).length} enums in ${durationMs}ms`,
    );

    return {
      targetKey: target.key,
      label: target.label,
      database: target.database,
      serverVersion: meta.version,
      availableSchemas: Array.isArray(meta.schemas) ? meta.schemas : [],
      schemas,
      relations,
      enums: enumMap,
      extensions,
      capturedAt: new Date().toISOString(),
      durationMs,
    };
  });
};
