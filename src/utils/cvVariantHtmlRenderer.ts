// Renders a CV variant that the AI authored as a complete, self-styled HTML
// document (its own <style>/inline CSS choosing colors, layout, fonts) into a
// real PDF/DOCX. Deliberately separate from htmlDocumentGenerator.ts's
// pdfkit-based renderer, which still serves interview pack and any other
// caller that sends plain semantic HTML plus a fixed `design` token set —
// this file exists because CV variant generation no longer uses that
// approach at all: the AI's HTML *is* the design, rendered through a real
// browser engine (Playwright) instead of our own hand-built block drawer.
import { chromium, Browser } from "playwright";
import HTMLtoDOCX from "html-to-docx";
import { getServiceLogger } from "./createLogger";

const logger = getServiceLogger("cv-variant-html-renderer");

// Launched once, reused across requests — matches the module-level singleton
// pattern already used for the Gradient AI clients in digital-factory.ts.
// Spinning up a fresh Chromium process per request would add real latency on
// top of the AI generation call, which is already the slow part.
let browserPromise: Promise<Browser> | null = null;
const getBrowser = async (): Promise<Browser> => {
  if (!browserPromise) {
    browserPromise = chromium.launch({ headless: true }).catch((error) => {
      browserPromise = null;
      throw error;
    });
  }
  return browserPromise;
};

// Defense-in-depth alongside the disabled-JS browser context below — the
// AI's HTML is untrusted input now executed inside a real browser engine,
// not just walked by our own tag-whitelist parser, so it gets the same
// scrutiny any other untrusted HTML input would.
//
// External <img> sources are stripped for both renderers, not just blocked
// at the network layer: the PDF path already blocks them via page.route, but
// html-to-docx has no such gate — it actively *fetches* referenced images to
// embed them, so an external src is both an SSRF-style risk and a reliability
// one (it throws outright if the URL doesn't resolve to a real image).
const sanitizeAiHtml = (html: string): string =>
  html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<img\b[^>]*>/gi, (tag) => (/\bsrc\s*=\s*["']data:/i.test(tag) ? tag : ""));

/**
 * Renders an AI-authored CV variant (a complete HTML document with its own
 * embedded styling) to a PDF buffer. JavaScript is disabled and only `data:`
 * URIs are allowed to load — the HTML is untrusted, so this closes off
 * script execution and any external network access (tracking pixels, SSRF)
 * a malicious or malformed AI response could otherwise attempt.
 */
export const renderCvVariantHtmlToPdf = async (html: string): Promise<Buffer> => {
  const safeHtml = sanitizeAiHtml(html);
  const browser = await getBrowser();
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    await page.route("**/*", (route) => {
      const url = route.request().url();
      if (url.startsWith("data:")) {
        route.continue();
      } else {
        route.abort();
      }
    });
    await page.setContent(safeHtml, { waitUntil: "load" });
    const buffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "12mm", bottom: "12mm", left: "12mm", right: "12mm" },
    });
    return buffer;
  } finally {
    await context.close();
  }
};

/**
 * Best-effort DOCX conversion of the same AI-authored HTML. Word can't
 * replicate arbitrary CSS (grid layouts, custom positioning, gradients), so
 * this will generally look plainer than the PDF — expected for any
 * HTML-to-DOCX conversion, not something to chase pixel parity on.
 *
 * KNOWN ISSUE (confirmed, not yet fixed): html-to-docx only reads *inline*
 * `style="..."` attributes — it has no CSS cascade, so it never applies
 * rules from a `<style>` block. The AI almost always authors its design as a
 * `<style>` block with classes (`.header`, `.skill-chip`, ...), not inline
 * styles, so nearly every color/background/layout choice is silently
 * dropped — verified directly: a real generated CV with ~15 distinct
 * declared colors produced a DOCX with exactly 1 surviving color and 0
 * background/shading elements.
 *
 * The obvious fix — resolving that cascade with `juice` before handing the
 * HTML to html-to-docx — was tried and reverted: on real, complex
 * AI-generated CVs it made things categorically worse. Once most elements
 * carry a long inlined `style` attribute, html-to-docx silently truncates
 * partway through the document (73 text runs survived unjuiced; 6 survived
 * juiced, on the identical source). Bisected against gradients, a curated
 * property allowlist, the leftover `<style>` block juice keeps for `@media`
 * rules, HTML comments, and redundant `class` attributes — none of those
 * changed the outcome, so this is a structural parser limitation in
 * html-to-docx itself, not a property-value issue. A real fix needs either
 * a different DOCX conversion approach entirely (e.g. a server-side
 * LibreOffice conversion, matching how PDF generation already moved off a
 * fragile approach onto a real rendering engine) or patching/replacing
 * html-to-docx — both bigger than this pass.
 */
export const renderCvVariantHtmlToDocx = async (html: string): Promise<Buffer> => {
  const safeHtml = sanitizeAiHtml(html);
  const result = await HTMLtoDOCX(safeHtml, null, { orientation: "portrait" });
  if (Buffer.isBuffer(result)) return result;
  logger.warn("[renderCvVariantHtmlToDocx] html-to-docx returned a Blob, not a Buffer — converting");
  return Buffer.from(await (result as Blob).arrayBuffer());
};
