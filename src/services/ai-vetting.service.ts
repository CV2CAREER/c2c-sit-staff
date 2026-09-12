import { getServiceLogger } from "../utils/createLogger";
import { queryDigitalOceanAI } from "../utils/digital-factory";
import { ManualApplication } from "../models/v1/manual-application.model";
import { Profile } from "../models/v1/profile.model";
import { VCS, VCSPrompt } from "../models/v1/keyword-population.model";
import ErrorHandler from "../utils/errorHandler";

const logger = getServiceLogger("ai-vetting");

export const AI_VETTING_PROMPT_KEY = "ai_vetting_classification_prompt";

export interface AiVettingResult {
  score: "HQA" | "MQA" | "LQA" | null;
  reason: string;
  status: "classified" | "failed";
  promptVersion: string | null;
}

const safeList = (arr: string[] | undefined | null): string =>
  arr && arr.length > 0 ? arr.join(", ") : "Not specified";

const extractHyperlinkTitle = (raw: string | undefined | null): string => {
  if (!raw) return "N/A";
  const match = raw.match(/=HYPERLINK\("[^"]*","([^"]*?)"\)/i);
  return match ? match[1].trim() : raw.trim();
};

const AU_STATE_NAMES: Record<string, string> = {
  "new south wales": "NSW", "queensland": "QLD", "victoria": "VIC",
  "south australia": "SA", "western australia": "WA", "tasmania": "TAS",
  "northern territory": "NT", "australian capital territory": "ACT",
};
const AU_STATE_ABBREVS = new Set(["NSW", "QLD", "VIC", "SA", "WA", "TAS", "NT", "ACT"]);
const REMOTE_KEYWORDS = ["work from home", "remote", "wfh", "hybrid"];

// Strict suburb -> state inference for state-priority (all locations must map to same single state)
const WA_SUBURBS = new Set([
  "perth","perth cbd","west perth","east perth","northbridge","highgate","mount lawley","subiaco","leederville","willetton","leeming","como","south perth","burswood","victoria park","claremont","nedlands","applecross","ascot","baldivis","beckenham","kenwick","ferndale","rockingham","success","parmelia","warnbro","orelia","mandurah","mandagulop","joondalup","balga","cockburn central","atwell","wellard","ellenbrook","forrestfield","kewdale","butler","lakelands","bayswater","osborne park","morley","midland","canning vale","joondanna","innaloo","scarborough",
]);
const CITY_TO_STATE: Record<string, string> = {
  "perth": "WA", "sydney": "NSW", "melbourne": "VIC", "brisbane": "QLD", "adelaide": "SA", "hobart": "TAS", "darwin": "NT", "canberra": "ACT",
};

const getStateForSuburb = (loc: string): string | null => {
  const lower = loc.trim().toLowerCase();
  if (AU_STATE_ABBREVS.has(lower.toUpperCase())) return lower.toUpperCase();
  const full = AU_STATE_NAMES[lower];
  if (full) return full;
  if (WA_SUBURBS.has(lower)) return "WA";
  // city name fallback
  for (const [city, st] of Object.entries(CITY_TO_STATE)) {
    if (lower === city || lower.includes(city)) return st;
  }
  // If location contains state hint like ", WA" already, extract
  const waMatch = lower.match(/\b(wa|nsw|vic|qld|sa|tas|nt|act)\b/);
  if (waMatch) return waMatch[1].toUpperCase();
  return null;
};

const inferStateFromLocations = (locations: string[], cities: string[]): string | null => {
  const all = [...locations, ...cities].filter(v => v && v.trim().length > 0);
  if (all.length === 0) return null;
  const states = all.map(getStateForSuburb);
  // Strict: all must be known and same
  if (states.some(s => s === null)) return null;
  const unique = Array.from(new Set(states));
  return unique.length === 1 ? unique[0] : null;
};

const normalizeLocations = (arr: string[] | undefined | null): string[] => {
  if (!arr || arr.length === 0) return [];
  const cleaned = arr
    .map(v => v.trim())
    .filter(v => v.length > 0 && !REMOTE_KEYWORDS.includes(v.toLowerCase()));
  const unique = Array.from(new Set(cleaned));
  return unique.slice(0, 30);
};

const normalizeStates = (locations: string[] | undefined | null, states: string[] | undefined | null): string[] => {
  const locArr = locations || [];
  const stateArr = (states || []).filter(s => !REMOTE_KEYWORDS.includes(s.toLowerCase()));
  const movedFromLoc: string[] = [];

  for (const loc of locArr) {
    const upper = loc.trim().toUpperCase();
    if (AU_STATE_ABBREVS.has(upper)) {
      movedFromLoc.push(upper);
    } else {
      const full = AU_STATE_NAMES[loc.trim().toLowerCase()];
      if (full) movedFromLoc.push(full);
    }
  }

  const combined = [...stateArr, ...movedFromLoc];
  return Array.from(new Set(combined)).slice(0, 10);
};

interface ClientProfileContext {
  text: string;
  // True when the client accepts anywhere in their target country — either
  // explicit ("All Australia") or by omission (a country was given but no
  // state/city/location narrowed it further). Deciding this in code means
  // the AI is never asked to infer it from a wall of prompt text.
  isCountryWide: boolean;
  // Explicit selected states, or the single state inferred from suburbs
  // (see inferStateFromLocations). Empty when isCountryWide, since every
  // state is already accepted in that case.
  acceptedStates: string[];
}

const buildClientProfile = (profile: Profile): ClientProfileContext => {
    const hasAllLocations =
      (profile.locations || []).some(l => l.trim().toLowerCase().startsWith('all ')) ||
      (profile.state || []).some(s => s.trim().toLowerCase().startsWith('all ')) ||
      (profile.municipals || []).some(m => m.trim().toLowerCase().startsWith('all ')) ||
      (profile.city || []).some(c => c.trim().toLowerCase().startsWith('all '));

    const locations = hasAllLocations ? [] : normalizeLocations(profile.locations);
    const states = hasAllLocations ? [] : normalizeStates(profile.locations, profile.state);
    const cities = hasAllLocations ? [] : normalizeLocations(profile.city);
    const municipals = hasAllLocations ? [] : normalizeLocations(profile.municipals);
    const allLocations = [...locations, ...municipals];

    // State-priority inference: if no explicit state but all suburbs map to one state, infer it
    let inferred: string | null = null;
    let displayStates = states;
    if (!hasAllLocations && states.length === 0) {
      inferred = inferStateFromLocations(locations, cities);
      if (inferred) displayStates = [inferred];
    }
    const statesLine = inferred
      ? `${safeList(displayStates)} (inferred from ${locations.length} locations in ${inferred})`
      : safeList(displayStates);

    // A client who only set a country, with nothing narrower at all, is
    // functionally identical to an explicit "All {country}" pick — they
    // just never had to type it. Treat it the same way rather than leaving
    // the AI to guess whether silence means country-wide or unspecified.
    const noNarrowerGeo = !hasAllLocations && allLocations.length === 0 && cities.length === 0 && displayStates.length === 0;
    const isCountryWide = hasAllLocations || (noNarrowerGeo && !!profile.country?.trim());

    const countryLine = isCountryWide && !hasAllLocations && profile.country
      ? `${profile.country} (no state/city restriction given — accept anywhere in ${profile.country})`
      : (profile.country || "Not specified");

    const text = [
      `- Target Titles: ${safeList(profile.titles)}`,
      `- Excluded Titles: ${safeList(profile.titlesExcluded)}`,
      `- Target Keywords: ${safeList(profile.keywords)}`,
      `- Excluded Keywords: ${safeList(profile.keywordsExcluded)}`,
      `- Target Locations: ${safeList(allLocations)}`,
      `- Target Cities: ${safeList(cities)}`,
      `- Excluded Cities: ${safeList(profile.cityExcluded)}`,
      `- Target States: ${statesLine}`,
      `- Excluded States: ${safeList(profile.stateExcluded)}`,
      `- Target Country: ${countryLine}`,
      `- Salary Range (stored in thousands): ${profile.minSalary ?? "Not specified"} - ${profile.maxSalary ?? "Not specified"}`,
      `- Target Industries: ${safeList(profile.industriesInclude)}`,
      `- Excluded Industries: ${safeList(profile.industriesExclude)}`,
      `- Target Job Types: ${safeList(profile.jobTypes)}`,
      `- Work Rights: ${safeList(profile.workingRight)}`,
    ].join("\n");

    return { text, isCountryWide, acceptedStates: isCountryWide ? [] : displayStates };
  };

const buildJobDetails = (job: ManualApplication, clientContext: ClientProfileContext): string => {
  const lines = [
    `- Title: ${extractHyperlinkTitle(job.Job_Title)}`,
    `- Company: ${job.Advertiser || "N/A"}`,
    `- Location: ${job.Location || "N/A"}`,
    `- Country: ${job.Country || "N/A"}`,
    `- Job Type: ${job.Job_Type || "N/A"}`,
  ];

  // Pre-compute the state match instead of leaving it to the AI to notice
  // that e.g. Tamworth is in NSW when NSW is an accepted state but Tamworth
  // itself isn't in the client's (necessarily incomplete) Preferred Cities
  // list — that's exactly the failure mode this fixes.
  if (!clientContext.isCountryWide && clientContext.acceptedStates.length > 0 && job.Location) {
    const jobState = getStateForSuburb(job.Location);
    if (jobState) {
      const matches = clientContext.acceptedStates.includes(jobState);
      lines.push(
        `- Location Resolves To State: ${jobState} — ${
          matches
            ? "this IS one of the client's accepted states, so location PASSES regardless of whether the exact city appears in Target Cities"
            : "this is NOT one of the client's accepted states"
        }`,
      );
    }
  }

  return lines.join("\n");
};

export const getVcsPrompt = async (): Promise<{ prompt: string; version: string }> => {
  const vcsRow = await VCS.findOne({
    where: { key: AI_VETTING_PROMPT_KEY, active: true },
  });

  if (!vcsRow) {
    throw new ErrorHandler(
      `AI vetting prompt "${AI_VETTING_PROMPT_KEY}" is not configured — run seed-vcs-ai-vetting-prompt.ts`,
      500,
    );
  }

  const promptRow = await VCSPrompt.findByPk(vcsRow.activePromptId);

  if (!promptRow) {
    throw new ErrorHandler(
      `AI vetting prompt "${AI_VETTING_PROMPT_KEY}" has no active version deployed`,
      500,
    );
  }

  return { prompt: promptRow.prompt, version: promptRow.version };
};

const parseClassificationResponse = (raw: string): Omit<AiVettingResult, "promptVersion"> => {
  const trimmed = raw.trim();

  let json: any;
  try {
    json = JSON.parse(trimmed);
  } catch {
    const braceMatch = trimmed.match(/\{[\s\S]*\}/);
    if (!braceMatch) {
      return {
        score: null,
        reason: "Failed to parse AI response: no JSON object found",
        status: "failed",
      };
    }
    try {
      json = JSON.parse(braceMatch[0]);
    } catch {
      return {
        score: null,
        reason: "Failed to parse AI response: invalid JSON",
        status: "failed",
      };
    }
  }

  const score = json?.score?.toUpperCase?.();
  const reason = json?.reason?.trim?.();

  if (!score || !["HQA", "MQA", "LQA"].includes(score)) {
    return {
      score: null,
      reason: `AI returned unrecognised score: "${json?.score ?? "missing"}"`,
      status: "failed",
    };
  }

  if (!reason) {
    return {
      score,
      reason: "No reason provided by AI",
      status: "failed",
    };
  }

  return { score: score as "HQA" | "MQA" | "LQA", reason, status: "classified" };
};

export const classifyJob = async (
  job: ManualApplication,
  profile: Profile,
): Promise<AiVettingResult> => {
  const { prompt: promptTemplate, version } = await getVcsPrompt();

  const clientContext = buildClientProfile(profile);
  const jobDetails = buildJobDetails(job, clientContext);

  const prompt = promptTemplate
    .replace(/\{\{CLIENT_PROFILE\}\}/g, clientContext.text)
    .replace(/\{\{JOB_DETAILS\}\}/g, jobDetails);

  logger.info(
    `Classifying job ${job.id} for client ${job.client_id} (${job.Job_Title})`
  );

  try {
    // jsonMode enforces valid JSON at the API level instead of relying
    // purely on the prompt's own "return ONLY JSON" instruction, with
    // parseClassificationResponse's regex extraction as a second-line
    // fallback for whatever that still doesn't catch.
    const raw = await queryDigitalOceanAI(prompt, 2, true);
    const result = parseClassificationResponse(raw);
    logger.info(
      `Classification result for job ${job.id}: ${result.status === "classified" ? result.score : "FAILED"} (prompt v${version})`
    );
    return { ...result, promptVersion: version };
  } catch (err: any) {
    logger.error(`AI classification failed for job ${job.id}: ${err.message}`);
    return {
      score: null,
      reason: `AI service error: ${err.message}`,
      status: "failed",
      promptVersion: version,
    };
  }
};