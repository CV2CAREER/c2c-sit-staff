import { Client } from "pg";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const REQUIRED_CURRENCIES = ["AUD", "GBP", "EUR", "NGN", "CAD", "USD"] as const;

const buildConnectionString = () => {
  const user = process.env.DB_USER;
  const password = process.env.DB_PASSWORD;
  const host = process.env.DB_HOST;
  const port = process.env.DB_PORT || "5432";
  const dbName = process.env.DB_NAME;

  if (!user || !password || !host || !dbName) {
    throw new Error("Missing DB credentials in environment variables.");
  }

  return `postgres://${user}:${password}@${host}:${port}/${dbName}?uselibpqcompat=true&sslmode=require`;
};

const run = async () => {
  const connectionString = buildConnectionString();
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();

  try {
    await client.query("BEGIN");

    for (const currencyCode of REQUIRED_CURRENCIES) {
      const existing = await client.query(
        `select id from locations where "currencyCode" = $1 limit 1`,
        [currencyCode],
      );

      if (existing.rows.length === 0) {
        await client.query(
          `insert into locations ("id","currencyCode","multiplier","createdAt","updatedAt")
           values (gen_random_uuid(), $1, $2, now(), now())`,
          [currencyCode, "1"],
        );
      }
    }

    const supportedLocations = await client.query<{
      id: string;
      currencyCode: string | null;
    }>(
      `select id, "currencyCode" from locations where "currencyCode" = any($1::text[])`,
      [REQUIRED_CURRENCIES],
    );

    const targetLocationIds = supportedLocations.rows.map((row) => row.id);

    if (targetLocationIds.length === 0) {
      throw new Error("No supported locations found after backfill.");
    }

    const features = await client.query<{
      id: string;
      title: string;
      locationIds: string[] | null;
    }>(
      `select id, title, "locationIds" from features order by "createdAt" asc`,
    );

    let updatedCount = 0;

    for (const feature of features.rows) {
      const existingIds = Array.isArray(feature.locationIds)
        ? feature.locationIds.filter(
            (value) => typeof value === "string" && value.length > 0,
          )
        : [];

      if (existingIds.length > 0) {
        continue;
      }

      await client.query(
        `update features set "locationIds" = $2::uuid[], "updatedAt" = now() where id = $1`,
        [feature.id, targetLocationIds],
      );

      updatedCount += 1;
    }

    await client.query("COMMIT");

    const summary = await client.query<{
      featureCount: number;
      mappedFeatureCount: number;
      supportedLocationCount: number;
    }>(
      `select
        (select count(*)::int from features) as "featureCount",
        (select count(*)::int from features where coalesce(array_length("locationIds", 1), 0) > 0) as "mappedFeatureCount",
        (select count(*)::int from locations where "currencyCode" = any($1::text[])) as "supportedLocationCount"`,
      [REQUIRED_CURRENCIES],
    );

    const result = summary.rows[0];
    console.log(
      JSON.stringify(
        {
          updatedFeatures: updatedCount,
          featureCount: result.featureCount,
          mappedFeatureCount: result.mappedFeatureCount,
          supportedLocationCount: result.supportedLocationCount,
          requiredCurrencies: REQUIRED_CURRENCIES,
        },
        null,
        2,
      ),
    );
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    await client.end();
  }
};

run().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Pricing backfill failed: ${message}`);
  process.exit(1);
});
