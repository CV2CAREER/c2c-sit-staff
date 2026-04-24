import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import mongoose, { Schema, Types } from "mongoose";
import { Client as PgClient } from "pg";
import { v4 as uuidv4 } from "uuid";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const FEATURE_TIERS = [
  "Emerald",
  "Coral",
  "Free",
  "Copper",
  "Bronze",
  "Silver",
  "Gold",
  "Platinum",
] as const;

type FeatureTier = (typeof FEATURE_TIERS)[number];

type MongoLocationDoc = {
  _id: Types.ObjectId;
  currencyCode?: string;
  multiplier?: string;
  createdAt?: Date;
  updatedAt?: Date;
};

type MongoFeatureDoc = {
  _id: Types.ObjectId;
  title?: string;
  price?: number | string;
  jobApplications?: number | string;
  screeningPrep?: number | string;
  interviewPrep?: number | string;
  resumeDevelopment?: number | string;
  validityPeriod?: string;
  subscriptionBreak?: string;
  profileLimit?: number | string;
  otherFeatures?: unknown;
  extra?: unknown;
  locationId?: Array<Types.ObjectId | string>;
  createdAt?: Date;
  updatedAt?: Date;
};

type ExistingLocationRow = {
  id: string;
  currencyCode: string | null;
};

type ExistingFeatureRow = {
  id: string;
  title: string;
  tier: FeatureTier;
  price: number | string;
  jobApplications: number;
  cvResumeRequests: number;
  validityPeriod: string;
  subscriptionBreak: string;
  profileLimit: number;
  pauseOptionMonths: number;
  description: string | null;
  extra: string | null;
  isTopUp: boolean;
  isActive: boolean;
  locationIds: string[] | null;
  planCount: number;
};

type SyncedFeature = {
  title: string;
  tier: FeatureTier;
  price: number;
  jobApplications: number;
  cvResumeRequests: number;
  screeningPrep: number;
  interviewPrep: number;
  resumeDevelopment: number;
  validityPeriod: string;
  subscriptionBreak: string;
  pauseOptionMonths: number;
  profileLimit: number;
  extra: string | null;
  description: string | null;
  isTopUp: boolean;
  isActive: boolean;
  locationIds: string[];
  sourceDocs: number;
  stamp: number;
};

const locationSchema = new Schema(
  {
    currencyCode: { type: String },
    multiplier: { type: String },
  },
  {
    strict: false,
    timestamps: true,
    collection: "locations",
  },
);

const featureSchema = new Schema(
  {
    title: { type: String },
    price: { type: Number },
    jobApplications: { type: Schema.Types.Mixed },
    screeningPrep: { type: Schema.Types.Mixed },
    interviewPrep: { type: Schema.Types.Mixed },
    resumeDevelopment: { type: Schema.Types.Mixed },
    validityPeriod: { type: String },
    subscriptionBreak: { type: String },
    profileLimit: { type: Schema.Types.Mixed },
    extra: { type: Schema.Types.Mixed },
    locationId: { type: [Schema.Types.ObjectId] },
  },
  {
    strict: false,
    timestamps: true,
    collection: "features",
  },
);

const MongoLocationModel =
  mongoose.models.__sync_pricing_location ||
  mongoose.model("__sync_pricing_location", locationSchema);
const MongoFeatureModel =
  mongoose.models.__sync_pricing_feature ||
  mongoose.model("__sync_pricing_feature", featureSchema);

const stripQuotes = (value: string) => value.replace(/^['"]|['"]$/g, "");

const readSiblingEnvValue = (key: string) => {
  const siblingEnvPath = path.resolve(
    process.cwd(),
    "../c2c-staff-main/.env",
  );

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
    process.env.MONGODB_URL ||
    process.env.MONGODB_URI ||
    readSiblingEnvValue("MONGODB_URL") ||
    readSiblingEnvValue("MONGODB_URI");

  if (!uri) {
    throw new Error("Missing MongoDB URL. Set MONGODB_URL or MONGODB_URI.");
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

  return `postgres://${user}:${password}@${host}:${port}/${dbName}?sslmode=require`;
};

const toIsoOrZero = (value: Date | string | undefined) => {
  const date = value ? new Date(value) : undefined;
  const time = date?.getTime();
  return typeof time === "number" && Number.isFinite(time) ? time : 0;
};

const normalizeCurrencyCode = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toUpperCase();
  return normalized.length > 0 ? normalized : null;
};

const toPositiveInteger = (value: unknown, fallback: number) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    const rounded = Math.floor(value);
    return rounded > 0 ? rounded : fallback;
  }

  if (typeof value === "string") {
    const match = value.match(/\d+/);
    if (match) {
      const parsed = Number.parseInt(match[0], 10);
      if (Number.isFinite(parsed) && parsed > 0) {
        return parsed;
      }
    }
  }

  return fallback;
};

const toStrictNonNegativeInteger = (value: unknown): number | undefined => {
  if (typeof value === "number" && Number.isFinite(value)) {
    const rounded = Math.floor(value);
    return rounded >= 0 ? rounded : undefined;
  }

  if (typeof value === "string") {
    const normalized = value.trim();
    if (/^\d+$/.test(normalized)) {
      const parsed = Number.parseInt(normalized, 10);
      if (Number.isFinite(parsed) && parsed >= 0) {
        return parsed;
      }
    }
  }

  return undefined;
};

const toNonNegativeInteger = (value: unknown, fallback: number) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    const rounded = Math.floor(value);
    return rounded >= 0 ? rounded : fallback;
  }

  if (typeof value === "string") {
    const match = value.match(/\d+/);
    if (match) {
      const parsed = Number.parseInt(match[0], 10);
      if (Number.isFinite(parsed) && parsed >= 0) {
        return parsed;
      }
    }
  }

  return fallback;
};

const toDecimal = (value: unknown, fallback: number) => {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed >= 0) {
      return parsed;
    }
  }

  return fallback;
};

const normalizeMultiplier = (value: unknown) => {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }

  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return String(value);
  }

  return "1";
};

const normalizeOtherFeatures = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((item) => item.length > 0);
};

const parseLegacyJobApplications = (
  value: unknown,
  fallbackCount: number,
) => {
  const strictCount = toStrictNonNegativeInteger(value);
  if (typeof strictCount === "number") {
    return { count: strictCount, label: null as string | null };
  }

  if (typeof value === "string") {
    const normalized = value.trim();
    if (normalized.length === 0 || normalized === "-") {
      return { count: 0, label: null as string | null };
    }

    return { count: 0, label: normalized };
  }

  return { count: fallbackCount, label: null as string | null };
};

const inferTier = (
  title: string,
  fallbackTier?: FeatureTier,
): FeatureTier => {
  const normalized = title.trim().toLowerCase();
  const direct = FEATURE_TIERS.find(
    (tier) => tier.toLowerCase() === normalized,
  );
  if (direct) {
    return direct;
  }

  const contains = FEATURE_TIERS.find((tier) =>
    normalized.includes(tier.toLowerCase()),
  );
  if (contains) {
    return contains;
  }

  if (fallbackTier) {
    return fallbackTier;
  }

  throw new Error(`Cannot infer tier from title "${title}".`);
};

const parsePauseOptionMonths = (
  subscriptionBreak: string,
  fallback: number,
) => {
  const pauseMatch = subscriptionBreak.match(
    /pause(?:\s+option)?(?:\s+before)?(?:\s+duration)?\s+(\d+)/i,
  );

  if (pauseMatch && pauseMatch[1]) {
    const parsed = Number.parseInt(pauseMatch[1], 10);
    if (Number.isFinite(parsed) && parsed >= 0) {
      return parsed;
    }
  }

  return toNonNegativeInteger(subscriptionBreak, fallback);
};

const pickFeatureCandidate = (candidates: ExistingFeatureRow[]) =>
  [...candidates].sort((left, right) => {
    if (left.planCount !== right.planCount) {
      return right.planCount - left.planCount;
    }
    return left.title.localeCompare(right.title);
  })[0];

const normalizeLocationIds = (locationIds: Array<string | null | undefined>) =>
  [...new Set(locationIds.filter((locationId): locationId is string => Boolean(locationId)))]
    .sort((left, right) => left.localeCompare(right));

const buildFeatureScopeKey = (title: string, locationIds: string[]) =>
  `${title.trim().toLowerCase()}::${normalizeLocationIds(locationIds).join(",")}`;

const getExactFeatureCandidate = (
  candidates: ExistingFeatureRow[],
  locationIds: string[],
) => {
  const normalizedTarget = normalizeLocationIds(locationIds);

  return candidates.find((candidate) => {
    const candidateLocationIds = normalizeLocationIds(candidate.locationIds || []);
    if (candidateLocationIds.length !== normalizedTarget.length) {
      return false;
    }

    return candidateLocationIds.every((locationId, index) => locationId === normalizedTarget[index]);
  });
};

const buildSyncedFeatures = (
  mongoFeatures: MongoFeatureDoc[],
  mongoLocationIdToPgId: Map<string, string>,
  allSyncedLocationIds: string[],
  existingFeaturesByTitle: Map<string, ExistingFeatureRow[]>,
) => {
  const syncedByScope = new Map<string, SyncedFeature>();

  for (const mongoFeature of mongoFeatures) {
    const title = typeof mongoFeature.title === "string" ? mongoFeature.title.trim() : "";
    if (!title) {
      continue;
    }

    const titleKey = title.toLowerCase();
    const existingCandidates = existingFeaturesByTitle.get(titleKey) || [];
    const docLocationIds = Array.isArray(mongoFeature.locationId)
      ? normalizeLocationIds(
          mongoFeature.locationId
            .map((value) => String(value))
            .map((id) => mongoLocationIdToPgId.get(id)),
        )
      : [];
    const targetLocationIds =
      docLocationIds.length > 0 ? docLocationIds : normalizeLocationIds(allSyncedLocationIds);
    const scopeKey = buildFeatureScopeKey(title, targetLocationIds);
    const exactExistingCandidate = getExactFeatureCandidate(existingCandidates, targetLocationIds);
    const fallbackExistingCandidate =
      existingCandidates.length > 0 ? pickFeatureCandidate(existingCandidates) : undefined;
    const existingCandidate = exactExistingCandidate || fallbackExistingCandidate;

    const tier = inferTier(title, existingCandidate?.tier);
    const price = toDecimal(
      mongoFeature.price,
      Number(existingCandidate?.price ?? 1),
    );
    const parsedJobApplications = parseLegacyJobApplications(
      mongoFeature.jobApplications,
      existingCandidate?.jobApplications ?? 0,
    );
    const jobApplications = parsedJobApplications.count;
    const cvResumeRequests = toNonNegativeInteger(
      mongoFeature.resumeDevelopment,
      existingCandidate?.cvResumeRequests ?? 1,
    );
    const screeningPrep = toNonNegativeInteger(mongoFeature.screeningPrep, 0);
    const interviewPrep = toNonNegativeInteger(mongoFeature.interviewPrep, 0);
    const resumeDevelopment = toNonNegativeInteger(
      mongoFeature.resumeDevelopment,
      0,
    );
    const validityPeriod =
      typeof mongoFeature.validityPeriod === "string" &&
      mongoFeature.validityPeriod.trim().length > 0
        ? mongoFeature.validityPeriod.trim()
        : existingCandidate?.validityPeriod || "12 months";
    const subscriptionBreak =
      typeof mongoFeature.subscriptionBreak === "string" &&
      mongoFeature.subscriptionBreak.trim().length > 0
        ? mongoFeature.subscriptionBreak.trim()
        : existingCandidate?.subscriptionBreak || "0 months";
    const pauseOptionMonths = parsePauseOptionMonths(
      subscriptionBreak,
      existingCandidate?.pauseOptionMonths ?? 0,
    );
    const profileLimit = toPositiveInteger(
      mongoFeature.profileLimit,
      existingCandidate?.profileLimit ?? 1,
    );
    const legacyExtraParts = new Set<string>();
    if (parsedJobApplications.label) {
      legacyExtraParts.add(parsedJobApplications.label);
    }

    for (const featureLine of normalizeOtherFeatures(mongoFeature.otherFeatures)) {
      legacyExtraParts.add(featureLine);
    }

    const legacyExtra = [...legacyExtraParts];
    const extra =
      legacyExtra.length > 0
        ? legacyExtra.join(", ")
        : mongoFeature.extra == null
          ? existingCandidate?.extra ?? null
          : String(mongoFeature.extra);
    const description = existingCandidate?.description ?? null;
    const isTopUp = existingCandidate?.isTopUp ?? false;
    const isActive = existingCandidate?.isActive ?? true;
    const docStamp = Math.max(
      toIsoOrZero(mongoFeature.updatedAt),
      toIsoOrZero(mongoFeature.createdAt),
    );

    const existingAggregate = syncedByScope.get(scopeKey);
    if (!existingAggregate) {
      syncedByScope.set(scopeKey, {
        title,
        tier,
        price,
        jobApplications,
        cvResumeRequests,
        screeningPrep,
        interviewPrep,
        resumeDevelopment,
        validityPeriod,
        subscriptionBreak,
        pauseOptionMonths,
        profileLimit,
        extra,
        description,
        isTopUp,
        isActive,
        locationIds: targetLocationIds,
        sourceDocs: 1,
        stamp: docStamp,
      });
      continue;
    }

    existingAggregate.sourceDocs += 1;

    if (docStamp >= existingAggregate.stamp) {
      existingAggregate.title = title;
      existingAggregate.tier = tier;
      existingAggregate.price = price;
      existingAggregate.jobApplications = jobApplications;
      existingAggregate.cvResumeRequests = cvResumeRequests;
      existingAggregate.screeningPrep = screeningPrep;
      existingAggregate.interviewPrep = interviewPrep;
      existingAggregate.resumeDevelopment = resumeDevelopment;
      existingAggregate.validityPeriod = validityPeriod;
      existingAggregate.subscriptionBreak = subscriptionBreak;
      existingAggregate.pauseOptionMonths = pauseOptionMonths;
      existingAggregate.profileLimit = profileLimit;
      existingAggregate.extra = extra;
      existingAggregate.description = description;
      existingAggregate.isTopUp = isTopUp;
      existingAggregate.isActive = isActive;
      existingAggregate.locationIds = targetLocationIds;
      existingAggregate.stamp = docStamp;
    }
  }

  for (const aggregate of syncedByScope.values()) {
    if (aggregate.locationIds.length === 0) {
      aggregate.locationIds = normalizeLocationIds(allSyncedLocationIds);
    }
  }

  return syncedByScope;
};

const run = async () => {
  const dryRun = process.argv.includes("--dry-run");
  const forceDeleteReferenced =
    process.env.SYNC_PRICING_FORCE_DELETE_REFERENCED === "true";

  const { uri: mongoUri, dbName } = resolveMongoConnection();

  await mongoose.connect(mongoUri, dbName ? { dbName } : undefined);

  const mongoLocations = await MongoLocationModel.find({})
    .lean<MongoLocationDoc[]>()
    .exec();
  const mongoFeatures = await MongoFeatureModel.find({})
    .lean<MongoFeatureDoc[]>()
    .exec();

  if (mongoLocations.length === 0) {
    throw new Error("No MongoDB locations found. Aborting sync.");
  }

  if (mongoFeatures.length === 0) {
    throw new Error("No MongoDB features found. Aborting sync.");
  }

  const mongoLocationIdToCurrency = new Map<string, string>();
  const canonicalLocationsByCurrency = new Map<
    string,
    { currencyCode: string; multiplier: string; sortStamp: number }
  >();

  for (const location of mongoLocations) {
    const currencyCode = normalizeCurrencyCode(location.currencyCode);
    if (!currencyCode) {
      continue;
    }

    mongoLocationIdToCurrency.set(String(location._id), currencyCode);
    const multiplier = normalizeMultiplier(location.multiplier);
    const sortStamp = Math.max(
      toIsoOrZero(location.updatedAt),
      toIsoOrZero(location.createdAt),
    );
    const existing = canonicalLocationsByCurrency.get(currencyCode);
    if (!existing || sortStamp >= existing.sortStamp) {
      canonicalLocationsByCurrency.set(currencyCode, {
        currencyCode,
        multiplier,
        sortStamp,
      });
    }
  }

  const canonicalLocations = [...canonicalLocationsByCurrency.values()];
  if (canonicalLocations.length === 0) {
    throw new Error("No valid MongoDB locations with currencyCode found.");
  }

  const pg = new PgClient({
    connectionString: buildPostgresConnectionString(),
    ssl: { rejectUnauthorized: false },
  });

  const counters = {
    locationsInserted: 0,
    locationsUpdated: 0,
    locationsDeleted: 0,
    locationsRetainedReferenced: 0,
    featuresInserted: 0,
    featuresUpdated: 0,
    featuresDeleted: 0,
    featuresRetainedReferenced: 0,
  };

  await pg.connect();

  try {
    await pg.query("BEGIN");

    const existingLocationsRes = await pg.query<ExistingLocationRow>(
      `select id, "currencyCode" from locations`,
    );

    const existingLocationByCurrency = new Map<string, ExistingLocationRow>();
    for (const row of existingLocationsRes.rows) {
      const normalized = normalizeCurrencyCode(row.currencyCode);
      if (!normalized) {
        continue;
      }
      if (!existingLocationByCurrency.has(normalized)) {
        existingLocationByCurrency.set(normalized, row);
      }
    }

    const syncedLocationIdsByCurrency = new Map<string, string>();

    for (const location of canonicalLocations) {
      const existing = existingLocationByCurrency.get(location.currencyCode);
      if (existing) {
        await pg.query(
          `update locations
           set "multiplier" = $2, "currencyCode" = $3, "updatedAt" = now()
           where id = $1`,
          [existing.id, location.multiplier, location.currencyCode],
        );
        counters.locationsUpdated += 1;
        syncedLocationIdsByCurrency.set(location.currencyCode, existing.id);
        continue;
      }

      const newId = uuidv4();
      await pg.query(
        `insert into locations ("id","currencyCode","multiplier","createdAt","updatedAt")
         values ($1,$2,$3,now(),now())`,
        [newId, location.currencyCode, location.multiplier],
      );
      counters.locationsInserted += 1;
      syncedLocationIdsByCurrency.set(location.currencyCode, newId);
    }

    const mongoLocationIdToPgId = new Map<string, string>();
    for (const [mongoId, currencyCode] of mongoLocationIdToCurrency.entries()) {
      const mappedPgId = syncedLocationIdsByCurrency.get(currencyCode);
      if (mappedPgId) {
        mongoLocationIdToPgId.set(mongoId, mappedPgId);
      }
    }

    const allSyncedLocationIds = [...new Set(syncedLocationIdsByCurrency.values())];

    const existingFeaturesRes = await pg.query<ExistingFeatureRow>(
      `select
         f.id,
         f.title,
         f.tier,
         f.price,
         f."jobApplications",
         f."cvResumeRequests",
         f."validityPeriod",
         f."subscriptionBreak",
         f."profileLimit",
         f."pauseOptionMonths",
         f.description,
         f.extra,
         f."isTopUp",
         f."isActive",
         f."locationIds",
         coalesce(count(p.id), 0)::int as "planCount"
       from features f
       left join plans p
         on p."featureId" = f.id
         and p."deletedAt" is null
       group by
         f.id,
         f.title,
         f.tier,
         f.price,
         f."jobApplications",
         f."cvResumeRequests",
         f."validityPeriod",
         f."subscriptionBreak",
         f."profileLimit",
         f."pauseOptionMonths",
         f.description,
         f.extra,
         f."isTopUp",
         f."isActive",
         f."locationIds"`,
    );

    const existingFeaturesByTitle = new Map<string, ExistingFeatureRow[]>();
    for (const row of existingFeaturesRes.rows) {
      const key = row.title.trim().toLowerCase();
      const list = existingFeaturesByTitle.get(key) || [];
      list.push(row);
      existingFeaturesByTitle.set(key, list);
    }

    const syncedFeaturesByScope = buildSyncedFeatures(
      mongoFeatures,
      mongoLocationIdToPgId,
      allSyncedLocationIds,
      existingFeaturesByTitle,
    );

    const keptFeatureIds = new Set<string>();

    for (const aggregate of syncedFeaturesByScope.values()) {
      const titleKey = aggregate.title.trim().toLowerCase();
      const candidates = existingFeaturesByTitle.get(titleKey) || [];
      const candidate = getExactFeatureCandidate(candidates, aggregate.locationIds);
      const locationIds = normalizeLocationIds(aggregate.locationIds);

      if (candidate) {
        await pg.query(
          `update features
           set
             title = $2,
             tier = $3,
             price = $4,
             "jobApplications" = $5,
             "cvResumeRequests" = $6,
             "screeningPrep" = $7,
             "interviewPrep" = $8,
             "resumeDevelopment" = $9,
             "validityPeriod" = $10,
             "pauseOptionMonths" = $11,
             "subscriptionBreak" = $12,
             "profileLimit" = $13,
             "isTopUp" = $14,
             description = $15,
             extra = $16,
             "isActive" = $17,
             "locationIds" = $18::uuid[],
             "updatedAt" = now()
           where id = $1`,
          [
            candidate.id,
            aggregate.title,
            aggregate.tier,
            aggregate.price,
            aggregate.jobApplications,
            aggregate.cvResumeRequests,
            aggregate.screeningPrep,
            aggregate.interviewPrep,
            aggregate.resumeDevelopment,
            aggregate.validityPeriod,
            aggregate.pauseOptionMonths,
            aggregate.subscriptionBreak,
            aggregate.profileLimit,
            aggregate.isTopUp,
            aggregate.description,
            aggregate.extra,
            aggregate.isActive,
            locationIds,
          ],
        );
        counters.featuresUpdated += 1;
        keptFeatureIds.add(candidate.id);
        continue;
      }

      const newFeatureId = uuidv4();
      await pg.query(
        `insert into features (
           id,
           title,
           tier,
           price,
           "jobApplications",
           "cvResumeRequests",
           "screeningPrep",
           "interviewPrep",
           "resumeDevelopment",
           "validityPeriod",
           "pauseOptionMonths",
           "subscriptionBreak",
           "profileLimit",
           "isTopUp",
           description,
           extra,
           "isActive",
           "locationIds",
           "createdAt",
           "updatedAt"
         ) values (
           $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18::uuid[],now(),now()
         )`,
        [
          newFeatureId,
          aggregate.title,
          aggregate.tier,
          aggregate.price,
          aggregate.jobApplications,
          aggregate.cvResumeRequests,
          aggregate.screeningPrep,
          aggregate.interviewPrep,
          aggregate.resumeDevelopment,
          aggregate.validityPeriod,
          aggregate.pauseOptionMonths,
          aggregate.subscriptionBreak,
          aggregate.profileLimit,
          aggregate.isTopUp,
          aggregate.description,
          aggregate.extra,
          aggregate.isActive,
          locationIds,
        ],
      );
      counters.featuresInserted += 1;
      keptFeatureIds.add(newFeatureId);
    }

    for (const feature of existingFeaturesRes.rows) {
      if (keptFeatureIds.has(feature.id)) {
        continue;
      }

      const featureScopeKey = buildFeatureScopeKey(
        feature.title,
        feature.locationIds || [],
      );
      if (syncedFeaturesByScope.has(featureScopeKey)) {
        keptFeatureIds.add(feature.id);
        continue;
      }

      if (feature.planCount > 0 && !forceDeleteReferenced) {
        counters.featuresRetainedReferenced += 1;
        continue;
      }

      await pg.query(`delete from features where id = $1`, [feature.id]);
      counters.featuresDeleted += 1;
    }

    const syncedLocationIdsSet = new Set(syncedLocationIdsByCurrency.values());
    for (const location of existingLocationsRes.rows) {
      if (syncedLocationIdsSet.has(location.id)) {
        continue;
      }

      const locationUsage = await pg.query<{ total: number }>(
        `select count(*)::int as total from users where "locationId" = $1`,
        [location.id],
      );
      const usageCount = locationUsage.rows[0]?.total ?? 0;

      if (usageCount > 0 && !forceDeleteReferenced) {
        counters.locationsRetainedReferenced += 1;
        continue;
      }

      await pg.query(`delete from locations where id = $1`, [location.id]);
      counters.locationsDeleted += 1;
    }

    const postSyncSummary = await pg.query<{
      locationCount: number;
      featureCount: number;
      mappedFeatureCount: number;
    }>(
      `select
         (select count(*)::int from locations) as "locationCount",
         (select count(*)::int from features) as "featureCount",
         (select count(*)::int from features where coalesce(array_length("locationIds", 1), 0) > 0) as "mappedFeatureCount"`,
    );

    const summary = {
      mode: dryRun ? "dry-run" : "apply",
      mongo: {
        locationDocs: mongoLocations.length,
        featureDocs: mongoFeatures.length,
        canonicalCurrencies: canonicalLocations.length,
      },
      actions: counters,
      postgresAfterSync: postSyncSummary.rows[0],
      flags: {
        forceDeleteReferenced,
      },
    };

    if (dryRun) {
      await pg.query("ROLLBACK");
    } else {
      await pg.query("COMMIT");
    }

    console.log(JSON.stringify(summary, null, 2));
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
  console.error(`Mongo -> Postgres pricing sync failed: ${message}`);
  process.exit(1);
});
