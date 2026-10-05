import { Sequelize, QueryTypes } from "sequelize";
import { getServiceLogger } from "../utils/createLogger";
import { resolvePoolTarget } from "./_pool-target";

const logger = getServiceLogger("copy-data-iat-to-targets");

// One-off data migration: copies rows for a set of tables FROM iat-pool
// (read-only) INTO sandbox and rat-pool (c2c_rat). Never writes to
// iat-pool — the source connection only ever runs SELECT.
//
// Upserts on "id" (ON CONFLICT DO UPDATE), so this is safe to re-run.
// Pass --tables=a,b,c to override the default set.
const argv = process.argv.slice(2);
const tablesFlag = argv.find((a) => a.startsWith("--tables="));
const TABLES = tablesFlag
  ? tablesFlag.split("=").slice(1).join("=").split(",")
  : ["features", "email_templates", "client_contents"];
const TARGETS = ["sandbox", "rat"];

// vcs_prompts.vcsId <-> vcs_configurations.activePromptId is a circular FK
// pair — each table references the other, so neither can be inserted first
// with its FK populated. These columns are nulled out on the initial
// INSERT and backfilled in a second pass once both tables are fully
// populated for that target.
const DEFER_COLUMNS: { table: string; column: string }[] = [
  { table: "vcs_prompts", column: "vcsId" },
  { table: "vcs_configurations", column: "activePromptId" },
];

const IAT_SOURCE = {
  host: "unification-staging-db-do-user-12600817-0.f.db.ondigitalocean.com",
  port: 25060,
  database: "c2c_iat",
};

const CONFIRMED = process.argv.includes("--force") || process.env.CONFIRM_DROP === "yes";

function quoteIdent(name: string): string {
  return `"${name}"`;
}

async function main() {
  const { DATABASE_USERNAME, DATABASE_PASSWORD } = await import("../config/env");

  const source = new Sequelize(IAT_SOURCE.database, DATABASE_USERNAME!, DATABASE_PASSWORD!, {
    host: IAT_SOURCE.host,
    port: IAT_SOURCE.port,
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
    if (current_database !== IAT_SOURCE.database) {
      throw new Error(`Source connected to "${current_database}", expected "${IAT_SOURCE.database}" — aborting.`);
    }
    logger.info(`✅ Source: "${current_database}" @ ${IAT_SOURCE.host}:${IAT_SOURCE.port} (read-only)`);

    // Fetch every table's rows AND column types from iat-pool up front —
    // source is never touched again after this block. Column types matter
    // because jsonb/array columns need different bind handling than plain
    // scalars (Sequelize's named :replacements mis-expand JS arrays into
    // multiple values instead of one bound parameter — bind ($1, $2, ...)
    // avoids that, but jsonb still needs an explicit JSON.stringify + cast).
    const rowsByTable = new Map<string, Record<string, any>[]>();
    const columnTypesByTable = new Map<string, Map<string, string>>();
    for (const table of TABLES) {
      const rows = (await source.query(`SELECT * FROM ${quoteIdent(table)}`, {
        type: QueryTypes.SELECT,
      })) as Record<string, any>[];
      rowsByTable.set(table, rows);
      logger.info(`📋 ${table}: ${rows.length} row(s) on iat-pool`);

      const colRows = (await source.query(
        `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = :table`,
        { replacements: { table }, type: QueryTypes.SELECT },
      )) as { column_name: string; data_type: string }[];
      columnTypesByTable.set(table, new Map(colRows.map((c) => [c.column_name, c.data_type])));
    }

    if (!CONFIRMED) {
      logger.warn("🛑 Dry run only (no --force / CONFIRM_DROP=yes passed). Nothing was written.");
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

        await dest.transaction(async (t) => {
          for (const table of TABLES) {
            const rows = rowsByTable.get(table) || [];
            if (!rows.length) {
              logger.info(`  ${table}: nothing to copy (source table empty).`);
              continue;
            }

            const colTypes = columnTypesByTable.get(table)!;
            const deferredCols = new Set(
              DEFER_COLUMNS.filter((d) => d.table === table).map((d) => d.column),
            );
            const columns = Object.keys(rows[0]);
            const colList = columns.map(quoteIdent).join(", ");
            const valuePlaceholders = columns
              .map((c, i) => {
                const dt = colTypes.get(c);
                const cast = dt === "jsonb" ? "::jsonb" : dt === "json" ? "::json" : "";
                return `$${i + 1}${cast}`;
              })
              .join(", ");
            // Deferred columns (circular FKs) are excluded from the
            // conflict-update set — otherwise a re-run's upsert would stomp
            // a value the backfill pass already set back to NULL.
            const updateSet = columns
              .filter((c) => c !== "id" && !deferredCols.has(c))
              .map((c) => `${quoteIdent(c)} = EXCLUDED.${quoteIdent(c)}`)
              .join(", ");

            const sql = `
              INSERT INTO ${quoteIdent(table)} (${colList})
              VALUES (${valuePlaceholders})
              ON CONFLICT (id) DO UPDATE SET ${updateSet}
            `;

            let count = 0;
            for (const row of rows) {
              const bind = columns.map((c) => {
                if (deferredCols.has(c)) return null; // backfilled in the pass below
                const value = row[c];
                const dt = colTypes.get(c);
                if (value === null || value === undefined) return null;
                if (dt === "jsonb" || dt === "json") return JSON.stringify(value);
                return value;
              });
              await dest.query(sql, { bind, transaction: t });
              count++;
            }
            logger.info(`  ${table}: upserted ${count} row(s).`);
          }

          // Second pass: now that every table is fully populated, backfill
          // the circular FK columns that were nulled out above.
          for (const { table, column } of DEFER_COLUMNS) {
            const rows = rowsByTable.get(table) || [];
            if (!rows.length) continue;
            let backfilled = 0;
            for (const row of rows) {
              const value = row[column];
              if (value === null || value === undefined) continue;
              await dest.query(
                `UPDATE ${quoteIdent(table)} SET ${quoteIdent(column)} = $1 WHERE id = $2`,
                { bind: [value, row.id], transaction: t },
              );
              backfilled++;
            }
            if (backfilled) {
              logger.info(`  ${table}.${column}: backfilled ${backfilled} row(s).`);
            }
          }
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
  logger.error(`❌ copy-data-iat-to-targets failed: ${error?.message || error}`);
  process.exitCode = 1;
});
