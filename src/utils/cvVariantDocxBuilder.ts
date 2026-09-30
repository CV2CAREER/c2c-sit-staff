// A CV-Variant-specific DOCX builder that bypasses html-to-docx entirely.
//
// Why this exists: html-to-docx only reads inline `style="..."` attributes —
// it has no CSS cascade, so a `<style>` block (how the AI always authors its
// design) is invisible to it. The obvious fix (inline the cascade with
// `juice` before handing off) was tried and reverted — on real AI-generated
// CVs it triggers a structural parser bug in html-to-docx: once most
// elements carry a `style` attribute (regardless of its length or content —
// bisected against gradients, a property allowlist, and a color/background
// -only minimal case; none of it mattered), the library silently truncates
// the document partway through. See cvVariantHtmlRenderer.ts for the full
// investigation.
//
// Instead: parse the AI's own <style> block ourselves (a flat, best-effort
// CSS reader — tag/class/`*` selectors only, no combinators, no
// specificity weighting beyond "later rule wins"; real AI-authored CV CSS is
// simple and flat, matching every sample seen during development), walk the
// DOM to find text-bearing leaf elements at ANY depth (the AI commonly wraps
// everything in a container div, so only looking at direct children of
// <body> — like htmlDocumentGenerator.ts's parser does for TipTap's flatter
// output — would miss almost everything here), resolve each leaf's color/
// weight/size from that CSS plus its own inline style, and build real
// docx.js Paragraph/TextRun objects directly. Never touches html-to-docx.
//
// Deliberately not chasing pixel parity with the PDF (two-column layouts,
// grids, exact spacing) — the goal is the same bar the PDF already clears
// well past: the AI's actual color and heading choices are visibly present,
// not almost entirely absent.
import * as cheerio from "cheerio";
import { AlignmentType, BorderStyle, Document, Packer, Paragraph, TextRun } from "docx";
import { getServiceLogger } from "./createLogger";

const logger = getServiceLogger("cv-variant-docx-builder");

// ---------------------------------------------------------------------------
// Minimal CSS reader
// ---------------------------------------------------------------------------

type CssRule = Record<string, string>;
type CssRules = { tags: Map<string, CssRule>; classes: Map<string, CssRule>; universal: CssRule };

/** Parses `property: value;` pairs inside one `{ ... }` block. */
const parseDeclarations = (body: string): CssRule => {
  const rule: CssRule = {};
  body.split(";").forEach((decl) => {
    const colonIndex = decl.indexOf(":");
    if (colonIndex === -1) return;
    const prop = decl.slice(0, colonIndex).trim().toLowerCase();
    const value = decl.slice(colonIndex + 1).trim();
    if (prop && value) rule[prop] = value;
  });
  return rule;
};

/**
 * Reads every `<style>` block's simple selectors (tag names, `.classes`,
 * `*`) into lookup tables. Compound/descendant selectors (`.a .b`,
 * `.a > .b`) and at-rules (`@media`, `@import`) are skipped — best-effort,
 * not a real CSS engine. Good enough for the flat, single-selector rules
 * every sample AI-generated CV actually uses.
 */
const readCssRules = ($: cheerio.CheerioAPI): CssRules => {
  const tags = new Map<string, CssRule>();
  const classes = new Map<string, CssRule>();
  const universal: CssRule = {};

  $("style").each((_, styleEl) => {
    const css = $(styleEl).html() || "";
    // Strip at-rule blocks (@media print { ... }, @import ...) — their
    // content isn't unconditionally true, and @media's nested `{ }` would
    // otherwise confuse the flat regex below.
    const withoutAtRules = css
      .replace(/@media[^{]*\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/gi, "")
      .replace(/@import[^;]*;/gi, "")
      .replace(/\/\*[\s\S]*?\*\//g, "");

    const ruleRegex = /([^{}]+)\{([^{}]*)\}/g;
    let match: RegExpExecArray | null;
    while ((match = ruleRegex.exec(withoutAtRules))) {
      const selectorList = match[1].trim();
      const declarations = parseDeclarations(match[2]);
      if (!Object.keys(declarations).length) continue;

      selectorList.split(",").forEach((rawSelector) => {
        const selector = rawSelector.trim();
        if (!selector) return;
        if (selector === "*") {
          Object.assign(universal, declarations);
        } else if (selector.startsWith(".") && /^\.[\w-]+$/.test(selector)) {
          classes.set(selector.slice(1), { ...classes.get(selector.slice(1)), ...declarations });
        } else if (/^[a-z][a-z0-9]*$/i.test(selector)) {
          tags.set(selector.toLowerCase(), { ...tags.get(selector.toLowerCase()), ...declarations });
        }
        // Anything else (descendant/compound/id/pseudo selectors) is skipped.
      });
    }
  });

  return { tags, classes, universal };
};

/** Parses `style="prop: value; ..."` into the same CssRule shape. */
const parseInlineStyle = (styleAttr: string | undefined): CssRule =>
  styleAttr ? parseDeclarations(styleAttr) : {};

/**
 * Resolves one element's effective style by merging, in increasing
 * precedence: the universal `*` rule, its tag rule, each of its class rules
 * (in class-list order), then its own inline style. Not real CSS
 * specificity (no weighting beyond "later source wins") — deliberately
 * simple, matching how flat the actual input is.
 */
const resolveOwnStyle = ($el: cheerio.Cheerio<any>, rules: CssRules): CssRule => {
  const tag = ($el.get(0) as any)?.tagName?.toLowerCase();
  const classAttr = $el.attr("class") || "";
  const merged: CssRule = { ...rules.universal };
  if (tag && rules.tags.has(tag)) Object.assign(merged, rules.tags.get(tag));
  classAttr
    .split(/\s+/)
    .filter(Boolean)
    .forEach((cls) => {
      if (rules.classes.has(cls)) Object.assign(merged, rules.classes.get(cls));
    });
  Object.assign(merged, parseInlineStyle($el.attr("style")));
  return merged;
};

// ---------------------------------------------------------------------------
// Style value parsing
// ---------------------------------------------------------------------------

const HEX_COLOR = /#([0-9a-f]{3}|[0-9a-f]{6})\b/i;
const RGB_COLOR = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i;

const NAMED_COLORS: Record<string, string> = {
  white: "FFFFFF",
  black: "000000",
  red: "FF0000",
  blue: "0000FF",
  green: "008000",
};

/** Normalizes a CSS color value (hex, rgb()/rgba(), or a few named colors) to a bare 6-digit hex for docx. Returns null for anything else (gradients, transparent, currentColor, ...) rather than guessing. */
const parseColor = (value: string | undefined): string | null => {
  if (!value) return null;
  const hexMatch = value.match(HEX_COLOR);
  if (hexMatch) {
    const hex = hexMatch[1];
    return hex.length === 3
      ? hex.split("").map((c) => c + c).join("").toUpperCase()
      : hex.toUpperCase();
  }
  const rgbMatch = value.match(RGB_COLOR);
  if (rgbMatch) {
    const [, r, g, b] = rgbMatch;
    return [r, g, b].map((c) => Math.max(0, Math.min(255, parseInt(c, 10))).toString(16).padStart(2, "0")).join("").toUpperCase();
  }
  return NAMED_COLORS[value.trim().toLowerCase()] ?? null;
};

/** Converts a CSS font-size (pt/px/em/rem) to points. Assumes a 16px root for em/rem, matching every browser default the AI would have designed against. */
const parseFontSizePt = (value: string | undefined): number | null => {
  if (!value) return null;
  const match = value.match(/([\d.]+)\s*(pt|px|em|rem)/i);
  if (!match) return null;
  const num = parseFloat(match[1]);
  const unit = match[2].toLowerCase();
  if (unit === "pt") return num;
  if (unit === "px") return num * 0.75;
  return num * 12; // em/rem, assuming a 16px (~12pt) root
};

const isBoldValue = (value: string | undefined): boolean => {
  if (!value) return false;
  const trimmed = value.trim().toLowerCase();
  if (trimmed === "bold" || trimmed === "bolder") return true;
  const numeric = parseInt(trimmed, 10);
  return !Number.isNaN(numeric) && numeric >= 600;
};

// ---------------------------------------------------------------------------
// DOM walk — collect text-bearing leaves at any depth
// ---------------------------------------------------------------------------

interface TextBlock {
  text: string;
  color: string | null;
  bold: boolean;
  italic: boolean;
  fontSizePt: number | null;
  isListItem: boolean;
}

const BLOCK_SKIP_TAGS = new Set(["script", "style", "head", "meta", "link", "title", "svg"]);

/**
 * Recurses through the whole tree (not just direct children of <body>) —
 * unlike htmlDocumentGenerator.ts's parser, which only needs to handle
 * TipTap's flat h1/h2/h3/p/ul output, the AI here commonly wraps everything
 * in one or more container divs. An element counts as a leaf the moment it
 * has its own direct text (not just via descendants) — collectRuns-style
 * recursion the rest of the way in, so inline formatting (`<strong>` inside
 * a `<p>`) still contributes to the same block's text, just without a
 * separate bold run for that portion (a deliberate simplification; the
 * block's own resolved bold/color still reflects its dominant styling).
 */
const collectTextBlocks = (
  $: cheerio.CheerioAPI,
  root: any,
  rules: CssRules,
  inheritedColor: string | null,
  inheritedBold: boolean,
  blocks: TextBlock[],
): void => {
  $(root)
    .contents()
    .each((_, node) => {
      if (node.type !== "tag") return;
      const tag = (node as any).tagName?.toLowerCase();
      if (BLOCK_SKIP_TAGS.has(tag)) return;

      const $el = $(node);
      const own = resolveOwnStyle($el, rules);
      const color = parseColor(own.color) ?? inheritedColor;
      const bold = isBoldValue(own["font-weight"]) || inheritedBold;
      const italic = (own["font-style"] || "").toLowerCase() === "italic";
      const fontSizePt = parseFontSizePt(own["font-size"]);

      const hasDirectText = $el
        .contents()
        .toArray()
        .some((child) => child.type === "text" && !!(child as any).data?.trim());

      if (hasDirectText) {
        const text = $el.text().replace(/\s+/g, " ").trim();
        if (text) {
          blocks.push({ text, color, bold, italic, fontSizePt, isListItem: tag === "li" });
        }
        // A leaf's own descendants (e.g. a <strong> inside this <p>)
        // already contributed their text via $el.text() above — don't
        // walk them again as separate blocks.
        return;
      }

      // Pure container (no direct text of its own) — recurse, carrying
      // color/bold down since CSS `color`/`font-weight` inherit and a
      // wrapper's declared color is otherwise invisible to its children.
      collectTextBlocks($, node, rules, color, bold, blocks);
    });
};

// ---------------------------------------------------------------------------
// Classification + docx building
// ---------------------------------------------------------------------------

type Kind = "title" | "section" | "label" | "body";

interface ClassifiedBlock extends TextBlock {
  kind: Kind;
}

/**
 * Classifies each block from its own resolved font size relative to the
 * document's most common ("body") size — not absolute thresholds, since
 * AI-chosen base sizes vary (9.5pt in one sample, 11pt in another).
 */
const classifyBlocks = (blocks: TextBlock[]): ClassifiedBlock[] => {
  const sizes = blocks.map((b) => b.fontSizePt).filter((s): s is number => s !== null);
  const bodySize = sizes.length
    ? sizes.sort((a, b) => sizes.filter((v) => v === a).length - sizes.filter((v) => v === b).length).pop()! // most frequent
    : 11;

  let sawTitle = false;
  return blocks.map((block): ClassifiedBlock => {
    const relative = (block.fontSizePt ?? bodySize) / bodySize;
    if (!sawTitle && relative >= 1.6) {
      sawTitle = true;
      return { ...block, kind: "title" };
    }
    if (relative >= 1.2 || (block.bold && block.fontSizePt !== null && relative >= 1.05)) {
      return { ...block, kind: "section" };
    }
    if (block.bold && block.text.length < 60) {
      return { ...block, kind: "label" };
    }
    return { ...block, kind: "body" };
  });
};

/** Picks an accent color for section/title rules — the first distinct, non-black/white/gray color a title or section block resolved to, falling back to the platform's own default accent. */
const PLATFORM_DEFAULT_ACCENT = "0D9F6E";
const pickAccentColor = (blocks: ClassifiedBlock[]): string => {
  const candidate = blocks.find((b) => {
    if (!b.color || (b.kind !== "title" && b.kind !== "section")) return false;
    const c = b.color;
    return c !== "FFFFFF" && c !== "000000" && !/^([0-9A-F])\1([0-9A-F])\2([0-9A-F])\3$/i.test(c); // skip pure grays
  });
  return candidate?.color ?? PLATFORM_DEFAULT_ACCENT;
};

const buildParagraphs = (blocks: ClassifiedBlock[], accent: string): Paragraph[] =>
  blocks.map((block) => {
    const color = block.kind === "body" ? block.color ?? "1F2937" : block.color ?? accent;
    const size =
      block.kind === "title" ? 44 : block.kind === "section" ? 26 : block.fontSizePt ? Math.round(block.fontSizePt * 2) : 22;

    return new Paragraph({
      children: [
        new TextRun({
          text: block.text,
          bold: block.bold || block.kind === "title" || block.kind === "section" || block.kind === "label",
          italics: block.italic,
          color,
          size,
        }),
      ],
      bullet: block.isListItem ? { level: 0 } : undefined,
      border:
        block.kind === "title" || block.kind === "section"
          ? { bottom: { style: BorderStyle.SINGLE, size: block.kind === "title" ? 12 : 6, color: accent, space: 4 } }
          : undefined,
      alignment: AlignmentType.LEFT,
      spacing: {
        before: block.kind === "section" ? 300 : block.kind === "title" ? 100 : 80,
        after: block.kind === "title" || block.kind === "section" ? 160 : 80,
      },
    });
  });

/**
 * Builds a real, editable DOCX directly from the AI's HTML — bypassing
 * html-to-docx entirely. See the module doc comment for why.
 */
export const buildCvVariantDocx = async (html: string): Promise<Buffer> => {
  const $ = cheerio.load(html);
  const rules = readCssRules($);

  const blocks: TextBlock[] = [];
  const bodyEl = $("body").get(0) ?? $.root().get(0);
  collectTextBlocks($, bodyEl, rules, null, false, blocks);

  if (!blocks.length) {
    logger.warn("[buildCvVariantDocx] No text blocks found — falling back to a single empty paragraph");
  }

  const classified = classifyBlocks(blocks);
  const accent = pickAccentColor(classified);
  const paragraphs = buildParagraphs(classified, accent);

  const doc = new Document({
    sections: [{ children: paragraphs.length ? paragraphs : [new Paragraph("")] }],
  });

  return Packer.toBuffer(doc);
};
