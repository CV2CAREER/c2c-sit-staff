import PDFDocument from "pdfkit";
import { Document, Packer, Paragraph } from "docx";

/**
 * pdfkit's built-in standard fonts (Helvetica etc.) only support the narrow
 * WinAnsi/Latin-1 glyph set - "smart" typographic characters the AI likes to
 * use (non-breaking hyphens, curly quotes, en/em dashes, narrow spaces) fall
 * outside it and render as garbage (e.g. a stray "/"). Normalize those down
 * to their plain-ASCII equivalents before rendering. DOCX is full Unicode so
 * this isn't strictly required there, but applied too for typography
 * consistency between the two output formats.
 *
 * Every replacement uses explicit \u escapes (never literal glyphs) so the
 * source file itself can't hide an ambiguous/invisible character.
 */
export const normalizeTypography = (text: string): string =>
  text
    // Curly single quotes / apostrophe variants -> '
    .replace(/[‘’‚‛]/g, "'")
    // Curly double quotes -> "
    .replace(/[“”„‟]/g, '"')
    // En dash, em dash, non-breaking hyphen -> -
    .replace(/[–—‑]/g, "-")
    // Bullet variants -> -
    .replace(/[•●◦‣]/g, "-")
    // Non-breaking space, en/em/figure/thin/hair spaces, narrow-no-break,
    // medium-math space, ideographic space -> regular space
    .replace(/[  -   　]/g, " ")
    // Ellipsis -> ...
    .replace(/…/g, "...");

/**
 * Renders plain text into a simple single-column, justified PDF, one pdfkit
 * `.text()` call per paragraph so blank lines between paragraphs are
 * preserved. Short lines (name, date, salutation) are unaffected by
 * `justify` - it only stretches lines that actually wrap.
 */
export const textToPdfBuffer = (text: string): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.font("Helvetica").fontSize(11);
    normalizeTypography(text)
      .split(/\n/)
      .forEach((line) => {
        doc.text(line || " ", { align: "justify" });
      });

    doc.end();
  });
};

/**
 * Renders plain text into a minimal .docx - one paragraph per line so blank
 * lines between paragraphs are preserved, body justified to match the PDF.
 */
export const textToDocxBuffer = async (text: string): Promise<Buffer> => {
  const paragraphs = normalizeTypography(text)
    .split(/\n/)
    .map((line) => new Paragraph({ text: line, alignment: "both" }));

  const doc = new Document({
    sections: [{ children: paragraphs }],
  });

  return Packer.toBuffer(doc);
};
