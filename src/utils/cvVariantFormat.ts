import type { CvVariantResult } from "@/hooks/useCvVariantGeneration";

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const paragraph = (text: string, opts?: { bold?: boolean; align?: "justify" }): string => {
  const inner = opts?.bold ? `<strong>${escapeHtml(text)}</strong>` : escapeHtml(text);
  const style = opts?.align ? ` style="text-align: ${opts.align}"` : "";
  return `<p${style}>${inner}</p>`;
};

/** Like `paragraph`, but the caller has already built (and escaped) the inner HTML — e.g. multiple `<strong>label:</strong> value` runs joined together. */
const rawParagraph = (innerHtml: string): string => `<p>${innerHtml}</p>`;

const bulletList = (items: string[]): string =>
  items.length
    ? `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`
    : "";

// ---------------------------------------------------------------------------
// Generic JSON helpers
//
// The CV variant prompt (VCS-managed, editable via Admin > Prompts) is a
// *hint* to the AI about the shape we'd like back, not a contract — a
// rewritten prompt, an off day for the model, or a differently-tuned agent
// can all return different field names or nesting. Rather than hard-failing
// when the exact expected keys aren't there, everything below understands
// the known shape for a polished, CV-specific layout when present, and falls
// back to walking whatever JSON actually came back — still producing a
// readable, presentable document instead of losing the generation entirely.
// ---------------------------------------------------------------------------

const isObject = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);

/** "job_description_summary" / "roleTitle" -> "Job Description Summary" / "Role Title". */
const prettifyKey = (key: string): string => {
  const spaced = key
    .replace(/[_-]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .trim();
  return spaced.replace(/\b\w/g, (c) => c.toUpperCase()) || key;
};

/** Extracts display text from a primitive or a `{text, is_new}`-style run — the two shapes the schema mixes. */
const extractText = (value: unknown): string | undefined => {
  if (typeof value === "string") return value.trim() || undefined;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (isObject(value) && typeof value.text === "string") return extractText(value.text);
  return undefined;
};

const isEmptyValue = (value: unknown): boolean => {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0 || value.every(isEmptyValue);
  if (isObject(value)) return Object.values(value).every(isEmptyValue);
  return false;
};

// Bookkeeping keys that are either surfaced elsewhere (flags — see
// collectCvVariantFlags, shown in a separate review panel) or not meant for
// display at all (is_new, the AI-authorship marker) — skipped at any depth.
const META_KEYS = new Set(["is_new", "flag", "flags"]);

// Keys whose whole purpose is to *be* a list — labeling them "Bullets:" or
// "Items:" before the list itself is just noise, so these render inline.
const UNLABELED_LIST_KEYS = new Set(["bullets", "items", "sub_sections", "subsections", "responsibilities", "duties"]);

const HEADING_KEYS = ["title", "name", "role_title", "job_title", "qualification", "heading", "label"];
const SUBTITLE_KEYS = ["company", "company_name", "institution", "employer", "organization"];
const LOCATION_KEYS = ["location", "city"];
const DATE_KEYS = ["dates", "date", "duration"];

const formatDateRangeObject = (value: Record<string, unknown>): string | undefined => {
  const start = extractText(value.start) ?? extractText(value.from);
  const end = extractText(value.end) ?? extractText(value.to);
  if (!start && !end) return undefined;
  return `${start ?? "?"} — ${end ?? "Present"}`;
};

/** Renders one array-item object (an experience role, education entry, sub_section, or any unrecognized entry): heading + subtitle/date line + remaining fields, whatever it actually has. */
const renderEntry = (item: Record<string, unknown>): string => {
  const parts: string[] = [];
  const consumed = new Set<string>();

  const headingKey = HEADING_KEYS.find((k) => extractText(item[k]) !== undefined);
  const heading = headingKey ? extractText(item[headingKey]) : undefined;
  if (headingKey) consumed.add(headingKey);

  const subtitleKey = SUBTITLE_KEYS.find((k) => k !== headingKey && extractText(item[k]) !== undefined);
  const locationKey = LOCATION_KEYS.find((k) => extractText(item[k]) !== undefined);
  if (subtitleKey) consumed.add(subtitleKey);
  if (locationKey) consumed.add(locationKey);

  const subtitleBits = [
    subtitleKey ? extractText(item[subtitleKey]) : undefined,
    locationKey ? extractText(item[locationKey]) : undefined,
  ].filter((bit): bit is string => !!bit);

  if (heading) parts.push(`<h3>${escapeHtml(heading)}</h3>`);
  if (subtitleBits.length) parts.push(paragraph(subtitleBits.join(", "), { bold: !heading }));

  const dateKey = DATE_KEYS.find((k) => !isEmptyValue(item[k]));
  if (dateKey) {
    consumed.add(dateKey);
    const dateValue = item[dateKey];
    const dateText = extractText(dateValue) ?? (isObject(dateValue) ? formatDateRangeObject(dateValue) : undefined);
    if (dateText) parts.push(paragraph(dateText));
  }

  const rest = Object.fromEntries(Object.entries(item).filter(([k]) => !consumed.has(k)));
  const restHtml = renderObjectFields(rest);
  if (restHtml) parts.push(restHtml);

  return parts.join("");
};

/** Dispatches an arbitrary JSON value to the right rendering: text, bullet list, array of entries, or a nested object's fields. */
const renderValue = (value: unknown): string => {
  if (isEmptyValue(value)) return "";

  const text = extractText(value);
  if (text !== undefined) return paragraph(text);

  if (Array.isArray(value)) {
    const nonEmpty = value.filter((item) => !isEmptyValue(item));
    if (!nonEmpty.length) return "";

    const primitiveTexts = nonEmpty.map(extractText);
    if (primitiveTexts.every((t) => t !== undefined)) {
      return bulletList(primitiveTexts as string[]);
    }

    return nonEmpty
      .filter(isObject)
      .map((item) => renderEntry(item))
      .join("");
  }

  if (isObject(value)) return renderObjectFields(value);

  return "";
};

/** Renders an object's own fields: short primitives inline as "Label: value", anything complex as its own labeled block. */
function renderObjectFields(obj: Record<string, unknown>): string {
  const inline: string[] = [];
  const blocks: string[] = [];

  Object.entries(obj).forEach(([key, value]) => {
    if (META_KEYS.has(key.toLowerCase()) || isEmptyValue(value)) return;

    const text = extractText(value);
    if (text !== undefined) {
      inline.push(`<strong>${escapeHtml(prettifyKey(key))}:</strong> ${escapeHtml(text)}`);
      return;
    }

    const body = renderValue(value);
    if (!body) return;
    blocks.push(UNLABELED_LIST_KEYS.has(key.toLowerCase()) ? body : paragraph(prettifyKey(key), { bold: true }) + body);
  });

  const inlineHtml = inline.length ? rawParagraph(inline.join(" &nbsp;·&nbsp; ")) : "";
  return inlineHtml + blocks.join("");
}

const KNOWN_SECTION_LABELS: Record<string, string> = {
  summary: "Professional Summary",
  skills: "Skills",
  experience: "Experience",
  education: "Education",
  certifications: "Certifications",
};

// Consumed by the name/header line, the design-token pipeline, or the flags
// review panel — never re-shown as their own generic section.
const NON_SECTION_KEYS = new Set([
  "client_name", "name", "style_variant", "style_reasoning", "top_level_flags", "design", "flags", "flag", "is_new",
]);

/**
 * Flattens the CV variant JSON into rich-text HTML, edited via the
 * CvVariantEditor (TipTap) so the admin can bold/italic/underline/align it
 * into a presentable, job-ready layout before it's rendered to PDF/DOCX.
 * Section-level `flags` surface separately (collectCvVariantFlags), so
 * they aren't inlined here.
 *
 * Known fields (header/summary/skills/experience/education/certifications/
 * additional_sections) get their specific, polished layout. Anything else —
 * including a completely different schema the AI drifted into — still
 * renders as a labeled section instead of being dropped or throwing.
 */
export function flattenCvVariantToHtml(result: CvVariantResult): string {
  const obj = (result ?? {}) as Record<string, unknown>;
  const parts: string[] = [];
  const handled = new Set<string>(NON_SECTION_KEYS);

  // ---- Name / header ----
  const header = obj.header;
  const headerName = isObject(header) ? extractText(header.name) : undefined;
  if (isObject(header) && headerName) {
    handled.add("header");
    parts.push(`<h1>${escapeHtml(headerName)}</h1>`);
    const headline = extractText(header.headline);
    if (headline) parts.push(paragraph(headline, { bold: true }));
    const contactLine = extractText(header.contact_line);
    if (contactLine) parts.push(paragraph(contactLine));
    const workRights = extractText(isObject(header.work_rights_line) ? header.work_rights_line.text : header.work_rights_line);
    if (workRights) parts.push(paragraph(workRights));

    const consumed = new Set(["name", "headline", "contact_line", "work_rights_line"]);
    const rest = renderObjectFields(
      Object.fromEntries(Object.entries(header).filter(([k]) => !consumed.has(k))),
    );
    if (rest) parts.push(rest);
  } else {
    const name = extractText(obj.client_name) ?? extractText(obj.name);
    if (name) parts.push(`<h1>${escapeHtml(name)}</h1>`);
    if (isObject(header)) {
      handled.add("header");
      const rest = renderObjectFields(header);
      if (rest) parts.push(rest);
    }
  }

  // ---- Known sections, in a sensible fixed order ----
  (["summary", "skills", "experience", "education", "certifications"] as const).forEach((key) => {
    handled.add(key);
    if (!(key in obj) || isEmptyValue(obj[key])) return;

    let body: string;
    if (key === "summary" && isObject(obj.summary) && Array.isArray(obj.summary.runs)) {
      const text = (obj.summary.runs as unknown[]).map(extractText).filter(Boolean).join(" ");
      body = text ? paragraph(text, { align: "justify" }) : "";
    } else if (key === "skills" && isObject(obj.skills)) {
      // e.g. { technical: [...], soft: [...] } instead of a flat array —
      // render each named group under its own sub-label.
      body = Object.entries(obj.skills as Record<string, unknown>)
        .map(([subKey, subValue]) => {
          const items = Array.isArray(subValue) ? subValue.map(extractText).filter((t): t is string => !!t) : [];
          if (!items.length) return "";
          return paragraph(prettifyKey(subKey), { bold: true }) + bulletList(items);
        })
        .join("");
    } else {
      body = renderValue(obj[key]);
    }

    if (body) parts.push(`<h2>${KNOWN_SECTION_LABELS[key]}</h2>${body}`);
  });

  // ---- additional_sections: array of {heading, items} ----
  handled.add("additional_sections");
  const additional = obj.additional_sections;
  if (Array.isArray(additional) && additional.length) {
    additional.forEach((section) => {
      if (!isObject(section)) return;
      const heading = extractText(section.heading) ?? extractText(section.title);
      const items = Array.isArray(section.items)
        ? (section.items as unknown[]).map(extractText).filter((t): t is string => !!t)
        : [];
      if (!heading && !items.length) return;
      if (heading) parts.push(`<h2>${escapeHtml(heading)}</h2>`);
      if (items.length) parts.push(bulletList(items));
    });
  }

  // ---- Anything else, generically — a drifted or entirely different schema still renders instead of vanishing ----
  Object.entries(obj).forEach(([key, value]) => {
    if (handled.has(key)) return;
    const body = renderValue(value);
    if (!body) return;
    parts.push(`<h2>${escapeHtml(prettifyKey(key))}</h2>${body}`);
  });

  return parts.filter(Boolean).join("");
}

/** All flags found anywhere in the variant (any nesting depth, any key literally named `flag`/`flags`), each labeled with the nearest identifiable entry it came from. */
export function collectCvVariantFlags(result: CvVariantResult): { source: string; flag: string }[] {
  const obj = (result ?? {}) as Record<string, unknown>;
  const flags: { source: string; flag: string }[] = [];

  const pushFlag = (source: string, flag: unknown) => {
    const text = extractText(flag);
    if (text) flags.push({ source, flag: text });
  };

  const walk = (value: unknown, source: string) => {
    if (Array.isArray(value)) {
      value.forEach((item) => walk(item, source));
      return;
    }
    if (!isObject(value)) return;

    const label = HEADING_KEYS.map((k) => extractText(value[k])).find((t): t is string => !!t) ?? source;

    Object.entries(value).forEach(([key, val]) => {
      const lowerKey = key.toLowerCase();
      if (lowerKey === "flag") {
        pushFlag(label, val);
        return;
      }
      if (lowerKey === "flags") {
        if (Array.isArray(val)) val.forEach((f) => pushFlag(label, f));
        else pushFlag(label, val);
        return;
      }
      if (isObject(val) || Array.isArray(val)) walk(val, label);
    });
  };

  const topFlags = obj.top_level_flags ?? obj.flags;
  if (Array.isArray(topFlags)) topFlags.forEach((f) => pushFlag("Overall", f));
  else if (typeof topFlags === "string") pushFlag("Overall", topFlags);

  walk(obj, "Overall");

  const seen = new Set<string>();
  return flags.filter(({ source, flag }) => {
    const key = `${source}::${flag}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
