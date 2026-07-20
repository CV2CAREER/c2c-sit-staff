import PDFDocument from "pdfkit";
import {
  AlignmentType,
  BorderStyle,
  Document,
  Packer,
  Paragraph,
  TextRun as DocxTextRun,
} from "docx";
import * as cheerio from "cheerio";
import { normalizeTypography } from "./textDocumentGenerator";

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
 * that can't survive an edit.
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

const COLORS = {
  accent: "#0D9F6E",
  accentSoft: "#E4F7F0",
  textDark: "#1F2937",
  textMuted: "#6B7280",
};

const PDF_FONT_SIZES: Record<BlockType, number> = {
  heading1: 24,
  heading2: 15,
  heading3: 13,
  paragraph: 11,
  bullet: 11,
  ordered: 11,
};

const pdfFontFor = (bold: boolean, italic: boolean): string => {
  if (bold && italic) return "Helvetica-BoldOblique";
  if (bold) return "Helvetica-Bold";
  if (italic) return "Helvetica-Oblique";
  return "Helvetica";
};

/** Draws a wrapped row of colored pill badges (e.g. skills), one draw call per label. */
const drawPillRow = (doc: PDFKit.PDFDocument, labels: string[]) => {
  const startX = doc.page.margins.left;
  const rightEdge = doc.page.width - doc.page.margins.right;
  const bottomEdge = doc.page.height - doc.page.margins.bottom;
  const paddingX = 8;
  const paddingY = 4;
  const gap = 6;
  const fontSize = 10;
  const pillHeight = fontSize + paddingY * 2;

  let x = startX;
  let y = doc.y;

  doc.font("Helvetica-Bold").fontSize(fontSize);

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

    doc.roundedRect(x, y, pillWidth, pillHeight, pillHeight / 2).fill(COLORS.accentSoft);
    doc.fillColor(COLORS.accent).text(label, x + paddingX, y + paddingY - 1, { lineBreak: false });

    x += pillWidth + gap;
  });

  doc.x = startX;
  doc.y = y + pillHeight + 12;
  doc.fillColor(COLORS.textDark).font("Helvetica");
};

export const htmlToPdfBuffer = (html: string): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const groups = buildRenderGroups(annotateBlocks(parseHtmlToBlocks(html)));
    const contentLeft = doc.page.margins.left;
    const contentRight = doc.page.width - doc.page.margins.right;

    const drawRule = (color: string, lineWidth: number) => {
      const y = doc.y;
      doc.moveTo(contentLeft, y).lineTo(contentRight, y).lineWidth(lineWidth).strokeColor(color).stroke();
      doc.moveDown(0.4);
    };

    groups.forEach((group) => {
      if (group.kind === "skills-row") {
        drawPillRow(doc, group.blocks.map(blockText));
        return;
      }

      const block = group.block;
      const fontSize = PDF_FONT_SIZES[block.type];

      if (!block.runs.length) {
        doc.fontSize(fontSize).text(" ");
        return;
      }

      if (block.kind === "section") doc.moveDown(0.7);
      else if (block.kind === "subsection") doc.moveDown(0.5);
      else doc.moveDown(0.15);

      let extraIndent = 0;
      if (block.kind === "subsection") {
        const barY = doc.y + 1;
        doc.rect(contentLeft, barY, 3, fontSize + 3).fill(COLORS.accent);
        extraIndent = 10;
      }

      const listIndent = block.type === "bullet" || block.type === "ordered" ? 16 : 0;
      const indent = listIndent + extraIndent;
      const prefix = block.type === "bullet" ? "•  " : block.type === "ordered" ? "1. " : "";

      block.runs.forEach((run, runIndex) => {
        let color = COLORS.textDark;
        let size = fontSize;
        let bold = run.bold;

        if (block.kind === "title") {
          color = COLORS.accent;
          bold = true;
          size = fontSize;
        } else if (block.kind === "section") {
          color = COLORS.accent;
          bold = true;
        } else if (block.kind === "subsection") {
          color = COLORS.textDark;
          bold = true;
        } else if (block.kind === "meta") {
          color = COLORS.textMuted;
        } else if (block.kind === "label") {
          color = COLORS.accent;
          bold = true;
        }

        doc
          .font(pdfFontFor(bold, run.italic))
          .fontSize(size)
          .fillColor(color)
          .text(runIndex === 0 ? `${prefix}${run.text}` : run.text, {
            continued: runIndex < block.runs.length - 1,
            underline: run.underline,
            strike: run.strike,
            align: block.align,
            indent,
          });
      });

      doc.fillColor(COLORS.textDark).font("Helvetica");

      if (block.kind === "title") {
        doc.moveDown(0.3);
        drawRule(COLORS.accent, 2);
      } else if (block.kind === "section") {
        doc.moveDown(0.15);
        drawRule(COLORS.accent, 0.75);
      }
    });

    doc.end();
  });
};

const DOCX_ALIGN: Record<Align, (typeof AlignmentType)[keyof typeof AlignmentType]> = {
  left: AlignmentType.LEFT,
  center: AlignmentType.CENTER,
  right: AlignmentType.RIGHT,
  justify: AlignmentType.BOTH,
};

const DOCX_COLORS = {
  accent: "0D9F6E",
  textDark: "1F2937",
  textMuted: "6B7280",
};

export const htmlToDocxBuffer = async (html: string): Promise<Buffer> => {
  const groups = buildRenderGroups(annotateBlocks(parseHtmlToBlocks(html)));

  const paragraphs = groups.map((group) => {
    if (group.kind === "skills-row") {
      const children: DocxTextRun[] = [];
      group.blocks.forEach((b, index) => {
        if (index > 0) children.push(new DocxTextRun({ text: "   ", color: DOCX_COLORS.textMuted }));
        children.push(new DocxTextRun({ text: blockText(b), bold: true, color: DOCX_COLORS.accent }));
      });
      return new Paragraph({ children, spacing: { before: 80, after: 160 } });
    }

    const block = group.block;
    const isEmphasized = block.kind === "title" || block.kind === "section" || block.kind === "subsection" || block.kind === "label";
    const color =
      block.kind === "title" || block.kind === "section" || block.kind === "label"
        ? DOCX_COLORS.accent
        : block.kind === "meta"
          ? DOCX_COLORS.textMuted
          : DOCX_COLORS.textDark;

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
              size: block.kind === "title" ? 44 : block.kind === "section" ? 26 : undefined,
            }),
        )
      : [new DocxTextRun({ text: "" })];

    const border =
      block.kind === "title" || block.kind === "section"
        ? {
            bottom: {
              style: BorderStyle.SINGLE,
              size: block.kind === "title" ? 12 : 6,
              color: DOCX_COLORS.accent,
              space: 4,
            },
          }
        : block.kind === "subsection"
          ? {
              left: {
                style: BorderStyle.SINGLE,
                size: 18,
                color: DOCX_COLORS.accent,
                space: 6,
              },
            }
          : undefined;

    return new Paragraph({
      children,
      alignment: DOCX_ALIGN[block.align],
      bullet: block.type === "bullet" ? { level: 0 } : undefined,
      numbering: block.type === "ordered" ? { reference: "cv-variant-numbering", level: 0 } : undefined,
      indent: block.kind === "subsection" ? { left: 200 } : undefined,
      border,
      spacing: {
        before: block.kind === "section" ? 300 : block.kind === "subsection" ? 200 : block.kind === "title" ? 100 : 80,
        after: block.kind === "title" || block.kind === "section" ? 160 : 80,
      },
    });
  });

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
    sections: [{ children: paragraphs }],
  });

  return Packer.toBuffer(doc);
};
