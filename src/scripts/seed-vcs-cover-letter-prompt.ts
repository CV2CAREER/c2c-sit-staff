import { getServiceLogger } from "../utils/createLogger";
import { VCS, VCSPrompt } from "../models/v1/keyword-population.model";

const logger = getServiceLogger("seed-vcs-cover-letter-prompt");

export const COVER_LETTER_PROMPT_KEY = "cover_letter_generation_prompt";

const COVER_LETTER_PROMPT = `Act as an expert career coach and hiring manager with 20+ years of experience at top companies. Create an exceptional, personalized cover letter using the following inputs:

MY RESUME/CV:
{{CV_TEXT}}

JOB DESCRIPTION/VACANCY ADVERT:
{{JOB_CONTEXT}}

INSTRUCTIONS FOR THE COVER LETTER:

1. ANALYZE & MATCH FIRST:
- Extract the top 3-5 required skills from the job description
- Identify matching achievements/experiences from my CV
- Note company culture/keywords to incorporate

2. CREATE THIS STRUCTURE:
- Header: My contact info + hiring manager/company details
- Opening Paragraph: Immediate enthusiasm + 1-sentence teaser of my strongest relevant achievement
- Middle (2-3 paragraphs):
  Paragraph 1: Address 2-3 key technical requirements with specific, quantified examples from my CV
  Paragraph 2: Show cultural fit and soft skills with relevant examples
  Optional Paragraph 3: Unique value I bring beyond requirements
- Closing: Reiterate fit + clear call to action for interview

3. STYLE & FORMAT REQUIREMENTS:
- Length: 250-400 words (one page maximum)
- Tone: Professional yet warm, confident but not arrogant
- Language: Active voice, strong action verbs, natural use of job description keywords
- Format: Clean, professional, easy to skim
- Personalization: Company name mentioned 2-3 times naturally

4. AVOID: Generic statements, clichés, "I think/believe" language, or repeating my resume verbatim

OUTPUT: Provide the complete, ready-to-use cover letter only — no preamble, no commentary, no markdown headers.
`;

/**
 * Upserts the cover letter generation prompt as its own VCS entry, keyed by
 * COVER_LETTER_PROMPT_KEY so callers fetch it independently of the
 * `upload_role_titles_prompt` config used by keyword/role-title generation
 * (see AdminDocumentService.getActivePrompt). Existing rows are left
 * untouched unless SEED_COVER_LETTER_PROMPT_FORCE=true.
 */
export const seedCoverLetterPrompt = async (): Promise<void> => {
  const forceUpdate = process.env.SEED_COVER_LETTER_PROMPT_FORCE === "true";

  const existingVCS = await VCS.findOne({ where: { key: COVER_LETTER_PROMPT_KEY } });

  if (existingVCS && !forceUpdate) {
    logger.info("Cover letter prompt VCS entry already exists, skipping seed");
    return;
  }

  const promptRow = await VCSPrompt.create({
    prompt: COVER_LETTER_PROMPT,
    version: "1",
    active: true,
  });

  if (existingVCS) {
    await existingVCS.update({ active: true, activePromptId: promptRow.id });
    logger.info("Cover letter prompt refreshed and re-activated");
  } else {
    await VCS.create({
      key: COVER_LETTER_PROMPT_KEY,
      active: true,
      activePromptId: promptRow.id,
    });
    logger.info("Cover letter prompt seeded and activated");
  }
};

// Standalone entrypoint — run directly with:
//   npx tsx src/scripts/seed-vcs-cover-letter-prompt.ts
// (add SEED_COVER_LETTER_PROMPT_FORCE=true before it to push a new version
// over an existing row). Guarded so `connectDB()` importing
// seedCoverLetterPrompt() above doesn't also trigger this block and exit the
// running server process.
if (require.main === module) {
  require("dotenv").config();
  const { getSequelize } = require("../utils/sequelize");

  (async () => {
    const sequelize = getSequelize();
    try {
      await sequelize.authenticate();
      logger.info("Connected to database");
      await seedCoverLetterPrompt();
      await sequelize.close();
      process.exit(0);
    } catch (error) {
      logger.error("Failed to seed cover letter prompt", error);
      process.exit(1);
    }
  })();
}
