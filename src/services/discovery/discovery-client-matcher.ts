import { Credentials } from '../../models/v1/credentials.model';
import { User } from '../../models/v1/user.model';
import { Profile } from '../../models/v1/profile.model';
import { ManualApplication } from '../../models/v1/manual-application.model';
import { DiscoveryMatch } from '../../models/v1/discovery-match.model';
import { DiscoveryJob } from '../../models/v1/discovery-job.model';
import { classifyJob } from '../ai-vetting.service';
import { aiVettingConfigApplicationService } from '../admin/ai-vetting-config.application.service';
import { applyAiVettingResult } from './discovery-ai-vetting.service';
import { getServiceLogger } from '../../utils/createLogger';

const logger = getServiceLogger('discovery-client-matcher');

// ─── AI Vetting Concurrency Limiter ───────────────────────────────────────────
// The AI classifier (classifyJob) makes an OpenAI/DO call per application. A large
// discovery run can create hundreds of ManualApplications, so we cap concurrency
// to avoid rate limits and resource exhaustion.
const AI_VETTING_MAX_CONCURRENCY = 5;
let aiVettingInFlight = 0;
const aiVettingQueue: Array<() => Promise<void>> = [];

function enqueueAiVetting(task: () => Promise<void>): void {
  aiVettingQueue.push(task);
  drainAiVettingQueue();
}

async function drainAiVettingQueue(): Promise<void> {
  while (aiVettingQueue.length > 0 && aiVettingInFlight < AI_VETTING_MAX_CONCURRENCY) {
    const task = aiVettingQueue.shift()!;
    aiVettingInFlight++;
    task()
      .catch((err) => logger.error(`AI vetting task failed: ${err.message}`))
      .finally(() => {
        aiVettingInFlight--;
        drainAiVettingQueue();
      });
  }
}

// ─── Location Normalization (adapted from ai-vetting.service.ts) ──────────────

const AU_STATE_NAMES: Record<string, string> = {
  'new south wales': 'NSW', 'queensland': 'QLD', 'victoria': 'VIC',
  'south australia': 'SA', 'western australia': 'WA', 'tasmania': 'TAS',
  'northern territory': 'NT', 'australian capital territory': 'ACT',
};
const AU_STATE_ABBREVS = new Set(['NSW', 'QLD', 'VIC', 'SA', 'WA', 'TAS', 'NT', 'ACT']);
const REMOTE_KEYWORDS = ['work from home', 'remote', 'wfh', 'hybrid'];

const CITY_TO_STATE: Record<string, string> = {
  'perth': 'WA', 'sydney': 'NSW', 'melbourne': 'VIC', 'brisbane': 'QLD',
  'adelaide': 'SA', 'hobart': 'TAS', 'darwin': 'NT', 'canberra': 'ACT',
};

const getStateForSuburb = (loc: string): string | null => {
  const lower = loc.trim().toLowerCase();
  if (AU_STATE_ABBREVS.has(lower.toUpperCase())) return lower.toUpperCase();
  const full = AU_STATE_NAMES[lower];
  if (full) return full;
  for (const [city, st] of Object.entries(CITY_TO_STATE)) {
    if (lower === city || lower.includes(city)) return st;
  }
  const match = lower.match(/\b(wa|nsw|vic|qld|sa|tas|nt|act)\b/);
  if (match) return match[1].toUpperCase();
  return null;
};

// Normalize a single raw location string, rejecting junk values.
const cleanLocation = (raw: string): string | null => {
  if (typeof raw !== 'string') return null;
  const v = raw.replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
  if (v.length === 0 || v.length > 50) return null;
  const lower = v.toLowerCase();
  // Remote / WFH tokens ("WORK_FROM_HOME", "remote", "wfh", "hybrid").
  if (REMOTE_KEYWORDS.includes(lower)) return null;
  // Country-wide placeholder tokens ("All Australia", "All Nigeria", "ALL_US",
  // "All American Samoa", "All Afghanistan") — not searchable locations.
  if (/^all[\s-]/i.test(v)) return null;
  return v;
};

// A raw "All Australia" / "All Nigeria" location entry means "anywhere in
// this country", not junk to discard — cleanLocation() drops it as a
// placeholder, so callers must check for it first and capture the intended
// country before normalizing the rest of the list.
const extractAnyLocationCountry = (arr: string[] | undefined | null): string | undefined => {
  for (const raw of arr || []) {
    if (typeof raw !== 'string') continue;
    const match = raw.trim().match(/^all[\s-]+(.+)$/i);
    if (match) {
      const code = normalizeCountryCode(match[1]);
      if (code) return code;
    }
  }
  return undefined;
};

const normalizeLocations = (arr: string[] | undefined | null): string[] => {
  if (!arr || arr.length === 0) return [];
  const cleaned = arr
    .map(cleanLocation)
    .filter((v): v is string => v !== null);
  return Array.from(new Set(cleaned)).slice(0, 30);
};

const normalizeStates = (locations: string[] | undefined | null, states: string[] | undefined | null): string[] => {
  const locArr = locations || [];
  // Pass explicit states through the same junk filter as locations.
  const stateArr = (states || [])
    .map(cleanLocation)
    .filter((s): s is string => s !== null);
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

  return Array.from(new Set([...stateArr, ...movedFromLoc])).slice(0, 10);
};

// ─── Country Normalization ────────────────────────────────────────────────────

const COUNTRY_TO_CODE: Record<string, string> = {
  australia: 'au', au: 'au', australian: 'au',
  'new zealand': 'nz', nz: 'nz',
  'united kingdom': 'gb', uk: 'gb', 'great britain': 'gb', england: 'gb', britain: 'gb',
  'united states': 'us', usa: 'us', 'united states of america': 'us', america: 'us',
  canada: 'ca',
  ireland: 'ie',
  nigeria: 'ng', ghana: 'gh', kenya: 'ke', 'south africa': 'za',
  india: 'in', philippines: 'ph', singapore: 'sg', malaysia: 'my',
  germany: 'de', france: 'fr', netherlands: 'nl',
};

const COUNTRY_HINTS: Record<string, string[]> = {
  au: ['australia', 'nsw', 'qld', 'vic', 'sa', 'wa', 'tas', 'nt', 'act', 'perth', 'sydney', 'melbourne', 'brisbane', 'adelaide', 'hobart', 'darwin', 'canberra'],
  ng: ['nigeria', 'lagos', 'abuja', 'ibadan', 'port harcourt', 'kano'],
  gb: ['united kingdom', 'uk', 'london', 'manchester', 'birmingham', 'leeds', 'scotland', 'england'],
  us: ['united states', 'usa', 'new york', 'california', 'texas', 'florida'],
  ca: ['canada', 'toronto', 'vancouver', 'montreal', 'ottawa', 'calgary'],
  nz: ['new zealand', 'auckland', 'wellington', 'christchurch'],
  za: ['south africa', 'johannesburg', 'cape town', 'durban'],
  ie: ['ireland', 'dublin', 'cork', 'galway'],
  sg: ['singapore'],
  ph: ['philippines', 'manila', 'cebu'],
  in: ['india', 'mumbai', 'bangalore', 'delhi', 'hyderabad'],
};

const normalizeCountryCode = (country: string | undefined | null): string | undefined => {
  if (!country) return undefined;
  const key = country.trim().toLowerCase();
  return COUNTRY_TO_CODE[key];
};

const escapeRegex = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Word-boundary-safe "does haystack contain this term". Plain .includes()
// lets short terms (state abbreviations like "WA", "SA", country hints like
// "uk"/"usa") match as substrings of unrelated words — "WA" inside
// "Washington", "SA" inside "Mesa", "UK"/"usa" mid-word — producing false
// location/country matches. \b boundaries eliminate that without losing
// genuine matches ("Sydney" in "Sydney, NSW" still matches on either side).
const containsTerm = (haystack: string, term: string): boolean => {
  if (!term) return false;
  try {
    return new RegExp(`\\b${escapeRegex(term)}\\b`, 'i').test(haystack);
  } catch {
    return haystack.toLowerCase().includes(term.toLowerCase());
  }
};

// Fallback: infer country from location strings when the profile has no country.
const inferCountryFromLocations = (locations: string[]): string | undefined => {
  const joined = locations.join(' ');
  for (const [code, hints] of Object.entries(COUNTRY_HINTS)) {
    for (const hint of hints) {
      if (containsTerm(joined, hint)) return code;
    }
  }
  return undefined;
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface MatchResult {
  credentialsId: string;
  userId: string;
  score: number;
  rationale: string;
}

export interface ClientProfile {
  credentialsId: string;
  userId: string;
  keywords: string[];
  titles: string[];
  jobTypes: string[];
  locations: string[];
  /** Set when the client's raw locations included "All <Country>" — means
   *  any location within this country satisfies the location signal. */
  anyLocationCountry?: string;
  industries: string[];
  minSalary?: number;
  maxSalary?: number;
  country?: string;
  keywordsExcluded: string[];
  titlesExcluded: string[];
  jobTypesExcluded: string[];
  industriesExcluded: string[];
  advertisersExcluded: string[];
}

export interface CountrySearchGroup {
  country: string;
  keywords: string[];
  locations: string[];
}

export interface CombinedSearchParams {
  keywords: string[];
  locations: string[];
  country: string;
  searchGroups: CountrySearchGroup[];
}

// ─── Load Profiles ────────────────────────────────────────────────────────────

/**
 * Load all active client profiles for discovery matching.
 * Returns a map of clientId → profile criteria with full location data.
 */
export async function loadActiveClientProfiles(): Promise<Map<string, ClientProfile>> {
  const profiles = new Map<string, ClientProfile>();

  const credentials = await Credentials.findAll({
    where: { isDeleted: false },
    include: [
      {
        model: User,
        as: 'client',
        attributes: ['id', 'firstName', 'lastName', 'profileId'],
        include: [
          {
            model: Profile,
            as: 'profile',
            attributes: [
              'id', 'keywords', 'keywordsExcluded', 'locations', 'industriesInclude', 'industriesExclude',
              'minSalary', 'maxSalary', 'titles', 'titlesExcluded', 'includedJobTitles',
              'jobTypes', 'jobTypesExcluded', 'advertisers', 'advertisersExcluded', 'advertisersExclude',
              'city', 'state', 'municipals', 'country',
            ],
          },
        ],
      },
    ],
  });

  for (const cred of credentials) {
    const client = (cred as any).client;
    if (!client?.profile) continue;

    const profile = client.profile;

    // "All Australia" etc. means "anywhere in this country" — capture that
    // intent before normalizeLocations() discards it as a junk placeholder.
    const anyLocationCountry = extractAnyLocationCountry(profile.locations);

    // Normalize all location fields
    const locations = normalizeLocations(profile.locations);
    const cities = normalizeLocations(profile.city);
    const municipals = normalizeLocations(profile.municipals);
    const states = normalizeStates(profile.locations, profile.state);

    // Build combined location list for this client
    const allLocations = [...locations, ...cities, ...municipals, ...states];

    // Country: explicit profile.country first, then infer from locations, default AU
    const country = normalizeCountryCode(profile.country)
      || anyLocationCountry
      || inferCountryFromLocations(allLocations)
      || 'au';

    // Merge all role/title signals (titles + includedJobTitles), de-duped.
    const titles = Array.from(new Set([
      ...(profile.titles || []),
      ...(profile.includedJobTitles || []),
    ].map((t: string) => t.trim()).filter((t: string) => t.length > 0)));

    const toList = (v: unknown): string[] =>
      Array.isArray(v) ? (v as string[]).map((x) => (x || '').trim()).filter((x) => x.length > 0) : [];

    profiles.set(cred.id, {
      credentialsId: cred.id,
      userId: client.id,
      keywords: toList(profile.keywords),
      titles,
      jobTypes: toList(profile.jobTypes),
      locations: allLocations,
      anyLocationCountry,
      industries: toList(profile.industriesInclude),
      minSalary: profile.minSalary || undefined,
      maxSalary: profile.maxSalary || undefined,
      country,
      keywordsExcluded: toList(profile.keywordsExcluded),
      titlesExcluded: toList(profile.titlesExcluded),
      jobTypesExcluded: toList(profile.jobTypesExcluded),
      industriesExcluded: toList(profile.industriesExclude),
      advertisersExcluded: Array.from(new Set([
        ...toList(profile.advertisersExcluded),
        ...toList(profile.advertisersExclude),
      ])),
    });
  }

  logger.info(`Loaded ${profiles.size} active client profiles for discovery matching`);
  return profiles;
}

/**
 * Extract combined search parameters from all active client profiles.
 * Keywords are a shared union (occupation terms are largely country-agnostic),
 * while locations are grouped by their client's country so each market is
 * searched against the correct region (Adzuna region, LinkedIn global search).
 */
export function getCombinedSearchParams(clientProfiles: Map<string, ClientProfile>): CombinedSearchParams {
  const keywordCounts = new Map<string, number>();
  const locationsByCountry = new Map<string, Set<string>>();

  const bump = (term: string): void => {
    keywordCounts.set(term, (keywordCounts.get(term) || 0) + 1);
  };

  for (const [, profile] of clientProfiles) {
    for (const kw of profile.keywords) {
      bump(kw);
    }
    for (const title of profile.titles) {
      bump(title);
    }

    const country = profile.country || 'au';
    if (!locationsByCountry.has(country)) {
      locationsByCountry.set(country, new Set<string>());
    }
    for (const loc of profile.locations) {
      locationsByCountry.get(country)!.add(loc);
    }
  }

  // Order keywords by how many clients want them (desc), then alphabetically, so
  // the bounded per-source keyword search covers the most-represented roles first.
  const keywords = Array.from(keywordCounts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([term]) => term)
    .slice(0, 20);

  const searchGroups: CountrySearchGroup[] = Array.from(locationsByCountry.entries())
    .map(([country, locs]) => ({
      country,
      keywords,
      locations: Array.from(locs).filter((l) => l && l.trim().length > 0).slice(0, 40),
    }))
    .filter((g) => g.locations.length > 0);

  // Flat fields kept for backwards-compat / overrides.
  const locations = Array.from(new Set(searchGroups.flatMap((g) => g.locations))).slice(0, 40);
  const country = searchGroups[0]?.country || 'au';

  logger.info(
    `Combined search params: ${keywords.length} keywords across ${searchGroups.length} market(s) [${searchGroups.map((g) => `${g.country}:${g.locations.length}`).join(', ')}]`
  );
  return { keywords, locations, country, searchGroups };
}

/**
 * Match a discovered job against all active client profiles.
 * Returns matches that score above threshold.
 */
export function matchJobToClients(
  job: DiscoveryJob,
  clientProfiles: Map<string, any>,
): MatchResult[] {
  const matches: MatchResult[] = [];
  const titleLower = (job.title || '').toLowerCase();
  const companyLower = (job.company || '').toLowerCase();
  const descLower = (job.description || '').toLowerCase();
  const fullText = `${titleLower} ${companyLower} ${descLower}`;
  const employmentTypeLower = ((job as any).employment_type || '').toString().toLowerCase();
  const salaryMin = (job as any).salary_min;

  for (const [clientId, profile] of clientProfiles) {
    let score = 0;
    const reasons: string[] = [];

    // Role match — keywords AND titles (job titles + keywords are both
    // "what role does this client want" signals).
    const roleTerms: string[] = [
      ...(profile.keywords || []),
      ...(profile.titles || []),
    ];
    if (roleTerms.length > 0) {
      const matched = roleTerms.some((term: string) => {
        const t = term.toLowerCase();
        return titleLower.includes(t) || descLower.includes(t);
      });
      if (matched) {
        score += 40;
        reasons.push('role match');
      }
    }

    // Location match. "All Australia"-style profiles match any job in that
    // country outright — checked first since normalizeLocations() strips
    // that signal from profile.locations entirely (see anyLocationCountry).
    // Otherwise compare with word-boundary matching, not raw .includes():
    // plain substring checks let short state codes ("WA", "SA") false-match
    // inside unrelated words ("Washington", "Mesa") — see discovery-client-
    // matcher analysis 2026-09-08 for real examples this caused.
    let locationMatched = false;
    if (profile.anyLocationCountry) {
      const jobCountry = inferCountryFromLocations([job.location || '']);
      if (jobCountry === profile.anyLocationCountry) locationMatched = true;
    }
    if (!locationMatched && (profile.locations || []).length > 0) {
      locationMatched = profile.locations.some((loc: string) =>
        containsTerm(job.location || '', loc) || containsTerm(loc, job.location || ''),
      );
    }
    if (locationMatched) {
      score += 30;
      reasons.push('location match');
    }

    // Industry match
    if ((profile.industries || []).length > 0) {
      const matched = profile.industries.some((ind: string) => {
        return fullText.includes(ind.toLowerCase());
      });
      if (matched) {
        score += 20;
        reasons.push('industry match');
      }
    }

    // Job type match (full-time / part-time / contract / casual …)
    if ((profile.jobTypes || []).length > 0 && employmentTypeLower && employmentTypeLower !== 'n/a') {
      const matched = profile.jobTypes.some((jt: string) => {
        const jtLower = jt.toLowerCase();
        return employmentTypeLower.includes(jtLower) || jtLower.includes(employmentTypeLower);
      });
      if (matched) {
        score += 15;
        reasons.push('job type match');
      }
    }

    // Salary match — job offers within/above the client's minimum.
    if (profile.minSalary && salaryMin && salaryMin >= profile.minSalary) {
      score += 15;
      reasons.push('salary match');
    }

    // Base score for having any criteria match
    if (reasons.length > 0) {
      score += 10;
    }

    // Exclusion checks — explicit client "not this" preferences drop the match.
    const excluded = isJobExcluded(profile, titleLower, descLower, companyLower, employmentTypeLower);
    if (excluded) {
      continue;
    }

    // Include if there's a meaningful role/location signal.
    if (score >= 40) {
      matches.push({
        credentialsId: profile.credentialsId,
        userId: profile.userId,
        score: Math.min(score, 100),
        rationale: reasons.join('; ') || 'partial match',
      });
    }
  }

  return matches;
}

/**
 * Return true if a job hits any of the client's explicit exclusion rules.
 */
function isJobExcluded(
  profile: any,
  titleLower: string,
  descLower: string,
  companyLower: string,
  employmentTypeLower: string,
): boolean {
  const hit = (list: string[], text: string): boolean =>
    (list || []).some((term: string) => {
      const t = term.toLowerCase();
      return t.length > 0 && text.includes(t);
    });

  if (hit(profile.keywordsExcluded, titleLower) || hit(profile.keywordsExcluded, descLower)) return true;
  if (hit(profile.titlesExcluded, titleLower)) return true;
  if (hit(profile.industriesExcluded, descLower)) return true;

  if ((profile.jobTypesExcluded || []).length > 0 && employmentTypeLower && employmentTypeLower !== 'n/a') {
    for (const jt of profile.jobTypesExcluded) {
      const jtLower = jt.toLowerCase();
      if (employmentTypeLower.includes(jtLower) || jtLower.includes(employmentTypeLower)) return true;
    }
  }

  if ((profile.advertisersExcluded || []).length > 0 && companyLower && companyLower !== 'unknown') {
    if (hit(profile.advertisersExcluded, companyLower)) return true;
  }

  return false;
}

/**
 * Create ManualApplication + DiscoveryMatch for each client match.
 * This is what makes jobs appear on the client's MDT page.
 */
export async function createClientApplications(
  job: DiscoveryJob,
  matches: MatchResult[],
  sourceSlug: string,
): Promise<number> {
  let created = 0;

  for (const match of matches) {
    try {
      // Check if already exists (dedup by job+client)
      const existing = await DiscoveryMatch.findOne({
        where: { job_id: job.id, client_id: match.credentialsId },
      });

      if (existing) {
        logger.info(`  Match already exists for client ${match.credentialsId} on job ${job.id}`);
        continue;
      }

      // Create DiscoveryMatch record (audit trail)
      await DiscoveryMatch.create({
        job_id: job.id,
        client_id: match.credentialsId,
        match_score: match.score,
        match_rationale: match.rationale,
        discovery_method: 'machine',
        status: 'UNATTENDED',
      } as any);

      // Create ManualApplication record (appears on client's MDT page)
      const joblink = job.apply_url || job.source_url || '';
      const jobTitle = job.title || 'N/A';

      const manualApp = await ManualApplication.create({
        client_id: match.userId,
        Client: match.credentialsId,
        credentialsTourId: null,
        Job_Title: joblink
          ? `=HYPERLINK("${joblink}","${jobTitle}")`
          : jobTitle,
        JobId: job.source_job_id || 'N/A',
        Internal_Jobsite: sourceSlug || 'N/A',
        External_Jobsite: sourceSlug || 'N/A',
        Job_Type: job.employment_type || 'N/A',
        Advertiser: job.company || 'N/A',
        Location: job.location || 'N/A',
        Country: 'N/A',
        Salary: job.salary_min ? `$${job.salary_min}` : 'N/A',
        Skills: 'N/A',
        Status: 'UNATTENDED',
        DiscoveredBy: 'AI Discovery Agent',
        DiscoveryDate: new Date(),
        discovery_method: 'machine',
        ApplicationSubmittedBy: null,
        ApplicationSubmissionDate: null,
        VettedBy: null,
        VettedDate: null,
        QualityScore: null,
        CoverLetterRequired: null,
        isDeleted: false,
      } as any);
      // Fire-and-forget AI classification, concurrency-limited (same classifier
      // as campaign.service.ts). Persist is retried on transient DB errors.
      enqueueAiVetting(async () => {
        try {
          const config = await aiVettingConfigApplicationService.getConfig();
          if (!config.enabled) return;
          const profile = await Profile.findOne({
            where: { userId: manualApp.client_id, name: 'primary' },
          });
          if (!profile) {
            logger.warn(`No primary profile for client ${manualApp.client_id} — skipping AI vetting`);
            return;
          }

          const result = await classifyJob(manualApp, profile);
          await applyAiVettingResult(manualApp, result);
          logger.info(`AI vetting done for discovery job ${manualApp.id}: ${result.status === 'classified' ? result.score : 'FAILED'}`);
        } catch (err: any) {
          logger.error(`AI vetting failed for discovery job ${manualApp.id}: ${err.message}`);
        }
      });

      created++;
      logger.info(`  Created ManualApplication for client ${match.credentialsId}: ${jobTitle} (score: ${match.score})`);
    } catch (err: any) {
      logger.error(`  Failed to create ManualApplication for client ${match.credentialsId}: ${err.message}`);
    }
  }

  return created;
}
