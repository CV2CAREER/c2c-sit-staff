// Renders a CV variant that the AI authored as a complete, self-styled HTML
// document (its own <style>/inline CSS choosing colors, layout, fonts) into a
// real PDF/DOCX. Deliberately separate from htmlDocumentGenerator.ts's
// pdfkit-based renderer, which still serves interview pack and any other
// caller that sends plain semantic HTML plus a fixed `design` token set —
// this file exists because CV variant generation no longer uses that
// approach at all: the AI's HTML *is* the design, rendered through a real
// browser engine (Playwright) instead of our own hand-built block drawer.
import { chromium, Browser } from "playwright";
import { buildCvVariantDocx } from "./cvVariantDocxBuilder";

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
// External <img> sources are stripped here rather than relying solely on the
// PDF path's own page.route block below — belt and suspenders against an
// SSRF-style external fetch. (The DOCX path — cvVariantDocxBuilder.ts —
// doesn't render images at all, so this is moot for it either way.)
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
 * DOCX conversion of the same AI-authored HTML — via buildCvVariantDocx
 * (cvVariantDocxBuilder.ts), not html-to-docx.
 *
 * html-to-docx was tried first and dropped. It only reads *inline*
 * `style="..."` attributes — no CSS cascade, so a `<style>` block (how the
 * AI always authors its design) is invisible to it: verified directly, a
 * real generated CV with ~15 distinct declared colors produced a DOCX with
 * exactly 1 surviving color and 0 backgrounds. The obvious fix — resolving
 * that cascade with `juice` before handing off — made things categorically
 * worse: once most elements carry a `style` attribute (regardless of its
 * length or content — bisected against gradients, a property allowlist, and
 * a color/background-only minimal case; none of it mattered), html-to-docx
 * silently truncates the document partway through (73 surviving text runs
 * unjuiced, 6 juiced, on the identical source) — a structural bug in the
 * library itself. buildCvVariantDocx reads the AI's own CSS and builds real
 * docx.js Paragraph/TextRun objects directly, never touching html-to-docx.
 *
 * Still not chasing pixel parity with the PDF (no two-column layouts, no
 * CSS Grid, no gradients) — that was already true of the html-to-docx path
 * too. The bar this clears that the old path didn't: the AI's actual
 * color/heading choices are visibly present in the output, not almost
 * entirely absent.
 */
export const renderCvVariantHtmlToDocx = async (html: string): Promise<Buffer> => {
  const safeHtml = sanitizeAiHtml(html);
  return buildCvVariantDocx(safeHtml);
};
