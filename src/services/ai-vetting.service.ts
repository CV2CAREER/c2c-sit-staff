import { getServiceLogger } from "../utils/createLogger";
import { queryDigitalOceanAI } from "../utils/digital-factory";
import { ManualApplication } from "../models/v1/manual-application.model";
import { Profile } from "../models/v1/profile.model";

const logger = getServiceLogger("ai-vetting");

export const PROMPT_VERSION = "1.4";

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
    `- Salary Range (stored in thousands): ${profile.minSalary ?? "Not specified"} - ${profile.maxSalary ?? "Not specified"}`,
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
    `- Salary: ${job.Salary || "Not specified"}`,
    `- Skills/Tech: ${job.Skills && job.Skills !== "N/A" ? job.Skills : "Not specified"}`,
    "",
    "LOCATION MATCHING RULES:",
    "- If the job Location or Country mentions Remote, Hybrid, WFH, Work From Home, or similar, treat it as a remote/hybrid role and match it against any Remote entry in the client's Target Locations or Cities.",
    "- A job located in the client's Target Country should NOT be rejected for location simply because the city is not listed or differs from Target Cities; only reject for location when the country itself is outside the client's targets.",
    "- If the client targets both specific cities AND Remote, a remote role matches regardless of the city/state.",
    "- Only say a criterion is missing/not provided when the JOB DETAILS value is literally N/A, Not specified, or empty. If the field has a value, use it.",
    "",
    "SALARY MATCHING:",
    "- Salary is a SOFT criterion and must NEVER alone cause an LQA.",
    "- A job paying AT OR ABOVE the client's minimum salary is acceptable regardless of how high it goes. Exceeding the client's maximum is a POSITIVE, not a downgrade.",
    "- Only mention salary as a concern when the job pays CLEARLY BELOW the client's minimum, and even then rate it at most MQA.",
    "- If the client's salary range or the job's salary is Not specified, do not penalise for it.",
    "",
    "SKILLS MATCHING:",
    "- Compare the job's Skills/Tech against the client's Target Keywords (and avoid Excluded Keywords).",
    "- Missing skills are EXPECTED — most job listings do not state skills. A job with no Skills/Tech must NOT be downgraded or used as a reason for LQA; treat it as neutral.",
    "- Only use skills as a NEGATIVE factor when the job explicitly lists skills that are excluded or clearly contradict the client's targets.",
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
