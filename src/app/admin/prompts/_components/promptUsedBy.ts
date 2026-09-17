// Every prompt `key` is wired to exactly one call site (see admin-document.service.ts,
// interview-pack.service.ts, ai-vetting.service.ts), so the feature that uses a prompt
// is a static fact about its key, not something that needs to be logged per-call.
const PROMPT_USED_BY_LABELS: Record<string, string> = {
  cv_variant_generation_prompt: "CV Variant Generation",
  cover_letter_generation_prompt: "Cover Letter Generation",
  role_title_generation_prompt: "Role Title Generation",
  upload_role_titles_prompt: "Role Titles Upload",
  ai_vetting_classification_prompt: "AI Vetting / Classification",
  interview_pack_foundational_prompt: "Interview Pack – Foundational",
  interview_pack_star_bank_prompt: "Interview Pack – STAR Answer Bank",
  interview_pack_technical_prompt: "Interview Pack – Technical Deep-Dive",
  interview_pack_closing_prompt: "Interview Pack – Closing",
};

export const getPromptUsedByLabel = (key: string): string => {
  if (PROMPT_USED_BY_LABELS[key]) return PROMPT_USED_BY_LABELS[key];

  return key
    .replace(/_prompt$/, "")
    .split("_")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};
