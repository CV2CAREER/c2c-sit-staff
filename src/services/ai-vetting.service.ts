import { getServiceLogger } from "../utils/createLogger";
import { queryDigitalOceanAI } from "../utils/digital-factory";
import { ManualApplication } from "../models/v1/manual-application.model";
import { Profile } from "../models/v1/profile.model";

const logger = getServiceLogger("ai-vetting");

export const PROMPT_VERSION = "1.0";

export interface AiVettingResult {
  score: "HQA" | "MQA" | "LQA" | null;
  reason: string;
  status: "classified" | "failed";
}

const safeList = (arr: string[] | undefined | null): string =>
  arr && arr.length > 0 ? arr.join(", ") : "Not specified";

const buildClassificationPrompt = (
  job: ManualApplication,
  profile: Profile
): string => {
  return [
    "You are a job vetting assistant. Classify this job against the client's profile criteria.",
    "",
    "CLIENT PROFILE:",
    `- Target Titles: ${safeList(profile.titles)}`,
    `- Excluded Titles: ${safeList(profile.titlesExcluded)}`,
    `- Target Keywords: ${safeList(profile.keywords)}`,
    `- Excluded Keywords: ${safeList(profile.keywordsExcluded)}`,
    `- Target Locations: ${safeList(profile.locations)}`,
    `- Target Cities: ${safeList(profile.city)}`,
    `- Target States: ${safeList(profile.state)}`,
    `- Target Country: ${profile.country || "Not specified"}`,
    `- Salary Range: ${profile.minSalary ?? "Not specified"} - ${profile.maxSalary ?? "Not specified"}`,
    `- Target Industries: ${safeList(profile.industriesInclude)}`,
    `- Excluded Industries: ${safeList(profile.industriesExclude)}`,
    `- Target Job Types: ${safeList(profile.jobTypes)}`,
    "",
    "JOB DETAILS:",
    `- Title: ${job.Job_Title || "N/A"}`,
    `- Company: ${job.Advertiser || "N/A"}`,
    `- Location: ${job.Location || "N/A"}`,
    `- Country: ${job.Country || "N/A"}`,
    `- Job Type: ${job.Job_Type || "N/A"}`,
    "",
    "Respond with JSON only. Do not include markdown formatting or code blocks.",
    '{ "score": "HQA", "reason": "Brief one-line reason for the classification" }',
    "",
    "HQA = Strong match on all or nearly all criteria",
    "MQA = Genuine but imperfect fit — one criterion is off, borderline, or unclear",
    "LQA = Poor fit on one or more criteria",
  ].join("\n");
};

const parseClassificationResponse = (raw: string): AiVettingResult => {
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
  const prompt = buildClassificationPrompt(job, profile);

  logger.info(
    `Classifying job ${job.id} for client ${job.client_id} (${job.Job_Title})`
  );

  try {
    const raw = await queryDigitalOceanAI(prompt);
    const result = parseClassificationResponse(raw);
    logger.info(
      `Classification result for job ${job.id}: ${result.status === "classified" ? result.score : "FAILED"}`
    );
    return result;
  } catch (err: any) {
    logger.error(`AI classification failed for job ${job.id}: ${err.message}`);
    return {
      score: null,
      reason: `AI service error: ${err.message}`,
      status: "failed",
    };
  }
};
