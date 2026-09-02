import { getServiceLogger } from "../utils/createLogger";
import { queryDigitalOceanAI } from "../utils/digital-factory";
import { ManualApplication } from "../models/v1/manual-application.model";
import { Profile } from "../models/v1/profile.model";
import { VCS, VCSPrompt } from "../models/v1/keyword-population.model";
import ErrorHandler from "../utils/errorHandler";

const logger = getServiceLogger("ai-vetting");

export const AI_VETTING_PROMPT_KEY = "ai_vetting_classification_prompt";

export interface AiVettingResult {
  score: "HQA" | "MQA" | "LQA" | null;
  reason: string;
  status: "classified" | "failed";
  promptVersion: string | null;
}

const safeList = (arr: string[] | undefined | null): string =>
  arr && arr.length > 0 ? arr.join(", ") : "Not specified";

const extractHyperlinkTitle = (raw: string | undefined | null): string => {
  if (!raw) return "N/A";
  const match = raw.match(/=HYPERLINK\("[^"]*","([^"]*?)"\)/i);
  return match ? match[1].trim() : raw.trim();
};

const AU_STATE_NAMES: Record<string, string> = {
  "new south wales": "NSW", "queensland": "QLD", "victoria": "VIC",
  "south australia": "SA", "western australia": "WA", "tasmania": "TAS",
  "northern territory": "NT", "australian capital territory": "ACT",
};
const AU_STATE_ABBREVS = new Set(["NSW", "QLD", "VIC", "SA", "WA", "TAS", "NT", "ACT"]);
const REMOTE_KEYWORDS = ["work from home", "remote", "wfh", "hybrid"];

const normalizeLocations = (arr: string[] | undefined | null): string[] => {
  if (!arr || arr.length === 0) return [];
  const cleaned = arr
    .map(v => v.trim())
    .filter(v => v.length > 0 && !REMOTE_KEYWORDS.includes(v.toLowerCase()));
  const unique = Array.from(new Set(cleaned));
  return unique.slice(0, 30);
};

const normalizeStates = (locations: string[] | undefined | null, states: string[] | undefined | null): string[] => {
  const locArr = locations || [];
  const stateArr = (states || []).filter(s => !REMOTE_KEYWORDS.includes(s.toLowerCase()));
  const movedFromLoc: string[] = [];

  for (const loc of locArr) {
    const upper = loc.trim().toUpperCase();
    if (AU_STATE_ABBREVS.has(upper)) {
      movedFromLoc.push(upper);
    } else {
      const full = AU_STATE_NAMES[loc.trim().toLowerCase()];
      if (full) movedFromLoc.push(full);
    }
  }

  const combined = [...stateArr, ...movedFromLoc];
  return Array.from(new Set(combined)).slice(0, 10);
};

const buildClientProfile = (profile: Profile): string => {
    const hasAllLocations =
      (profile.locations || []).some(l => l.trim().toLowerCase().startsWith('all ')) ||
      (profile.state || []).some(s => s.trim().toLowerCase().startsWith('all '));

    const locations = hasAllLocations ? [] : normalizeLocations(profile.locations);
    const states = hasAllLocations ? [] : normalizeStates(profile.locations, profile.state);
    const cities = hasAllLocations ? [] : normalizeLocations(profile.city);

    return [
      `- Target Titles: ${safeList(profile.titles)}`,
      `- Excluded Titles: ${safeList(profile.titlesExcluded)}`,
      `- Target Keywords: ${safeList(profile.keywords)}`,
      `- Excluded Keywords: ${safeList(profile.keywordsExcluded)}`,
      `- Target Locations: ${safeList(locations)}`,
      `- Target Cities: ${safeList(cities)}`,
      `- Target States: ${safeList(states)}`,
      `- Target Country: ${profile.country || "Not specified"}`,
      `- Salary Range (stored in thousands): ${profile.minSalary ?? "Not specified"} - ${profile.maxSalary ?? "Not specified"}`,
      `- Target Industries: ${safeList(profile.industriesInclude)}`,
      `- Excluded Industries: ${safeList(profile.industriesExclude)}`,
      `- Target Job Types: ${safeList(profile.jobTypes)}`,
      `- Work Rights: ${safeList(profile.workingRight)}`,
    ].join("\n");
  };

const buildJobDetails = (job: ManualApplication): string => {
  return [
    `- Title: ${extractHyperlinkTitle(job.Job_Title)}`,
    `- Company: ${job.Advertiser || "N/A"}`,
    `- Location: ${job.Location || "N/A"}`,
    `- Country: ${job.Country || "N/A"}`,
    `- Job Type: ${job.Job_Type || "N/A"}`,
  ].join("\n");
};

export const getVcsPrompt = async (): Promise<{ prompt: string; version: string }> => {
  const vcsRow = await VCS.findOne({
    where: { key: AI_VETTING_PROMPT_KEY, active: true },
  });

  if (!vcsRow) {
    throw new ErrorHandler(
      `AI vetting prompt "${AI_VETTING_PROMPT_KEY}" is not configured — run seed-vcs-ai-vetting-prompt.ts`,
      500,
    );
  }

  const promptRow = await VCSPrompt.findByPk(vcsRow.activePromptId);

  if (!promptRow) {
    throw new ErrorHandler(
      `AI vetting prompt "${AI_VETTING_PROMPT_KEY}" has no active version deployed`,
      500,
    );
  }

  return { prompt: promptRow.prompt, version: promptRow.version };
};

const parseClassificationResponse = (raw: string): Omit<AiVettingResult, "promptVersion"> => {
  const trimmed = raw.trim();

  let json: any;
  try {
    json = JSON.parse(trimmed);
  } catch {
    const braceMatch = trimmed.match(/\{[\s\S]*\}/);
    if (!braceMatch) {
      return {
        score: null,
        reason: "Failed to parse AI response: no JSON object found",
        status: "failed",
      };
    }
    try {
      json = JSON.parse(braceMatch[0]);
    } catch {
      return {
        score: null,
        reason: "Failed to parse AI response: invalid JSON",
        status: "failed",
      };
    }
  }

  const score = json?.score?.toUpperCase?.();
  const reason = json?.reason?.trim?.();

  if (!score || !["HQA", "MQA", "LQA"].includes(score)) {
    return {
      score: null,
      reason: `AI returned unrecognised score: "${json?.score ?? "missing"}"`,
      status: "failed",
    };
  }

  if (!reason) {
    return {
      score,
      reason: "No reason provided by AI",
      status: "failed",
    };
  }

  return { score: score as "HQA" | "MQA" | "LQA", reason, status: "classified" };
};

export const classifyJob = async (
  job: ManualApplication,
  profile: Profile,
): Promise<AiVettingResult> => {
  const { prompt: promptTemplate, version } = await getVcsPrompt();

  const clientProfile = buildClientProfile(profile);
  const jobDetails = buildJobDetails(job);

  const prompt = promptTemplate
    .replace(/\{\{CLIENT_PROFILE\}\}/g, clientProfile)
    .replace(/\{\{JOB_DETAILS\}\}/g, jobDetails);

  logger.info(
    `Classifying job ${job.id} for client ${job.client_id} (${job.Job_Title})`
  );

  try {
    const raw = await queryDigitalOceanAI(prompt);
    const result = parseClassificationResponse(raw);
    logger.info(
      `Classification result for job ${job.id}: ${result.status === "classified" ? result.score : "FAILED"} (prompt v${version})`
    );
    return { ...result, promptVersion: version };
  } catch (err: any) {
    logger.error(`AI classification failed for job ${job.id}: ${err.message}`);
    return {
      score: null,
      reason: `AI service error: ${err.message}`,
      status: "failed",
      promptVersion: version,
    };
  }
};
