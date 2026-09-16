import { Op } from "sequelize";
import { Credentials } from "../../models/v1/credentials.model";
import { User } from "../../models/v1/user.model";
import { CECDailyLog } from "../../models/v1/cec-daily-log.model";
import { CECIssueBurndown } from "../../models/v1/cec-issue-burndown.model";
import { CECComplaint } from "../../models/v1/cec-complaint.model";
import { CECReferralPayout } from "../../models/v1/cec-referral-payout.model";
import { CECSalesOutreach } from "../../models/v1/cec-sales-outreach.model";
import { CECAmbassadorScout } from "../../models/v1/cec-ambassador-scout.model";
import { TourCount } from "../../models/v1/tour-count.model";
import { getServiceLogger } from "../../utils/createLogger";
import { calculateCampaignFields } from "../../utils/campaign-calculator";

const logger = getServiceLogger("cec-shared");

const TrackerModels: Record<string, any> = {
  "daily-log": CECDailyLog,
  "issue-burndown": CECIssueBurndown,
  "complaints": CECComplaint,
  "referral-payouts": CECReferralPayout,
  "sales-outreach": CECSalesOutreach,
  "ambassador-scouting": CECAmbassadorScout,
};

// Client-anchored trackers render one merged row per client credential, with an
// optional CEC log attached. Everything else is a record list — each saved row
// is its own row (complaints, referral payouts, sales outreach, ambassador).
const CLIENT_ANCHORED = new Set(["daily-log", "issue-burndown"]);

// Single source of truth for the key used to link a CEC log back to a client
// credential. Previously the merge used `sec.CustomerId` only while the row
// builder fell back to `cred.clientId`, so logs saved for clients with no
// CustomerId were orphaned and appeared to vanish on refresh.
function resolveCustomerId(cred: any): string {
  const sec = cred?.seekExternalCredentials || {};
  return sec.CustomerId || cred?.clientId || "";
}

// Subscription status is derived from the existing campaign flight state
// (`capitalized`) plus the computed campaign end — not a separate CEC concept.
function deriveSubscriptionStatus(cred: any, computed: { CampaignEnd?: string }): string {
  const capitalized = String(cred?.capitalized || "").toUpperCase();
  const expiredFlag = cred?.SeekSubExpired === true || cred?.SeekSubExpired === "true";
  const end = computed?.CampaignEnd ? new Date(computed.CampaignEnd) : null;
  const past = !!end && !isNaN(end.getTime()) && end.getTime() < Date.now();

  if (expiredFlag || past) return "Expired";
  if (capitalized === "HOLD") return "Active-Paused";
  if (capitalized === "INFLIGHT" || capitalized === "FLIGHT") return "Active-Inflight";
  return "";
}

// Loyalty: 0–1 tours = still on the first tour (Newcomer); 2+ = renewed
// (Returnee). Mirrors the derivation in user.service.ts.
function deriveLoyalty(tourCount: number): string {
  return tourCount >= 2 ? "Returnee" : "Newcomer";
}

function baseClientRow(cred: any, existingLog: any, tourCount: number, mobile: string) {
  const sec = cred.seekExternalCredentials || {};
  const customerId = resolveCustomerId(cred);
  const computed = calculateCampaignFields({
    SeekSubStartDate: sec.SeekSubStartDate || cred.SeekSubStartDate,
    createdAt: cred.createdAt,
    SeekSubDurDays: sec.SeekSubDurDays,
    GraceDuration: sec.GraceDuration,
    CampaignEnd: sec.CampaignEnd,
  });
  return {
    id: existingLog?.id || `campaign-${cred.id}`,
    logId: existingLog?.id || null,
    campaignCredentialId: cred.id,
    name: sec.Full_Name || `${sec.First_Name || ""} ${sec.Last_Name || ""}`.trim(),
    customerId,
    plan: sec.Plan || "",
    flightStatus: cred.capitalized || "",
    status: deriveSubscriptionStatus(cred, computed),
    loyalty: deriveLoyalty(tourCount),
    mobile: mobile || "",
    subDate: computed.SeekSubStartDate || "",
    subEnd: computed.CampaignEnd || "",
    seekEmail: sec.Alias_Email || "",
    country: sec.Country || "",
    submissions: tourCount,
    hasLog: !!existingLog,
  };
}

// Saved log values win where present; blanks fall back to the client-record
// derived values so a half-filled log never erases Account data.
function mergeClientRow(base: any, existingLog: any) {
  if (!existingLog) return base;
  return {
    ...base,
    ...existingLog,
    id: existingLog.id,
    logId: existingLog.id,
    hasLog: true,
    campaignCredentialId: base.campaignCredentialId,
    customerId: existingLog.customerId || base.customerId,
    name: existingLog.name || base.name,
    status: existingLog.status || base.status,
    loyalty: existingLog.loyalty || base.loyalty,
    mobile: existingLog.mobile || base.mobile,
    subDate: existingLog.subDate || base.subDate,
    subEnd: existingLog.subEnd || base.subEnd,
    // Read-only, always from the client record
    plan: base.plan,
    flightStatus: base.flightStatus,
    seekEmail: base.seekEmail,
    country: base.country,
    submissions: base.submissions,
  };
}

function parseDateLoose(val: any): Date | null {
  if (!val) return null;
  const s = String(val).trim();
  if (!s) return null;
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d;
  const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (m) {
    const d2 = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
    if (!isNaN(d2.getTime())) return d2;
  }
  return null;
}

// Record-list rows expose the same `hasLog`/`logId` contract as client-anchored
// rows so the frontend editor is identical across every tracker. Complaints
// also get their age computed live from the logged date (SPR-19-10-008).
function decorateRecord(trackerKey: string, row: any) {
  const out: any = { ...row, hasLog: true, logId: row.id };
  if (trackerKey === "complaints") {
    const logged = parseDateLoose(row.logged);
    out.age = logged ? Math.max(0, Math.floor((Date.now() - logged.getTime()) / 86400000)) : 0;
  }
  return out;
}

export async function getClientsWithTracker(trackerKey: string, filters: Record<string, any> = {}) {
  const { search, filter, page = 1, limit = 50 } = filters;
  const TrackerModel = TrackerModels[trackerKey];
  if (!TrackerModel) return { rows: [], totalCount: 0, page: 1, limit: 0 };

  // ── Record-list trackers ─────────────────────────────────────────────────
  if (!CLIENT_ANCHORED.has(trackerKey)) {
    const raw = await TrackerModel.findAll({
      where: { isDeleted: false },
      order: [["createdAt", "DESC"]],
      raw: true,
    });
    let rows = raw.map((r: any) => decorateRecord(trackerKey, r));

    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter((r: any) =>
        Object.values(r).some((v) => String(v ?? "").toLowerCase().includes(q)),
      );
    }

    return { rows, totalCount: rows.length, page: 1, limit: rows.length };
  }

  // ── Client-anchored trackers ─────────────────────────────────────────────
  const credentials = await Credentials.findAll({
    where: { isDeleted: false },
    order: [["createdAt", "DESC"]],
    raw: true,
  });
  const plainCredentials = credentials;

  logger.info(`Fetched ${plainCredentials.length} campaign credentials for ${trackerKey}`);

  // Mobile lives on User.phoneNumber, which is PII-encrypted — requesting the
  // field in `attributes` triggers the model's batch-decrypt AfterFind hook.
  const clientIds = [...new Set(plainCredentials.map((c: any) => c.clientId).filter(Boolean))];
  const mobileByClientId = new Map<string, string>();
  if (clientIds.length) {
    try {
      const users = await User.findAll({
        where: { id: { [Op.in]: clientIds as string[] } },
        attributes: ["id", "phoneNumber", "whatsappNumber"],
      });
      for (const u of users) {
        const m = (u.phoneNumber || u.whatsappNumber || "").trim();
        if (m) mobileByClientId.set(u.id, m);
      }
    } catch (err: any) {
      logger.warn(`Failed to load client mobile numbers: ${err.message}`);
    }
  }

  let filtered = plainCredentials;
  if (search) {
    const q = search.toLowerCase();
    filtered = plainCredentials.filter((c: any) => {
      const sec = c.seekExternalCredentials || {};
      const fullName = (sec.Full_Name || "").toLowerCase();
      const firstName = (sec.First_Name || "").toLowerCase();
      const lastName = (sec.Last_Name || "").toLowerCase();
      const customerId = resolveCustomerId(c).toLowerCase();
      return fullName.includes(q) || firstName.includes(q) || lastName.includes(q) || customerId.includes(q);
    });
  }

  const credentialsIds = filtered.map((c: any) => c.id);
  const tourCounts = credentialsIds.length
    ? await TourCount.findAll({
        where: { credentialsId: { [Op.in]: credentialsIds } },
        attributes: ["credentialsId", "count"],
        raw: true,
      })
    : [];
  const tourCountByCredId = new Map<string, number>();
  for (const tc of tourCounts) {
    tourCountByCredId.set((tc as any).credentialsId, (tc as any).count ?? 0);
  }

  const customerIds = [...new Set(filtered.map((c: any) => resolveCustomerId(c)).filter(Boolean))];

  const orClauses: any[] = [];
  if (credentialsIds.length) orClauses.push({ campaignCredentialId: { [Op.in]: credentialsIds } });
  if (customerIds.length) orClauses.push({ customerId: { [Op.in]: customerIds } });

  const trackerRows = orClauses.length
    ? await TrackerModel.findAll({
        where: { isDeleted: false, [Op.or]: orClauses } as any,
        order: [["updatedAt", "DESC"]],
        raw: true,
      })
    : [];

  // Newest-first ordering means the first row seen per key is the most recent,
  // so a stale duplicate can never clobber the live log.
  const byCredId = new Map<string, any>();
  const byCustomerId = new Map<string, any>();
  for (const row of trackerRows) {
    if (row.campaignCredentialId && !byCredId.has(row.campaignCredentialId)) byCredId.set(row.campaignCredentialId, row);
    if (row.customerId && !byCustomerId.has(row.customerId)) byCustomerId.set(row.customerId, row);
  }

  let merged = filtered.map((cred: any) => {
    const existingLog = byCredId.get(cred.id) || byCustomerId.get(resolveCustomerId(cred)) || null;
    const base = baseClientRow(
      cred,
      existingLog,
      tourCountByCredId.get(cred.id) ?? 0,
      mobileByClientId.get(cred.clientId) ?? "",
    );
    return mergeClientRow(base, existingLog);
  });

  if (filter === "critical") merged = merged.filter((r) => r.sentimentBefore === "Critical");
  if (filter === "nocall") merged = merged.filter((r) => r.callEstablished !== "Yes");
  if (filter === "nosurvey") merged = merged.filter((r) => !r.survey || r.survey === "" || r.survey === "No");
  if (filter === "migrated") merged = merged.filter((r) => r.migration && r.migration.includes(" to "));
  if (filter === "otp") merged = merged.filter((r) => r.otp && r.otp !== "No Issue" && r.otp !== "" && r.otp !== null);
  if (filter === "unverified") merged = merged.filter((r) => r.verification === "Not Verified");
  if (filter === "nocv") merged = merged.filter((r) => r.cv === "Not yet uploaded");
  if (filter === "open") merged = merged.filter((r) => r.resolution && r.resolution !== "Resolved" && r.resolution !== "");
  if (filter === "noreach") merged = merged.filter((r) => r.outreach !== "Yes" && r.outreach !== "" && r.outreach !== null);
  if (filter === "high") merged = merged.filter((r) => r.priority === "High");
  if (filter === "resolved") merged = merged.filter((r) => r.status === "Resolved");

  const totalCount = merged.length;
  const offset = (Number(page) - 1) * Number(limit);
  const rows = merged.slice(offset, offset + Number(limit));

  logger.info(`Returning ${rows.length} rows for ${trackerKey} (total: ${totalCount})`);

  return { rows, totalCount, page: Number(page), limit: Number(limit) };
}
