import { Op } from "sequelize";
import { Credentials } from "../../models/v1/credentials.model";
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

function baseClientRow(cred: any, existingLog: any, tourCount: number) {
  const sec = cred.seekExternalCredentials || {};
  const customerId = sec.CustomerId || cred.clientId || "";
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
    subDate: computed.SeekSubStartDate || "",
    subEnd: computed.CampaignEnd || "",
    seekEmail: sec.Alias_Email || "",
    country: sec.Country || "",
    submissions: tourCount,
    hasLog: !!existingLog,
  };
}

const STANDALONE = new Set(["sales-outreach", "ambassador-scouting"]);

export async function getClientsWithTracker(trackerKey: string, filters: Record<string, any> = {}) {
  const { search, filter, page = 1, limit = 50 } = filters;
  const TrackerModel = TrackerModels[trackerKey];

  if (STANDALONE.has(trackerKey)) {
    const rows = await TrackerModel.findAll({
      where: { isDeleted: false },
      raw: true,
    });
    return { rows, totalCount: rows.length, page: 1, limit: rows.length };
  }

  const credentials = await Credentials.findAll({
    where: { isDeleted: false },
    order: [["createdAt", "DESC"]],
    raw: true,
  });
  const plainCredentials = credentials;

  logger.info(`Fetched ${plainCredentials.length} campaign credentials for ${trackerKey}`);

  let filtered = plainCredentials;
  if (search) {
    const q = search.toLowerCase();
    filtered = plainCredentials.filter((c: any) => {
      const sec = c.seekExternalCredentials || {};
      const fullName = (sec.Full_Name || "").toLowerCase();
      const firstName = (sec.First_Name || "").toLowerCase();
      const lastName = (sec.Last_Name || "").toLowerCase();
      const customerId = (sec.CustomerId || "").toLowerCase();
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

  const customerIds = filtered
    .map((c: any) => c.seekExternalCredentials?.CustomerId)
    .filter((id): id is string => !!id);

  const trackerRows = customerIds.length
    ? await TrackerModel.findAll({
        where: { customerId: { [Op.in]: customerIds }, isDeleted: false },
        raw: true,
      })
    : [];

  const trackerByCustomerId = new Map<string, any>();
  for (const row of trackerRows) {
    if (row.customerId) trackerByCustomerId.set(row.customerId, row);
  }

  let merged = filtered.map((cred: any) => {
    const sec = cred.seekExternalCredentials || {};
    const customerId = sec.CustomerId || "";
    const existingLog = trackerByCustomerId.get(customerId);
    return { ...baseClientRow(cred, existingLog, tourCountByCredId.get(cred.id) ?? 0), ...existingLog };
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
