
export interface CampaignData {
  SeekSubStartDate?: string;
  createdAt?: string | Date;
  SeekSubDurDays?: string | number;
  SeekSubEndDate?: string;
  GraceDuration?: string | number | null;
  CampaignEnd?: string;
  SeekSubRemainingDays?: number;
  SeekSubToExpireDays?: number;
  SeekSubExpired?: string;
  [key: string]: any;
}

const DATE_FORMAT = "DD-MM-YYYY";

// Parse DD-MM-YYYY → UTC Date
export function parseDate(date?: string): Date | null {
  if (!date) return null;
  const [day, month, year] = date.split("-").map(Number);
  if (!day || !month || !year) return null;
  return new Date(Date.UTC(year, month - 1, day));
}

// Parse an ISO datetime (e.g. createdAt: "2026-07-28T10:02:46.827Z") → UTC date-only
function parseISODate(value?: string | Date | null): Date | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return null;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

// Format UTC Date → DD-MM-YYYY
export function formatDate(date: Date): string {
  const d = String(date.getUTCDate()).padStart(2, "0");
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const y = date.getUTCFullYear();
  return `${d}-${m}-${y}`;
}

// Add days UTC
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

// Whole days from today (UTC date-only) until the given date.
// 0 = the date is today, negative = already past.
export function daysUntil(date: Date): number {
  const now = new Date();
  const today = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
  const target = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

// Diff in days UTC
function diffDays(a: Date, b: Date): number {
  const ms = a.getTime() - b.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

/**
 * Fast, production-ready campaign calculator
 */
export function calculateCampaignFields(data: CampaignData): CampaignData {
  const result = { ...data };

  // Fall back to createdAt when SeekSubStartDate wasn't set (legacy rows)
  const startDate = parseDate(result.SeekSubStartDate) ?? parseISODate(result.createdAt);
  const durDays = Number(result.SeekSubDurDays || 0);
  const graceDays = Number(result.GraceDuration || 0);

  if (!startDate) {
    result.SeekSubRemainingDays = 0;
    result.SeekSubToExpireDays = 0;
    return result;
  }

  // Reflect the resolved start date back so callers/UI see what was actually used
  result.SeekSubStartDate = formatDate(startDate);

  // Sub End
  const subEnd = addDays(startDate, durDays);
  result.SeekSubEndDate = formatDate(subEnd);

  // Campaign End (subscription + grace period)
  const campaignEnd = addDays(subEnd, graceDays);
  result.CampaignEnd = formatDate(campaignEnd);

  // Today UTC
  const today = new Date();
  const todayUTC = new Date(Date.UTC(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate()
  ));

  // Days left in the paid subscription itself (excludes grace period).
  // This is a countdown derived from the fixed SeekSubDurDays total — it
  // never mutates that stored value, it just reflects how much of it is left.
  const remainingDays = diffDays(subEnd, todayUTC);
  result.SeekSubRemainingDays = remainingDays > 0 ? remainingDays : 0;

  // Days left until the full campaign (subscription + grace) ends
  const expireDays = diffDays(campaignEnd, todayUTC);
  result.SeekSubToExpireDays = expireDays > 0 ? expireDays : 0;

  // Expired Flag — true once the full campaign (incl. grace) has ended
  result.SeekSubExpired = expireDays <= 0 ? "YES" : "NO";

  return result;
  }
