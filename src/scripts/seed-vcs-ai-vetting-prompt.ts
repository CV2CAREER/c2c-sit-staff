import { getServiceLogger } from "../utils/createLogger";
import { VCS, VCSPrompt } from "../models/v1/keyword-population.model";

const logger = getServiceLogger("seed-vcs-ai-vetting-prompt");

export const AI_VETTING_PROMPT_KEY = "ai_vetting_classification_prompt";

const AI_VETTING_PROMPT = `You are a job vetting assistant. Classify this job against the client's profile criteria.

CLIENT PROFILE:
{{CLIENT_PROFILE}}

JOB DETAILS:
{{JOB_DETAILS}}

LOCATION MATCHING RULES:
- If the job Location or Country mentions Remote, Hybrid, WFH, Work From Home, or similar, treat it as a remote/hybrid role and match it against any Remote entry in the client's Target Locations or Cities.
- A job located in the client's Target Country should NOT be rejected for location simply because the city is not listed or differs from Target Cities; only reject for location when the country itself is outside the client's targets.
- If the client targets both specific cities AND Remote, a remote role matches regardless of the city/state.
- Only say a criterion is missing/not provided when the JOB DETAILS value is literally N/A, Not specified, or empty. If the field has a value, use it.

SALARY MATCHING:
- Salary is a SOFT criterion and must NEVER alone cause an LQA.
- A job paying AT OR ABOVE the client's minimum salary is acceptable regardless of how high it goes. Exceeding the client's maximum is a POSITIVE, not a downgrade.
- Only mention salary as a concern when the job pays CLEARLY BELOW the client's minimum, and even then rate it at most MQA.
- If the client's salary range or the job's salary is Not specified, do not penalise for it.

SKILLS MATCHING:
- Compare the job's Skills/Tech against the client's Target Keywords (and avoid Excluded Keywords).
- Missing skills are EXPECTED — most job listings do not state skills. A job with no Skills/Tech must NOT be downgraded or used as a reason for LQA; treat it as neutral.
- Only use skills as a NEGATIVE factor when the job explicitly lists skills that are excluded or clearly contradict the client's targets.

Respond with JSON only. Do not include markdown formatting or code blocks.
{ "score": "HQA", "reason": "Brief one-line reason for the classification" }

HQA = Strong match on all or nearly all criteria
MQA = Genuine but imperfect fit — one criterion is off, borderline, or unclear
LQA = Poor fit on one or more criteria`;

export const seedAiVettingPrompt = async (): Promise<void> => {
  const forceUpdate = process.env.SEED_AI_VETTING_PROMPT_FORCE === "true";

  const existingVCS = await VCS.findOne({ where: { key: AI_VETTING_PROMPT_KEY } });

  if (existingVCS && !forceUpdate) {
    logger.info("AI vetting prompt VCS entry already exists, skipping seed");
    return;
  }

  const promptRow = await VCSPrompt.create({
    prompt: AI_VETTING_PROMPT,
    version: "1.4",
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
