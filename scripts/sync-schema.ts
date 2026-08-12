import dotenv from 'dotenv';
dotenv.config();

import { Sequelize } from 'sequelize-typescript';
import { modelList } from '../src/utils/modelsList';

const DB_NAME = process.env.DB_NAME || '';
const DB_USER = process.env.DB_USER || '';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_HOST = process.env.DB_HOST || '';
const DB_PORT = parseInt(process.env.DB_PORT || '5432', 10);
const DB_STATEMENT_TIMEOUT = parseInt(process.env.DB_STATEMENT_TIMEOUT || '30000', 10);
const NODE_ENV = process.env.NODE_ENV || 'development';

const isLocal = NODE_ENV === 'local';
const isPgbouncer = String(DB_PORT) === '25061';

const dialectOptions: any = {};
if (!isLocal) {
  dialectOptions.ssl = { require: true, rejectUnauthorized: false };
}
if (!isPgbouncer && DB_STATEMENT_TIMEOUT > 0) {
  dialectOptions.statement_timeout = DB_STATEMENT_TIMEOUT;
}

const sequelize = new Sequelize({
  database: DB_NAME,
  username: DB_USER,
  password: DB_PASSWORD,
  host: DB_HOST,
  port: DB_PORT,
  dialect: 'postgres',
  logging: false,
  models: modelList,
  dialectOptions,
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000,
    evict: 5000,
  },
});

const dryRun = process.argv.includes('--dry-run');

async function main() {
  console.log(`Connecting to ${DB_HOST}:${DB_PORT}/${DB_NAME}...`);
  await sequelize.authenticate();
  console.log('Connected.\n');

  // Step 1: sync() creates any missing tables
  console.log('Syncing tables (creating any missing ones)...');
  await sequelize.sync({ alter: false });
  console.log('Tables synced.\n');

  // Step 2: Check columns on each existing table
  const queryInterface = sequelize.getQueryInterface();

  for (const model of modelList) {
    const tableName = (model as any).getTableName();
    const tableNameStr = typeof tableName === 'object' ? tableName.tableName || tableName.toString() : String(tableName);

    // Check if table actually exists in the database
    const [tables] = await sequelize.query(
      `SELECT table_name FROM information_schema.tables WHERE table_name = ?`,
      { replacements: [tableNameStr] }
    );
    if (!tables.length) {
      console.log(`  [SKIP] Table "${tableNameStr}" not found (will be created by sync).`);
      continue;
    }

    // Get actual columns from the database
    const [columns] = await sequelize.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = ?`,
      { replacements: [tableNameStr] }
    );
    const actualCols = new Set(columns.map((c: any) => c.column_name));

    // Get model-defined attributes
    const attrs = model.getAttributes();
    const missingCols: string[] = [];

    for (const [propName, attrDef] of Object.entries(attrs)) {
      const colName = (attrDef as any).field || propName;
      if (!actualCols.has(colName)) {
        missingCols.push(colName);
      }
    }

    if (!missingCols.length) {
      console.log(`  [OK] Table "${tableNameStr}" — all columns present.`);
      continue;
    }

    console.log(`  [FIX] Table "${tableNameStr}" — adding ${missingCols.length} missing column(s):`);

    for (const colName of missingCols) {
      const attrDef = Object.entries(attrs).find(
        ([p, a]: [string, any]) => (a.field || p) === colName
      )?.[1] as any;

      if (!attrDef) {
        console.log(`    WARN: Could not find attribute for column "${colName}", skipping.`);
        continue;
      }

      if (dryRun) {
        console.log(`    ADD "${colName}" (type: ${attrDef.type?.toString?.() || attrDef.type?.key || 'unknown'})`);
      } else {
        try {
          await queryInterface.addColumn(tableNameStr, colName, {
            type: attrDef.type,
            allowNull: attrDef.allowNull,
            defaultValue: attrDef.defaultValue,
            primaryKey: attrDef.primaryKey,
            unique: attrDef.unique,
          });
          console.log(`    ✓ Added "${colName}"`);
        } catch (err: any) {
          console.error(`    ✗ Failed to add "${colName}": ${err.message}`);
        }
      }
    }
  }

  console.log('\nDone.');

  if (dryRun) {
    console.log('(dry-run mode — no changes were made. Remove --dry-run to execute.)');
  }

  await sequelize.close();
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
