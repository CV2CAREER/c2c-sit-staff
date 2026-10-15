import { Sequelize, QueryTypes } from "sequelize";
import { getServiceLogger } from "../utils/createLogger";
import { resolvePoolTarget } from "./_pool-target";

const logger = getServiceLogger("replicate-user-account");

// One-off: finds a specific user by email on the source DB (read-only, via
// the same emailHash lookup find_user_by_email() uses) and replicates that
// exact row — plus anything it references (profile/secondaryProfile/
// location/plan, all nullable FKs on users) — onto the target DBs.
// Never writes to the source, and never writes to prod. Upserts on "id",
// safe to re-run.
//
// --source=prod|iat|... (default iat), --targets=iat,sit,uat,rat,sandbox
const EMAIL = process.argv.find((a) => a.startsWith("--email="))?.split("=").slice(1).join("=");
// Pass --targets=rat (or sandbox, or both comma-separated) to restrict which
// target(s) get written — useful when the other target already has its own
// distinct row for this email (different id, e.g. a real signup) and
// replicating iat-pool's row there would create a duplicate-email row
// instead of the intended one account.
const targetsFlag = process.argv.find((a) => a.startsWith("--targets="));
const TARGETS = targetsFlag ? targetsFlag.split("=").slice(1).join("=").split(",") : ["sandbox", "rat"];

const SOURCE_NAME = process.argv.find((a) => a.startsWith("--source="))?.split("=").slice(1).join("=") || "iat";

const CONFIRMED = process.argv.includes("--force") || process.env.CONFIRM_DROP === "yes";

function quoteIdent(name: string): string {
  return `"${name}"`;
}

// Referenced-table lookups for the user's nullable FK columns.
const FK_LOOKUPS: { column: string; table: string }[] = [
  { column: "profileId", table: "profiles" },
  { column: "secondaryProfileId", table: "profiles" },
  { column: "locationId", table: "locations" },
  { column: "planId", table: "plans" },
];

async function getColumnTypes(sequelize: Sequelize, table: string): Promise<Map<string, string>> {
  const colRows = (await sequelize.query(
    `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = :table`,
    { replacements: { table }, type: QueryTypes.SELECT },
  )) as { column_name: string; data_type: string }[];
  return new Map(colRows.map((c) => [c.column_name, c.data_type]));
}

function buildUpsertSql(table: string, columns: string[]): string {
  const colList = columns.map(quoteIdent).join(", ");
  const placeholders = columns.map((_, i) => `$${i + 1}`).join(", ");
  const updateSet = columns
    .filter((c) => c !== "id")
    .map((c) => `${quoteIdent(c)} = EXCLUDED.${quoteIdent(c)}`)
    .join(", ");
  return `INSERT INTO ${quoteIdent(table)} (${colList}) VALUES (${placeholders}) ON CONFLICT (id) DO UPDATE SET ${updateSet}`;
}

function buildBind(row: Record<string, any>, columns: string[], colTypes: Map<string, string>): any[] {
  return columns.map((c) => {
    const value = row[c];
    if (value === null || value === undefined) return null;
    const dt = colTypes.get(c);
    if (dt === "jsonb" || dt === "json") return JSON.stringify(value);
    return value;
  });
}

async function main() {
  if (!EMAIL) {
    throw new Error("Usage: --email=someone@example.com [--force]");
  }

  if (TARGETS.includes("prod") || TARGETS.includes(SOURCE_NAME)) {
    throw new Error(`Refusing to write to prod or to the source ("${SOURCE_NAME}"). Targets: ${TARGETS.join(", ")}`);
  }

  const SOURCE = resolvePoolTarget([`--target=${SOURCE_NAME}`]);
  const source = new Sequelize(SOURCE.database, SOURCE.username, SOURCE.password, {
    host: SOURCE.host,
    port: SOURCE.port,
    dialect: "postgres",
    logging: false,
    dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
  });

  try {
    await source.authenticate();
    const [[{ current_database }]] = (await source.query("SELECT current_database()")) as [
      { current_database: string }[],
      unknown,
    ];
    if (current_database !== SOURCE.database) {
      throw new Error(`Source connected to "${current_database}", expected "${SOURCE.database}" — aborting.`);
    }
    logger.info(`✅ Source: "${current_database}" @ ${SOURCE.host}:${SOURCE.port} (read-only)`);

    // Same lookup find_user_by_email() itself performs — matching on the
    // deterministic emailHash rather than the (often-empty) legacy email col.
    const found = (await source.query(
      `SELECT id FROM users WHERE "emailHash" = ENCODE(DIGEST(LOWER(:email), 'sha256'), 'hex')`,
      { replacements: { email: EMAIL }, type: QueryTypes.SELECT },
    )) as { id: string }[];

    if (!found.length) {
      throw new Error(`No user found on ${SOURCE.database} for email "${EMAIL}".`);
    }
    const userId = found[0].id;
    logger.info(`Found user id=${userId} for ${EMAIL}`);

    const userColTypes = await getColumnTypes(source, "users");
    const [userRow] = (await source.query(`SELECT * FROM users WHERE id = :id`, {
      replacements: { id: userId },
      type: QueryTypes.SELECT,
    })) as Record<string, any>[];

    // Pull any referenced rows this user points at (all nullable FKs).
    const referenced: { table: string; row: Record<string, any>; colTypes: Map<string, string> }[] = [];
    const seen = new Set<string>();
    for (const { column, table } of FK_LOOKUPS) {
      const fkValue = userRow[column];
      if (!fkValue) continue;
      const key = `${table}:${fkValue}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const colTypes = await getColumnTypes(source, table);
      const [row] = (await source.query(`SELECT * FROM ${quoteIdent(table)} WHERE id = :id`, {
        replacements: { id: fkValue },
        type: QueryTypes.SELECT,
      })) as Record<string, any>[];
      if (row) {
        referenced.push({ table, row, colTypes });
        logger.info(`  references ${table}.id=${fkValue} (via ${column}) — will also copy this row`);
      } else {
        logger.warn(`  ${column}=${fkValue} but no matching row found in ${table} on ${SOURCE.database} (leaving as-is)`);
      }
    }

    if (!CONFIRMED) {
      logger.warn("🛑 Dry run only (no --force / CONFIRM_DROP=yes passed). Nothing was written.");
      logger.info(`Would copy: users.id=${userId}, plus ${referenced.length} referenced row(s).`);
      return;
    }

    for (const targetName of TARGETS) {
      const target = resolvePoolTarget([`--target=${targetName}`]);
      const dest = new Sequelize(target.database, target.username, target.password, {
        host: target.host,
        port: target.port,
        dialect: "postgres",
        logging: false,
        dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
      });

      try {
        await dest.authenticate();
        const [[{ current_database: destDb }]] = (await dest.query("SELECT current_database()")) as [
          { current_database: string }[],
          unknown,
        ];
        if (destDb !== target.database) {
          throw new Error(`Target "${targetName}" connected to "${destDb}", expected "${target.database}" — aborting this target.`);
        }
        logger.info(`\n➡️  Writing into "${destDb}" @ ${target.host}:${target.port} (${targetName})`);

        // A different account (different id) already holding this email
        // here would end up as a duplicate-email row — skip, don't clobber.
        const existing = (await dest.query(
          `SELECT id FROM users WHERE "emailHash" = ENCODE(DIGEST(LOWER(:email), 'sha256'), 'hex')`,
          { replacements: { email: EMAIL }, type: QueryTypes.SELECT },
        )) as { id: string }[];
        const clash = existing.find((r) => String(r.id) !== String(userId));
        if (clash) {
          logger.warn(`⚠️  ${destDb} already has a different user id=${clash.id} for ${EMAIL} — skipping this target.`);
          continue;
        }

        // Only write columns the target schema actually has (envs drift).
        const destColumns = async (table: string, row: Record<string, any>) => {
          const destTypes = await getColumnTypes(dest, table);
          const dropped = Object.keys(row).filter((c) => !destTypes.has(c));
          if (dropped.length) logger.warn(`  ${table}: target lacks column(s) ${dropped.join(", ")} — not copied`);
          return Object.keys(row).filter((c) => destTypes.has(c));
        };

        await dest.transaction(async (t) => {
          const userColumns = await destColumns("users", userRow);
          const userSql = buildUpsertSql("users", userColumns);

          // profiles.userId -> users and users.profileId -> profiles is
          // circular, so land the user first with its FK columns nulled,
          // then the referenced rows, then the full user row below.
          const fkColumns = new Set(FK_LOOKUPS.map((f) => f.column));
          const userWithoutFks = Object.fromEntries(
            Object.entries(userRow).map(([k, v]) => [k, fkColumns.has(k) ? null : v]),
          );
          await dest.query(userSql, { bind: buildBind(userWithoutFks, userColumns, userColTypes), transaction: t });

          for (const { table, row, colTypes } of referenced) {
            const columns = await destColumns(table, row);
            const sql = buildUpsertSql(table, columns);
            await dest.query(sql, { bind: buildBind(row, columns, colTypes), transaction: t });
            logger.info(`  ${table}: upserted referenced row id=${row.id}`);
          }

          await dest.query(userSql, { bind: buildBind(userRow, userColumns, userColTypes), transaction: t });
          logger.info(`  users: upserted id=${userId} (${EMAIL})`);
        });

        logger.info(`✅ "${destDb}" (${targetName}) done.`);
      } finally {
        await dest.close();
      }
    }

    logger.info("\n✅ All targets done.");
  } finally {
    await source.close();
  }
}

main().catch((error) => {
  logger.error(`❌ replicate-user-account failed: ${error?.message || error}`);
  process.exitCode = 1;
});
