import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { Client as PgClient } from "pg";
import { v4 as uuidv4 } from "uuid";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

type MongoDoc = {
  _id?: unknown;
  name?: unknown;
  label?: unknown;
  value?: unknown;
  email?: unknown;
  slackId?: unknown;
  role?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
};

const COLLECTIONS = {
  owners: "cr_tracking_owners",
  changes: "cr_changes",
  severities: "cr_severities",
  families: "cr_families",
  stages: "cr_stage_lists",
  types: "cr_types",
  personas: "cr_impacted_personas",
  providers: "cr_impacted_providers",
  nodes: "cr_impacted_nodes",
} as const;

const stripQuotes = (value: string) => value.replace(/^['"]|['"]$/g, "");

const readSiblingEnvValue = (key: string) => {
  const siblingEnvPath = path.resolve(process.cwd(), "../c2c-staff-main/.env");

  if (!fs.existsSync(siblingEnvPath)) {
    return undefined;
  }

  const envContent = fs.readFileSync(siblingEnvPath, "utf8");
  const regex = new RegExp(`^${key}\\s*=\\s*(.+)$`, "m");
  const match = envContent.match(regex);
  if (!match || !match[1]) {
    return undefined;
  }

  return stripQuotes(match[1].trim());
};

const extractDbNameFromMongoUri = (uri: string): string | undefined => {
  try {
    const parsed = new URL(uri);
    const dbPath = parsed.pathname?.replace("/", "").trim();
    return dbPath || undefined;
  } catch {
    return undefined;
  }
};

const resolveMongoConnection = () => {
  const uri =
    process.env.MONGODB_DIRECT_URL ||
    readSiblingEnvValue("MONGODB_DIRECT_URL") ||
    process.env.MONGODB_URL ||
    process.env.MONGODB_URI ||
    readSiblingEnvValue("MONGODB_URL") ||
    readSiblingEnvValue("MONGODB_URI");

  if (!uri) {
    throw new Error(
      "Missing MongoDB URL. Set MONGODB_DIRECT_URL or MONGODB_URL / MONGODB_URI.",
    );
  }

  const dbName =
    process.env.MONGODB_NAME ||
    readSiblingEnvValue("MONGODB_NAME") ||
    extractDbNameFromMongoUri(uri);

  return { uri, dbName };
};

const buildPostgresConnectionString = () => {
  const user = process.env.DB_USER;
  const password = process.env.DB_PASSWORD;
  const host = process.env.DB_HOST;
  const port = process.env.DB_PORT || "5432";
  const dbName = process.env.DB_NAME;

  if (!user || !password || !host || !dbName) {
    throw new Error(
      "Missing Postgres credentials (DB_USER, DB_PASSWORD, DB_HOST, DB_PORT, DB_NAME).",
    );
  }

  return `postgres://${user}:${password}@${host}:${port}/${dbName}?uselibpqcompat=true&sslmode=require`;
};

const asTrimmedString = (value: unknown): string => {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim();
};

const asIsoDate = (value: unknown): string => {
  const date = value ? new Date(String(value)) : new Date();
  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString();
  }
  return date.toISOString();
};

const dedupeByKey = <T>(rows: T[], keyBuilder: (row: T) => string): T[] => {
  const seen = new Set<string>();
  const deduped: T[] = [];

  for (const row of rows) {
    const key = keyBuilder(row);
    if (!key || seen.has(key)) {
      continue;
    }
    seen.add(key);
    deduped.push(row);
  }

  return deduped;
};

const run = async () => {
  const dryRun = process.argv.includes("--dry-run");
  const { uri: mongoUri, dbName } = resolveMongoConnection();

  await mongoose.connect(mongoUri, dbName ? { dbName } : undefined);
  const mongoDb = mongoose.connection.db;
  if (!mongoDb) {
    throw new Error("MongoDB connection established without database handle.");
  }

  const availableCollections = new Set(
    (
      await mongoDb.listCollections({}, { nameOnly: true }).toArray()
    ).map((collection) => collection.name),
  );

  const readCollection = async (name: string): Promise<MongoDoc[]> => {
    if (!availableCollections.has(name)) {
      return [];
    }
    const docs = await mongoDb.collection(name).find({}).toArray();
    return docs as MongoDoc[];
  };

  const ownersSource = await readCollection(COLLECTIONS.owners);
  const changesSource = await readCollection(COLLECTIONS.changes);
  const severitiesSource = await readCollection(COLLECTIONS.severities);
  const familiesSource = await readCollection(COLLECTIONS.families);
  const stagesSource = await readCollection(COLLECTIONS.stages);
  const typesSource = await readCollection(COLLECTIONS.types);
  const personasSource = await readCollection(COLLECTIONS.personas);
  const providersSource = await readCollection(COLLECTIONS.providers);
  const nodesSource = await readCollection(COLLECTIONS.nodes);

  const owners = dedupeByKey(
    ownersSource
      .map((row) => ({
        name: asTrimmedString(row.name),
        email: asTrimmedString(row.email) || null,
        slackId: asTrimmedString(row.slackId) || null,
        role: asTrimmedString(row.role) || null,
        createdAt: asIsoDate(row.createdAt),
        updatedAt: asIsoDate(row.updatedAt),
      }))
      .filter((row) => row.name.length > 0),
    (row) => `${row.name.toLowerCase()}::${row.email ?? ""}::${row.role ?? ""}`,
  );

  const toNamedRows = (rows: MongoDoc[]) =>
    dedupeByKey(
      rows
        .map((row) => ({
          name: asTrimmedString(row.name),
          createdAt: asIsoDate(row.createdAt),
          updatedAt: asIsoDate(row.updatedAt),
        }))
        .filter((row) => row.name.length > 0),
      (row) => row.name.toLowerCase(),
    );

  const toPersonaRows = (rows: MongoDoc[]) =>
    dedupeByKey(
      rows
        .map((row) => {
          const label =
            asTrimmedString(row.label) ||
            asTrimmedString(row.value) ||
            asTrimmedString(row.name);
          return {
            label,
            createdAt: asIsoDate(row.createdAt),
            updatedAt: asIsoDate(row.updatedAt),
          };
        })
        .filter((row) => row.label.length > 0),
      (row) => row.label.toLowerCase(),
    );

  const changes = toNamedRows(changesSource);
  const severities = toNamedRows(severitiesSource);
  const families = toNamedRows(familiesSource);
  const stages = toNamedRows(stagesSource);
  const types = toNamedRows(typesSource);
  const personas = toPersonaRows(personasSource);
  const providers = toPersonaRows(providersSource).map((row) => ({
    name: row.label,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }));
  const nodes = toPersonaRows(nodesSource).map((row) => ({
    name: row.label,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }));

  const pg = new PgClient({
    connectionString: buildPostgresConnectionString(),
    ssl: { rejectUnauthorized: false },
  });

  await pg.connect();

  try {
    await pg.query("BEGIN");

    await pg.query(`delete from cr_owners`);
    for (const row of owners) {
      await pg.query(
        `insert into cr_owners (id, name, email, "slackId", role, "createdAt", "updatedAt")
         values ($1, $2, $3, $4, $5, $6, $7)`,
        [
          uuidv4(),
          row.name,
          row.email,
          row.slackId,
          row.role,
          row.createdAt,
          row.updatedAt,
        ],
      );
    }

    const insertNamedRows = async (table: string, rows: Array<{ name: string; createdAt: string; updatedAt: string }>) => {
      await pg.query(`delete from ${table}`);
      for (const row of rows) {
        await pg.query(
          `insert into ${table} (id, name, "createdAt", "updatedAt")
           values ($1, $2, $3, $4)`,
          [uuidv4(), row.name, row.createdAt, row.updatedAt],
        );
      }
    };

    await insertNamedRows("cr_changes", changes);
    await insertNamedRows("cr_severities", severities);
    await insertNamedRows("cr_families", families);
    await insertNamedRows("cr_stages", stages);
    await insertNamedRows("cr_types", types);
    await insertNamedRows("cr_providers", providers);
    await insertNamedRows("cr_nodes", nodes);

    await pg.query(`delete from cr_personas`);
    for (const row of personas) {
      await pg.query(
        `insert into cr_personas (id, label, "createdAt", "updatedAt")
         values ($1, $2, $3, $4)`,
        [uuidv4(), row.label, row.createdAt, row.updatedAt],
      );
    }

    if (dryRun) {
      await pg.query("ROLLBACK");
    } else {
      await pg.query("COMMIT");
    }

    console.log(
      JSON.stringify(
        {
          mode: dryRun ? "dry-run" : "apply",
          sourceCollections: COLLECTIONS,
          mongoCounts: {
            owners: ownersSource.length,
            changes: changesSource.length,
            severities: severitiesSource.length,
            families: familiesSource.length,
            stages: stagesSource.length,
            types: typesSource.length,
            personas: personasSource.length,
            providers: providersSource.length,
            nodes: nodesSource.length,
          },
          syncedCounts: {
            owners: owners.length,
            changes: changes.length,
            severities: severities.length,
            families: families.length,
            stages: stages.length,
            types: types.length,
            personas: personas.length,
            providers: providers.length,
            nodes: nodes.length,
          },
        },
        null,
        2,
      ),
    );
  } catch (error) {
    await pg.query("ROLLBACK");
    throw error;
  } finally {
    await pg.end();
    await mongoose.disconnect();
  }
};

run().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Mongo -> Postgres CR options sync failed: ${message}`);
  process.exit(1);
});
