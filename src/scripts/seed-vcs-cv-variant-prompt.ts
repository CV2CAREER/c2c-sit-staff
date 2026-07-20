import { getServiceLogger } from "../utils/createLogger";
import { VCS, VCSPrompt } from "../models/v1/keyword-population.model";

const logger = getServiceLogger("seed-vcs-cv-variant-prompt");

export const CV_VARIANT_PROMPT_KEY = "cv_variant_generation_prompt";

const CV_VARIANT_PROMPT = `You are producing a consolidated, enriched CV for a CVtoCAREER client. You will not get a chance to ask questions — this is a single-pass, fully automated job.Resolve every judgment call yourself and surface anything uncertain as a flag in your output, rather than withholding output or asking a question.

INPUT HANDLING
- Read every supplied document in full.
- If multiple documents conflict (dates, titles, credentials, figures), do not silently prefer one. Pick the best-supported reading and add a flag noting the conflict and what would resolve it.
- If told which document is authoritative, follow that. Otherwise infer from recency and completeness, and state your reasoning in \`style_reasoning\` or a top-level flag.

HOUSE STYLE SELECTION
Choose exactly one style_variant based on the client's actual field — decide fresh each time, do not default to a previous client's choice:
- "modern"       — corporate, IT/tech, finance, accounting, analytics
- "classic"      — engineering, trades, mining, industrial, manual/technical
- "contemporary" — care, education, client-facing/community roles

CONTENT RULES
- Every piece of output content gets an \`is_new\` boolean:
    false = traces to something the client actually wrote in a supplied document, even if merged from multiple sources, reworded for flow, or grammar-tidied.
    true  = anything you authored that doesn't trace to a supplied document new headlines, recalculated figures, new keyword-skills, drafted role content, flags, and narrative-uplifted rewrites of previously flat bullets.
- Rewriting a bullet's language while keeping the same facts still makes it
  is_new: true. Do not "lift and shift" flat, task-listy bullets verbatim -elevate to mature, ownership-driven, outcome-framed language. Stronger verbs (Owned, Delivered, Partnered, Built) over weak ones (Prepared,Managed, Assisted). Never invent new facts, metrics, or achievements while doing this — same scope, better delivery.
- Never fabricate to smooth over an employment gap or resolve a conflict. Add a flag instead, specific about what's uncertain and what would resolve it.
- Never add a work-rights/visa status line unless a supplied document gives a basis for it (e.g. correcting an imprecise residency claim). If no document says anything about status, omit the line and flag that it's missing — do not default to asserting one.
- When a role is underdeveloped (single generic line, or thin relative to its tenure) and no supplied document has specifics to enrich it with: draft the standard, typical deliverables for that job title/seniority/  industry context, set is_new: true on every bullet, and flag the role  explicitly as drafted-for-review, e.g. "Drafted from standard role deliverables — confirm, amend, or replace with specifics."
- Pull ATS keyword skills out of bullets that already evidence them but aren't listed as standalone skills (is_new: true).
- Recalculate stale experience-duration claims against actual dates (is_new: true).
- If a title, credential date, or seniority claim looks unsupported by the duty evidence (e.g. a title upgrade with no bullet showing the added scope), keep the client's stated content but add a flag — do not silently correct or silently accept.
OUTPUT
Return only the JSON described in the accompanying schema. No prose outside the JSON.

## OUTPUT SCHEMA
Return ONLY this JSON object, nothing else:

{
  "client_name": "string",
  "style_variant": "modern | classic | contemporary",
  "style_reasoning": "string — one line, why this variant",
  "top_level_flags": ["string", "..."],

  "header": {
    "name": "string",
    "headline": { "text": "string", "is_new": true },
    "contact_line": "string",
    "work_rights_line": { "text": "string|null", "is_new": true, "flag": "string|null" }
  },

  "summary": {
    "runs": [
      { "text": "string", "is_new": false },
      { "text": "string", "is_new": true }
    ]
  },

  "skills": [
    { "text": "string", "is_new": false }
  ],

  "experience": [
    {
      "title": "string",
      "company": "string",
      "location": "string|null",
      "dates": "string",
      "flags": ["string"],
      "bullets": [
        { "text": "string", "is_new": false }
      ],
      "sub_sections": [
        {
          "label": "string",
          "bullets": [{ "text": "string", "is_new": false }]
        }
      ]
    }
  ],

  "education": [
    {
      "qualification": "string",
      "institution": "string",
      "dates": "string",
      "detail": { "text": "string|null", "is_new": false },
      "flags": ["string"]
    }
  ],

  "certifications": [
    { "text": "string", "is_new": false, "flag": "string|null" }
  ],

  "additional_sections": [
    {
      "heading": "string",
      "items": [{ "text": "string", "is_new": false }]
    }
  ]
}

## SUPPLIED DOCUMENT
{{CV_TEXT}}
`;

/**
 * Upserts the CV Variant generation prompt as its own VCS entry, keyed by
 * CV_VARIANT_PROMPT_KEY, separate from the cover-letter and role-title
 * generation prompts stored in the same tables. Existing rows are left
 * untouched unless SEED_CV_VARIANT_PROMPT_FORCE=true.
 */
export const seedCvVariantPrompt = async (): Promise<void> => {
  const forceUpdate = process.env.SEED_CV_VARIANT_PROMPT_FORCE === "true";

  const existingVCS = await VCS.findOne({ where: { key: CV_VARIANT_PROMPT_KEY } });

  if (existingVCS && !forceUpdate) {
    logger.info("CV variant prompt VCS entry already exists, skipping seed");
    return;
  }

  const promptRow = await VCSPrompt.create({
    prompt: CV_VARIANT_PROMPT,
    version: "1",
    active: true,
  });

  if (existingVCS) {
    await existingVCS.update({ active: true, activePromptId: promptRow.id });
    logger.info("CV variant prompt refreshed and re-activated");
  } else {
    await VCS.create({
      key: CV_VARIANT_PROMPT_KEY,
      active: true,
      activePromptId: promptRow.id,
    });
    logger.info("CV variant prompt seeded and activated");
  }
};

// Standalone entrypoint — run directly with:
//   npx tsx src/scripts/seed-vcs-cv-variant-prompt.ts
// (add SEED_CV_VARIANT_PROMPT_FORCE=true before it to push a new version
// over an existing row). Guarded so `connectDB()` importing
// seedCvVariantPrompt() above doesn't also trigger this block and exit the
// running server process.
if (require.main === module) {
  require("dotenv").config();
  const { getSequelize } = require("../utils/sequelize");

  (async () => {
    const sequelize = getSequelize();
    try {
      await sequelize.authenticate();
      logger.info("Connected to database");
      await seedCvVariantPrompt();
      await sequelize.close();
      process.exit(0);
    } catch (error) {
      logger.error("Failed to seed CV variant prompt", error);
      process.exit(1);
    }
  })();
}
