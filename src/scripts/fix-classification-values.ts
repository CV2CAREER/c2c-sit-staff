import { Op } from "sequelize";
import { getServiceLogger } from "../utils/createLogger";
import { DropdownOption } from "../models/v1/dropdown-option.model";
import { Profile } from "../models/v1/profile.model";

const logger = getServiceLogger("fix-classification-values");

type ClassificationEntry = { id?: string; name?: string; [key: string]: unknown };

const BATCH_SIZE = 200;

/**
 * One-time data fix for a pre-existing inconsistency (not introduced by the
 * dropdown-options migration, but surfaced by unifying Industries &
 * Classifications onto one DB-backed source): the onboarding wizard has
 * always saved a classification's `id` as its real classification id (e.g.
 * '6140'), but the dashboard Job Preferences page's Tab2 saved `id` as the
 * classification's display NAME instead (since its old options list only
 * had a flat name string, with no separate id). Both paths wrote into the
 * same `profiles.classifications` / `profiles.classificationsExcluded`
 * JSONB columns.
 *
 * This rewrites any entry whose `id` doesn't match a real seeded
 * classification id, but whose `name` (or `id`, since they're equal in the
 * buggy case) matches a seeded classification's label — to the correct id.
 * Entries that already have a valid id, or that don't match anything at all
 * (e.g. a classification that's since been removed), are left untouched.
 */
export const fixClassificationValues = async (): Promise<void> => {
  const classificationRows = await DropdownOption.findAll({
    where: { listKey: "industries", parentId: { [Op.ne]: null } },
    attributes: ["id", "value", "label"],
  });

  const validIds = new Set(classificationRows.map((r) => r.value));
  const labelToId = new Map<string, string>();
  for (const row of classificationRows) {
    labelToId.set(row.label.trim().toLowerCase(), row.value);
  }

  logger.info(`Loaded ${classificationRows.length} seeded classification(s) for lookup`);

  const fixEntry = (entry: ClassificationEntry): { fixed: ClassificationEntry; changed: boolean } => {
    if (!entry || typeof entry !== "object") return { fixed: entry, changed: false };
    const currentId = typeof entry.id === "string" ? entry.id : "";
    if (currentId && validIds.has(currentId)) return { fixed: entry, changed: false };

    const nameCandidate = typeof entry.name === "string" && entry.name.trim() ? entry.name : currentId;
    const correctId = labelToId.get(nameCandidate.trim().toLowerCase());
    if (!correctId || correctId === currentId) return { fixed: entry, changed: false };

    return { fixed: { ...entry, id: correctId }, changed: true };
  };

  const fixArray = (arr: unknown): { fixed: ClassificationEntry[]; changedCount: number } => {
    if (!Array.isArray(arr) || arr.length === 0) return { fixed: (arr as ClassificationEntry[]) || [], changedCount: 0 };
    let changedCount = 0;
    const fixed = arr.map((entry) => {
      const result = fixEntry(entry as ClassificationEntry);
      if (result.changed) changedCount += 1;
      return result.fixed;
    });
    return { fixed, changedCount };
  };

  let offset = 0;
  let profilesScanned = 0;
  let profilesUpdated = 0;
  let entriesFixed = 0;

  for (;;) {
    const batch = await Profile.findAll({
      attributes: ["id", "classifications", "classificationsExcluded"],
      order: [["id", "ASC"]],
      limit: BATCH_SIZE,
      offset,
    });
    if (batch.length === 0) break;

    for (const profile of batch) {
      profilesScanned += 1;
      const includedResult = fixArray(profile.classifications);
      const excludedResult = fixArray(profile.classificationsExcluded);
      const totalChanged = includedResult.changedCount + excludedResult.changedCount;

      if (totalChanged > 0) {
        await profile.update({
          classifications: includedResult.fixed,
          classificationsExcluded: excludedResult.fixed,
        });
        profilesUpdated += 1;
        entriesFixed += totalChanged;
        logger.info(`Profile ${profile.id}: fixed ${totalChanged} classification entr${totalChanged === 1 ? "y" : "ies"}`);
      }
    }

    offset += BATCH_SIZE;
  }

  logger.info(
    `Classification value fix complete — scanned ${profilesScanned} profile(s), updated ${profilesUpdated}, fixed ${entriesFixed} entr${entriesFixed === 1 ? "y" : "ies"} total`,
  );
};

// Standalone entrypoint — run directly with:
//   npx tsx src/scripts/fix-classification-values.ts
if (require.main === module) {
  require("dotenv").config();
  const { getSequelize } = require("../utils/sequelize");

  (async () => {
    const sequelize = getSequelize();
    try {
      await sequelize.authenticate();
      logger.info("Connected to database");
      await fixClassificationValues();
      await sequelize.close();
      process.exit(0);
    } catch (error) {
      logger.error("Classification value fix failed:", error);
      try {
        await sequelize.close();
      } catch {
        // ignore
      }
      process.exit(1);
    }
  })();
}
