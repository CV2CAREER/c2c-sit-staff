// External Action field type (SPR-21-52): a Missing Information block that sends the
// customer to an external process (e.g. an Indeed appeal) and records only that they
// completed it. Its settings live in the field's JSON `options` column as an object.
export const EXTERNAL_ACTION_FIELD_TYPE = "external_action";

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

type FieldLike = { fieldType?: unknown; options?: unknown };

const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

/** Normalises whatever is stored in `options` into a full config object. */
export const normaliseExternalActionConfig = (raw: unknown): ExternalActionConfig => {
  const o = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  return {
    actionLabel: str(o.actionLabel),
    completionLabel: str(o.completionLabel),
    appealUrl: str(o.appealUrl),
    guideUrl: str(o.guideUrl),
    showGuide: o.showGuide === true,
    requireCompletion: o.requireCompletion !== false,
    emailSubject: str(o.emailSubject),
    emailBody: str(o.emailBody),
    guidanceText: str(o.guidanceText),
  };
};

// The sentence the builder's original default email text carried for every template. It is only
// true when a guide is actually available, so it is dropped from older saved texts when not.
const LEGACY_GUIDE_SENTENCE = "If you need help understanding the process, use the step-by-step guide.";
const GUIDE_HELP_SENTENCE = "If you need help understanding the process, use the step-by-step guide in the request.";

/**
 * The email body to send for an External Action. The guide is only mentioned when there really is
 * one (the "show guide" toggle is on AND a guide link is set):
 *  - guide available: the sentence is added unless the admin's text already talks about a guide;
 *  - guide not available: the old default guide sentence is removed.
 * Everything else the admin wrote is sent as written.
 */
export const composeExternalActionEmailBody = (cfg: ExternalActionConfig): string => {
  const body = cfg.emailBody.trim();
  const guideAvailable = cfg.showGuide && cfg.guideUrl.length > 0;
  if (guideAvailable) {
    if (/guide/i.test(body)) return body;
    return body ? `${body}\n\n${GUIDE_HELP_SENTENCE}` : GUIDE_HELP_SENTENCE;
  }
  return body.replace(LEGACY_GUIDE_SENTENCE, "").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
};

/** The template's External Action settings, or null when it has no such block. */
export const getExternalActionConfig = (fields: FieldLike[] | null | undefined): ExternalActionConfig | null => {
  const field = (fields || []).find((f) => f.fieldType === EXTERNAL_ACTION_FIELD_TYPE);
  return field ? normaliseExternalActionConfig(field.options) : null;
};

// ---- Instructions block: display-only free text for the customer --------------------------------
export const INSTRUCTIONS_FIELD_TYPE = "instructions";
export const INSTRUCTIONS_MAX_LENGTH = 5000;

/** Throws a readable Error when an Instructions block has no text or is too long. */
export const validateInstructionsFields = (fields: FieldLike[] | null | undefined): void => {
  for (const f of (fields || []).filter((x) => x.fieldType === INSTRUCTIONS_FIELD_TYPE)) {
    const o = f.options && typeof f.options === "object" && !Array.isArray(f.options)
      ? (f.options as Record<string, unknown>)
      : {};
    const body = typeof o.body === "string" ? o.body.trim() : "";
    if (!body) throw new Error("Instructions: the text is required");
    if (body.length > INSTRUCTIONS_MAX_LENGTH) {
      throw new Error(`Instructions: the text must be ${INSTRUCTIONS_MAX_LENGTH} characters or fewer`);
    }
  }
};

const isHttpUrl = (value: string): boolean => {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
};

/**
 * Throws a readable Error when the External Action fields in a template payload are
 * invalid: at most one block, required labels, and http(s) links.
 */
export const validateExternalActionFields = (fields: FieldLike[] | null | undefined): void => {
  const blocks = (fields || []).filter((f) => f.fieldType === EXTERNAL_ACTION_FIELD_TYPE);
  if (blocks.length === 0) return;
  if (blocks.length > 1) {
    throw new Error("A template can have only one External Action block");
  }

  const cfg = normaliseExternalActionConfig(blocks[0].options);
  if (!cfg.actionLabel) throw new Error("External Action: the action label is required");
  if (!cfg.completionLabel) throw new Error("External Action: the completion label is required");
  if (!cfg.appealUrl) throw new Error("External Action: the external link is required");
  if (!isHttpUrl(cfg.appealUrl)) throw new Error("External Action: the external link must start with http:// or https://");
  if (cfg.guideUrl && !isHttpUrl(cfg.guideUrl)) {
    throw new Error("External Action: the guide link must start with http:// or https://");
  }
};
