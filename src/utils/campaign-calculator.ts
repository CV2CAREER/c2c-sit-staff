
export interface CampaignData {
  SeekSubStartDate?: string;
  SeekSubDurDays?: string | number;
  SeekSubEndDate?: string;
  GraceDuration?: string | number | null;
  CampaignEnd?: string;
  SeekSubToExpireDays?: number;
  SeekSubExpired?: string;
  [key: string]: any;
}

const DATE_FORMAT = "DD-MM-YYYY";

// Parse DD-MM-YYYY → UTC Date
function parseDate(date?: string): Date | null {
  if (!date) return null;
  const [day, month, year] = date.split("-").map(Number);
  if (!day || !month || !year) return null;
  return new Date(Date.UTC(year, month - 1, day));
}

// Format UTC Date → DD-MM-YYYY
function formatDate(date: Date): string {
  const d = String(date.getUTCDate()).padStart(2, "0");
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const y = date.getUTCFullYear();
  return `${d}-${m}-${y}`;
}

// Add days UTC
function addDays(date: Date, days: number): Date {
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
 * Fast, production-ready campaign calculator
 */
export function calculateCampaignFields(data: CampaignData): CampaignData {
  const result = { ...data };

  const startDate = parseDate(result.SeekSubStartDate);
  const durDays = Number(result.SeekSubDurDays || 0);
  const graceDays = Number(result.GraceDuration || 0);

  if (!startDate) {
    result.SeekSubToExpireDays = 0;
    return result;
  }

  // Sub End
  const subEnd = addDays(startDate, durDays);
  result.SeekSubEndDate = formatDate(subEnd);

  // Campaign End
  const campaignEnd = addDays(subEnd, graceDays);
  result.CampaignEnd = formatDate(campaignEnd);

  // Today UTC
  const today = new Date();
  const todayUTC = new Date(Date.UTC(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate()
  ));

  // Expire Days
  const expireDays = diffDays(campaignEnd, todayUTC);
  result.SeekSubToExpireDays = expireDays > 0 ? expireDays : 0;

  // Expired Flag
  result.SeekSubExpired = expireDays <= 0 ? "YES" : "NO";

  return result;
  }
