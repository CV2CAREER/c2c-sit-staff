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

const buildClientProfile = (profile: Profile): string => {
  return [
    `- Target Titles: ${safeList(profile.titles)}`,
    `- Excluded Titles: ${safeList(profile.titlesExcluded)}`,
    `- Target Keywords: ${safeList(profile.keywords)}`,
    `- Excluded Keywords: ${safeList(profile.keywordsExcluded)}`,
    `- Target Locations: ${safeList(profile.locations)}`,
    `- Target Cities: ${safeList(profile.city)}`,
    `- Target States: ${safeList(profile.state)}`,
    `- Target Country: ${profile.country || "Not specified"}`,
    `- Salary Range (stored in thousands): ${profile.minSalary ?? "Not specified"} - ${profile.maxSalary ?? "Not specified"}`,
    `- Target Industries: ${safeList(profile.industriesInclude)}`,
    `- Excluded Industries: ${safeList(profile.industriesExclude)}`,
    `- Target Job Types: ${safeList(profile.jobTypes)}`,
  ].join("\n");
};

const buildJobDetails = (job: ManualApplication): string => {
  return [
    `- Title: ${job.Job_Title || "N/A"}`,
    `- Company: ${job.Advertiser || "N/A"}`,
    `- Location: ${job.Location || "N/A"}`,
    `- Country: ${job.Country || "N/A"}`,
    `- Job Type: ${job.Job_Type || "N/A"}`,
    `- Salary: ${job.Salary || "Not specified"}`,
    `- Skills/Tech: ${job.Skills && job.Skills !== "N/A" ? job.Skills : "Not specified"}`,
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
