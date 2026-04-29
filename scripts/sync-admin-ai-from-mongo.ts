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
  value?: unknown;
  category?: unknown;
  categoryId?: unknown;
  clientInputs?: unknown;
  params?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
};

type ModuleSpec = {
  slug:
    | "aq-ai"
    | "cv-ai"
    | "interview-preparation"
    | "job-match-ai"
    | "keyword-generator"
    | "market-viability"
    | "preference-ai"
    | "qa-ai"
    | "va-ai";
  categoryCollection: string;
  promptCollection: string;
  promptCategoryField: "categoryId" | "category";
};

const MODULES: ModuleSpec[] = [
  {
    slug: "qa-ai",
    categoryCollection: "promptscategories",
    promptCollection: "prompts",
    promptCategoryField: "categoryId",
  },
  {
    slug: "aq-ai",
    categoryCollection: "aqpromptscategories",
    promptCollection: "aqprompts",
    promptCategoryField: "categoryId",
  },
  {
    slug: "cv-ai",
    categoryCollection: "cvpromptscategories",
    promptCollection: "cvprompts",
    promptCategoryField: "categoryId",
  },
  {
    slug: "interview-preparation",
    categoryCollection: "interviewpreppromptscategories",
    promptCollection: "interviewprepprompts",
    promptCategoryField: "categoryId",
  },
  {
    slug: "job-match-ai",
    categoryCollection: "matchpromptscategories",
    promptCollection: "matchprompts",
    promptCategoryField: "categoryId",
  },
  {
    slug: "keyword-generator",
    categoryCollection: "keywordpopulationpromptscategories",
    promptCollection: "keywordpopulationprompts",
    promptCategoryField: "categoryId",
  },
  {
    slug: "market-viability",
    categoryCollection: "marketviabilitypromptscategories",
    promptCollection: "marketviabilityprompts",
    promptCategoryField: "categoryId",
  },
  {
    slug: "preference-ai",
    categoryCollection: "prefrencespromptscategories",
    promptCollection: "prefrencesprompts",
    promptCategoryField: "categoryId",
  },
  {
    slug: "va-ai",
    categoryCollection: "vaaipromptscategories",
    promptCollection: "vaaiprompts",
    promptCategoryField: "category",
  },
];

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

const normalizeClientInputs = (value: unknown): Array<{ label: string; type: string; options?: unknown[] }> => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => {
      if (typeof entry === "string") {
        const label = entry.trim();
        if (!label) return null;
        return { label, type: "text" };
      }

      if (!entry || typeof entry !== "object") {
        return null;
      }

      const label = asTrimmedString((entry as any).label);
      const type = asTrimmedString((entry as any).type) || "text";
      const options = Array.isArray((entry as any).options)
        ? (entry as any).options
        : undefined;

      if (!label) {
        return null;
      }

      return {
        label,
        type,
        ...(options ? { options } : {}),
      };
    })
    .filter((entry): entry is { label: string; type: string; options?: unknown[] } => Boolean(entry));
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

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

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

  const pg = new PgClient({
    connectionString: buildPostgresConnectionString(),
    ssl: { rejectUnauthorized: false },
  });

  await pg.connect();

  const summary: Array<{
    module: string;
    categoryCollection: string;
    promptCollection: string;
    sourceCategoryCount: number;
    sourcePromptCount: number;
    syncedCategoryCount: number;
    syncedPromptCount: number;
  }> = [];

  try {
    await pg.query("BEGIN");

    for (const moduleSpec of MODULES) {
      const categoriesSource = await readCollection(moduleSpec.categoryCollection);
      const promptsSource = await readCollection(moduleSpec.promptCollection);

      const categories = dedupeByKey(
        categoriesSource
          .map((row) => ({
            _id: String(row._id || "").trim(),
            name: asTrimmedString(row.name),
            createdAt: asIsoDate(row.createdAt),
            updatedAt: asIsoDate(row.updatedAt),
          }))
          .filter((row) => row._id && row.name),
        (row) => row._id,
      );

      const validCategoryIds = new Set(categories.map((category) => category._id));

      const prompts = dedupeByKey(
        promptsSource
          .map((row) => {
            const rawCategoryValue = row[moduleSpec.promptCategoryField];
            const categoryId = String(
              (rawCategoryValue as any)?._id ?? rawCategoryValue ?? "",
            ).trim();
            const clientInputs =
              moduleSpec.slug === "va-ai"
                ? normalizeClientInputs(row.params)
                : normalizeClientInputs(row.clientInputs);

            return {
              _id: String(row._id || "").trim(),
              categoryId,
              value: asTrimmedString(row.value),
              clientInputs,
              createdAt: asIsoDate(row.createdAt),
              updatedAt: asIsoDate(row.updatedAt),
            };
          })
          .filter(
            (row) =>
              row._id &&
              row.categoryId &&
              row.value &&
              validCategoryIds.has(row.categoryId),
          ),
        (row) => row._id,
      );

      const key = `admin.ai.${moduleSpec.slug}`;
      const existingResult = await pg.query<{
        id: string;
        value: any;
      }>(`select id, value from system_configs where key = $1 limit 1`, [key]);

      const existingValue = existingResult.rows[0]?.value;
      const existingObject = isObject(existingValue) ? existingValue : {};
      const existingVcs = isObject(existingObject.vcs)
        ? existingObject.vcs
        : { activePrompt: null, prompts: [] };

      const nextValue = {
        categories,
        prompts,
        simulations: Array.isArray(existingObject.simulations)
          ? existingObject.simulations
          : [],
        queue: Array.isArray(existingObject.queue) ? existingObject.queue : [],
        vcs: {
          activePrompt:
            typeof (existingVcs as any).activePrompt === "string"
              ? (existingVcs as any).activePrompt
              : null,
          prompts: Array.isArray((existingVcs as any).prompts)
            ? (existingVcs as any).prompts
            : [],
        },
        cvStyle:
          typeof existingObject.cvStyle === "string" ? existingObject.cvStyle : "",
      };

      if (existingResult.rows.length > 0) {
        await pg.query(
          `update system_configs set value = $2::jsonb, "updatedAt" = now() where key = $1`,
          [key, JSON.stringify(nextValue)],
        );
      } else {
        await pg.query(
          `insert into system_configs (id, key, value, "createdAt", "updatedAt")
           values ($1, $2, $3::jsonb, now(), now())`,
          [uuidv4(), key, JSON.stringify(nextValue)],
        );
      }

      summary.push({
        module: moduleSpec.slug,
        categoryCollection: moduleSpec.categoryCollection,
        promptCollection: moduleSpec.promptCollection,
        sourceCategoryCount: categoriesSource.length,
        sourcePromptCount: promptsSource.length,
        syncedCategoryCount: categories.length,
        syncedPromptCount: prompts.length,
      });
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
          modules: summary,
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
  console.error(`Mongo -> Postgres admin AI sync failed: ${message}`);
  process.exit(1);
});
