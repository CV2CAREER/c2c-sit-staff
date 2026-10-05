export const FIELD_TYPES = [
  { type: "text", label: "Short text" },
  { type: "textarea", label: "Long text" },
  { type: "date", label: "Date picker" },
  { type: "select", label: "Dropdown" },
  { type: "checkbox", label: "Multi-select" },
  { type: "file", label: "File upload" },
  { type: "number", label: "Number" },
  { type: "phone", label: "Phone" },
  { type: "email", label: "Email" },
] as const;

// SPR-21-52: External Action block. Sends the customer to an external process (e.g. an Indeed
// appeal) and records only that they completed it. Its settings are stored as an object in the
// field's `options` JSON (select/checkbox fields keep an array there).
export const EXTERNAL_ACTION_FIELD_TYPE = {
  type: "external_action" as const,
  label: "External action",
};

export type ExternalActionConfig = {
  actionLabel: string;
  completionLabel: string;
  appealUrl: string;
  guideUrl: string;
  showGuide: boolean;
  requireCompletion: boolean;
  emailSubject: string;
  emailBody: string;
  guidanceText: string;
};

export const DEFAULT_EXTERNAL_ACTION_CONFIG: ExternalActionConfig = {
  actionLabel: "Open Indeed appeal",
  completionLabel: "I've completed the appeal",
  appealUrl: "",
  guideUrl: "",
  showGuide: true,
  requireCompletion: true,
  emailSubject: "Action required: complete your Indeed appeal",
  // No mention of a guide here: the email adds that sentence itself, only when a guide is available.
  emailBody:
    "Your application has been temporarily blocked by Indeed.\n\nPlease use the link in the form to complete the required appeal directly with Indeed.\n\nOnce you have completed the appeal, return to CVtoCAREER and select \"I've completed the appeal\".",
  guidanceText:
    "Complete the appeal directly with Indeed. You do not need to send your appeal documents, ticket details or other external-case information to CVtoCAREER.",
};

const LEGACY_GUIDE_SENTENCE = "If you need help understanding the process, use the step-by-step guide.";
const GUIDE_HELP_SENTENCE = "If you need help understanding the process, use the step-by-step guide in the request.";

/** True when the customer will really have a guide: the toggle is on AND a guide link is set. */
export function isGuideAvailable(cfg: Pick<ExternalActionConfig, "showGuide" | "guideUrl">): boolean {
  return cfg.showGuide && cfg.guideUrl.trim().length > 0;
}

/**
 * The email body that is actually sent (mirrors the backend). The guide is only mentioned when
 * there is one: added if the admin's text doesn't already talk about a guide, and the old default
 * guide sentence is removed when there isn't.
 */
export function composeExternalActionEmailBody(cfg: ExternalActionConfig): string {
  const body = cfg.emailBody.trim();
  if (isGuideAvailable(cfg)) {
    if (/guide/i.test(body)) return body;
    return body ? `${body}\n\n${GUIDE_HELP_SENTENCE}` : GUIDE_HELP_SENTENCE;
  }
  return body.replace(LEGACY_GUIDE_SENTENCE, "").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

/** Reads an External Action config out of a field's `options`, filling any gaps with the defaults. */
export function readExternalActionConfig(options: unknown): ExternalActionConfig {
  const o =
    options && typeof options === "object" && !Array.isArray(options)
      ? (options as Record<string, unknown>)
      : {};
  const s = (v: unknown, d: string) => (typeof v === "string" ? v : d);
  const d = DEFAULT_EXTERNAL_ACTION_CONFIG;
  return {
    actionLabel: s(o.actionLabel, d.actionLabel),
    completionLabel: s(o.completionLabel, d.completionLabel),
    appealUrl: s(o.appealUrl, d.appealUrl),
    guideUrl: s(o.guideUrl, d.guideUrl),
    showGuide: typeof o.showGuide === "boolean" ? o.showGuide : d.showGuide,
    requireCompletion: typeof o.requireCompletion === "boolean" ? o.requireCompletion : d.requireCompletion,
    emailSubject: s(o.emailSubject, d.emailSubject),
    emailBody: s(o.emailBody, d.emailBody),
    guidanceText: s(o.guidanceText, d.guidanceText),
  };
}

// Display-only free text the admin writes for the customer (links allowed). Never required and has
// no answer. The text is stored as `options.body` in the field's JSON `options`.
export const INSTRUCTIONS_FIELD_TYPE = {
  type: "instructions" as const,
  label: "Instructions",
};

export const INSTRUCTIONS_MAX_LENGTH = 5000;

export function readInstructionsBody(options: unknown): string {
  const o =
    options && typeof options === "object" && !Array.isArray(options)
      ? (options as Record<string, unknown>)
      : {};
  return typeof o.body === "string" ? o.body : "";
}

export const REFEREE_BLOCK_FIELD_TYPE = {
  type: "referee_block" as const,
  label: "Referee block (10 fields)",
};

export const REFEREE_DEFAULT_FIELDS = [
  { fieldName: "organization_name", fieldLabel: "Organization Name", fieldType: "text", isRequired: true, isVisible: true, helpText: "Company / institution name" },
  { fieldName: "position_title", fieldLabel: "Position Title", fieldType: "text", isRequired: true, isVisible: true, helpText: "e.g. Manager, Director" },
  { fieldName: "phone_number", fieldLabel: "Phone Number", fieldType: "phone", isRequired: true, isVisible: true, helpText: "Include country code" },
  { fieldName: "email", fieldLabel: "Email", fieldType: "email", isRequired: true, isVisible: true, helpText: "Work email preferred" },
  { fieldName: "postal_address", fieldLabel: "Postal Address", fieldType: "text", isRequired: false, isVisible: true, helpText: "Street address" },
  { fieldName: "city", fieldLabel: "City", fieldType: "text", isRequired: false, isVisible: true, helpText: null },
  { fieldName: "state", fieldLabel: "State", fieldType: "text", isRequired: false, isVisible: true, helpText: null },
  { fieldName: "postcode", fieldLabel: "Postcode", fieldType: "text", isRequired: false, isVisible: true, helpText: null },
  { fieldName: "country", fieldLabel: "Country", fieldType: "text", isRequired: false, isVisible: true, helpText: null },
  { fieldName: "relationship", fieldLabel: "Relationship", fieldType: "text", isRequired: false, isVisible: true, helpText: null },
] as const;

export type FieldTypeEntry = (typeof FIELD_TYPES)[number];
