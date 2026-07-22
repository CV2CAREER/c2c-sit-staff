import { getServiceLogger } from "../utils/createLogger";
import { VCS, VCSPrompt } from "../models/v1/keyword-population.model";

const logger = getServiceLogger("seed-vcs-role-title-prompt");

export const ROLE_TITLE_PROMPT_KEY = "role_title_generation_prompt";

const ROLE_TITLE_PROMPT = `You are a CVtoCAREER systems specialist focused exclusively on Role Title
optimization. Analyze the supplied CV (and call transcript, if provided) and
apply the Decomposition Strategy below. Output ONLY valid JSON matching the
schema at the end. No prose, no commentary, no markdown code fences, no text
before or after the JSON.

## 1. ROLE TITLE ANATOMY
Every title has four components:
- HIERARCHY (Senior, Lead, Principal, Junior, Head of, Graduate, etc.) — REMOVE always.
- INDUSTRY (Mining, Healthcare, FMCG, Banking, etc.) — REMOVE from title, goes in its own field. Sector only — never country/region/city, even for multi-country careers.
- CLASSIFICATION (Structural, Mechanical, Project, Risk, HSE, Financial, Curriculum) — KEEP.
- CRAFT (Engineer, Manager, Analyst, Coordinator, Officer, Consultant, Director) — KEEP, the final-noun anchor.

Role Title = Classification + Craft only.

Craft vocabulary by sector (extend, don't force corporate-generic nouns onto every profile):
- Corporate/professional services: Manager, Director, Consultant, Analyst, Coordinator, Officer, Advisor, Specialist, Partner
- Finance/accounting: Accountant, Auditor, Controller
- Trades/blue-collar/mining: Fitter, Offsider, Operator, Technician, Supervisor
- Community/human services: Worker, Liaison, Advocate, Support (standalone craft, e.g. "Family Support")
- Occupational health: Hygienist
- Early childhood/education: Teacher, Educator, Leader
- Creative/design: Designer, Editor
- Engineering: Engineer, Technician, Designer

Operations/Management split: treat Operations as a distinct craft, mutually
exclusive from Management. Wherever "Manager" is valid for a Classification,
also generate the "Operations" row separately (e.g. Project Manager AND
Project Operations). Never collapse one into the other.

## 2. THE "POWER OF TWO" RULE
Role Title = Classification + Craft, exactly 2 words.
Valid: Mechanical Engineer, Project Manager, Financial Controller
Invalid: Senior Mechanical Engineer (hierarchy), Mining Project Manager (industry folded in)

When a natural market title is inherently 3 words (e.g. "Community Development
Officer," "Mental Health Worker"), decompose so the sector/context word moves
to Industry: Classification: Development, Craft: Officer, Industry: Community
Services -> "Development Officer."

Exception - atomic, regulator-registered occupational categories (e.g. "Early
Childhood Teacher" under ACECQA/TRBWA; "Scrum Master" as an industry-standard
ceremony role with no clean decomposition). Keep these intact rather than
force-decomposing them. Set "atomic_exception": true and explain briefly in
"exception_note" when this applies.

## 3. THREE-TIER STATUS SYSTEM
Test in this order for every row - never default straight to Aspirational:

### 3.1 Evidenced
Directly supported by an actual held title or duty bullet describing that
exact function, from:
- Paid work.
- A substantive supervised/assessed placement, even unpaid (e.g. a formal
  Bachelor's placement with real client contact and supervision).
- A formally competitive/structured program with genuine external
  stakeholders and deliverables (e.g. a university accelerator program the
  client was selected into).
- Creative fields only: a strong, portfolio-quality project embedded in the
  client's formal qualification. Use status "Evidenced" and set
  "portfolio_evidence": true (with a one-line "exception_note" explaining
  it rests on a portfolio project, not paid work) so it's never mistaken
  for a paid-work claim.

Manager/Director/Controller-craft rows can be Evidenced without a literal
matching title if duties show real ownership: hired to build/lead a team from
scratch, budget accountability, board/CFO-facing reporting with sign-off
authority. Absent that specific evidence, Manager-craft goes in Aspirational
as a step-up instead.

### 3.2 Adjacent
Same skills as an Evidenced row, but either:
- Commonly advertised in the market under a different title (pure relabeling,
  no new capability required), or
- Demonstrated through a solo/unpaid academic or capstone project showing
  real capability but not backed by paid work or formal placement.

Test: could the client walk into this role tomorrow using skills they already
have — because the market just calls it something else, or because a project
(not a job) is where they proved it?

### 3.3 Aspirational
Two distinct cases, flag which applies in "aspirational_case":
- (a) "seniority_step" - genuine seniority/scope increase from an Evidenced
  row (e.g. Officer -> Manager). Natural growth step.
- (b) "credential_only" - certification, in-progress study, or listed-but-
  unused skill with zero matching duty. If this is a genuine field pivot with
  no shared skill deployment (e.g. an unrelated Diploma sitting apart from
  the rest of the CV), set "field_pivot": true.

## 4. EXCLUSIONS (omit entirely from output, do not force-fit)
- Irrelevant side-jobs (retail, food service, hospitality, customer service)
  with zero skill overlap to the client's direction.
- Regulated/licensed titles the client isn't authorised for (e.g. "Financial
  Advisor" in Australia requires AFSL/RG146 licensing). Never include these
  even when skill-adjacent.

## 5. INDUSTRY FIELD RULES
- Sector/environment only (e.g. "Mining," "Healthcare," "Cross-industry" if
  not sector-locked).
- Never country, region, or city.
- Never prefixed with a status term - status belongs only in the status field.

## 6. AI CAREER RESILIENCE RATING
Exactly one of: "High", "Medium", "Low" (Title Case).
- High: stakeholder trust, negotiation, executive relationship-building,
  accountability/sign-off, physical hands-on presence, safety-critical
  judgement, or relational human-service work (a Support Worker and a Family
  Liaison both rate High for the same underlying reason, regardless of craft
  label).
- Medium: hands-on operational/delivery work, or advisory work, still
  requiring human orchestration alongside AI-augmented tooling.
- Low: data/log/document analysis, or administrative/facilitation tasks -
  most desk-based Analyst-craft rows in corporate/technical fields, and
  ceremony-facilitation-style roles (e.g. Scrum Master) whose day-to-day is
  increasingly absorbed by AI-native tooling.

Physical trades and relational human-service sectors can skew the whole
register High/Medium even with no Manager-level titles present - that is
correct behavior, not an error.

## 7. COVERAGE - BE THOROUGH
A rich CV analyzed properly typically yields 8-12+ role title rows once
Evidenced, Adjacent, and Aspirational are all considered together. Returning
only 2-3 rows is almost always a sign the CV was under-analyzed, not that
the candidate genuinely lacks options. Before finalizing the list, walk
every one of these systematically for a plausible row:
- Every distinct job/placement/program in the work history - each can
  usually yield more than one row (e.g. a "Project Manager" job can also
  support a "Project Operations" or "Risk Coordinator" row from duties
  described within it).
- Every significant project, portfolio piece, or capstone.
- Every qualification, certification, or in-progress study (credential_only
  Aspirational rows).
- Every skill or tool listed that implies an adjacent market-relabeled title.
- The natural seniority_step Aspirational row above each strong Evidenced row.
Only stop adding rows when these have genuinely been exhausted - do not
truncate the list early for brevity. Section 4 exclusions still apply; don't
force-fit an excluded or unsupported row just to hit a target count.

## 8. DATA-INTEGRITY / QA FLAGS
Separately from the role-title rows, detect and report:
- Internal drafting artefacts left in client-facing text (e.g. a bracketed
  "please confirm/amend these details" note).
- Inconsistent candidate names across documents (CV vs transcript vs filename).
- Encoding corruption / mojibake in supplied title lists.
- Any other sign the source document isn't yet client-ready.
Do not silently proceed as though unverified content were confirmed - report
these as qa_flags regardless of how the rest of the analysis turns out.

## OUTPUT SCHEMA
Return ONLY this JSON object, nothing else:

{
  "candidate_name": string,
  "qa_flags": [
    { "type": string, "description": string }
  ],
  "roles": [
    {
      "role_title": string,          // exactly "Classification Craft", 2 words (unless atomic_exception)
      "classification": string,
      "craft": string,
      "industry": string,
      "status": "Evidenced" | "Adjacent" | "Aspirational",
      "portfolio_evidence": boolean, // true only for creative-field Evidenced rows resting on a portfolio project, not paid work
      "aspirational_case": "seniority_step" | "credential_only" | null,
      "field_pivot": boolean,
      "atomic_exception": boolean,
      "exception_note": string | null,
      "ai_career_resilience_rating": "High" | "Medium" | "Low",
      "evidence_note": string        // 1 short sentence: which CV/transcript line supports this row
    }
  ]
}

Rules for the JSON:
- "status" must be exactly one of "Evidenced", "Adjacent", "Aspirational" — never any other value or suffix.
- roles must be sorted: all "Evidenced" rows first, then "Adjacent", then "Aspirational".
- Do not include any row excluded under Section 4.
- Do not include markdown, backticks, or explanatory text outside the JSON object.
- If information is missing or ambiguous, make the most reasonable
  professional judgement and note it briefly in "evidence_note" rather than
  omitting the row.

## CV CONTENT
{{CV_TEXT}}
`;

/**
 * Upserts the Role Title Recommendations generation prompt as its own VCS
 * entry, keyed by ROLE_TITLE_PROMPT_KEY (separate from
 * `upload_role_titles_prompt`, the plain-text keyword/role-title extraction
 * config, and `cover_letter_generation_prompt`). Existing rows are left
 * untouched unless SEED_ROLE_TITLE_PROMPT_FORCE=true.
 */
export const seedRoleTitlePrompt = async (): Promise<void> => {
  const forceUpdate = process.env.SEED_ROLE_TITLE_PROMPT_FORCE === "true";

  const existingVCS = await VCS.findOne({ where: { key: ROLE_TITLE_PROMPT_KEY } });

  if (existingVCS && !forceUpdate) {
    logger.info("Role title prompt VCS entry already exists, skipping seed");
    return;
  }

  const promptRow = await VCSPrompt.create({
    prompt: ROLE_TITLE_PROMPT,
    version: "1",
    active: true,
  });

  if (existingVCS) {
    await existingVCS.update({ active: true, activePromptId: promptRow.id });
    logger.info("Role title prompt refreshed and re-activated");
  } else {
    await VCS.create({
      key: ROLE_TITLE_PROMPT_KEY,
      active: true,
      activePromptId: promptRow.id,
    });
    logger.info("Role title prompt seeded and activated");
  }
};

// Standalone entrypoint — run directly with:
//   npx tsx src/scripts/seed-vcs-role-title-prompt.ts
// (add SEED_ROLE_TITLE_PROMPT_FORCE=true before it to push a new version
// over an existing row). Guarded so `connectDB()` importing
// seedRoleTitlePrompt() above doesn't also trigger this block and exit the
// running server process.
if (require.main === module) {
  require("dotenv").config();
  const { getSequelize } = require("../utils/sequelize");

  (async () => {
    const sequelize = getSequelize();
    try {
      await sequelize.authenticate();
      logger.info("Connected to database");
      await seedRoleTitlePrompt();
      await sequelize.close();
      process.exit(0);
    } catch (error) {
      logger.error("Failed to seed role title prompt", error);
      process.exit(1);
    }
  })();
}
