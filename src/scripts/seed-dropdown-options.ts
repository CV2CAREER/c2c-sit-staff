import fs from "fs";
import path from "path";
import { getServiceLogger } from "../utils/createLogger";
import { DropdownOption } from "../models/v1/dropdown-option.model";

const logger = getServiceLogger("seed-dropdown-options");

// Fixtures are a one-time JSON export of what used to be hardcoded in
// c2c-customer-rft's src/data/options.ts, src/data/salaryOptions.ts, and
// src/constants/situations.ts — generated (not hand-transcribed) to avoid
// transcription drift across ~3,750 total entries. See src/scripts/fixtures/.
const FIXTURES_DIR = path.join(__dirname, "fixtures");
const loadFixture = <T>(filename: string): T =>
  JSON.parse(fs.readFileSync(path.join(FIXTURES_DIR, filename), "utf8"));

type FlatOption = { label: string; value: string | number; id?: string | number };
type GroupedOption<Child> = { label: string; options: Child[] };
type ClassificationChild = { id: string; name: string };
type SalaryChild = { label: string; value: number };
type WorkingRightChild = { label: string; value: string };

const findOrCreateTopLevel = async (
  listKey: string,
  value: string,
  label: string,
  sortOrder: number,
  extra: Partial<{ isSystem: boolean; metadata: Record<string, unknown> | null }> = {},
) => {
  const [row, wasCreated] = await DropdownOption.findOrCreate({
    where: { listKey, parentId: null, value },
    defaults: {
      listKey,
      parentId: null,
      value,
      label,
      sortOrder,
      isSystem: extra.isSystem ?? false,
      metadata: extra.metadata ?? null,
    },
  });
  return { row, wasCreated };
};

const findOrCreateChild = async (
  listKey: string,
  parentId: string,
  value: string,
  label: string,
  sortOrder: number,
) => {
  const [, wasCreated] = await DropdownOption.findOrCreate({
    where: { listKey, parentId, value },
    defaults: { listKey, parentId, value, label, sortOrder },
  });
  return wasCreated;
};

// job_types — flat, "All" is a system sentinel (load-bearing for the
// mutual-exclusivity logic on the wizard/dashboard, see Step2Filters.tsx).
const seedJobTypes = async (): Promise<number> => {
  const entries = loadFixture<FlatOption[]>("job-types.json");
  let created = 0;
  for (let i = 0; i < entries.length; i += 1) {
    const e = entries[i];
    const value = String(e.value);
    const { wasCreated } = await findOrCreateTopLevel("job_types", value, e.label, i, {
      isSystem: value === "All",
    });
    if (wasCreated) created += 1;
  }
  return created;
};

// situations — flat strings, label === value.
const seedSituations = async (): Promise<number> => {
  const entries = loadFixture<string[]>("situations.json");
  let created = 0;
  for (let i = 0; i < entries.length; i += 1) {
    const { wasCreated } = await findOrCreateTopLevel("situations", entries[i], entries[i], i);
    if (wasCreated) created += 1;
  }
  return created;
};

// advertisers — flat, ~3,350 entries. The static array's "id" field
// (e.g. '-1' for the 'All' sentinel) is preserved in metadata for audit
// trail only — `value` (the name) is the persisted-selection key.
const seedAdvertisers = async (): Promise<number> => {
  const entries = loadFixture<FlatOption[]>("advertisers.json");
  let created = 0;
  for (let i = 0; i < entries.length; i += 1) {
    const e = entries[i];
    const value = String(e.value);
    const { wasCreated } = await findOrCreateTopLevel("advertisers", value, e.label, i, {
      isSystem: value === "All",
      metadata: e.id !== undefined ? { legacyId: e.id } : null,
    });
    if (wasCreated) created += 1;
  }
  return created;
};

// industries -> classifications, two-level. Child `value` is the original
// classification id (e.g. '6140') — this is what the wizard already
// persists into classificationsIncluded/Excluded, must not change.
const seedIndustries = async (): Promise<number> => {
  const groups = loadFixture<GroupedOption<ClassificationChild>[]>("industries-classifications.json");
  let created = 0;
  for (let i = 0; i < groups.length; i += 1) {
    const group = groups[i];
    const { row, wasCreated } = await findOrCreateTopLevel("industries", group.label, group.label, i);
    if (wasCreated) created += 1;
    for (let j = 0; j < group.options.length; j += 1) {
      const child = group.options[j];
      const childCreated = await findOrCreateChild("industries", row.id, child.id, child.name, j);
      if (childCreated) created += 1;
    }
  }
  return created;
};

// salary_amounts -> periods (Anually/Monthly/Hourly) -> amounts, two-level.
// Child `value` is the numeric amount as a string — Step2Filters.tsx compares
// these as numbers, coercion happens at the customer-backend read boundary.
const seedSalaryAmounts = async (): Promise<number> => {
  const groups = loadFixture<GroupedOption<SalaryChild>[]>("salary-amounts.json");
  let created = 0;
  for (let i = 0; i < groups.length; i += 1) {
    const group = groups[i];
    const { row, wasCreated } = await findOrCreateTopLevel("salary_amounts", group.label, group.label, i);
    if (wasCreated) created += 1;
    for (let j = 0; j < group.options.length; j += 1) {
      const child = group.options[j];
      const childCreated = await findOrCreateChild(
        "salary_amounts",
        row.id,
        String(child.value),
        child.label,
        j,
      );
      if (childCreated) created += 1;
    }
  }
  return created;
};

// working_rights -> countries (+ one 'generic' fallback parent) -> visa/right
// entries, two-level. Parent `value` is the lowercased country name, matching
// getWorkingRightsByCountry's existing lookup key exactly.
const seedWorkingRights = async (): Promise<number> => {
  const byCountry = loadFixture<Record<string, WorkingRightChild[]>>("working-rights.json");
  let created = 0;
  let i = 0;
  for (const [countryKey, rights] of Object.entries(byCountry)) {
    const isGeneric = countryKey === "generic";
    const label = isGeneric
      ? "Generic (fallback for unlisted countries)"
      : countryKey.replace(/\b\w/g, (c) => c.toUpperCase());
    const { row, wasCreated } = await findOrCreateTopLevel("working_rights", countryKey, label, i, {
      isSystem: isGeneric,
    });
    if (wasCreated) created += 1;
    for (let j = 0; j < rights.length; j += 1) {
      const right = rights[j];
      const childCreated = await findOrCreateChild("working_rights", row.id, right.value, right.label, j);
      if (childCreated) created += 1;
    }
    i += 1;
  }
  return created;
};

/**
 * Idempotent — existing rows (matched by listKey + parentId + value) are
 * left untouched, so re-running this after an admin has already edited a
 * row doesn't clobber their changes.
 */
export const seedDropdownOptions = async (): Promise<void> => {
  const jobTypes = await seedJobTypes();
  const situations = await seedSituations();
  const industries = await seedIndustries();
  const salaryAmounts = await seedSalaryAmounts();
  const workingRights = await seedWorkingRights();
  const advertisers = await seedAdvertisers();

  logger.info(
    `Dropdown option seed complete — job_types: ${jobTypes}, situations: ${situations}, ` +
      `industries: ${industries}, salary_amounts: ${salaryAmounts}, working_rights: ${workingRights}, ` +
      `advertisers: ${advertisers} rows created (existing rows left untouched)`,
  );
};

// Standalone entrypoint — run directly with:
//   npx tsx src/scripts/seed-dropdown-options.ts
if (require.main === module) {
  require("dotenv").config();
  const { getSequelize } = require("../utils/sequelize");

  (async () => {
    const sequelize = getSequelize();
    try {
      await sequelize.authenticate();
      logger.info("Connected to database");
      // Targeted, single-model sync — creates the dropdown_options table on
      // first run only, without touching any other model's schema (mirrors
      // ClientContentService.ensureClientContentTable's approach for
      // introducing a new table against the shared DB).
      await DropdownOption.sync({ force: false });
      await seedDropdownOptions();
      await sequelize.close();
      process.exit(0);
    } catch (error) {
      logger.error("Dropdown option seed failed:", error);
      try {
        await sequelize.close();
      } catch {
        // ignore
      }
      process.exit(1);
    }
  })();
}
