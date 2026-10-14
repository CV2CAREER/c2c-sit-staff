import { getServiceLogger } from "../../utils/createLogger";
import ErrorHandler from "../../utils/errorHandler";
import { auditTrailApplicationService } from "./audit-trail.application.service";
import { UsageOverride, schemaTableUsageService } from "./schema-table-usage.service";
import { DiffItem, DiffResult, diffSnapshots } from "./schema-diff.engine";
import {
  SchemaSnapshot,
  captureSnapshot,
  listTargets,
  pingTarget,
} from "./schema-diff.snapshot.service";

const logger = getServiceLogger("schema-diff-service");

const SNAPSHOT_TTL_MS = 2 * 60 * 1000;
const SCHEMA_NAME_REGEX = /^[a-zA-Z_][a-zA-Z0-9_$]{0,62}$/;
const MAX_AI_ITEMS = 180;
const MAX_QUESTION_LENGTH = 1000;

export interface CompareInput {
  sourceKey: string;
  targetKey: string;
  schemas?: unknown;
  refresh?: boolean;
  includeLegacy?: boolean;
  actorUserId: string;
  skipAudit?: boolean;
}

export interface SideInfo {
  key: string;
  label: string;
  database: string;
  serverVersion: string;
  capturedAt: string;
  durationMs: number;
  fromCache: boolean;
  relationCount: number;
  enumCount: number;
}

export interface CompareResponse extends DiffResult {
  source: SideInfo;
  target: SideInfo;
  schemas: string[];
  availableSchemas: string[];
  comparedAt: string;
  durationMs: number;
  usage: {
    scanGeneratedAt: string;
    overrides: Record<string, UsageOverride>;
  };
}

export interface AiReview {
  headline: string;
  riskLevel: "low" | "medium" | "high";
  summary: string;
  keyFindings: { title: string; detail: string; severity: "critical" | "warning" | "info" }[];
  likelyCauses: string[];
  deploymentPlan: string[];
  cautions: string[];
}

// --- snapshot cache (per target + schema filter) -----------------------------

const snapshotCache = new Map<string, { at: number; snapshot: SchemaSnapshot }>();
const inFlight = new Map<string, Promise<SchemaSnapshot>>();

const getSnapshot = async (
  key: string,
  schemas: string[],
  refresh: boolean,
): Promise<{ snapshot: SchemaSnapshot; fromCache: boolean }> => {
  const cacheKey = `${key}|${schemas.join(",")}`;
  const cached = snapshotCache.get(cacheKey);
  if (!refresh && cached && Date.now() - cached.at < SNAPSHOT_TTL_MS) {
    return { snapshot: cached.snapshot, fromCache: true };
  }

  // Two admins (or a double-click) comparing the same database share one read.
  let pending = inFlight.get(cacheKey);
  if (!pending) {
    pending = captureSnapshot(key, schemas)
      .then((snapshot) => {
        snapshotCache.set(cacheKey, { at: Date.now(), snapshot });
        return snapshot;
      })
      .finally(() => inFlight.delete(cacheKey));
    inFlight.set(cacheKey, pending);
  }
  return { snapshot: await pending, fromCache: false };
};

// Used by Database Modifications: read a target through the same cache, and drop a
// target's cached snapshots after it has been changed.
export const getTargetSnapshot = (key: string, schemas: string[], refresh: boolean) =>
  getSnapshot(key, schemas, refresh);

export const invalidateTargetSnapshots = (key: string) => {
  for (const cacheKey of [...snapshotCache.keys()]) {
    if (cacheKey.startsWith(`${key}|`)) snapshotCache.delete(cacheKey);
  }
};

export const normalizeSchemas = (raw: unknown): string[] => {
  if (raw == null || raw === "") return ["public"];
  const list = Array.isArray(raw) ? raw : String(raw).split(",");
  const schemas = [...new Set(list.map((s) => String(s).trim()).filter(Boolean))];
  for (const s of schemas) {
    if (!SCHEMA_NAME_REGEX.test(s)) throw new ErrorHandler(`Invalid schema name "${s}".`, 400);
  }
  // Empty list = every user schema.
  return schemas.sort();
};

const sideInfo = (snap: SchemaSnapshot, fromCache: boolean): SideInfo => ({
  key: snap.targetKey,
  label: snap.label,
  database: snap.database,
  serverVersion: snap.serverVersion,
  capturedAt: snap.capturedAt,
  durationMs: snap.durationMs,
  fromCache,
  relationCount: Object.keys(snap.relations).length,
  enumCount: Object.keys(snap.enums).length,
});

// --- AI helpers --------------------------------------------------------------

// Only catalog metadata goes to the model — table/column names, types and
// DDL. No row data is ever read by this feature.
const describeForAi = (result: CompareResponse) => {
  const { summary, items } = result;
  const shown = items.slice(0, MAX_AI_ITEMS);
  const lines = shown.map((i: DiffItem) => {
    const detail = [
      i.source ? `source=${i.source.slice(0, 160)}` : null,
      i.target ? `target=${i.target.slice(0, 160)}` : null,
    ]
      .filter(Boolean)
      .join(" | ");
    return `- [${i.severity}] ${i.category} ${i.change} ${i.object}${i.name !== i.object ? `.${i.name}` : ""}: ${i.message}${detail ? ` (${detail})` : ""}`;
  });
  const truncated =
    items.length > shown.length
      ? `\n(${items.length - shown.length} further lower-priority differences omitted)`
      : "";

  // Per-object rollup over ALL items, so the model sees the whole picture
  // even when the detailed list below is truncated.
  const perObject = new Map<string, Record<string, number>>();
  for (const i of items) {
    const counts = perObject.get(i.object) || {};
    counts[`${i.category}:${i.change}`] = (counts[`${i.category}:${i.change}`] || 0) + 1;
    perObject.set(i.object, counts);
  }
  const rollup = [...perObject.entries()]
    .sort((a, b) => Object.values(b[1]).reduce((x, y) => x + y, 0) - Object.values(a[1]).reduce((x, y) => x + y, 0))
    .slice(0, 60)
    .map(([object, counts]) => `- ${object}: ${Object.entries(counts).map(([k, v]) => `${k}=${v}`).join(", ")}`);

  return [
    `SOURCE (reference): ${result.source.label} — database "${result.source.database}", PostgreSQL ${result.source.serverVersion}`,
    `TARGET (being checked): ${result.target.label} — database "${result.target.database}", PostgreSQL ${result.target.serverVersion}`,
    `Schemas compared: ${result.schemas.length ? result.schemas.join(", ") : "all user schemas"}`,
    `Totals: ${summary.total} differences — ${summary.bySeverity.critical} critical, ${summary.bySeverity.warning} warning, ${summary.bySeverity.info} info; ${summary.objectsAffected} objects affected.`,
    `By change: ${Object.entries(summary.byChange).map(([k, v]) => `${k}=${v}`).join(", ")}`,
    ``,
    `Objects with differences (top ${rollup.length} of ${perObject.size}, counts by category:change):`,
    ...rollup,
    ``,
    `Note: any object NOT listed above exists in both databases with identical structure.`,
    result.legacy.objects.length
      ? `Migrated/unused tables (not referenced by the application's code): ${result.legacy.objects.length} objects with ${result.legacy.objects.reduce((n, o) => n + o.differences, 0)} differences — ${
          result.legacy.included
            ? "included below at info severity"
            : "EXCLUDED from this comparison; do not treat their absence or differences as problems"
        }. Examples: ${result.legacy.objects.slice(0, 15).map((o) => o.table).join(", ")}.`
      : ``,
    ``,
    `Differences (most severe first):`,
    ...lines,
  ].join("\n") + truncated;
};

const extractJson = (text: string): any => {
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(trimmed.slice(start, end + 1));
    throw new Error("No JSON object in AI response");
  }
};

// The model sometimes numbers or bullets its own list items ("1. …", "- …");
// the UI already renders lists, so strip them to avoid "1. 1. …".
const asStringList = (v: unknown, max = 8): string[] =>
  Array.isArray(v)
    ? v
        .map((x) => String(x).replace(/^\s*(?:(?:step\s*)?\d+\s*[.):-]|[-*•–])\s*/i, "").trim())
        .filter(Boolean)
        .slice(0, max)
    : [];

const sanitizeReview = (raw: any): AiReview => {
  const risk = String(raw?.riskLevel || "").toLowerCase();
  return {
    headline: String(raw?.headline || "Schema comparison review"),
    riskLevel: risk === "high" || risk === "medium" || risk === "low" ? risk : "medium",
    summary: String(raw?.summary || ""),
    keyFindings: Array.isArray(raw?.keyFindings)
      ? raw.keyFindings.slice(0, 8).map((f: any) => {
          const sev = String(f?.severity || "").toLowerCase();
          return {
            title: String(f?.title || ""),
            detail: String(f?.detail || ""),
            severity: sev === "critical" || sev === "warning" || sev === "info" ? sev : "info",
          };
        })
      : [],
    likelyCauses: asStringList(raw?.likelyCauses),
    deploymentPlan: asStringList(raw?.deploymentPlan, 12),
    cautions: asStringList(raw?.cautions),
  };
};

// Lazy so a missing/misconfigured AI setup only disables the AI panel, not
// the comparison itself.
const callAi = async (prompt: string, jsonMode: boolean): Promise<string> => {
  let mod: typeof import("../../utils/digital-factory");
  try {
    mod = await import("../../utils/digital-factory");
  } catch (err: any) {
    logger.error(`AI module unavailable: ${err?.message}`);
    throw new ErrorHandler("The AI assistant is not configured on this server. The comparison itself still works.", 503);
  }
  try {
    return await mod.queryDigitalOceanAI(prompt, 1, jsonMode, 3000);
  } catch (err: any) {
    logger.error(`AI call failed: ${err?.message}`);
    throw new ErrorHandler(
      /timed out/i.test(err?.message || "")
        ? "The AI assistant took too long to answer. Try again in a moment."
        : "The AI assistant could not produce an answer right now. Try again in a moment.",
      502,
    );
  }
};

// --- service -----------------------------------------------------------------

class SchemaDiffApplicationService {
  listTargets(force = false) {
    return listTargets(force);
  }

  ping(key: string) {
    return pingTarget(key);
  }

  async compare(input: CompareInput): Promise<CompareResponse> {
    const { sourceKey, targetKey, actorUserId } = input;
    if (!sourceKey || !targetKey) {
      throw new ErrorHandler("Pick a database on both sides before comparing.", 400);
    }
    if (sourceKey === targetKey) {
      throw new ErrorHandler("Source and target are the same database — pick two different ones.", 400);
    }
    const schemas = normalizeSchemas(input.schemas);
    const refresh = Boolean(input.refresh);
    const started = Date.now();

    // Both sides in parallel (the snapshot slot limit still caps open
    // connections). Each error already names its database; the source's is
    // reported first since it's the reference.
    const [sourceResult, targetResult] = await Promise.allSettled([
      getSnapshot(sourceKey, schemas, refresh),
      getSnapshot(targetKey, schemas, refresh),
    ]);
    if (sourceResult.status === "rejected") throw sourceResult.reason;
    if (targetResult.status === "rejected") throw targetResult.reason;
    const source = sourceResult.value;
    const target = targetResult.value;

    const usage = await schemaTableUsageService.getContext();
    const diff = diffSnapshots(source.snapshot, target.snapshot, {
      legacyReason: usage.legacyReason,
      includeLegacy: Boolean(input.includeLegacy),
    });
    const availableSchemas = [
      ...new Set([...source.snapshot.availableSchemas, ...target.snapshot.availableSchemas]),
    ].sort();

    const response: CompareResponse = {
      ...diff,
      source: sideInfo(source.snapshot, source.fromCache),
      target: sideInfo(target.snapshot, target.fromCache),
      schemas,
      availableSchemas,
      comparedAt: new Date().toISOString(),
      durationMs: Date.now() - started,
      usage: { scanGeneratedAt: usage.scanGeneratedAt, overrides: usage.overrides },
    };

    logger.info(
      `Compared ${source.snapshot.label} -> ${target.snapshot.label}: ${diff.summary.total} differences (${response.durationMs}ms, by=${actorUserId})`,
    );

    if (!input.skipAudit) auditTrailApplicationService
      .log({
        action: "SCHEMA_COMPARE",
        actorUserId,
        targetType: "Schema",
        targetKey: `${source.snapshot.database} -> ${target.snapshot.database}`,
        metadata: { schemas, summary: diff.summary, legacyHidden: diff.legacy.hiddenDifferences },
      })
      .catch((err) => logger.warn(`Audit log for SCHEMA_COMPARE failed: ${err?.message}`));

    return response;
  }

  setTableUsage(table: string, usage: UsageOverride | null, actorUserId: string) {
    return schemaTableUsageService.setOverride(table, usage, actorUserId);
  }

  async aiReview(input: Omit<CompareInput, "refresh"> & { question?: unknown }) {
    // Reuses the cached snapshots, so this normally costs no extra DB reads.
    const result = await this.compare({ ...input, refresh: false, skipAudit: true });
    const context = describeForAi(result);
    const question = typeof input.question === "string" ? input.question.trim() : "";

    if (question) {
      if (question.length > MAX_QUESTION_LENGTH) {
        throw new ErrorHandler(`Please keep the question under ${MAX_QUESTION_LENGTH} characters.`, 400);
      }
      const prompt = [
        "You are a senior PostgreSQL DBA helping an admin of a Node.js/Sequelize application understand the schema differences between two of their databases.",
        "Answer the admin's question using ONLY the comparison below. If the comparison does not contain enough information, say so plainly rather than guessing.",
        "Be concise and practical. Never suggest running destructive statements without a backup.",
        "Format for a narrow chat panel: start with a one-sentence answer, then short sections with a bold title line each, and bullet points under them. Do NOT use Markdown tables. Put SQL only in fenced ```sql code blocks with real line breaks. Keep it under 250 words.",
        "",
        "=== COMPARISON ===",
        context,
        "=== END COMPARISON ===",
        "",
        `Admin's question: ${question}`,
      ].join("\n");
      const answer = await callAi(prompt, false);
      return { mode: "answer" as const, question, answer: answer.trim() };
    }

    if (result.summary.identical) {
      return {
        mode: "review" as const,
        review: {
          headline: "The schemas are identical",
          riskLevel: "low",
          summary: `No structural differences were found between ${result.source.label} and ${result.target.label} in the compared schemas.`,
          keyFindings: [],
          likelyCauses: [],
          deploymentPlan: [],
          cautions: [],
        } satisfies AiReview,
      };
    }

    const prompt = [
      "You are a senior PostgreSQL DBA reviewing schema drift between two databases of a Node.js/Sequelize application (tables are usually created by Sequelize sync or hand-written SQL migrations).",
      "SOURCE is the reference; TARGET is the database being checked. Assess what the differences mean for an application that was written against the SOURCE schema and is deployed against the TARGET.",
      "",
      "=== COMPARISON ===",
      context,
      "=== END COMPARISON ===",
      "",
      "Respond with ONLY a JSON object, no prose around it, matching exactly:",
      `{
  "headline": "one sentence, plain English, what matters most",
  "riskLevel": "low" | "medium" | "high",
  "summary": "2-4 sentences for a non-DBA admin",
  "keyFindings": [{ "title": "short", "detail": "1-2 sentences: impact and what to do", "severity": "critical" | "warning" | "info" }],
  "likelyCauses": ["e.g. a migration that was run on SOURCE but not TARGET"],
  "deploymentPlan": ["ordered, concrete steps to bring TARGET in line safely"],
  "cautions": ["data-loss / locking / downtime risks to watch for"]
}`,
      "Rules: at most 6 keyFindings, group related differences (e.g. one finding for several missing columns on one table). Base everything strictly on the comparison. Do not invent tables or columns.",
    ].join("\n");

    const raw = await callAi(prompt, true);
    try {
      return { mode: "review" as const, review: sanitizeReview(extractJson(raw)) };
    } catch (err: any) {
      logger.warn(`AI review JSON parse failed: ${err?.message}`);
      throw new ErrorHandler("The AI assistant returned an unreadable answer. Try again.", 502);
    }
  }
}

export const schemaDiffApplicationService = new SchemaDiffApplicationService();
