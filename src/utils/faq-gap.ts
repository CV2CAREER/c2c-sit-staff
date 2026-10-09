import { QueryTypes } from "sequelize";
import { getSequelize } from "./sequelize";
import { getServiceLogger } from "./createLogger";

/**
 * FAQ Gap Log (S.ADM.12.02.IR02A) — every question a bot could not answer.
 * Shared by c2c-customer-backend (client chatbot) and c2c-staff-backend
 * (admin/PC VA); keep both copies of this file in sync. Staff read it on
 * Communication → FAQ → Gap Log.
 */

const logger = getServiceLogger("faq-gap");

export type FaqGapSource = "client" | "admin" | "pc";

/** The bot appends this when it has no answer; it is stripped before the reply is shown. */
export const NO_ANSWER_MARKER = "[[NO_ANSWER]]";

export const NO_ANSWER_INSTRUCTION = `**Unanswered questions**
If you cannot answer the question from the information you have about CVtoCAREER (or the context provided), say so plainly — never guess — and end your reply with the exact token ${NO_ANSWER_MARKER} on its own line. Do not use the token in any other case.`;

/** Removes the marker; `noAnswer` is true when the bot declined. */
export function extractNoAnswer(content: string): { clean: string; noAnswer: boolean } {
  if (!content || !content.includes(NO_ANSWER_MARKER)) return { clean: content, noAnswer: false };
  return { clean: content.split(NO_ANSWER_MARKER).join("").trim(), noAnswer: true };
}

const normalize = (q: string) =>
  q.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim().slice(0, 500);

let tableReady: Promise<unknown> | null = null;
function ensureTable() {
  if (!tableReady) {
    tableReady = getSequelize()
      .query(`
        CREATE TABLE IF NOT EXISTS faq_gaps (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          question TEXT NOT NULL,
          "normalizedQuestion" TEXT NOT NULL UNIQUE,
          "askCount" INTEGER NOT NULL DEFAULT 0,
          "clientCount" INTEGER NOT NULL DEFAULT 0,
          "adminCount" INTEGER NOT NULL DEFAULT 0,
          "pcCount" INTEGER NOT NULL DEFAULT 0,
          status VARCHAR(20) NOT NULL DEFAULT 'open',
          "faqArticleId" UUID NULL,
          "lastAskedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )`)
      .catch((err) => {
        tableReady = null;
        throw err;
      });
  }
  return tableReady;
}

/** Fire-and-forget: a logging failure must never break the chat reply. */
export function recordFaqGap(question: string, source: FaqGapSource): void {
  const text = (question || "").trim();
  const normalizedQuestion = normalize(text);
  if (!normalizedQuestion) return;

  const sourceColumn = { client: "clientCount", admin: "adminCount", pc: "pcCount" }[source];

  setImmediate(async () => {
    try {
      await ensureTable();
      // A gap that was already answered (converted) or dismissed reopens when asked again.
      await getSequelize().query(
        `INSERT INTO faq_gaps (question, "normalizedQuestion", "askCount", "${sourceColumn}")
         VALUES (:question, :normalizedQuestion, 1, 1)
         ON CONFLICT ("normalizedQuestion") DO UPDATE SET
           "askCount" = faq_gaps."askCount" + 1,
           "${sourceColumn}" = faq_gaps."${sourceColumn}" + 1,
           status = 'open',
           "lastAskedAt" = NOW(),
           "updatedAt" = NOW()`,
        { replacements: { question: text.slice(0, 2000), normalizedQuestion }, type: QueryTypes.INSERT },
      );
    } catch (err: any) {
      logger.error(`Failed to record FAQ gap: ${err.message}`);
    }
  });
}

export interface FaqGapRow {
  id: string;
  question: string;
  askCount: number;
  clientCount: number;
  adminCount: number;
  pcCount: number;
  status: "open" | "converted" | "dismissed";
  faqArticleId: string | null;
  lastAskedAt: string;
  createdAt: string;
}

export async function listFaqGaps(status: string = "open"): Promise<FaqGapRow[]> {
  await ensureTable();
  return getSequelize().query<FaqGapRow>(
    `SELECT id, question, "askCount", "clientCount", "adminCount", "pcCount", status,
            "faqArticleId", "lastAskedAt", "createdAt"
       FROM faq_gaps
      WHERE (:status = 'all' OR status = :status)
      ORDER BY "askCount" DESC, "lastAskedAt" DESC
      LIMIT 500`,
    { replacements: { status }, type: QueryTypes.SELECT },
  );
}

export async function updateFaqGapStatus(
  id: string,
  status: "open" | "converted" | "dismissed",
  faqArticleId?: string | null,
): Promise<boolean> {
  await ensureTable();
  const [, affected] = (await getSequelize().query(
    `UPDATE faq_gaps SET status = :status, "faqArticleId" = COALESCE(:faqArticleId, "faqArticleId"), "updatedAt" = NOW()
      WHERE id = :id`,
    { replacements: { id, status, faqArticleId: faqArticleId ?? null }, type: QueryTypes.UPDATE },
  )) as [unknown, number];
  return affected > 0;
}
