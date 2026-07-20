import type {
  InterviewPackStage1Result,
  InterviewPackStage2Result,
  InterviewPackStage3Result,
  InterviewPackStage4Result,
} from "@/hooks/useInterviewPackGeneration";

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const paragraph = (
  text: string | null | undefined,
  opts?: { bold?: boolean; align?: "justify" },
): string => {
  if (!text) return "";
  const inner = opts?.bold ? `<strong>${escapeHtml(text)}</strong>` : escapeHtml(text);
  const style = opts?.align ? ` style="text-align: ${opts.align}"` : "";
  return `<p${style}>${inner}</p>`;
};

const bulletList = (items: (string | null | undefined)[]): string => {
  const clean = items.filter((item): item is string => Boolean(item?.trim()));
  return clean.length
    ? `<ul>${clean.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`
    : "";
};

const qaPair = (question: string, answer: string | null | undefined): string => {
  if (!answer) return "";
  return `${paragraph(question, { bold: true })}${paragraph(answer, { align: "justify" })}`;
};

/**
 * Combines the 4 sequentially-generated stage results into one rich-text
 * HTML document, edited via the same TipTap editor used for CV Variant so
 * the admin can format it before it's rendered to PDF/DOCX. Sections mirror
 * the stage order (foundational → STAR bank → technical → closing) since
 * that's the order a candidate would actually rehearse in.
 */
export function flattenInterviewPackToHtml(
  stage1: InterviewPackStage1Result | undefined,
  stage2: InterviewPackStage2Result | undefined,
  stage3: InterviewPackStage3Result | undefined,
  stage4: InterviewPackStage4Result | undefined,
): string {
  const parts: string[] = [];

  parts.push("<h1>Interview Preparation Pack</h1>");

  if (stage1?.candidateProfile) {
    const cp = stage1.candidateProfile;
    parts.push("<h2>Candidate Snapshot</h2>");
    parts.push(paragraph(`${cp.yearsExperience} years of relevant experience`));
    if (cp.coreSkills?.length) parts.push(paragraph(`Core skills: ${cp.coreSkills.join(", ")}`));
    if (cp.industries?.length) parts.push(paragraph(`Industries: ${cp.industries.join(", ")}`));
    parts.push(paragraph(cp.currentlyEmployed ? "Currently employed" : "Not currently employed"));
    if (cp.employmentGapsDetected?.length) {
      parts.push(paragraph("Employment gaps to be ready to address:", { bold: true }));
      parts.push(bulletList(cp.employmentGapsDetected));
    }
  }

  if (stage1?.positioning) {
    const pos = stage1.positioning;
    parts.push("<h2>Positioning</h2>");
    parts.push(paragraph(pos.statement, { bold: true }));
    pos.pillars?.forEach((pillar) => {
      parts.push(paragraph(pillar.lead, { bold: true }));
      parts.push(paragraph(pillar.body, { align: "justify" }));
    });
    if (pos.gapScript) {
      parts.push(paragraph("Gap Script", { bold: true }));
      parts.push(paragraph(pos.gapScript, { align: "justify" }));
    }
  }

  if (stage1?.foundational) {
    const f = stage1.foundational;
    parts.push("<h2>Foundational Questions &amp; Answers</h2>");
    parts.push(qaPair("Tell me about yourself.", f.tellMeAboutYourself));
    parts.push(qaPair("Why this role?", f.whyThisRole));
    parts.push(qaPair("Why are you leaving / making this career pivot?", f.whyLeavingOrCareerPivot));
    parts.push(qaPair("What key deliverables have you owned?", f.keyDeliverables));
    parts.push(qaPair("What's your notice period?", f.noticePeriod));
    if (f.workingRights?.statement) {
      parts.push(qaPair("What are your working rights?", f.workingRights.statement));
    }
    parts.push(qaPair("How would you respond to a salary offer?", f.salaryOfferResponse));
    parts.push(qaPair("What if asked to decline your current pay?", f.salaryCurrentPayDecline));
    parts.push(qaPair("What if your salary expectations get flipped back on you?", f.salaryExpectationsFlip));
    parts.push(qaPair("What are your top three strengths?", f.topThreeStrengths));
    parts.push(qaPair("What's an area you're developing?", f.developmentArea));
    parts.push(qaPair("What are your career goals?", f.careerGoals));
  }

  if (stage2?.starBank?.length) {
    parts.push("<h2>STAR Answer Bank</h2>");
    stage2.starBank.forEach((story) => {
      parts.push(`<h3>${escapeHtml(story.title)}</h3>`);
      parts.push(paragraph(`Use when asked about: ${story.useWhenAskedAbout}`));
      parts.push(paragraph("Situation", { bold: true }));
      parts.push(paragraph(story.situation, { align: "justify" }));
      parts.push(paragraph("Task", { bold: true }));
      parts.push(paragraph(story.task, { align: "justify" }));
      parts.push(paragraph("Action", { bold: true }));
      parts.push(paragraph(story.action, { align: "justify" }));
      parts.push(paragraph("Result", { bold: true }));
      parts.push(paragraph(story.result, { align: "justify" }));
    });
  }

  if (stage3?.technicalDeepDive?.length) {
    parts.push("<h2>Technical &amp; Competency Deep-Dive</h2>");
    stage3.technicalDeepDive.forEach((item) => {
      parts.push(paragraph(item.topic, { bold: true }));
      parts.push(paragraph(item.script, { align: "justify" }));
    });
  }

  if (stage3?.technicalPractice?.length) {
    parts.push("<h2>Technical Practice Questions</h2>");
    stage3.technicalPractice.forEach((q) => {
      parts.push(paragraph(`[${q.category}] ${q.question}`, { bold: true }));
      parts.push(paragraph(q.modelAnswer, { align: "justify" }));
      if (q.codeExample) {
        parts.push(`<pre><code>${escapeHtml(q.codeExample)}</code></pre>`);
      }
    });
  }

  if (stage4?.panelQuestions) {
    const pq = stage4.panelQuestions;
    parts.push("<h2>Questions to Ask the Panel</h2>");
    if (pq.aboutRole?.length) {
      parts.push(paragraph("About the Role", { bold: true }));
      parts.push(bulletList(pq.aboutRole));
    }
    if (pq.aboutTeam?.length) {
      parts.push(paragraph("About the Team", { bold: true }));
      parts.push(bulletList(pq.aboutTeam));
    }
    if (pq.aboutGrowth?.length) {
      parts.push(paragraph("About Growth", { bold: true }));
      parts.push(bulletList(pq.aboutGrowth));
    }
    if (pq.closingQuestion) {
      parts.push(paragraph("Closing Question", { bold: true }));
      parts.push(paragraph(pq.closingQuestion, { align: "justify" }));
    }
  }

  if (stage4?.playbook) {
    const pb = stage4.playbook;
    parts.push("<h2>Interview Day Playbook</h2>");
    if (pb.first60Seconds?.length) {
      parts.push(paragraph("First 60 Seconds", { bold: true }));
      parts.push(bulletList(pb.first60Seconds));
    }
    if (pb.pacingAndTone?.length) {
      parts.push(paragraph("Pacing &amp; Tone", { bold: true }));
      parts.push(bulletList(pb.pacingAndTone));
    }
    if (pb.last60Seconds) {
      parts.push(paragraph("Last 60 Seconds", { bold: true }));
      parts.push(paragraph(pb.last60Seconds, { align: "justify" }));
    }
    if (pb.thingsToAvoid?.length) {
      parts.push(paragraph("Things to Avoid", { bold: true }));
      parts.push(bulletList(pb.thingsToAvoid));
    }
    if (pb.nightBeforeChecklist?.length) {
      parts.push(paragraph("Night-Before Checklist", { bold: true }));
      parts.push(bulletList(pb.nightBeforeChecklist));
    }
  }

  return parts.filter(Boolean).join("");
}
