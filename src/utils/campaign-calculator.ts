/* GENERATED FILE - DO NOT EDIT BY HAND.
 * Mirror of backend/src/utils/campaign-calculator.ts, produced by
 * scripts/sync-campaign-calculator.mjs. Run `npm run sync:campaign-calculator`
 * after changing the backend source. `npm run check:campaign-calculator`
 * fails the build if this file drifts from it.
 */
export interface CampaignData {
  SeekSubStartDate?: string;
  createdAt?: string | Date;
  SeekSubDurDays?: string | number;
  SeekSubDurDaysFromPlan?: boolean;
  SeekSubEndDate?: string;
  GraceDuration?: string | number | null;
  ValidityPeriod?: string | null;
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

// Diff in days UTC
function diffDays(a: Date, b: Date): number {
  const ms = a.getTime() - b.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

/**
 * Convert a plan validityPeriod into a duration in days, measured from the
 * resolved start date. validityPeriod examples: "30 days", "6 months", "1 year".
 *
 * Month and year arithmetic has to be applied against a concrete date, so this
 * takes the start date rather than returning a fixed day count.
 *
 * The arithmetic is UTC, matching addDays() and diffDays() above. The previous
 * implementation used local-time setMonth()/setFullYear(), which shifted the
 * result by a day whenever a DST boundary fell inside the period.
 *
 * Returns null for an unparseable or unrecognised period rather than guessing.
 */
export function validityPeriodToDurationDays(
  startDate: Date,
  period?: string | null
): number | null {
  if (!period) return null;
  const [rawAmount, rawUnit = ""] = period.trim().split(/\s+/);
  const amount = parseInt(rawAmount, 10);
  if (!amount || isNaN(amount)) return null;

  const unit = rawUnit.toLowerCase();
  const end = new Date(startDate);
  if (unit.startsWith("day")) {
    end.setUTCDate(end.getUTCDate() + amount);
  } else if (unit.startsWith("month")) {
    end.setUTCMonth(end.getUTCMonth() + amount);
  } else if (unit.startsWith("year")) {
    end.setUTCFullYear(end.getUTCFullYear() + amount);
  } else {
    return null;
  }

  return Math.round((end.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Fast, production-ready campaign calculator
 */
export function calculateCampaignFields(data: CampaignData): CampaignData {
  const result = { ...data };

  // Fall back to createdAt when SeekSubStartDate wasn't set (legacy rows)
  const startDate = parseDate(result.SeekSubStartDate) ?? parseISODate(result.createdAt);

  if (!startDate) {
    result.SeekSubRemainingDays = 0;
    result.SeekSubToExpireDays = 0;
    return result;
  }

  // Duration resolution: the plan is the authority.
  //
  // When the governing plan has a usable validityPeriod, its duration wins over
  // any stored value, so a client who upgrades is measured against their new plan
  // rather than staying pinned to whatever was saved last time. A stored duration
  // is only used when there is no plan period to derive from - that keeps clients
  // with no plan, or a plan with an unrecognised unit, still carrying the number
  // somebody entered for them instead of silently dropping to 0.
  //
  // SeekSubDurDaysFromPlan tells callers which of the two happened, so the edit
  // modal can render the field read-only when the plan is driving it and leave it
  // editable when a human is the only possible source. It is never persisted.
  const fromPlan = validityPeriodToDurationDays(
    startDate,
    result.ValidityPeriod
  );
  let durDays: number;
  if (fromPlan !== null) {
    durDays = fromPlan;
    result.SeekSubDurDays = fromPlan;
    result.SeekSubDurDaysFromPlan = true;
  } else {
    const explicitDurDays = result.SeekSubDurDays;
    const hasExplicitDuration =
      explicitDurDays !== undefined &&
      explicitDurDays !== null &&
      String(explicitDurDays).trim() !== "";
    durDays = hasExplicitDuration ? Number(explicitDurDays) : 0;
    result.SeekSubDurDaysFromPlan = false;
  }

  const graceDays = Number(result.GraceDuration || 0);

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
