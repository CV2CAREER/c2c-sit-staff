/**
 * Marks every Q&A entry in the Redis SUPPORT_AI_PROMPT as Retired, keeping the
 * question and answer text exactly as it is.
 *
 *   npx tsx src/scripts/retire-support-ai-prompt.ts           # dry run (default)
 *   npx tsx src/scripts/retire-support-ai-prompt.ts --apply   # write to Redis
 *
 * Each entry gets two lines appended after its answer:
 *   STATUS: Retired
 *   RETIRED_ON: 30-09-2026
 *
 * Before writing, the current value is copied to SUPPORT_AI_PROMPT_BACKUP_<date>
 * (never overwritten if it already exists). Entries that already carry a
 * STATUS line are skipped, so the script is safe to re-run.
 */
import "../config/env";
import { REDIS_HOST } from "../config/env";
import { getConnectedRedis, disconnectRedis } from "../config/redis";

const PROMPT_KEY = "SUPPORT_AI_PROMPT";
const RETIRED_ON = "30-09-2026";
const BACKUP_KEY = `${PROMPT_KEY}_BACKUP_${RETIRED_ON.split("-").reverse().join("")}`;

// One entry = "QUESTION: … ANSWER: …" up to the next QUESTION or end of text.
const ENTRY_REGEX = /QUESTION:[\s\S]*?ANSWER:[\s\S]*?(?=\s*QUESTION:|\s*$)/g;

// Question/answer text with any status lines removed — used to prove nothing
// but the labels changed.
const extractQA = (prompt: string) =>
  (prompt.match(ENTRY_REGEX) || []).map((entry) => {
    const [, question = "", answer = ""] =
      entry.match(/QUESTION:\s*([\s\S]*?)\s*ANSWER:\s*([\s\S]*?)(?:\s*STATUS:[\s\S]*)?$/) || [];
    return { question: question.trim(), answer: answer.trim() };
  });

const retire = (prompt: string) => {
  let retired = 0;
  let skipped = 0;
  const updated = prompt.replace(ENTRY_REGEX, (entry) => {
    if (/\bSTATUS:/.test(entry)) {
      skipped++;
      return entry;
    }
    retired++;
    return `${entry}\nSTATUS: Retired\nRETIRED_ON: ${RETIRED_ON}`;
  });
  return { updated, retired, skipped };
};

const apply = process.argv.includes("--apply");

(async () => {
  const redis = await getConnectedRedis();
  if (!redis) throw new Error("Redis unavailable");

  console.log(`\nRedis: ${REDIS_HOST} · Mode: ${apply ? "APPLY" : "DRY RUN"}\n`);

  const current = await redis.get(PROMPT_KEY);
  if (!current) throw new Error(`${PROMPT_KEY} is empty or missing — nothing to retire`);

  const { updated, retired, skipped } = retire(current);

  const before = JSON.stringify(extractQA(current));
  const after = JSON.stringify(extractQA(updated));
  if (before !== after) {
    throw new Error("Question/answer content would change — aborting without writing");
  }

  console.log(`Entries found: ${extractQA(current).length} · to retire: ${retired} · already have a status: ${skipped}`);
  console.log("Question/answer content check: unchanged ✅\n");
  console.log("===== NEW VALUE =====");
  console.log(updated);
  console.log("=====================\n");

  if (!apply) {
    console.log("Dry run — nothing written. Re-run with --apply to save.");
  } else if (retired === 0) {
    console.log("Nothing to change.");
  } else {
    const backedUp = await redis.set(BACKUP_KEY, current, "NX");
    console.log(backedUp ? `Backup saved to ${BACKUP_KEY}` : `Backup ${BACKUP_KEY} already exists — kept as is`);
    await redis.set(PROMPT_KEY, updated);
    console.log(`✅ ${PROMPT_KEY} updated — ${retired} entr${retired === 1 ? "y" : "ies"} marked Retired.`);
  }

  await disconnectRedis();
  process.exit(0);
})().catch(async (error) => {
  console.error("Failed:", error.message);
  await disconnectRedis().catch(() => {});
  process.exit(1);
});
