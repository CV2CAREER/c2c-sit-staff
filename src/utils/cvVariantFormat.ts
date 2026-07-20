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

const bulletList = (items: string[]): string =>
  items.length
    ? `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`
    : "";

/**
 * Flattens the structured CV variant JSON into rich-text HTML, edited via
 * the CvVariantEditor (TipTap) so the admin can bold/italic/underline/align
 * it into a presentable, job-ready layout before it's rendered to PDF/DOCX.
 * Section-level `flags` (e.g. "drafted from standard deliverables —
 * confirm") surface the per-role review signal separately in the UI, so
 * they aren't inlined here.
 */
export function flattenCvVariantToHtml(result: CvVariantResult): string {
  const parts: string[] = [];

  parts.push(`<h1>${escapeHtml(result.header.name)}</h1>`);
  if (result.header.headline?.text) {
    parts.push(paragraph(result.header.headline.text, { bold: true }));
  }
  parts.push(paragraph(result.header.contact_line));
  if (result.header.work_rights_line?.text) {
    parts.push(paragraph(result.header.work_rights_line.text));
  }

  if (result.summary?.runs?.length) {
    parts.push("<h2>Professional Summary</h2>");
    parts.push(paragraph(result.summary.runs.map((run) => run.text).join(" "), { align: "justify" }));
  }

  if (result.skills?.length) {
    parts.push("<h2>Skills</h2>");
    // A real list (one skill per <li>) instead of one joined paragraph — the
    // PDF/DOCX renderer detects the "Skills" heading and renders each item
    // as a colored pill badge rather than a bulleted line.
    parts.push(bulletList(result.skills.map((skill) => skill.text)));
  }

  if (result.experience?.length) {
    parts.push("<h2>Experience</h2>");
    result.experience.forEach((exp) => {
      const locationPart = exp.location ? `, ${exp.location}` : "";
      parts.push(`<h3>${escapeHtml(`${exp.title} — ${exp.company}${locationPart}`)}</h3>`);
      parts.push(paragraph(exp.dates));
      parts.push(bulletList((exp.bullets ?? []).map((b) => b.text)));
      exp.sub_sections?.forEach((sub) => {
        parts.push(paragraph(sub.label, { bold: true }));
        parts.push(bulletList((sub.bullets ?? []).map((b) => b.text)));
      });
    });
  }

  if (result.education?.length) {
    parts.push("<h2>Education</h2>");
    result.education.forEach((edu) => {
      parts.push(
        paragraph(`${edu.qualification} — ${edu.institution} (${edu.dates})`, { bold: true }),
      );
      if (edu.detail?.text) parts.push(paragraph(edu.detail.text));
    });
  }

  if (result.certifications?.length) {
    parts.push("<h2>Certifications</h2>");
    parts.push(bulletList(result.certifications.map((cert) => cert.text)));
  }

  result.additional_sections?.forEach((section) => {
    parts.push(`<h2>${escapeHtml(section.heading)}</h2>`);
    parts.push(bulletList((section.items ?? []).map((item) => item.text)));
  });

  return parts.filter(Boolean).join("");
}

/** All section-level flags across the variant, each labeled with its source. */
export function collectCvVariantFlags(result: CvVariantResult): { source: string; flag: string }[] {
  const flags: { source: string; flag: string }[] = [];

  result.top_level_flags?.forEach((flag) => flags.push({ source: "Overall", flag }));

  if (result.header?.work_rights_line?.flag) {
    flags.push({ source: "Header", flag: result.header.work_rights_line.flag });
  }

  result.experience?.forEach((exp) => {
    exp.flags?.forEach((flag) => flags.push({ source: exp.title || "Experience", flag }));
  });

  result.education?.forEach((edu) => {
    edu.flags?.forEach((flag) => flags.push({ source: edu.qualification || "Education", flag }));
  });

  result.certifications?.forEach((cert) => {
    if (cert.flag) flags.push({ source: "Certifications", flag: cert.flag });
  });

  return flags;
}
