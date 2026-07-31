import { getServiceLogger } from "../utils/createLogger";
import { VCS, VCSPrompt } from "../models/v1/keyword-population.model";

const logger = getServiceLogger("seed-vcs-interview-pack-prompts");

export const INTERVIEW_PACK_FOUNDATIONAL_PROMPT_KEY = "interview_pack_foundational_prompt";
export const INTERVIEW_PACK_STAR_BANK_PROMPT_KEY = "interview_pack_star_bank_prompt";
export const INTERVIEW_PACK_TECHNICAL_PROMPT_KEY = "interview_pack_technical_prompt";
export const INTERVIEW_PACK_CLOSING_PROMPT_KEY = "interview_pack_closing_prompt";

/**
 * Shared across all four stages — prepended to each stage prompt below
 * rather than fetched separately, so each seeded VCSPrompt is self-contained
 * and a single VCS lookup is all a stage generator needs.
 */
const HARD_RULES = `HARD RULES:
1. Use only experience found in the candidate's CV. Never invent scenarios, employers, metrics, or credentials.
2. If the job ad requires something the CV doesn't evidence, bridge to the closest transferable
   experience and explicitly connect it. Lead sentences with the real strength; name the specific
   gap only as a brief closing detail, never as the opening clause. Never invent an unnamed
   "similar tool" or vague prior exposure to imply experience that isn't there.
3. Every answer is first person, spoken register — written the way the candidate would actually
   say it out loud, not analysis written about them.
4. Cite tools, technologies, and methodologies exactly as named in the CV — do not substitute or
   generalize a named tool.
5. Output valid JSON only, matching the schema provided. No prose outside the JSON object, no
   markdown code fences, no commentary before or after.`;

const INPUTS_BLOCK = `## INPUTS

JOB LINK:
{{JOB_LINK}}

JOB DESCRIPTION:
{{JOB_CONTENT}}

CV CONTENT:
{{CV_CONTENT}}`;

const PREVIOUS_CONTEXT_BLOCK = `## CONTEXT FROM PREVIOUS STEP
The candidateProfile and gapAnalysis already established for this candidate — stay
consistent with the pillars and gap-handling already decided there. Do not
re-derive or contradict them.

{{PREVIOUS_CONTEXT}}
`;

const STAGE_1_FOUNDATIONAL = `${HARD_RULES}

You are building the opening two sections of an Interview Preparation Pack, based only on
the candidate's CV and a job advertisement.

Do the following, in order:

1. Extract a candidateProfile: years of relevant experience, core tools/skills, industries,
   and current employment status (currently employed vs not — infer from CV dates).

2. Extract every distinct requirement, tool, or competency named in the job ad. For each,
   assess the CV's evidence level: "strong" (clearly and directly evidenced), "partial"
   (adjacent/transferable evidence exists), or "none" (no evidence at all). For every
   "partial" or "none" item, write a one-sentence bridgeNote naming the closest real
   transferable experience from the CV.

3. Write a personal positioning statement (1-2 sentences).

4. Write three anchoring pillars, each grounded in a "strong"-evidence item from step 2.

5. Write one consolidated gap script: a first-person paragraph addressing every "partial" or
   "none" item from step 2, following Hard Rule 2 (lead with strength, name the gap briefly,
   never invent).

6. Write the foundational answers in the output schema below, applying the Automation-Specific
   Guardrails (Section 3) for workingRights, salary, employment gaps, and notice period.

Output valid JSON only, matching this schema:
{
  "candidateProfile": {
    "yearsExperience": string,
    "coreSkills": string[],
    "industries": string[],
    "currentlyEmployed": boolean,
    "employmentGapsDetected": string[]
  },
  "gapAnalysis": [
    { "requirement": string, "evidenceLevel": "strong"|"partial"|"none", "cvBasis": string, "bridgeNote": string|null }
  ],
  "positioning": {
    "statement": string,
    "pillars": [ { "lead": string, "body": string } ],
    "gapScript": string
  },
  "foundational": {
    "tellMeAboutYourself": string,
    "whyThisRole": string,
    "whyLeavingOrCareerPivot": string,
    "keyDeliverables": string,
    "noticePeriod": string,
    "workingRights": { "statement": string|null, "needsCoachInput": boolean },
    "salaryOfferResponse": string,
    "salaryCurrentPayDecline": string,
    "salaryExpectationsFlip": string,
    "topThreeStrengths": string,
    "developmentArea": string,
    "careerGoals": string
  }
}

${INPUTS_BLOCK}
`;

const STAGE_2_STAR_BANK = `${HARD_RULES}

You are building the STAR Answer Bank section of an Interview Preparation Pack. You've been
given the candidateProfile and gapAnalysis from a previous step — stay consistent with the
pillars and gap-handling already established there.

Generate one distinct STAR story per genuinely different situation in the CV — typically one
per distinct employer or project combined with a distinct competency or challenge from that
experience. Do not create multiple stories that retell the same situation with only the
wording changed.

Aim to cover as many of the job ad's requirements as the CV's real material supports — do not
invent additional material just to hit a target count. A typical range is 8-20 stories
depending on how much real material the CV contains for this role: fewer is correct for a
junior or thin CV, more is correct for a senior or detailed one.

If the CV distinguishes real paid employment from academic or personal projects (e.g. a
separate "PROJECTS" section), preserve that distinction in sourceType — never present a
project as if it were a job.

Phrase every story's title as a full behavioral question ("Tell me about a time when you...").

Output valid JSON only, matching this schema:
{
  "starBank": [
    {
      "id": string,
      "title": string,
      "useWhenAskedAbout": string,
      "situation": string,
      "task": string,
      "action": string,
      "result": string,
      "sourceType": "employment"|"academic_project"|"personal_project"
    }
  ]
}

${PREVIOUS_CONTEXT_BLOCK}
${INPUTS_BLOCK}
`;

const STAGE_3_TECHNICAL = `${HARD_RULES}

You are building the Technical and Competency Deep-Dive section of an Interview Preparation
Pack. You've been given the candidateProfile and gapAnalysis from a previous step.

For every tool, technology, or methodology in gapAnalysis, write a short first-person script —
lead with real evidenced strength per Hard Rule 2, naming any gap only as a brief closing detail.

Then check: does the job ad name concrete, testable technical skills (a programming language, a
query language, or specific software)? If yes, write 5-8 realistic practice questions pitched at
the experience level the job ad states (e.g. 1-2 years' experience means junior-level questions,
not advanced or expert-level ones), each with a spoken explanation and, where relevant, a short
code example. If the role has no such discrete testable skills (e.g. a sales, management, or
generalist role), return an empty array for technicalPractice — do not force irrelevant
technical trivia onto a non-technical role.

Output valid JSON only, matching this schema:
{
  "technicalDeepDive": [
    { "topic": string, "script": string }
  ],
  "technicalPractice": [
    { "category": string, "question": string, "modelAnswer": string, "codeExample": string|null }
  ]
}

${PREVIOUS_CONTEXT_BLOCK}
${INPUTS_BLOCK}
`;

const STAGE_4_CLOSING = `${HARD_RULES}

You are building the final two sections of an Interview Preparation Pack.

Generate 6-8 genuine, curious questions the candidate could ask the interviewer, grouped into
"aboutRole," "aboutTeam," and "aboutGrowth," plus one closing question. These must be specific
to this job ad and company — not generic template questions that could apply to any employer.

Generate a Delivery Playbook: guidance for the first 60 seconds, pacing and tone, a closing
statement for the last 60 seconds, a "things to avoid" list that explicitly references the gaps
identified for this candidate (so they don't overclaim them live), and a night-before checklist.

Output valid JSON only, matching this schema:
{
  "panelQuestions": {
    "aboutRole": string[],
    "aboutTeam": string[],
    "aboutGrowth": string[],
    "closingQuestion": string
  },
  "playbook": {
    "first60Seconds": string[],
    "pacingAndTone": string[],
    "last60Seconds": string,
    "thingsToAvoid": string[],
    "nightBeforeChecklist": string[]
  }
}

${PREVIOUS_CONTEXT_BLOCK}
${INPUTS_BLOCK}
`;

const STAGE_PROMPTS: { key: string; prompt: string }[] = [
  { key: INTERVIEW_PACK_FOUNDATIONAL_PROMPT_KEY, prompt: STAGE_1_FOUNDATIONAL },
  { key: INTERVIEW_PACK_STAR_BANK_PROMPT_KEY, prompt: STAGE_2_STAR_BANK },
  { key: INTERVIEW_PACK_TECHNICAL_PROMPT_KEY, prompt: STAGE_3_TECHNICAL },
  { key: INTERVIEW_PACK_CLOSING_PROMPT_KEY, prompt: STAGE_4_CLOSING },
];

/**
 * Upserts the four Interview Pack stage prompts as their own VCS
 * entries. Existing rows are left untouched unless
 * SEED_INTERVIEW_PACK_PROMPTS_FORCE=true.
 */
export const seedInterviewPackPrompts = async (): Promise<void> => {
  const forceUpdate = process.env.SEED_INTERVIEW_PACK_PROMPTS_FORCE === "true";

  for (const { key, prompt } of STAGE_PROMPTS) {
    const existingVCS = await VCS.findOne({ where: { key } });

    if (existingVCS && !forceUpdate) {
      logger.info(`Interview Pack prompt "${key}" already exists, skipping seed`);
      continue;
    }

    const promptRow = await VCSPrompt.create({
      prompt,
      version: "1",
      active: true,
    });

    if (existingVCS) {
      await existingVCS.update({ active: true, activePromptId: promptRow.id });
      logger.info(`Interview Pack prompt "${key}" refreshed and re-activated`);
    } else {
      await VCS.create({
        key,
        active: true,
        activePromptId: promptRow.id,
      });
      logger.info(`Interview Pack prompt "${key}" seeded and activated`);
    }
  }
};

// Standalone entrypoint — run directly with:
//   npx tsx src/scripts/seed-vcs-interview-pack-prompts.ts
// (add SEED_INTERVIEW_PACK_PROMPTS_FORCE=true before it to push new versions
// over existing rows). Guarded so `connectDB()` importing
// seedInterviewPackPrompts() above doesn't also trigger this block and exit
// the running server process.
if (require.main === module) {
  require("dotenv").config();
  const { getSequelize } = require("../utils/sequelize");

  (async () => {
    const sequelize = getSequelize();
    try {
      await sequelize.authenticate();
      logger.info("Connected to database");
      await seedInterviewPackPrompts();
      await sequelize.close();
      process.exit(0);
    } catch (error) {
      logger.error("Failed to seed interview pack prompts", error);
      process.exit(1);
    }
  })();
}
