import ErrorHandler from "@/utils/errorHandler";
import { Upload } from "@/models/v1/upload.model";
import { Profile } from "@/models/v1/profile.model";
import { MissingInfoTemplate } from "@/models/v1/missing-info-template.model";
import { FaqService, normalizeQuestion } from "@/services/admin/faq.service";
import { callGradientAgent } from "@/utils/digital-factory";
import { extractPageContent } from "@/utils/factory";
import { getServiceLogger } from "@/utils/createLogger";
import { isSafePublicUrl } from "./url-guard";

const logger = getServiceLogger("selection-criteria-assistant");

const MAX_QUESTIONS = 15;
const MAX_JOB_AD_CHARS = 4000;
const MIN_JOB_AD_CHARS = 200;

/**
 * Questions about facts only the client can give (SPR-20-01 "private"):
 * never drafted, routed to Missing Information instead. Keyword rules, so they
 * are predictable and auditable rather than left to the model.
 */
const PRIVATE_PATTERNS: RegExp[] = [
  /\bvisa\b/i,
  /\bimmigration\b/i,
  /\bcitizen(ship)?\b/i,
  /\bresiden(cy|t status|ce status)\b/i,
  /\bwork(ing)? rights?\b/i,
  /\bwork permit\b/i,
  /\bright to work\b/i,
  /\bsponsor(ship)?\b/i,
  /\bpassport\b/i,
  /\bcertif(ied|icate|ication)/i,
  /\blicen[cs]e[ds]?\b/i,
  /\b(security|police|background|criminal|working with children) (clearance|check|record)s?\b/i,
  /\bclearance\b/i,
  /\bmedical\b/i,
  /\bdisabilit(y|ies)\b/i,
  /\bdate of birth\b/i,
  /\bconfined space\b/i,
];

const STOPWORDS = new Set([
  "what", "your", "have", "with", "from", "that", "this", "when", "date", "does", "describe",
  "current", "please", "provide", "details", "information", "hold", "valid", "about",
]);

const significantTokens = (text: string) =>
  text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 3 && !STOPWORDS.has(w));

/**
 * Splits pasted criteria into individual questions:
 *  - one per line,
 *  - inline numbering on a single line ("1. Describe X 2. Describe Y"),
 *  - several questions in one line ("…team? Describe…").
 * Numbering and bullets are dropped and duplicates removed.
 */
export function parseQuestions(raw: string) {
  const seen = new Set<string>();
  return raw
    .split(/\r?\n/)
    // "… 2. Next question" / "… (3) Next" → break before each inline number.
    .flatMap((line) => line.split(/\s+(?=\(?\d{1,2}[.)]\s+\S)/))
    // "…a team? Describe…" → break after a question mark that starts a new sentence.
    .flatMap((part) => part.split(/(?<=\?)\s+(?=[A-Z(])/))
    .map((line) =>
      line
        .replace(/^\s*(?:[-*•▪◦]|\(?\d{1,2}[.)]|\(?[a-zA-Z][.)])\s+/, "")
        .trim(),
    )
    .filter((line) => line.length > 3)
    .filter((line) => {
      const key = line.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, MAX_QUESTIONS);
}

const isPrivate = (question: string) => PRIVATE_PATTERNS.some((p) => p.test(question));

export type Classification = "public" | "private";
export type ClassifiedQuestion = { question: string; classification: Classification };

type EvidenceItem = { id: string; source: string; text: string };

const cvLabel = (upload: Upload) =>
  upload.document?.name || `CV uploaded ${upload.createdAt.toISOString().slice(0, 10)}`;

/**
 * Evidence = what the selected CV upload and the client's profile actually
 * say. Each item gets an id the model must cite; anything it cites that isn't
 * here is discarded, so evidence shown to the PC is always our own text.
 */
async function buildEvidence(clientId: string, upload: Upload): Promise<EvidenceItem[]> {
  const items: EvidenceItem[] = [];
  const add = (source: string, text?: string | null) => {
    const clean = (text ?? "").replace(/\s+/g, " ").trim();
    if (clean.length > 2) items.push({ id: `E${items.length + 1}`, source, text: clean.slice(0, 600) });
  };

  const cv = cvLabel(upload);
  const points = upload.cvDataPoints;
  if (points) {
    add(`${cv} — Summary`, points.professionalSummary);
    for (const w of points.workExperience ?? []) {
      add(
        `${cv} — ${[w.jobTitle, w.organization, w.dates].filter(Boolean).join(", ")}`,
        w.description || [w.jobTitle, w.organization].filter(Boolean).join(" at "),
      );
    }
    for (const e of points.education ?? []) {
      add(`${cv} — Education`, [e.degree, e.organization, e.dates, e.description].filter(Boolean).join(", "));
    }
    for (const c of points.certificationsLicenses ?? []) {
      add(`${cv} — Certification`, [c.name, c.organization, c.dates].filter(Boolean).join(", "));
    }
    if (points.skills?.length) add(`${cv} — Skills`, points.skills.join(", "));
    for (const a of points.achievements ?? []) add(`${cv} — Achievement`, a);
    for (const p of points.relevantProjects ?? []) add(`${cv} — Project`, p);
    if (points.languages?.length) add(`${cv} — Languages`, points.languages.join(", "));
  }
  if (upload.cvJobTitles?.length) add(`${cv} — Job titles held`, upload.cvJobTitles.join(", "));
  if (upload.keywords?.length) add(`${cv} — Keywords`, upload.keywords.join(", "));

  // Non-private answers the client gave on their profile.
  const profiles = await Profile.findAll({ where: { userId: clientId }, attributes: ["questions"] });
  for (const profile of profiles) {
    for (const q of profile.questions ?? []) {
      if (q && !q.private && q.answer) add(`Profile — ${q.question}`, q.answer);
    }
  }

  return items;
}

type AiDraft = { q: number; evidence: string[]; drafts: string[] };

/** Pulls the first JSON object out of the model's reply. */
function parseAiJson(text: string): AiDraft[] | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    const parsed = JSON.parse(text.slice(start, end + 1));
    return Array.isArray(parsed?.answers) ? parsed.answers : null;
  } catch {
    return null;
  }
}

async function draftWithAi(
  questions: string[],
  evidence: EvidenceItem[],
  jobAd: string,
  sessionId: string,
): Promise<AiDraft[] | null> {
  const evidenceBlock = evidence.length
    ? evidence.map((e) => `[${e.id}] (${e.source}) ${e.text}`).join("\n")
    : "(none on file)";

  const prompt = `[Task from the CVtoCAREER staff platform — not typed by a client]
You draft selection-criteria responses for a job application, written in the first person as the candidate.

RULES
- Use only the EVIDENCE below for any claim about the candidate. Never invent employers, numbers, dates or qualifications.
- For each question, list the evidence ids you relied on. If no evidence supports it, return an empty evidence list and write cautious, general drafts that make no specific factual claims.
- Write exactly 2 alternative drafts per question, each 2–4 sentences.
- Reply with JSON only, no other text, in this shape:
{"answers":[{"q":1,"evidence":["E1"],"drafts":["...","..."]}]}

JOB ADVERTISEMENT
${jobAd.slice(0, MAX_JOB_AD_CHARS)}

EVIDENCE
${evidenceBlock}

QUESTIONS
${questions.map((q, i) => `${i + 1}. ${q}`).join("\n")}`;

  const res = await callGradientAgent([{ role: "user", content: prompt }], sessionId);
  const content: string =
    res?.choices?.[0]?.message?.content ?? res?.choices?.[0]?.text ?? res?.output ?? res?.content ?? "";
  const parsed = parseAiJson(content);
  if (!parsed) logger.warn("Selection criteria: AI reply was not valid JSON");
  return parsed;
}

export type CriteriaResult =
  | {
      type: "private";
      question: string;
      template: { id: string; name: string } | null;
    }
  | {
      type: "public";
      question: string;
      bank: "matched" | "pending" | "new";
      bankCode: string;
      evidence: { source: string; text: string }[];
      candidates: { text: string; source: "db" | "ai-evidence" | "ai-intuition" }[];
    };

/** Validates the PC-confirmed list sent back for step 2. */
function parseConfirmedItems(items: unknown): ClassifiedQuestion[] {
  if (!Array.isArray(items)) return [];
  const seen = new Set<string>();
  return items
    .filter(
      (item): item is ClassifiedQuestion =>
        !!item &&
        typeof item.question === "string" &&
        (item.classification === "public" || item.classification === "private"),
    )
    .map((item) => ({ question: item.question.trim().slice(0, 500), classification: item.classification }))
    .filter((item) => {
      const key = item.question.toLowerCase();
      if (!item.question || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, MAX_QUESTIONS);
}

export class SelectionCriteriaService {
  /**
   * Step 1 — extract and classify only. No AI call, no FAQ writes, no
   * routing: the PC sees (and can correct) each Public/Private label before
   * anything else happens.
   */
  static classify(questionsText: string): ClassifiedQuestion[] {
    const questions = parseQuestions(questionsText ?? "");
    if (questions.length === 0) throw new ErrorHandler("Paste at least one selection-criteria question", 400);
    return questions.map((question) => ({
      question,
      classification: isPrivate(question) ? "private" : "public",
    }));
  }

  /** Résumé uploads for the client, newest first, default CV on top. */
  static async listCvs(clientId: string) {
    const uploads = await Upload.findAll({
      where: { userId: clientId, type: "resume", isDeleted: false },
      attributes: ["id", "document", "status", "isDefault", "createdAt"],
      order: [
        ["isDefault", "DESC"],
        ["createdAt", "DESC"],
      ],
    });
    return uploads.map((u) => ({
      id: u.id,
      name: cvLabel(u),
      status: u.status,
      isDefault: u.isDefault,
      createdAt: u.createdAt,
    }));
  }

  /** Fetches a job ad. `ok: false` tells the widget to show the paste fallback. */
  static async fetchJobAd(url: string) {
    if (!url?.trim() || !isSafePublicUrl(url)) {
      return { ok: false as const, reason: "That link can't be fetched. Paste the advertisement text instead." };
    }
    try {
      const text = (await extractPageContent(url.trim()))?.trim() ?? "";
      if (text.length < MIN_JOB_AD_CHARS) {
        return { ok: false as const, reason: "The page didn't return the advertisement. Paste its text instead." };
      }
      return { ok: true as const, text: text.slice(0, MAX_JOB_AD_CHARS) };
    } catch (error: any) {
      logger.warn(`Job ad fetch failed for ${url}: ${error.message}`);
      return { ok: false as const, reason: "The link couldn't be fetched. Paste the advertisement text instead." };
    }
  }

  static async run({
    clientId,
    uploadId,
    jobAdText,
    items,
    requestedBy,
    sessionId,
  }: {
    clientId: string;
    uploadId: string;
    jobAdText: string;
    /** Questions with the classification the PC confirmed in step 1. */
    items: unknown;
    requestedBy: string;
    sessionId: string;
  }): Promise<{ results: CriteriaResult[]; aiAvailable: boolean }> {
    const confirmed = parseConfirmedItems(items);
    if (confirmed.length === 0) throw new ErrorHandler("Extract and classify the questions first", 400);
    if (!jobAdText?.trim()) throw new ErrorHandler("The job advertisement is required", 400);

    const upload = await Upload.findOne({
      where: { id: uploadId, userId: clientId, type: "resume", isDeleted: false },
    });
    if (!upload) throw new ErrorHandler("Choose one of this client's CVs", 400);

    const questions = confirmed.map((c) => c.question);
    const privateSet = new Set(confirmed.filter((c) => c.classification === "private").map((c) => c.question));
    const isConfirmedPrivate = (question: string) => privateSet.has(question);
    const privateQs = questions.filter(isConfirmedPrivate);
    const publicQs = questions.filter((q) => !isConfirmedPrivate(q));

    // Private → Missing Information. Point at a published template when one fits.
    const templates = privateQs.length
      ? await MissingInfoTemplate.findAll({ where: { status: "published" }, attributes: ["id", "name"] })
      : [];
    const templateFor = (question: string) => {
      const tokens = new Set(significantTokens(question));
      const hit = templates.find((t) => significantTokens(t.name).some((w) => tokens.has(w)));
      return hit ? { id: hit.id, name: hit.name } : null;
    };

    const [bank, evidence] = await Promise.all([
      publicQs.length ? FaqService.lookupSelectionCriteria(publicQs, requestedBy) : Promise.resolve(new Map()),
      publicQs.length ? buildEvidence(clientId, upload) : Promise.resolve([] as EvidenceItem[]),
    ]);

    let ai: AiDraft[] | null = null;
    if (publicQs.length) {
      try {
        ai = await draftWithAi(publicQs, evidence, jobAdText, sessionId);
      } catch (error: any) {
        logger.warn(`Selection criteria: AI drafting failed: ${error.message}`);
      }
    }

    const evidenceById = new Map(evidence.map((e) => [e.id, e]));

    const results: CriteriaResult[] = questions.map((question) => {
      if (isConfirmedPrivate(question)) {
        return { type: "private", question, template: templateFor(question) };
      }

      const index = publicQs.indexOf(question) + 1;
      const entry = bank.get(normalizeQuestion(question));
      const draft = ai?.find((a) => Number(a.q) === index);

      // Only evidence ids we actually sent count — fabricated citations drop out.
      const cited = (draft?.evidence ?? [])
        .map((id) => evidenceById.get(String(id)))
        .filter((e): e is EvidenceItem => !!e);
      const aiSource = cited.length ? "ai-evidence" : "ai-intuition";

      const candidates: { text: string; source: "db" | "ai-evidence" | "ai-intuition" }[] = [];
      if (entry?.status === "matched" && entry.answer) candidates.push({ text: entry.answer, source: "db" });
      for (const text of draft?.drafts ?? []) {
        if (typeof text === "string" && text.trim()) candidates.push({ text: text.trim(), source: aiSource });
      }

      return {
        type: "public",
        question,
        bank: entry?.status ?? "new",
        bankCode: entry?.code ?? "",
        evidence: cited.slice(0, 2).map((e) => ({ source: e.source, text: e.text })),
        candidates: candidates.slice(0, 3),
      };
    });

    return { results, aiAvailable: !publicQs.length || !!ai };
  }
}
