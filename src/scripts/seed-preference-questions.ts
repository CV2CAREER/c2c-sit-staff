import { getServiceLogger } from "../utils/createLogger";
import {
  PreferenceQuestion,
  PreferenceQuestionFieldType,
  PreferenceQuestionVisibility,
} from "../models/v1/preference-question.model";

const logger = getServiceLogger("seed-preference-questions");

type SeedQuestion = {
  label: string;
  fieldType: PreferenceQuestionFieldType;
  options?: string[];
};

/**
 * Mirrors the questions previously hardcoded in c2c-customer-rft's
 * constants/questions.ts (privateQuestions / publicQuestions), so cutover to
 * the admin-managed table doesn't change what the onboarding screen shows.
 * `type: 'input'` from that file maps to fieldType "text" here.
 */
const PRIVATE_QUESTIONS: SeedQuestion[] = [
  { label: "Are you from a non-English speaking background?", fieldType: "radio", options: ["Yes", "No", "Prefer not to respond"] },
  { label: "Are you of Aboriginal or Torres Strait Islander Decent?", fieldType: "radio", options: ["Yes", "No", "Prefer not to respond"] },
  { label: "My Nickname in school", fieldType: "text" },
  { label: "Former Nationalities", fieldType: "text" },
  { label: "Have you been charged with a criminal offence in the last 10 years?", fieldType: "radio", options: ["Yes", "No"] },
  { label: "Are you from a racial, ethnic or ethno-religious group which is a minority in Australian Society", fieldType: "text" },
  { label: "Do you have a Covid-19 vaccination?", fieldType: "text" },
  { label: "What is your sexual orientation?", fieldType: "text" },
  { label: "Is your gender identity the same as the gender you were assigned at birth", fieldType: "select", options: ["Yes", "No", "Prefer not to respond"] },
  { label: "What is your religion or belief?", fieldType: "text" },
  { label: "How many hours can you work per week?", fieldType: "select", options: ["Up to 20", "20-30", "30-38", "other"] },
  { label: "Describe your personality", fieldType: "text" },
  { label: "Do you have a Police Record?", fieldType: "radio", options: ["Yes", "No"] },
  { label: "Do you have a police check?", fieldType: "radio", options: ["Yes", "No"] },
  { label: "Do you hold a Security Clearance? If so, what Security Clearance do you hold?", fieldType: "textarea" },
  { label: "Are there any factors that may affect your ability to perform the requirements of the role? This includes, but is not limited to, a previous or current illness or injury", fieldType: "text" },
  { label: "Biosecurity is critical to us: Do you keep birds or pigs at your place of residence, or live with someone who works in these industries?", fieldType: "text" },
  { label: "What suburb do you reside in ?", fieldType: "textarea" },
  { label: "Do you have any medical conditions (temporary or permanent) that would affect your ability to undertake these tasks? (Please answer this question if your sector of work is Retail)", fieldType: "textarea" },
  { label: "Have you ever lodged a claim for workers compensation? If yes, is the claim still open? Are you receiving treatment?", fieldType: "textarea" },
  { label: "Do you have a spouse, partner, relative or household member already working for us?", fieldType: "radio", options: ["Yes", "No"] },
  { label: "Have you ever been charged with a criminal offence?", fieldType: "radio", options: ["Yes", "No"] },
  { label: "If you require any type of accommodation during your interview process and/or while performing the role described above, please specify it here so that we can do our best to support you.(optional)", fieldType: "text" },
  { label: "If you have an illness, injury or disability that impacts your daily life, and you require any reasonable adjustments to be made during your recruitment process please tell us below.", fieldType: "textarea" },
];

const PUBLIC_QUESTIONS: SeedQuestion[] = [
  { label: "If you use a first name other than the one entered above that you would prefer we use when communicating with you, please enter it here:(optional)", fieldType: "text" },
  { label: "Preferred Personal Pronouns", fieldType: "text" },
  { label: "Briefly tell us about yourself", fieldType: "textarea" },
  { label: "Your address", fieldType: "textarea" },
];

type SystemSeedQuestion = SeedQuestion & { systemKey: string };

/**
 * These map to dedicated (in some cases field-level encrypted) Profile
 * columns rather than the generic questions[] blob — the onboarding screen
 * still renders them as fixed inputs bound to those columns. Admin can
 * relabel/reclassify/toggle them (matched by systemKey, not label, so a
 * rename doesn't create a duplicate), but the service layer blocks changing
 * fieldType/options or deleting them.
 */
const SYSTEM_QUESTIONS: SystemSeedQuestion[] = [
  { label: "Date of Birth", fieldType: "date", systemKey: "dateOfBirth" },
  { label: "Taxpayer Identification Number (TIN)", fieldType: "text", systemKey: "taxIdentificationNumber" },
  { label: "Social Security Number (SSN)", fieldType: "text", systemKey: "socialSecurityNumber" },
  { label: "Marital Status", fieldType: "select", systemKey: "maritalStatus" },
  { label: "Disability Status", fieldType: "select", systemKey: "disabilityStatus" },
  { label: "Are you a Veteran?", fieldType: "radio", options: ["Yes", "No"], systemKey: "veteran" },
];

const seedGroup = async (questions: SeedQuestion[], visibility: PreferenceQuestionVisibility) => {
  let created = 0;
  for (let i = 0; i < questions.length; i += 1) {
    const q = questions[i];
    const [, wasCreated] = await PreferenceQuestion.findOrCreate({
      where: { label: q.label, visibility },
      defaults: {
        label: q.label,
        fieldType: q.fieldType,
        options: q.options ?? null,
        visibility,
        isActive: true,
        sortOrder: i,
        createdById: null,
      },
    });
    if (wasCreated) created += 1;
  }
  return created;
};

const seedSystemQuestions = async (questions: SystemSeedQuestion[]): Promise<number> => {
  let created = 0;
  for (let i = 0; i < questions.length; i += 1) {
    const q = questions[i];
    const [, wasCreated] = await PreferenceQuestion.findOrCreate({
      where: { systemKey: q.systemKey },
      defaults: {
        label: q.label,
        fieldType: q.fieldType,
        options: q.options ?? null,
        visibility: "private",
        isActive: true,
        sortOrder: i,
        isSystem: true,
        systemKey: q.systemKey,
        createdById: null,
      },
    });
    if (wasCreated) created += 1;
  }
  return created;
};

/**
 * Idempotent — existing rows (matched by label + visibility for the
 * free-text questions, by systemKey for the system ones) are left untouched
 * so re-running this after an admin has already edited a question doesn't
 * clobber their changes.
 */
export const seedPreferenceQuestions = async (): Promise<void> => {
  const createdPrivate = await seedGroup(PRIVATE_QUESTIONS, "private");
  const createdPublic = await seedGroup(PUBLIC_QUESTIONS, "public");
  const createdSystem = await seedSystemQuestions(SYSTEM_QUESTIONS);

  logger.info(
    `Preference question seed complete — ${createdPrivate} private, ${createdPublic} public, ${createdSystem} system created (existing rows left untouched)`,
  );
};

// Standalone entrypoint — run directly with:
//   npx tsx src/scripts/seed-preference-questions.ts
if (require.main === module) {
  require("dotenv").config();
  const { getSequelize } = require("../utils/sequelize");

  (async () => {
    const sequelize = getSequelize();
    try {
      await sequelize.authenticate();
      logger.info("Connected to database");
      await seedPreferenceQuestions();
      await sequelize.close();
      process.exit(0);
    } catch (error) {
      logger.error("Preference question seed failed:", error);
      try {
        await sequelize.close();
      } catch {
        // ignore
      }
      process.exit(1);
    }
  })();
}
