import PDFDocument from "pdfkit";
import {
  AlignmentType,
  BorderStyle,
  Document,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun as DocxTextRun,
  WidthType,
} from "docx";
import * as cheerio from "cheerio";
import { normalizeTypography } from "./textDocumentGenerator";

/**
 * Design tokens the AI picks per CV variant (see CvVariantDesign in
 * admin-document.service.ts) — an accent color, a sans/serif font pairing, a
 * spacing density, and (new) a `style_variant` that selects a structurally
 * different layout, not just a recolor. Callers that don't have a variant
 * (e.g. the Interview Pack, which shares this renderer) simply omit `design`
 * — or omit `style_variant` within it — and get the original single-column
 * house style untouched.
 */
export interface DocumentDesign {
  accent_color: string;
  font_family: "sans" | "serif";
  density: "compact" | "standard" | "spacious";
  style_variant?: "modern" | "classic" | "contemporary";
}

const DEFAULT_DESIGN: DocumentDesign = {
  accent_color: "#0D9F6E",
  font_family: "sans",
  density: "standard",
};

const PDF_FONT_FAMILIES: Record<DocumentDesign["font_family"], { regular: string; bold: string; italic: string; boldItalic: string }> = {
  sans: {
    regular: "Helvetica",
    bold: "Helvetica-Bold",
    italic: "Helvetica-Oblique",
    boldItalic: "Helvetica-BoldOblique",
  },
  serif: {
    regular: "Times-Roman",
    bold: "Times-Bold",
    italic: "Times-Italic",
    boldItalic: "Times-BoldItalic",
  },
};

const DOCX_FONT_FAMILIES: Record<DocumentDesign["font_family"], string> = {
  sans: "Helvetica",
  serif: "Times New Roman",
};

/** Spacing multiplier applied to the fixed house-style spacing values below. */
const DENSITY_SCALE: Record<DocumentDesign["density"], number> = {
  compact: 0.75,
  standard: 1,
  spacious: 1.3,
};

/**
 * Renders rich-text HTML (from the TipTap CV Variant / Interview Pack
 * editor) into a genuinely designed PDF/DOCX — colored section headers,
 * accent dividers, a left accent bar on subsections, colored bold "labels"
 * (Situation/Task/Action/Result, Q&A prompts, etc.), and skills rendered as
 * pill badges — not just plain bold/italic/underline text.
 *
 * TipTap's schema (StarterKit + Underline + TextAlign) only round-trips real
 * HTML semantics (heading level, list type, bold/italic/underline/strike,
 * alignment, document order) — any custom data-* markup would be stripped
 * the moment the admin edits the text. So the "design" below is derived
 * entirely from that structure (see annotateBlocks) rather than from markup
 * that can't survive an edit. That's also why the three `style_variant`
 * layouts below branch purely on the SAME block stream / `style_variant` —
 * the content model itself never changes, only how blocks get laid out.
 */

type Align = "left" | "center" | "right" | "justify";
type BlockType = "paragraph" | "heading1" | "heading2" | "heading3" | "bullet" | "ordered";
type BlockKind = "title" | "meta" | "section" | "subsection" | "label" | "skills" | "body";

interface Run {
  text: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strike: boolean;
}

interface Block {
  type: BlockType;
  runs: Run[];
  align: Align;
}

interface RenderBlock extends Block {
  kind: BlockKind;
}

type RenderGroup =
  | { kind: "skills-row"; blocks: RenderBlock[] }
  | { kind: "single"; block: RenderBlock };

const parseAlign = (style: string | undefined): Align => {
  const match = style?.match(/text-align:\s*(left|center|right|justify)/i);
  const value = match?.[1]?.toLowerCase();
  return value === "center" || value === "right" || value === "justify" ? value : "left";
};

/** Walks an element's children, collecting text runs with inherited formatting flags. */
const collectRuns = (
  $: ReturnType<typeof cheerio.load>,
  el: any,
  flags: { bold: boolean; italic: boolean; underline: boolean; strike: boolean },
): Run[] => {
  const runs: Run[] = [];

  $(el)
    .contents()
    .each((_, node) => {
      if (node.type === "text") {
        const text = normalizeTypography((node as any).data || "");
        if (text) runs.push({ text, ...flags });
        return;
      }

      if (node.type !== "tag") return;

      const tag = (node as any).tagName?.toLowerCase();
      if (tag === "br") {
        runs.push({ text: "\n", ...flags });
        return;
      }

      const nextFlags = {
        bold: flags.bold || tag === "strong" || tag === "b",
        italic: flags.italic || tag === "em" || tag === "i",
        underline: flags.underline || tag === "u",
        strike: flags.strike || tag === "s" || tag === "strike" || tag === "del",
      };
      runs.push(...collectRuns($, node, nextFlags));
    });

  return runs;
};

const noFlags = { bold: false, italic: false, underline: false, strike: false };

/** Parses TipTap's HTML output into a flat list of formatted blocks. */
const parseHtmlToBlocks = (html: string): Block[] => {
  const $ = cheerio.load(html || "");
  const blocks: Block[] = [];

  const pushListItems = ($list: any, type: "bullet" | "ordered") => {
    $list.children("li").each((_: number, li: any) => {
      // TipTap wraps list item text in a nested <p>; fall back to the <li>
      // itself if it doesn't (plain content directly inside <li>).
      const $li = $(li);
      const $p = $li.children("p").first();
      const source = $p.length ? $p.get(0) : li;
      const runs = collectRuns($, source, noFlags);
      if (runs.length) blocks.push({ type, runs, align: "left" });
    });
  };

  $("body")
    .children()
    .each((_, el) => {
      const $el = $(el);
      const tag = (el as any).tagName?.toLowerCase();
      const align = parseAlign($el.attr("style"));

      if (tag === "h1") {
        blocks.push({ type: "heading1", runs: collectRuns($, el, noFlags), align });
      } else if (tag === "h2") {
        blocks.push({ type: "heading2", runs: collectRuns($, el, noFlags), align });
      } else if (tag === "h3") {
        blocks.push({ type: "heading3", runs: collectRuns($, el, noFlags), align });
      } else if (tag === "ul") {
        pushListItems($el, "bullet");
      } else if (tag === "ol") {
        pushListItems($el, "ordered");
      } else if (tag === "p" || tag === "div") {
        const runs = collectRuns($, el, noFlags);
        // Preserve intentional blank paragraphs (spacing) but skip nothing —
        // an empty block still renders as a blank line.
        blocks.push({ type: "paragraph", runs, align });
      }
    });

  return blocks;
};

const blockText = (block: Block): string => block.runs.map((r) => r.text).join("").trim();

const isBoldOnly = (block: Block): boolean =>
  block.type === "paragraph" && block.runs.length > 0 && !!blockText(block) && block.runs.every((r) => r.bold);

const SKILLS_SECTION_NAMES = new Set(["skills", "core skills", "technical skills", "key skills"]);

/**
 * Derives a presentation "kind" for each block purely from structure that
 * survives the TipTap round-trip: heading level, list membership, whether a
 * paragraph is bold-only, and document position relative to the title and
 * first section heading. No custom markup required.
 */
const annotateBlocks = (blocks: Block[]): RenderBlock[] => {
  let sawTitle = false;
  let sawFirstSection = false;
  let inSkillsSection = false;

  return blocks.map((block): RenderBlock => {
    if (block.type === "heading1") {
      sawTitle = true;
      return { ...block, kind: "title" };
    }
    if (block.type === "heading2") {
      sawFirstSection = true;
      inSkillsSection = SKILLS_SECTION_NAMES.has(blockText(block).toLowerCase());
      return { ...block, kind: "section" };
    }
    if (block.type === "heading3") {
      return { ...block, kind: "subsection" };
    }
    if ((block.type === "bullet" || block.type === "ordered") && inSkillsSection) {
      return { ...block, kind: "skills" };
    }
    if (block.type === "paragraph" && sawTitle && !sawFirstSection) {
      // Still inside the header block (name/headline/contact line) —
      // muted, not body copy.
      return { ...block, kind: "meta" };
    }
    if (isBoldOnly(block)) {
      return { ...block, kind: "label" };
    }
    return { ...block, kind: "body" };
  });
};

/** Groups consecutive "skills" blocks so they render as one wrapped pill row instead of stacked lines. */
const buildRenderGroups = (blocks: RenderBlock[]): RenderGroup[] => {
  const groups: RenderGroup[] = [];
  let i = 0;
  while (i < blocks.length) {
    if (blocks[i].kind === "skills") {
      const run: RenderBlock[] = [];
      while (i < blocks.length && blocks[i].kind === "skills") {
        run.push(blocks[i]);
        i++;
      }
      groups.push({ kind: "skills-row", blocks: run });
    } else {
      groups.push({ kind: "single", block: blocks[i] });
      i++;
    }
  }
  return groups;
};

const TEXT_COLORS = {
  textDark: "#1F2937",
  textMuted: "#6B7280",
};

/** Lightens a hex color by mixing it toward white — used for the skills-pill background and the contemporary banner tint. */
const softTint = (hex: string, amount = 0.88): string => {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  const mix = (channel: number) => Math.round(channel + (255 - channel) * amount);
  return `#${[mix(r), mix(g), mix(b)].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
};

// ---------------------------------------------------------------------------
// Column assignment — shared between the PDF and DOCX "modern" layouts (and
// used to split header vs. body for "classic"/"contemporary" too) so which
// section goes where is defined exactly once.
// ---------------------------------------------------------------------------

type ColumnAssignment = "header" | "left" | "right";

/** Sections that belong in the modern layout's narrow left column; everything else goes in the main column. */
const LEFT_COLUMN_SECTIONS = new Set(["skills", "core skills", "technical skills", "key skills", "education"]);

/**
 * Walks the block stream once, tracking the current h2 section, and buckets
 * every group into "header" (title/meta, before the first section — full
 * width in every layout), "left", or "right". A `Map` keyed by group
 * identity (not index) so callers can filter the original `groups` array
 * with it and preserve document order.
 */
function assignColumns(groups: RenderGroup[]): Map<RenderGroup, ColumnAssignment> {
  const assignment = new Map<RenderGroup, ColumnAssignment>();
  let currentSection = "";
  let sawFirstSection = false;

  groups.forEach((group) => {
    if (group.kind === "single" && group.block.kind === "section") {
      currentSection = blockText(group.block).toLowerCase();
      sawFirstSection = true;
    }

    if (!sawFirstSection) {
      assignment.set(group, "header");
      return;
    }
    assignment.set(group, LEFT_COLUMN_SECTIONS.has(currentSection) ? "left" : "right");
  });

  return assignment;
}

// ---------------------------------------------------------------------------
// PDF rendering
// ---------------------------------------------------------------------------

const PDF_FONT_SIZES: Record<BlockType, number> = {
  heading1: 24,
  heading2: 15,
  heading3: 13,
  paragraph: 11,
  bullet: 11,
  ordered: 11,
};

const pdfFontFor = (family: DocumentDesign["font_family"], bold: boolean, italic: boolean): string => {
  const fonts = PDF_FONT_FAMILIES[family];
  if (bold && italic) return fonts.boldItalic;
  if (bold) return fonts.bold;
  if (italic) return fonts.italic;
  return fonts.regular;
};

interface PdfDrawOpts {
  /** Classic: accent color stays on rule lines only, headings/labels fall back to dark text. */
  restrained?: boolean;
  /** Classic header: force every block to render centered regardless of its authored alignment. */
  forceCenter?: boolean;
}

/** Draws a wrapped row of colored pill badges (e.g. skills) using pdfkit's own auto-flowing cursor (page breaks handled by pdfkit itself). Used by the single-column flowing renderer. */
const drawPillRowFlowing = (doc: PDFKit.PDFDocument, labels: string[], design: DocumentDesign) => {
  const startX = doc.page.margins.left;
  const rightEdge = doc.page.width - doc.page.margins.right;
  const bottomEdge = doc.page.height - doc.page.margins.bottom;
  const paddingX = 8;
  const paddingY = 4;
  const gap = 6;
  const fontSize = 10;
  const pillHeight = fontSize + paddingY * 2;
  const fonts = PDF_FONT_FAMILIES[design.font_family];

  let x = startX;
  let y = doc.y;

  doc.font(fonts.bold).fontSize(fontSize);

  labels.forEach((label) => {
    const textWidth = doc.widthOfString(label);
    const pillWidth = textWidth + paddingX * 2;

    if (x + pillWidth > rightEdge) {
      x = startX;
      y += pillHeight + gap;
    }
    if (y + pillHeight > bottomEdge) {
      doc.addPage();
      x = startX;
      y = doc.page.margins.top;
    }

    doc.roundedRect(x, y, pillWidth, pillHeight, pillHeight / 2).fill(softTint(design.accent_color));
    doc.fillColor(design.accent_color).text(label, x + paddingX, y + paddingY - 1, { lineBreak: false });

    x += pillWidth + gap;
  });

  doc.x = startX;
  doc.y = y + pillHeight + 12;
  doc.fillColor(TEXT_COLORS.textDark).font(fonts.regular);
};

/**
 * Draws a full run of groups using pdfkit's own implicit cursor
 * (doc.x/doc.y, no explicit coordinates) — pdfkit auto-paginates this mode
 * itself, so no manual page-break bookkeeping is needed here. This is the
 * entire single-column rendering path: the legacy/undefined style_variant,
 * `classic`, the body of `contemporary` (after its banner), and the
 * full-width header strip of `modern` (before its two columns begin) all
 * funnel through this one function.
 */
const drawGroupsFlowing = (
  doc: PDFKit.PDFDocument,
  groups: RenderGroup[],
  design: DocumentDesign,
  opts: PdfDrawOpts = {},
) => {
  const fonts = PDF_FONT_FAMILIES[design.font_family];
  const scale = DENSITY_SCALE[design.density];
  const contentLeft = doc.page.margins.left;
  const contentRight = doc.page.width - doc.page.margins.right;

  const drawRule = (color: string, lineWidth: number) => {
    const y = doc.y;
    doc.moveTo(contentLeft, y).lineTo(contentRight, y).lineWidth(lineWidth).strokeColor(color).stroke();
    doc.moveDown(0.4 * scale);
  };

  groups.forEach((group) => {
    if (group.kind === "skills-row") {
      drawPillRowFlowing(doc, group.blocks.map(blockText), design);
      return;
    }

    const block = group.block;
    const fontSize = PDF_FONT_SIZES[block.type];

    if (!block.runs.length) {
      doc.fontSize(fontSize).text(" ");
      return;
    }

    if (block.kind === "section") doc.moveDown(0.7 * scale);
    else if (block.kind === "subsection") doc.moveDown(0.5 * scale);
    else doc.moveDown(0.15 * scale);

    let extraIndent = 0;
    if (block.kind === "subsection") {
      // The accent bar is a `rect()` fill, not a `.text()` call — it isn't
      // subject to pdfkit's automatic page-break-and-flow, so without this
      // check it can land on the last sliver of the current page while the
      // heading text it belongs to auto-flows onto the next one, leaving an
      // orphaned colored mark with no text next to it.
      const estimatedHeight = doc.heightOfString(blockText(block), {
        width: doc.page.width - contentLeft - doc.page.margins.right - 10,
      });
      if (doc.y + estimatedHeight > doc.page.height - doc.page.margins.bottom) {
        doc.addPage();
      }
      const barY = doc.y + 1;
      doc.rect(contentLeft, barY, 3, fontSize + 3).fill(design.accent_color);
      extraIndent = 10;
    }

    const listIndent = block.type === "bullet" || block.type === "ordered" ? 16 : 0;
    const indent = listIndent + extraIndent;
    const prefix = block.type === "bullet" ? "•  " : block.type === "ordered" ? "1. " : "";
    const align = opts.forceCenter && (block.kind === "title" || block.kind === "meta") ? "center" : block.align;

    let color = TEXT_COLORS.textDark;
    let bold = block.runs.every((r) => r.bold);
    if (block.kind === "title") {
      color = opts.restrained ? TEXT_COLORS.textDark : design.accent_color;
      bold = true;
    } else if (block.kind === "section") {
      color = opts.restrained ? TEXT_COLORS.textDark : design.accent_color;
      bold = true;
    } else if (block.kind === "subsection") {
      color = TEXT_COLORS.textDark;
      bold = true;
    } else if (block.kind === "meta") {
      color = TEXT_COLORS.textMuted;
    } else if (block.kind === "label") {
      color = opts.restrained ? TEXT_COLORS.textDark : design.accent_color;
      bold = true;
    }

    if (align && align !== "left" && block.runs.length > 1) {
      // pdfkit's `continued: true` (used below to mix per-run bold/underline
      // on one line) is broken when combined with align "center"/"right" —
      // each continued call recomputes its own aligned position independently
      // instead of flowing after the previous one, so multi-run lines (e.g.
      // a centered header's "Email: x · Phone: y · ..." contact line) render
      // stacked on top of each other instead of side by side. See
      // github.com/foliojs/pdfkit issues #240, #774, #1206 — unfixed upstream.
      // Draw non-left multi-run lines as one plain string instead; per-run
      // bold/underline/strike distinctions are lost for this case, but that's
      // the only way pdfkit renders them correctly positioned.
      doc
        .font(pdfFontFor(design.font_family, bold, false))
        .fontSize(fontSize)
        .fillColor(color)
        .text(prefix + block.runs.map((r) => r.text).join(""), { align, indent });
    } else {
      // title/section/subsection/label force every run bold regardless of
      // its own `run.bold`; "meta" and unstyled kinds keep each run's own.
      const forcedBold = block.kind === "title" || block.kind === "section" || block.kind === "subsection" || block.kind === "label";
      block.runs.forEach((run, runIndex) => {
        doc
          .font(pdfFontFor(design.font_family, forcedBold || run.bold, run.italic))
          .fontSize(fontSize)
          .fillColor(color)
          .text(runIndex === 0 ? `${prefix}${run.text}` : run.text, {
            continued: runIndex < block.runs.length - 1,
            underline: run.underline,
            strike: run.strike,
            align,
            indent,
          });
      });
    }

    doc.fillColor(TEXT_COLORS.textDark).font(fonts.regular);

    if (block.kind === "title") {
      doc.moveDown(0.3 * scale);
      drawRule(design.accent_color, 2); // rule stays accent-colored even when restrained — "usable on rule lines"
    } else if (block.kind === "section") {
      doc.moveDown(0.15 * scale);
      drawRule(design.accent_color, 0.75);
    }
  });
};

// -- Explicit-position rendering (modern's two columns + the contemporary banner) --
// pdfkit only auto-paginates when text is drawn WITHOUT explicit x/y — the
// two-column layout needs manual placement, so it needs manual pagination
// too. Heights are approximated (regular-weight metrics, concatenated run
// text) rather than exactly mirroring drawGroupsFlowing's per-run measurement
// — close enough to make correct page-break decisions for CV-length content
// without a second, fully-duplicated draw implementation.

const GAP = {
  beforeSection: 12,
  beforeSubsection: 8,
  beforeDefault: 3,
  afterTitle: 9,
  afterSection: 5,
};

const gapBefore = (kind: BlockKind, scale: number): number => {
  if (kind === "section") return GAP.beforeSection * scale;
  if (kind === "subsection") return GAP.beforeSubsection * scale;
  return GAP.beforeDefault * scale;
};

const gapAfter = (kind: BlockKind, scale: number): number => {
  if (kind === "title") return GAP.afterTitle * scale;
  if (kind === "section") return GAP.afterSection * scale;
  return 0;
};

const measurePillRowHeight = (doc: PDFKit.PDFDocument, labels: string[], design: DocumentDesign, width: number): number => {
  const paddingX = 8;
  const paddingY = 4;
  const gap = 6;
  const fontSize = 10;
  const pillHeight = fontSize + paddingY * 2;
  const fonts = PDF_FONT_FAMILIES[design.font_family];
  doc.font(fonts.bold).fontSize(fontSize);

  let x = 0;
  let rows = 1;
  labels.forEach((label) => {
    const pillWidth = doc.widthOfString(label) + paddingX * 2;
    if (x + pillWidth > width) {
      x = 0;
      rows += 1;
    }
    x += pillWidth + gap;
  });
  return rows * pillHeight + (rows - 1) * gap + 12;
};

const measureBlockHeight = (doc: PDFKit.PDFDocument, block: RenderBlock, design: DocumentDesign, width: number): number => {
  const fontSize = PDF_FONT_SIZES[block.type];
  if (!block.runs.length) return fontSize * 1.2;

  const fonts = PDF_FONT_FAMILIES[design.font_family];
  const listIndent = block.type === "bullet" || block.type === "ordered" ? 16 : 0;
  const extraIndent = block.kind === "subsection" ? 10 : 0;
  const indent = listIndent + extraIndent;
  const prefix = block.type === "bullet" ? "•  " : block.type === "ordered" ? "1. " : "";
  const text = prefix + block.runs.map((r) => r.text).join("");

  doc.font(fonts.regular).fontSize(fontSize);
  return doc.heightOfString(text, { width: Math.max(10, width - indent), align: block.align });
};

const measureGroupHeight = (doc: PDFKit.PDFDocument, group: RenderGroup, design: DocumentDesign, width: number, scale: number): number => {
  if (group.kind === "skills-row") {
    return measurePillRowHeight(doc, group.blocks.map(blockText), design, width);
  }
  return gapBefore(group.block.kind, scale) + measureBlockHeight(doc, group.block, design, width) + gapAfter(group.block.kind, scale);
};

/** Draws one pill row at an explicit region, no auto-pagination (caller already decided it fits). Returns the new absolute y. */
const drawPillRowAt = (doc: PDFKit.PDFDocument, labels: string[], design: DocumentDesign, region: { x: number; y: number; width: number }): number => {
  const paddingX = 8;
  const paddingY = 4;
  const gap = 6;
  const fontSize = 10;
  const pillHeight = fontSize + paddingY * 2;
  const fonts = PDF_FONT_FAMILIES[design.font_family];

  let x = region.x;
  let y = region.y;
  doc.font(fonts.bold).fontSize(fontSize);

  labels.forEach((label) => {
    const textWidth = doc.widthOfString(label);
    const pillWidth = textWidth + paddingX * 2;
    if (x + pillWidth > region.x + region.width) {
      x = region.x;
      y += pillHeight + gap;
    }
    doc.roundedRect(x, y, pillWidth, pillHeight, pillHeight / 2).fill(softTint(design.accent_color));
    doc.fillColor(design.accent_color).text(label, x + paddingX, y + paddingY - 1, { lineBreak: false });
    x += pillWidth + gap;
  });

  doc.fillColor(TEXT_COLORS.textDark).font(fonts.regular);
  return y + pillHeight + 12;
};

/** Draws one block at an explicit region, no auto-pagination. Returns the new absolute y. */
const drawBlockAt = (
  doc: PDFKit.PDFDocument,
  block: RenderBlock,
  design: DocumentDesign,
  region: { x: number; y: number; width: number },
  opts: PdfDrawOpts = {},
): number => {
  const scale = DENSITY_SCALE[design.density];
  const fonts = PDF_FONT_FAMILIES[design.font_family];
  let y = region.y + gapBefore(block.kind, scale);

  if (!block.runs.length) {
    return y + PDF_FONT_SIZES[block.type] * 1.2;
  }

  const fontSize = PDF_FONT_SIZES[block.type];
  let extraIndent = 0;
  if (block.kind === "subsection") {
    doc.rect(region.x, y + 1, 3, fontSize + 3).fill(design.accent_color);
    extraIndent = 10;
  }
  const listIndent = block.type === "bullet" || block.type === "ordered" ? 16 : 0;
  const indent = listIndent + extraIndent;
  const prefix = block.type === "bullet" ? "•  " : block.type === "ordered" ? "1. " : "";
  const align = opts.forceCenter && (block.kind === "title" || block.kind === "meta") ? "center" : block.align;

  doc.x = region.x + indent;
  doc.y = y;

  let color = TEXT_COLORS.textDark;
  let bold = block.runs.every((r) => r.bold);
  if (block.kind === "title") {
    color = opts.restrained ? TEXT_COLORS.textDark : design.accent_color;
    bold = true;
  } else if (block.kind === "section") {
    color = opts.restrained ? TEXT_COLORS.textDark : design.accent_color;
    bold = true;
  } else if (block.kind === "subsection") {
    color = TEXT_COLORS.textDark;
    bold = true;
  } else if (block.kind === "meta") {
    color = TEXT_COLORS.textMuted;
  } else if (block.kind === "label") {
    color = opts.restrained ? TEXT_COLORS.textDark : design.accent_color;
    bold = true;
  }

  if (align && align !== "left" && block.runs.length > 1) {
    // Same pdfkit continued+align bug as drawGroupsFlowing above — draw
    // non-left multi-run lines as one plain string instead of per-run
    // continued calls.
    doc
      .font(pdfFontFor(design.font_family, bold, false))
      .fontSize(fontSize)
      .fillColor(color)
      .text(prefix + block.runs.map((r) => r.text).join(""), {
        width: region.width - indent,
        align,
        indent: 0,
      });
  } else {
    // title/section/subsection/label force every run bold regardless of its
    // own `run.bold`; "meta" and unstyled kinds keep each run's own.
    const forcedBold = block.kind === "title" || block.kind === "section" || block.kind === "subsection" || block.kind === "label";
    block.runs.forEach((run, runIndex) => {
      doc
        .font(pdfFontFor(design.font_family, forcedBold || run.bold, run.italic))
        .fontSize(fontSize)
        .fillColor(color)
        .text(runIndex === 0 ? `${prefix}${run.text}` : run.text, {
          width: region.width - indent,
          continued: runIndex < block.runs.length - 1,
          underline: run.underline,
          strike: run.strike,
          align,
          indent: 0,
        });
    });
  }

  y = doc.y;
  doc.fillColor(TEXT_COLORS.textDark).font(fonts.regular);

  if (block.kind === "title" || block.kind === "section") {
    const ruleY = y + 3 * scale;
    doc.moveTo(region.x, ruleY).lineTo(region.x + region.width, ruleY)
      .lineWidth(block.kind === "title" ? 2 : 0.75)
      .strokeColor(design.accent_color)
      .stroke();
    y = ruleY + 4 * scale;
  }

  return y;
};

const drawGroupAt = (
  doc: PDFKit.PDFDocument,
  group: RenderGroup,
  design: DocumentDesign,
  region: { x: number; y: number; width: number },
  opts: PdfDrawOpts = {},
): number => {
  if (group.kind === "skills-row") {
    return drawPillRowAt(doc, group.blocks.map(blockText), design, region);
  }
  return drawBlockAt(doc, group.block, design, region, opts);
};

interface PageGeometry {
  contentTop: number;
  contentBottom: number;
  fullX: number;
  fullWidth: number;
  leftX: number;
  leftWidth: number;
  rightX: number;
  rightWidth: number;
}

const getPageGeometry = (doc: PDFKit.PDFDocument): PageGeometry => {
  const fullX = doc.page.margins.left;
  const fullWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const leftWidth = Math.round(fullWidth * 0.33);
  const gutter = 20;
  const rightX = fullX + leftWidth + gutter;
  const rightWidth = fullWidth - leftWidth - gutter;
  return {
    contentTop: doc.page.margins.top,
    contentBottom: doc.page.height - doc.page.margins.bottom,
    fullX,
    fullWidth,
    leftX: fullX,
    leftWidth,
    rightX,
    rightWidth,
  };
};

/**
 * Renders `leftGroups`/`rightGroups` as two independently-paginating
 * columns starting from the document's current position (after the header
 * has already been drawn via drawGroupsFlowing). Each column tracks its own
 * y and page; `doc.switchToPage` lets the right column reuse pages the left
 * column already created (or vice versa) instead of the two columns
 * fighting over pdfkit's single "current page" pointer. Requires the
 * document to have been constructed with `bufferPages: true`.
 */
const renderTwoColumns = (
  doc: PDFKit.PDFDocument,
  design: DocumentDesign,
  leftGroups: RenderGroup[],
  rightGroups: RenderGroup[],
  geometry: PageGeometry,
) => {
  const scale = DENSITY_SCALE[design.density];
  const startPage = doc.bufferedPageRange().count - 1;
  const startY = doc.y;

  const renderColumn = (groups: RenderGroup[], x: number, width: number) => {
    let page = startPage;
    let y = startY;
    doc.switchToPage(page);

    groups.forEach((group) => {
      const height = measureGroupHeight(doc, group, design, width, scale);
      if (y + height > geometry.contentBottom) {
        page += 1;
        if (page < doc.bufferedPageRange().count) {
          doc.switchToPage(page);
        } else {
          doc.addPage();
        }
        y = geometry.contentTop;
      }
      y = drawGroupAt(doc, group, design, { x, y, width });
    });

    return { page, y };
  };

  const leftResult = renderColumn(leftGroups, geometry.leftX, geometry.leftWidth);
  const rightResult = renderColumn(rightGroups, geometry.rightX, geometry.rightWidth);

  const finalPage = Math.max(leftResult.page, rightResult.page);
  doc.switchToPage(finalPage);
  doc.x = geometry.fullX;
  doc.y = Math.max(leftResult.page === finalPage ? leftResult.y : geometry.contentTop, rightResult.page === finalPage ? rightResult.y : geometry.contentTop);
};

/** Contemporary: paints a full-width tinted band behind the header (name/headline/contact) before the rest of the document flows normally below it. */
const renderBanner = (doc: PDFKit.PDFDocument, design: DocumentDesign, headerGroups: RenderGroup[], geometry: PageGeometry) => {
  const scale = DENSITY_SCALE[design.density];
  const padding = 16;

  let measuredHeight = 0;
  headerGroups.forEach((group) => {
    measuredHeight += measureGroupHeight(doc, group, design, geometry.fullWidth - padding * 2, scale);
  });

  const bannerTop = geometry.contentTop;
  const bannerHeight = measuredHeight + padding * 2;
  doc.rect(geometry.fullX - padding, bannerTop - padding / 2, geometry.fullWidth + padding * 2, bannerHeight).fill(softTint(design.accent_color, 0.85));

  let y = bannerTop;
  headerGroups.forEach((group) => {
    y = drawGroupAt(doc, group, design, { x: geometry.fullX, y, width: geometry.fullWidth - padding * 2 });
  });

  doc.x = geometry.fullX;
  doc.y = y + padding;
};

export const htmlToPdfBuffer = (html: string, design: DocumentDesign = DEFAULT_DESIGN): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, bufferPages: true });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const groups = buildRenderGroups(annotateBlocks(parseHtmlToBlocks(html)));
    const styleVariant = design.style_variant;

    if (!styleVariant) {
      // Legacy / no CV-variant design context (e.g. Interview Pack): exact
      // original single-column behavior, untouched.
      drawGroupsFlowing(doc, groups, design);
      doc.end();
      return;
    }

    const assignment = assignColumns(groups);
    const headerGroups = groups.filter((g) => assignment.get(g) === "header");
    const leftGroups = groups.filter((g) => assignment.get(g) === "left");
    const rightGroups = groups.filter((g) => assignment.get(g) === "right");
    const bodyGroups = groups.filter((g) => assignment.get(g) !== "header");

    if (styleVariant === "classic") {
      drawGroupsFlowing(doc, headerGroups, design, { restrained: true, forceCenter: true });
      drawGroupsFlowing(doc, bodyGroups, design, { restrained: true });
    } else if (styleVariant === "contemporary") {
      const geometry = getPageGeometry(doc);
      renderBanner(doc, design, headerGroups, geometry);
      drawGroupsFlowing(doc, bodyGroups, design);
    } else if (styleVariant === "modern" && leftGroups.length > 0) {
      // Header renders full-width via the normal flowing path so pdfkit's
      // own pagination handles it; only the two-column body needs manual
      // placement.
      drawGroupsFlowing(doc, headerGroups, design);
      const geometry = getPageGeometry(doc);
      renderTwoColumns(doc, design, leftGroups, rightGroups, geometry);
    } else {
      // "modern" with nothing that belongs in the left column (sparse data
      // — no skills, no education): a lone narrow column next to a mostly
      // empty page reads as broken, not minimal. Fall back to single-column
      // rather than reserving dead space.
      drawGroupsFlowing(doc, groups, design);
    }

    doc.end();
  });
};

// ---------------------------------------------------------------------------
// DOCX rendering
// ---------------------------------------------------------------------------

const DOCX_ALIGN: Record<Align, (typeof AlignmentType)[keyof typeof AlignmentType]> = {
  left: AlignmentType.LEFT,
  center: AlignmentType.CENTER,
  right: AlignmentType.RIGHT,
  justify: AlignmentType.BOTH,
};

const DOCX_TEXT_COLORS = {
  textDark: "1F2937",
  textMuted: "6B7280",
};

const NO_BORDER = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const NO_CELL_BORDERS = { top: NO_BORDER, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER };

interface DocxBuildOpts {
  restrained?: boolean;
  forceCenter?: boolean;
  /** Contemporary: tints every paragraph's background so the header reads as one continuous banner block. */
  bannerFill?: string;
}

/** Builds Paragraphs for a run of groups — shared by every layout; only alignment/color/shading options differ per variant. */
function buildParagraphsForGroups(groups: RenderGroup[], design: DocumentDesign, opts: DocxBuildOpts = {}): Paragraph[] {
  const accent = design.accent_color.replace("#", "");
  const font = DOCX_FONT_FAMILIES[design.font_family];
  const scale = DENSITY_SCALE[design.density];
  const shading = opts.bannerFill ? { type: ShadingType.CLEAR, fill: opts.bannerFill.replace("#", "") } : undefined;

  return groups.map((group) => {
    if (group.kind === "skills-row") {
      const children: DocxTextRun[] = [];
      group.blocks.forEach((b, index) => {
        if (index > 0) children.push(new DocxTextRun({ text: "   ", color: DOCX_TEXT_COLORS.textMuted, font }));
        children.push(new DocxTextRun({ text: blockText(b), bold: true, color: accent, font }));
      });
      return new Paragraph({ children, shading, spacing: { before: 80, after: 160 } });
    }

    const block = group.block;
    const isEmphasized = block.kind === "title" || block.kind === "section" || block.kind === "subsection" || block.kind === "label";
    const color =
      block.kind === "title" || block.kind === "section" || block.kind === "label"
        ? (opts.restrained ? DOCX_TEXT_COLORS.textDark : accent)
        : block.kind === "meta"
          ? DOCX_TEXT_COLORS.textMuted
          : DOCX_TEXT_COLORS.textDark;

    const children = block.runs.length
      ? block.runs.map(
          (run) =>
            new DocxTextRun({
              text: run.text,
              bold: run.bold || isEmphasized,
              italics: run.italic,
              underline: run.underline ? {} : undefined,
              strike: run.strike,
              color,
              font,
              size: block.kind === "title" ? 44 : block.kind === "section" ? 26 : undefined,
            }),
        )
      : [new DocxTextRun({ text: "", font })];

    // Rules stay accent-colored even in restrained (classic) mode — "usable
    // on rule lines, not on headings" is the whole point of that variant.
    const border =
      block.kind === "title" || block.kind === "section"
        ? {
            bottom: {
              style: BorderStyle.SINGLE,
              size: block.kind === "title" ? 12 : 6,
              color: accent,
              space: 4,
            },
          }
        : block.kind === "subsection"
          ? {
              left: {
                style: BorderStyle.SINGLE,
                size: 18,
                color: accent,
                space: 6,
              },
            }
          : undefined;

    const alignment = opts.forceCenter && (block.kind === "title" || block.kind === "meta")
      ? AlignmentType.CENTER
      : DOCX_ALIGN[block.align];

    return new Paragraph({
      children,
      alignment,
      shading,
      bullet: block.type === "bullet" ? { level: 0 } : undefined,
      numbering: block.type === "ordered" ? { reference: "cv-variant-numbering", level: 0 } : undefined,
      indent: block.kind === "subsection" ? { left: 200 } : undefined,
      border,
      spacing: {
        before: Math.round((block.kind === "section" ? 300 : block.kind === "subsection" ? 200 : block.kind === "title" ? 100 : 80) * scale),
        after: Math.round((block.kind === "title" || block.kind === "section" ? 160 : 80) * scale),
      },
    });
  });
}

/** A4 content width in DXA at docx's default 1" margins (11906 - 1440*2). Word/Google Docs both need fixed DXA widths on table columns — percentage widths are unreliable across viewers. */
const DOCX_CONTENT_WIDTH_DXA = 9026;

const buildTwoColumnTable = (leftParagraphs: Paragraph[], rightParagraphs: Paragraph[]): Table => {
  const leftWidth = Math.round(DOCX_CONTENT_WIDTH_DXA * 0.33);
  const rightWidth = DOCX_CONTENT_WIDTH_DXA - leftWidth;

  return new Table({
    columnWidths: [leftWidth, rightWidth],
    borders: {
      top: NO_BORDER,
      bottom: NO_BORDER,
      left: NO_BORDER,
      right: NO_BORDER,
      insideHorizontal: NO_BORDER,
      insideVertical: NO_BORDER,
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: leftWidth, type: WidthType.DXA },
            borders: NO_CELL_BORDERS,
            margins: { top: 0, bottom: 0, left: 0, right: 200 },
            children: leftParagraphs.length ? leftParagraphs : [new Paragraph("")],
          }),
          new TableCell({
            width: { size: rightWidth, type: WidthType.DXA },
            borders: NO_CELL_BORDERS,
            margins: { top: 0, bottom: 0, left: 200, right: 0 },
            children: rightParagraphs.length ? rightParagraphs : [new Paragraph("")],
          }),
        ],
      }),
    ],
  });
};

export const htmlToDocxBuffer = async (html: string, design: DocumentDesign = DEFAULT_DESIGN): Promise<Buffer> => {
  const groups = buildRenderGroups(annotateBlocks(parseHtmlToBlocks(html)));
  const styleVariant = design.style_variant;

  let children: (Paragraph | Table)[];

  if (!styleVariant) {
    // Legacy / no CV-variant design context: exact original single-column behavior.
    children = buildParagraphsForGroups(groups, design);
  } else {
    const assignment = assignColumns(groups);
    const headerGroups = groups.filter((g) => assignment.get(g) === "header");
    const leftGroups = groups.filter((g) => assignment.get(g) === "left");
    const rightGroups = groups.filter((g) => assignment.get(g) === "right");
    const bodyGroups = groups.filter((g) => assignment.get(g) !== "header");

    if (styleVariant === "classic") {
      children = [
        ...buildParagraphsForGroups(headerGroups, design, { restrained: true, forceCenter: true }),
        ...buildParagraphsForGroups(bodyGroups, design, { restrained: true }),
      ];
    } else if (styleVariant === "contemporary") {
      children = [
        ...buildParagraphsForGroups(headerGroups, design, { bannerFill: softTint(design.accent_color, 0.85) }),
        ...buildParagraphsForGroups(bodyGroups, design),
      ];
    } else if (styleVariant === "modern" && leftGroups.length > 0) {
      children = [
        ...buildParagraphsForGroups(headerGroups, design),
        buildTwoColumnTable(
          buildParagraphsForGroups(leftGroups, design),
          buildParagraphsForGroups(rightGroups, design),
        ),
      ];
    } else {
      // Sparse "modern" (nothing for the left column) — same single-column fallback as the PDF path.
      children = buildParagraphsForGroups(groups, design);
    }
  }

  const doc = new Document({
    numbering: {
      config: [
        {
          reference: "cv-variant-numbering",
          levels: [
            {
              level: 0,
              format: "decimal",
              text: "%1.",
              alignment: AlignmentType.START,
            },
          ],
        },
      ],
    },
    sections: [{ children }],
  });

  return Packer.toBuffer(doc);
};
