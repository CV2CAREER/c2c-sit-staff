import { DATABASE_HOST, DATABASE_USERNAME, DATABASE_PASSWORD } from "../config/env";

// Resolves which Postgres database a sandbox/rat/etc. maintenance script
// should connect to. Each named target can live on a completely different
// DigitalOcean cluster with its own credentials — sandbox and rat-pool do.
// Nothing here ever reads DB_NAME from .env, so these scripts can never
// accidentally land on whatever database .env's own connection currently
// points at.
export type PoolTarget = {
  name: string;
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
};

const PRESETS: Record<string, Omit<PoolTarget, "name" | "password"> & { passwordEnv?: string }> = {
  // Same cluster as iat-pool/uat-pool. Direct connection (not the 25061
  // pgbouncer pool port) — safer for DDL than going through the pooler.
  sandbox: {
    host: "unification-staging-db-do-user-12600817-0.f.db.ondigitalocean.com",
    port: 25060,
    database: "sandbox",
    username: DATABASE_USERNAME!,
  },
  // The .env comment for c2c_rat points at
  // db-postgresql-nyc3-49571-do-user-12600817-0.c.db.ondigitalocean.com,
  // but that host no longer resolves (DNS: non-existent domain) — it was a
  // pre-"unification" cluster, since retired. c2c_rat actually lives on the
  // same unified cluster as sandbox/iat-pool/uat-pool now, confirmed live.
  rat: {
    host: "unification-staging-db-do-user-12600817-0.f.db.ondigitalocean.com",
    port: 25060,
    database: "c2c_rat",
    username: DATABASE_USERNAME!,
  },
};

function flag(argv: string[], name: string): string | undefined {
  const withEquals = argv.find((a) => a.startsWith(`--${name}=`));
  return withEquals ? withEquals.split("=").slice(1).join("=") : undefined;
}

export function resolvePoolTarget(argv: string[]): PoolTarget {
  const targetName = flag(argv, "target") || "sandbox";
  const preset = PRESETS[targetName];
  if (!preset) {
    throw new Error(`Unknown --target "${targetName}". Known targets: ${Object.keys(PRESETS).join(", ")}`);
  }

  const host = flag(argv, "host") || preset.host;
  const port = flag(argv, "port") ? parseInt(flag(argv, "port")!, 10) : preset.port;
  const database = flag(argv, "db") || preset.database;
  const username = flag(argv, "user") || preset.username;

  const passwordEnvFlag = flag(argv, "password-env");
  const passwordEnv = passwordEnvFlag || preset.passwordEnv;
  const password = passwordEnv ? process.env[passwordEnv] : DATABASE_PASSWORD;

  if (!password) {
    throw new Error(
      `No password resolved for target "${targetName}". Set ${passwordEnv || "DATABASE_PASSWORD"} in your environment, or pass --password-env=<VAR_NAME>.`,
    );
  }

  return { name: targetName, host, port, database, username: username!, password };
}
