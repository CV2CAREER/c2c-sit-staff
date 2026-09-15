import { queryDigitalOceanAI, AiTokenUsage } from '../../utils/digital-factory';
import { getServiceLogger } from '../../utils/createLogger';

const logger = getServiceLogger('discovery-ai-extract');

export interface ExtractedJobFields {
  skills: string[];
  technologies: string[];
  salary: string;
  work_mode: string;
  visa_sponsorship: string;
  relocation_support: string;
  job_summary: string;
}

const cleanText = (text: string): string =>
  text.replace(/\s+/g, ' ').replace(/<[^>]+>/g, ' ').trim().substring(0, 6000);

function buildPrompt(content: string): string {
  return `Extract structured job information from the following job posting. Return ONLY valid JSON (no explanations, no markdown).

RULES:
- Missing fields → use "N/A" or empty array [].
- skills and technologies must be arrays of strings.
- salary as a plain string (e.g. "120000" or "$60/hr" or "N/A").
- work_mode is one of: "Remote", "Hybrid", "On-site", or "N/A".
- Do not hallucinate.

Return this exact JSON shape:
{"skills":[],"technologies":[],"salary":"","work_mode":"","visa_sponsorship":"","relocation_support":"","job_summary":""}

JOB POSTING:
${content}`;
}

function parseJson(text: string): ExtractedJobFields | null {
  const cleaned = text.replace(/```json\s*/gi, '').replace(/```/g, '');
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[0]);
    return {
      skills: Array.isArray(parsed.skills) ? parsed.skills.slice(0, 20) : [],
      technologies: Array.isArray(parsed.technologies) ? parsed.technologies.slice(0, 20) : [],
      salary: typeof parsed.salary === 'string' ? parsed.salary : 'N/A',
      work_mode: typeof parsed.work_mode === 'string' ? parsed.work_mode : 'N/A',
      visa_sponsorship: typeof parsed.visa_sponsorship === 'string' ? parsed.visa_sponsorship : 'N/A',
      relocation_support: typeof parsed.relocation_support === 'string' ? parsed.relocation_support : 'N/A',
      job_summary: typeof parsed.job_summary === 'string' ? parsed.job_summary : 'N/A',
    };
  } catch {
    return null;
  }
}

/**
 * Use DigitalOcean AI to read a job posting and extract richer structured fields
 * (skills, technologies, salary, work mode, visa/relocation) than regex alone.
 * Falls back to null on any failure so callers can keep regex-based extraction.
 */
export async function extractJobFieldsFromText(
  text: string,
  onUsage?: (usage: AiTokenUsage) => void,
): Promise<ExtractedJobFields | null> {
  const content = cleanText(text);
  if (!content || content.length < 50) return null;

  try {
    const raw = await queryDigitalOceanAI(buildPrompt(content), 1, true, 1500, onUsage);
    const parsed = parseJson(raw);
    if (parsed) {
      logger.info(`AI extracted job fields (skills=${parsed.skills.length}, tech=${parsed.technologies.length})`);
      return parsed;
    }
    logger.warn('Could not parse AI job extraction response');
    return null;
  } catch (err: any) {
    logger.warn(`AI job extraction failed: ${err.message}`);
    return null;
  }
}
