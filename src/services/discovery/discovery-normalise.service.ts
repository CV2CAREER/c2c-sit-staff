import { createHash } from 'crypto';
import { DiscoveryJobDraft } from './adapters/discovery-adapter.interface';

export interface NormalisedJob {
  titleNormalised: string;
  companyNormalised: string;
  locationNormalised: string;
  fingerprint: string;
}

const STRIP_SUFFIXES = [
  ' Pty Ltd', ' Pty. Ltd.', ' Limited', ' Ltd.', ' Ltd',
  ' Inc.', ' Inc', ' LLC', ' Corp.', ' Corp', ' Company',
  ' Co.', ' Co', ' S.A.', ' AG', ' GmbH', ' B.V.', ' N.V.',
  ' Plc', ' PLC', ' Group', ' Holdings', ' International',
];

const REMOTE_KEYWORDS = ['remote', 'work from home', 'wfh', 'telecommute', 'virtual', 'anywhere'];

const normalizeWhitespace = (s: string): string => s.replace(/\s+/g, ' ').trim();

export const normaliseTitle = (title: string): string => {
  let t = normalizeWhitespace(title);
  t = t.replace(/\s*[-–—]\s*(Full.?Time|Part.?Time|Contract|Permanent|Casual|Temporary|FIFO|DIDO)\b/gi, '');
  t = t.replace(/\s*[\(\[].*?[\)\]]/g, '');
  t = t.replace(/\b(Senior|Sr|Junior|Jr|Lead|Principal|Staff|Chief|Head)\b/gi, '');
  t = t.replace(/\b(Engineer|Developer|Analyst|Manager|Designer|Architect|Consultant|Specialist|Coordinator|Officer|Technician|Operator|Director|Supervisor|Lead)\b/gi, (match) => match.toLowerCase());
  return t.trim().toLowerCase();
};

export const normaliseCompany = (company: string): string => {
  let c = normalizeWhitespace(company);
  for (const suffix of STRIP_SUFFIXES) {
    c = c.replace(new RegExp(`${suffix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'), '');
  }
  return c.trim().toLowerCase();
};

export const normaliseLocation = (location: string): string => {
  let l = normalizeWhitespace(location);
  l = l.replace(/\s*,?\s*(AU|Australia|NSW|VIC|QLD|SA|WA|TAS|NT|ACT)\b/gi, '');
  l = l.replace(/\s+\d{4}\b/, '');
  return l.trim().toLowerCase();
};

export const computeFingerprint = (company: string, title: string, location: string): string => {
  const input = `${normaliseCompany(company)}|${normaliseTitle(title)}|${normaliseLocation(location)}`;
  return createHash('sha256').update(input).digest('hex');
};

export const normaliseJob = (draft: DiscoveryJobDraft): NormalisedJob => {
  const titleNormalised = normaliseTitle(draft.title);
  const companyNormalised = normaliseCompany(draft.company);
  const locationNormalised = normaliseLocation(draft.location);
  const fingerprint = computeFingerprint(draft.company, draft.title, draft.location);

  return {
    titleNormalised,
    companyNormalised,
    locationNormalised,
    fingerprint,
  };
};

export const hasRemoteFlag = (text: string): boolean => {
  const lower = text.toLowerCase();
  return REMOTE_KEYWORDS.some((kw) => lower.includes(kw));
};

export const validateDraft = (draft: DiscoveryJobDraft): { valid: boolean; reason?: string } => {
  if (!draft.title || draft.title.trim().length === 0) {
    return { valid: false, reason: 'Missing title' };
  }
  if (!draft.applyUrl || draft.applyUrl.trim().length === 0) {
    return { valid: false, reason: 'Missing apply URL' };
  }
  if (!draft.description || draft.description.trim().length < 10) {
    return { valid: false, reason: 'Description too short or missing' };
  }
  return { valid: true };
};
