import { getServiceLogger } from "../utils/createLogger";
import { VCS, VCSPrompt } from "../models/v1/keyword-population.model";

const logger = getServiceLogger("seed-vcs-ai-vetting-prompt");

export const AI_VETTING_PROMPT_KEY = "ai_vetting_classification_prompt";

const AI_VETTING_PROMPT = `You are a job vetting assistant. Classify this job against the client's profile criteria.

CLIENT PROFILE:
{{CLIENT_PROFILE}}

JOB DETAILS:
{{JOB_DETAILS}}

EVALUATION PARAMETERS (evaluate each): Role, Location, Salary, Work Rights, Industry.

KEY RULES:
- Hard contradiction => immediate LQA. Examples: job role explicitly contradicts target role; job country is outside client's target countries; job requires a work right the client does NOT have; job explicitly lists an industry that the client excludes.
- Uncertainty/insufficient info => treat as verification-needed (soft negative) and count as MQA-level concern.
- Scoring boundary:
  - HQA: strong/acceptable on nearly all parameters (5/5 or only minor soft issues).
  - MQA: 3-4/5 parameters OK or any combination with soft/uncertain issues.
  - LQA: any hard contradiction OR 3 or more parameter failures (hard or soft).
- Salary is a SOFT criterion: salary below client's minimum should be flagged at most MQA and must NEVER alone cause LQA. Salary at or above minimum is acceptable; exceeding client's max is positive.
- Skills are NEUTRAL if missing; only use skills to downgrade if job explicitly lists excluded/contradictory skills.
- Location rules:
  - Treat listings mentioning Remote/Hybrid/WFH as remote and match against client's Remote targets.
  - Do NOT reject for location if country matches even if city differs.
  - If client targets specific cities AND Remote, a remote listing matches regardless of city/state.
- Only mark a JOB DETAILS field as missing when its value is exactly N/A, Not specified, or empty.

RESPONSE FORMAT:
Respond with JSON only, exact object keys: { "score": "<HQA|MQA|LQA>", "reason": "<single concise reason>" }
- The reason must name the specific parameter(s) and indicate whether it's a "contradiction" (hard) or "verification needed" / "soft". Example: "Work Rights: contradiction - client lacks required right" or "Location: verification needed - remote vs city not explicit".

HQA = Strong match on all or nearly all criteria
MQA = Genuine but imperfect fit — one or more soft/uncertain issues or 3-4/5 acceptable
LQA = Poor fit — any hard contradiction OR ≥3 failures`;

export const seedAiVettingPrompt = async (): Promise<void> => {
  const forceUpdate = process.env.SEED_AI_VETTING_PROMPT_FORCE === "true";

  const existingVCS = await VCS.findOne({ where: { key: AI_VETTING_PROMPT_KEY } });

  if (existingVCS && !forceUpdate) {
    logger.info("AI vetting prompt VCS entry already exists, skipping seed");
    return;
  }

  const promptRow = await VCSPrompt.create({
    prompt: AI_VETTING_PROMPT,
    version: "1.5",
    active: true,
  });

  if (existingVCS) {
    await existingVCS.update({ active: true, activePromptId: promptRow.id });
    logger.info("AI vetting prompt refreshed and re-activated");
  } else {
    await VCS.create({
      key: AI_VETTING_PROMPT_KEY,
      active: true,
      activePromptId: promptRow.id,
    });
    logger.info("AI vetting prompt seeded and activated");
  }
};

if (require.main === module) {
  require("dotenv").config();
  const { getSequelize } = require("../utils/sequelize");

  (async () => {
    const sequelize = getSequelize();
    try {
      await sequelize.authenticate();
      logger.info("Connected to database");
      await seedAiVettingPrompt();
      await sequelize.close();
      process.exit(0);
    } catch (error) {
      logger.error("Failed to seed AI vetting prompt", error);
      process.exit(1);
    }
  })();
}