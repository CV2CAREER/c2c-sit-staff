import { getServiceLogger } from "../utils/createLogger";
import { ManualApplication } from "../models/v1/manual-application.model";
import { User } from "../models/v1/user.model";
import { SlackService } from "./slack.service";
import { sendManualApplicationChangeAdminEmail } from "./email.service";
import {
  SlackChannel,
  SlackEventType,
  SlackNode,
  SlackProvider,
  SlackSeverity,
} from "../utils/enum";
import { getEnvironmentFromHost } from "../utils/slack-helpers";

const logger = getServiceLogger("discovery-tracker-service");

// The "Users Filter" dropdown on admin/job-preference filters the grid by one
// of these real manual_applications columns — kept narrow to the meaningful
// categorical fields (free-text fields like Job_Title/JobId aren't practical
// filter dimensions).
export const FILTERABLE_FIELDS = [
  "Advertiser",
  "Job_Type",
  "Country",
  "Status",
  "Internal_Jobsite",
  "External_Jobsite",
] as const;

export type FilterableField = (typeof FILTERABLE_FIELDS)[number];

export const isFilterableField = (value: unknown): value is FilterableField =>
  typeof value === "string" && (FILTERABLE_FIELDS as readonly string[]).includes(value);

// Columns the admin grid is allowed to edit in place. Deliberately excludes
// id/timestamps/client_id/credentialsTourId — those are structural, not
// editable content.
export const EDITABLE_FIELDS = new Set([
  "Client",
  "Status",
  "StatusReason",
  "Job_Title",
  "JobId",
  "Internal_Jobsite",
  "External_Jobsite",
  "Job_Type",
  "Advertiser",
  "Location",
  "Country",
  "ApplicationSubmittedBy",
  "ApplicationSubmissionDate",
  "DiscoveredBy",
  "DiscoveryDate",
  "VettedBy",
  "VettedDate",
  "QualityScore",
  "CoverLetterRequired",
  "DeclinedReasons",
  "ApprovedBy",
  "ApprovedDate",
  "ReturnReason",
  "ReturnedBy",
  "ReturnedDate",
]);

type Actor = { name: string; email?: string };

// Job_Title is stored as a spreadsheet-style formula — e.g.
// =HYPERLINK("https://...","Data Engineer") — same format parsed for the
// admin grid's Job Title column (see table-columns.tsx). Extracts the
// display label and the URL so notifications can render an actual clickable
// link instead of dumping the raw formula string.
const parseJobTitle = (raw: string | undefined | null): { label: string; url: string | null } => {
  const value = raw || "N/A";
  const match = value.match(/=HYPERLINK\("([^"]+)"\s*,\s*"([^"]+)"\)/i);
  if (!match) return { label: value, url: null };
  const [, url, label] = match;
  return { label, url };
};

export const listManualApplications = async (params: {
  field?: string;
  value?: string;
  isDeleted: boolean;
}) => {
  const { field, value, isDeleted } = params;

  const where: Record<string, any> = { isDeleted };

  if (field) {
    if (!isFilterableField(field)) {
      throw new Error(`Unknown filter field: ${field}`);
    }
    if (value && value !== "Any") {
      where[field] = value;
    }
  }

  const rows = await ManualApplication.findAll({
    where,
    include: [
      {
        model: User,
        as: "user",
        attributes: ["id", "email", "firstName", "lastName"],
      },
    ],
    order: [["createdAt", "DESC"]],
  });

  return { rows, totalCount: rows.length };
};

export const getManualApplicationFilterValues = async (field: string) => {
  if (!isFilterableField(field)) {
    throw new Error(`Unknown filter field: ${field}`);
  }

  const rows = await ManualApplication.findAll({
    attributes: [field],
    where: { isDeleted: false },
    group: [field],
    order: [[field, "ASC"]],
    raw: true,
  });

  return (rows as unknown as Record<string, string>[])
    .map((row) => row[field])
    .filter((v): v is string => !!v && v.trim().length > 0);
};

const notifyManualApplicationChange = (
  record: ManualApplication,
  action: "updated" | "soft-deleted" | "restored" | "deleted",
  actor: Actor,
  host: string,
  changedFields?: string[],
) => {
  const { label: jobTitleLabel, url: jobTitleUrl } = parseJobTitle(record.Job_Title);
  const advertiser = record.Advertiser || "N/A";
  const changedFieldsStr = changedFields?.length ? changedFields.join(", ") : undefined;

  const actionVerb: Record<typeof action, string> = {
    updated: "updated",
    "soft-deleted": "sent to the recycle bin",
    restored: "restored from the recycle bin",
    deleted: "permanently deleted",
  };

  // Slack mrkdwn: <url|label> renders as a clickable link showing just the
  // label; a bare <url> line underneath renders as a second clickable link
  // showing the raw address — matches the grid's name-on-top/link-under look.
  const jobLine = jobTitleUrl ? `<${jobTitleUrl}|${jobTitleLabel}>` : jobTitleLabel;
  const jobLinkLine = jobTitleUrl ? `• *Link:* <${jobTitleUrl}>` : "";

  setImmediate(async () => {
    try {
      await SlackService.notify({
        location: getEnvironmentFromHost(host || ""),
        host: host || "",
        node: SlackNode.HUMAN_RESOURCE,
        provider: SlackProvider.HUBSTAFF,
        severity: SlackSeverity.INFO,
        trigger: actor.name,
        type: SlackEventType.MANUAL_APPLICATION,
        channel: SlackChannel.CRY_WOLF,
        body: [
          `📝 MANUAL APPLICATION ${action.toUpperCase().replace("-", " ")}`,
          `• *Record ID:* ${record.id}`,
          `• *Job:* ${jobLine} · ${advertiser}`,
          jobLinkLine,
          changedFieldsStr ? `• *Fields Changed:* ${changedFieldsStr}` : "",
          `• *Action:* Record ${actionVerb[action]}`,
          `${actor.name} via admin job discovery grid.`,
        ]
          .filter(Boolean)
          .join("\n"),
      });
    } catch (err) {
      logger.error(`Slack notification failed for manual application ${record.id}: ${err}`);
    }

    try {
      await sendManualApplicationChangeAdminEmail({
        recordId: record.id,
        jobTitle: jobTitleLabel,
        jobUrl: jobTitleUrl,
        advertiser,
        action,
        changedFields: changedFieldsStr,
        triggeredBy: actor.name,
      });
    } catch (err) {
      logger.error(`Team email notification failed for manual application ${record.id}: ${err}`);
    }
  });
};

export const updateManualApplicationRecord = async (
  id: string,
  body: Record<string, unknown>,
  actor: Actor,
  host: string,
) => {
  const record = await ManualApplication.findOne({ where: { id } });
  if (!record) {
    throw new Error("Manual application not found");
  }

  const updates: Record<string, unknown> = {};
  let isDeletedChange: boolean | undefined;

  if (typeof body.isDeleted === "boolean") {
    updates.isDeleted = body.isDeleted;
    isDeletedChange = body.isDeleted;
  }

  const changedFields: string[] = [];
  for (const [key, val] of Object.entries(body)) {
    if (key === "isDeleted") continue;
    if (EDITABLE_FIELDS.has(key)) {
      updates[key] = val;
      changedFields.push(key);
    }
  }

  if (Object.keys(updates).length === 0) {
    throw new Error("No editable fields provided");
  }

  await record.update(updates);

  logger.info(`Manual application ${id} updated — fields: ${Object.keys(updates).join(", ")}`);

  const action =
    isDeletedChange === true ? "soft-deleted" : isDeletedChange === false ? "restored" : "updated";
  notifyManualApplicationChange(record, action, actor, host, changedFields.length ? changedFields : undefined);

  return record;
};

export const deleteManualApplicationRecordPermanently = async (
  id: string,
  actor: Actor,
  host: string,
) => {
  const record = await ManualApplication.findOne({ where: { id } });
  if (!record) {
    throw new Error("Manual application not found");
  }

  notifyManualApplicationChange(record, "deleted", actor, host);

  await record.destroy();
  logger.info(`Manual application ${id} permanently deleted`);
};
