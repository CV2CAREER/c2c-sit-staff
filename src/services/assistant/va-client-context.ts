import { Op } from "sequelize";
import { User } from "@/models/v1/user.model";
import { Profile } from "@/models/v1/profile.model";
import { Credentials } from "@/models/v1/credentials.model";
import { ManualApplication } from "@/models/v1/manual-application.model";
import { MissingInfoRequest } from "@/models/v1/missing-info-request.model";
import { MissingInfoResponse } from "@/models/v1/missing-info-response.model";
import { calculateCampaignFields, formatDate } from "@/utils/campaign-calculator";
import { getServiceLogger } from "@/utils/createLogger";

const logger = getServiceLogger("va-client-context");

/*
 * Builds the client context the VA chat sends to the AI in Customer mode.
 *
 * Everything here goes to a third-party model, so each source is an explicit
 * ALLOW-list of fields — never a whole row. Deliberately never sent:
 * passwords (User.password/adminPassword, Credentials.seekPassword,
 * seekExternalCredentials.ExternalPassword), jobsite logins and aliases
 * (seekEmail, Alias_Email), tokens, bank details, and special-category data
 * (gender, marital status, disability, veteran status, private preference
 * answers).
 */

const MAX_APPLICATIONS = 25;
const MAX_MISSING_INFO_REQUESTS = 10;
const MAX_SECTION_CHARS = 4000;

// Safe keys from the campaign JSONB (seekExternalCredentials).
const CAMPAIGN_KEYS: Array<[key: string, label: string]> = [
  ["Plan", "Plan"],
  ["Active", "Campaign active"],
  ["Craft", "Craft"],
  ["Batch", "Batch"],
  ["Assurance", "Assurance"],
  ["Country", "Campaign country"],
  ["Seek_Aggregator", "SEEK aggregator"],
  ["Jora_Aggregator", "Jora aggregator"],
  ["Adzuna_Aggregator", "Adzuna aggregator"],
  ["CareerOne_Aggregator", "CareerOne aggregator"],
  ["Reed_Aggregator", "Reed aggregator"],
];

const isEmpty = (value: unknown) =>
  value === null ||
  value === undefined ||
  value === "" ||
  (Array.isArray(value) && value.length === 0);

/** Renders strings, numbers, booleans, dates and arrays (incl. {name}/{label} objects). */
const display = (value: unknown): string => {
  if (value instanceof Date) return formatDate(value);
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) {
    return value
      .map((item) =>
        item && typeof item === "object"
          ? String((item as any).name ?? (item as any).label ?? (item as any).title ?? "")
          : String(item),
      )
      .filter(Boolean)
      .join(", ");
  }
  return String(value).trim();
};

const line = (label: string, value: unknown) => {
  if (isEmpty(value)) return "";
  const text = display(value);
  return text ? `- ${label}: ${text}\n` : "";
};

const section = (title: string, body: string) => {
  if (!body.trim()) return "";
  const trimmed =
    body.length > MAX_SECTION_CHARS ? `${body.slice(0, MAX_SECTION_CHARS)}\n- …(truncated)\n` : body;
  return `## ${title}\n${trimmed}\n`;
};

async function userSection(clientId: string) {
  // Not `raw` — User's @AfterFind decrypts email via setDataValue on the instance.
  const user = await User.findByPk(clientId, {
    attributes: [
      "id",
      "uniqueId",
      "firstName",
      "middleName",
      "lastName",
      "email",
      "country",
      "currentCityOfResidence",
      "applicationStatus",
      "selectedPlan",
      "plan",
      "hasActiveSubscription",
      "campaignActive",
      "isDocumentApproved",
      "createdAt",
    ],
  });
  if (!user) return { user: null, text: "" };

  const name = [user.firstName, user.middleName, user.lastName].filter(Boolean).join(" ");
  const text =
    line("Name", name) +
    line("Client ID", user.uniqueId ?? user.id) +
    line("Email", user.email) +
    line("Country", user.country) +
    line("City of residence", user.currentCityOfResidence) +
    line("Application status", user.applicationStatus) +
    line("Plan", user.selectedPlan ?? user.plan) +
    line("Active subscription", user.hasActiveSubscription) +
    line("Campaign active", user.campaignActive) +
    line("Documents approved", user.isDocumentApproved) +
    line("Joined", user.createdAt);

  return { user, text: section("Client", text) };
}

async function profileSection(clientId: string) {
  const profiles = await Profile.findAll({
    where: { userId: clientId },
    order: [["name", "ASC"]], // primary before secondary
  });

  return profiles
    .map((p) => {
      // Stored as "0.00" when unset, so only a positive figure counts.
      const min = Number(p.minSalary) > 0 ? p.minSalary : null;
      const max = Number(p.maxSalary) > 0 ? p.maxSalary : null;
      const salary = min || max ? `${min ?? "?"} – ${max ?? "?"}` : null;
      const publicAnswers = (p.questions ?? [])
        .filter((q) => q && !q.private && q.answer)
        .map((q) => `  - ${q.question}: ${q.answer}`)
        .join("\n");

      const text =
        line("Target role", p.role) +
        line("Job titles", p.titles) +
        line("Excluded job titles", p.titlesExcluded) +
        line("Keywords", p.keywords) +
        line("Excluded keywords", p.keywordsExcluded) +
        line("Classifications", p.classifications) +
        line("Industries", p.industriesInclude) +
        line("Excluded industries", p.industriesExclude) +
        line("Job types", p.jobTypes) +
        line("Salary range", salary) +
        line("Country", p.country) +
        line("Locations", p.locations) +
        line("Cities", p.city) +
        line("States", p.state) +
        line("Work rights", p.workingRight) +
        line("Course of study", p.courseOfStudy) +
        line("Additional comments", p.additionalComments) +
        (publicAnswers ? `- Preference answers:\n${publicAnswers}\n` : "");

      return section(`Job preferences (${p.name} profile)`, text);
    })
    .join("");
}

async function campaignSection(clientId: string) {
  const credentials = await Credentials.findAll({
    where: { clientId, isDeleted: false },
    attributes: [
      "id",
      "currentCity",
      "onboardingDate",
      "criteriaReviewCompleted",
      "blacklisted",
      "SeekSubStartDate",
      "createdAt",
      "seekExternalCredentials",
    ],
    raw: true,
    // Skip the decrypt hook — it fetches jobsite passwords we must not send.
    hooks: false,
  } as any);

  return (credentials as any[])
    .map((c, index) => {
      const jsonb = (c.seekExternalCredentials || {}) as Record<string, unknown>;
      const computed = calculateCampaignFields({
        SeekSubStartDate: c.SeekSubStartDate,
        createdAt: c.createdAt,
        SeekSubDurDays: jsonb.SeekSubDurDays as any,
        GraceDuration: jsonb.GraceDuration as any,
      });

      const text =
        CAMPAIGN_KEYS.map(([key, label]) => line(label, jsonb[key])).join("") +
        line("Subscription start", computed.SeekSubStartDate) +
        line("Campaign end", computed.CampaignEnd) +
        line("Current city", c.currentCity) +
        line("Onboarding date", c.onboardingDate) +
        line("Criteria review completed", c.criteriaReviewCompleted) +
        line("Blacklisted", c.blacklisted);

      return section(credentials.length > 1 ? `Campaign ${index + 1}` : "Campaign", text);
    })
    .join("");
}

async function applicationsSection(clientId: string) {
  const [applications, total] = await Promise.all([
    ManualApplication.findAll({
      where: { client_id: clientId, isDeleted: false },
      attributes: [
        "Job_Title",
        "Advertiser",
        "Location",
        "Country",
        "Job_Type",
        "Salary",
        "Status",
        "StatusReason",
        "DeclinedReasons",
        "createdAt",
      ],
      order: [["createdAt", "DESC"]],
      limit: MAX_APPLICATIONS,
      raw: true,
    }),
    ManualApplication.count({ where: { client_id: clientId, isDeleted: false } }),
  ]);

  if (applications.length === 0) return "";

  const rows = (applications as any[])
    .map((a) => {
      const where = [a.Location, a.Country].filter(Boolean).join(", ");
      const detail = [a.Job_Type, a.Salary].filter(Boolean).join(", ");
      const reason = a.StatusReason || a.DeclinedReasons;
      return `- ${formatDate(new Date(a.createdAt))}: ${a.Job_Title} at ${a.Advertiser}` +
        `${where ? ` (${where})` : ""}${detail ? ` — ${detail}` : ""}` +
        ` — Status: ${a.Status ?? "unknown"}${reason ? ` (${reason})` : ""}\n`;
    })
    .join("");

  const heading =
    total > applications.length
      ? `Manual applications (latest ${applications.length} of ${total})`
      : `Manual applications (${total})`;
  return section(heading, rows);
}

async function missingInfoSection(clientId: string) {
  const requests = await MissingInfoRequest.findAll({
    where: { targetUserId: clientId },
    attributes: ["id", "missingInfoType", "status", "requestedAt", "fulfilledAt", "jobURL"],
    order: [["requestedAt", "DESC"]],
    limit: MAX_MISSING_INFO_REQUESTS,
    raw: true,
  });
  if (requests.length === 0) return "";

  const requestIds = (requests as any[]).map((r) => r.id);
  // Instances (not raw) so the response model's @AfterFind decrypts fieldValue.
  const responses = await MissingInfoResponse.findAll({
    where: { requestId: { [Op.in]: requestIds } },
    order: [["createdAt", "ASC"]],
  });

  const text = (requests as any[])
    .map((r) => {
      const answers = responses
        .filter((resp) => resp.requestId === r.id && !isEmpty(resp.fieldValue))
        .map((resp) => {
          // Uploaded files are stored as direct storage links — the AI can't
          // read them, and the link itself grants access, so it isn't sent.
          const value = /^https?:\/\//i.test(String(resp.fieldValue).trim())
            ? "(file uploaded)"
            : resp.fieldValue;
          return `  - ${resp.fieldLabel || resp.fieldName || "Answer"}: ${value}`;
        })
        .join("\n");
      // An unanswered expired request tells the AI nothing useful.
      if (!answers && r.status === "expired") return "";
      const dates = [
        r.requestedAt ? `requested ${formatDate(new Date(r.requestedAt))}` : "",
        r.fulfilledAt ? `answered ${formatDate(new Date(r.fulfilledAt))}` : "",
      ]
        .filter(Boolean)
        .join(", ");
      return `- ${r.missingInfoType} request — ${r.status}${dates ? ` (${dates})` : ""}` +
        `${r.jobURL ? ` for ${r.jobURL}` : ""}\n${answers ? `${answers}\n` : ""}`;
    })
    .join("");

  return section("Missing information requests and the client's answers", text);
}

/**
 * Everything we hold on file for the client, as plain text for the AI. Each
 * source is loaded independently so one failing table doesn't blank the rest.
 */
export async function buildClientContext(clientId: string): Promise<string> {
  const safe = async (label: string, load: () => Promise<string>) => {
    try {
      return await load();
    } catch (error: any) {
      logger.warn(`VA context: could not load ${label} for ${clientId}: ${error.message}`);
      return "";
    }
  };

  const { user, text: clientText } = await userSection(clientId);
  if (!user) return "";

  const [profile, campaign, applications, missingInfo] = await Promise.all([
    safe("profile", () => profileSection(clientId)),
    safe("campaign", () => campaignSection(clientId)),
    safe("manual applications", () => applicationsSection(clientId)),
    safe("missing information", () => missingInfoSection(clientId)),
  ]);

  return [clientText, profile, campaign, applications, missingInfo].filter(Boolean).join("\n");
}
