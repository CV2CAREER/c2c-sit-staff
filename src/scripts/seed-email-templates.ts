import fs from "fs";
import path from "path";
import { getServiceLogger } from "../utils/createLogger";
import { EmailTemplate, EmailTemplateType } from "../models/v1/email-template.model";

const logger = getServiceLogger("seed-email-templates");

const mailDirectory = path.resolve(__dirname, "../views/emails");

/**
 * Metadata for every .ejs file under views/emails, keyed by the exact
 * templateName string call sites pass to sendMail. `type` reflects who the
 * email is addressed to: TEAM_EMAIL/internal recipients are "admin",
 * everyone else (clients, coaches, invitees) is "customer". `variables` lists
 * the exact templateData keys the call site(s) pass today, so the admin UI
 * can offer a click-to-insert picker instead of requiring EJS syntax.
 */
export const TEMPLATE_META: Record<string, { name: string; type: EmailTemplateType; variables: string[] }> = {
  "activation.ejs": { name: "Account Activation", type: EmailTemplateType.CUSTOMER, variables: ["name", "email", "otp", "verificationLink", "currentYear"] },
  "admin-activation.ejs": { name: "Admin: New User Registration", type: EmailTemplateType.ADMIN, variables: ["name", "email", "frontendUrl", "currentYear"] },
  "admin-missing-info.ejs": { name: "Admin: Missing Info Request Created", type: EmailTemplateType.ADMIN, variables: ["clientName", "clientEmail", "missingField", "jobUrl", "updateMissingInfoUrl", "triggeredBy", "channel", "currentYear"] },
  "admin-missing-info-v2.ejs": { name: "Admin: Missing Info Request Sent", type: EmailTemplateType.ADMIN, variables: ["clientName", "clientEmail", "templateName", "category", "fieldCount", "updateMissingInfoUrl", "triggeredBy", "channel", "currentYear"] },
  "admin-new-otp.ejs": { name: "Admin: New OTP Issued", type: EmailTemplateType.ADMIN, variables: ["name", "lastName", "email", "frontendUrl", "currentYear"] },
  "admin-revised-documents.ejs": { name: "Admin: Documents Revised", type: EmailTemplateType.ADMIN, variables: ["title", "message", "userId", "documentTypes", "uploadCount", "timestamp", "currentYear"] },
  "admin-session-booked.ejs": { name: "Admin: Session Booked", type: EmailTemplateType.ADMIN, variables: ["date", "time", "timezone", "sessionType", "meetingLink", "duration", "frontendUrl", "currentYear", "clientName", "clientEmail", "coachName", "coachEmail"] },
  "admin-welcome-email.ejs": { name: "Admin: Welcome Email Sent", type: EmailTemplateType.ADMIN, variables: ["name", "lastName", "email", "frontendUrl", "currentYear"] },
  "AdminNotificationTemplate.ejs": { name: "Admin: Delivery Team Notification", type: EmailTemplateType.ADMIN, variables: ["firstname", "email", "link", "triggeredBy"] },
  "application-action-admin.ejs": { name: "Admin: Application Commenced/Ended", type: EmailTemplateType.ADMIN, variables: ["name", "email", "triggeredBy", "action", "currentYear"] },
  "application-action-user.ejs": { name: "Application Commenced/Ended", type: EmailTemplateType.CUSTOMER, variables: ["name", "email", "frontendUrl", "action", "currentYear"] },
  "availability-declined-client.ejs": { name: "Availability Declined", type: EmailTemplateType.CUSTOMER, variables: ["name", "date", "time", "timezone", "sessionType", "reason", "frontendUrl", "currentYear"] },
  "availability-declined.ejs": { name: "Coach Availability Declined", type: EmailTemplateType.CUSTOMER, variables: ["name", "day", "from", "to"] },
  "availability-reschedule-proposed.ejs": { name: "Availability Reschedule Proposed", type: EmailTemplateType.CUSTOMER, variables: ["name", "coachName", "originalDate", "originalTime", "originalTimezone", "sessionType", "proposedDate", "proposedTime", "proposedTimezone", "meetingLink", "frontendUrl", "currentYear"] },
  "client-missing-info.ejs": { name: "Missing Info Request", type: EmailTemplateType.CUSTOMER, variables: ["name", "missingField", "jobUrl", "updateMissingInfoUrl", "currentYear"] },
  "client-missing-info-v2.ejs": { name: "Missing Info Request v2", type: EmailTemplateType.CUSTOMER, variables: ["name", "templateName", "fieldLabels", "refereeCount", "personalMessage", "updateMissingInfoUrl", "currentYear"] },
  "client-revised-documents.ejs": { name: "Documents Revised", type: EmailTemplateType.CUSTOMER, variables: ["title", "name", "message", "documentNames", "documentTypes", "timestamp", "frontendUrl", "currentYear"] },
  "client-support-documents-admin.ejs": { name: "Admin: Client Support Documents", type: EmailTemplateType.ADMIN, variables: ["userId", "typeList", "count", "timestamp", "link", "currentYear"] },
  "client-support-documents-user.ejs": { name: "Client Support Documents", type: EmailTemplateType.CUSTOMER, variables: ["title", "name", "documentNames", "documentTypes", "timestamp", "hasRoleTitles", "frontendUrl", "currentYear"] },
  "coach-availability-proposal.ejs": { name: "Coach Availability Proposal", type: EmailTemplateType.CUSTOMER, variables: ["coachName", "clientName", "proposedDate", "proposedTime"] },
  "jobsite-credential-pending.ejs": { name: "Jobsite Credential — Pending Approval", type: EmailTemplateType.CUSTOMER, variables: ["name", "email", "isStaffAdded", "frontendUrl", "currentYear"] },
  "jobsite-credential-approved.ejs": { name: "Jobsite Credential — Approved", type: EmailTemplateType.CUSTOMER, variables: ["name", "email", "isAmbassador", "frontendUrl", "currentYear"] },
  "account-approved-user.ejs": { name: "Account Approved (Client)", type: EmailTemplateType.CUSTOMER, variables: ["name", "frontendUrl", "currentYear"] },
  "account-approved-admin.ejs": { name: "Admin: Account Approved", type: EmailTemplateType.ADMIN, variables: ["clientName", "clientEmail", "approvedBy", "frontendUrl", "currentYear"] },
  "account-deleted-user.ejs": { name: "Account Deleted (Client)", type: EmailTemplateType.CUSTOMER, variables: ["name", "frontendUrl", "currentYear"] },
  "account-deleted-admin.ejs": { name: "Admin: Account Deleted", type: EmailTemplateType.ADMIN, variables: ["clientName", "clientEmail", "purgedBy", "frontendUrl", "currentYear"] },
  "referrer-assigned-admin.ejs": { name: "Admin: Referrer Assigned", type: EmailTemplateType.ADMIN, variables: ["clientName", "clientEmail", "referrerLabel", "referralNumber", "freeBeforeReferral", "assignedBy", "frontendUrl", "currentYear"] },
  "jobsite-credential-failed.ejs": { name: "Jobsite Credential — Rejected", type: EmailTemplateType.CUSTOMER, variables: ["name", "email", "reasonCode", "optionalNote", "frontendUrl", "currentYear"] },
  "jobsite-credential-test.ejs": { name: "Jobsite Credential — Test Email", type: EmailTemplateType.CUSTOMER, variables: ["name", "currentYear"] },
  "jobsite-credential-pending-admin.ejs": { name: "Jobsite Credential — Pending (Admin)", type: EmailTemplateType.ADMIN, variables: ["clientName", "credentialEmail", "currentYear"] },
  "jobsite-credential-accepted-admin.ejs": { name: "Jobsite Credential — Accepted (Admin)", type: EmailTemplateType.ADMIN, variables: ["clientName", "credentialEmail", "adminId", "currentYear"] },
  "jobsite-credential-approved-admin.ejs": { name: "Jobsite Credential — Approved (Admin)", type: EmailTemplateType.ADMIN, variables: ["clientName", "credentialEmail", "adminId", "currentYear"] },
  "jobsite-credential-rejected-admin.ejs": { name: "Jobsite Credential — Rejected (Admin)", type: EmailTemplateType.ADMIN, variables: ["clientName", "credentialEmail", "adminId", "reason", "note", "currentYear"] },
  "jobsite-credential-test-admin.ejs": { name: "Jobsite Credential — Test Email (Admin)", type: EmailTemplateType.ADMIN, variables: ["clientName", "credentialEmail", "adminId", "currentYear"] },
  "coach-session-confirmed.ejs": { name: "Coach: Session Confirmed", type: EmailTemplateType.CUSTOMER, variables: ["date", "time", "timezone", "sessionType", "meetingLink", "duration", "frontendUrl", "currentYear", "name", "clientName"] },
  "content-generated.ejs": { name: "Content Generated", type: EmailTemplateType.CUSTOMER, variables: ["name", "type"] },
  "deployment-failure.ejs": { name: "Admin: Deployment Failure", type: EmailTemplateType.ADMIN, variables: ["appName", "environment", "errorMessage", "timestamp", "currentYear"] },
  "deployment-success.ejs": { name: "Admin: Deployment Success", type: EmailTemplateType.ADMIN, variables: ["appName", "environment", "commitSha", "commitMessage", "deployedBy", "duration", "deploymentUrl", "logsUrl", "timestamp", "currentYear"] },
  "discovery-tracker-change-admin.ejs": { name: "Admin: Manual Application Changed", type: EmailTemplateType.ADMIN, variables: ["recordId", "jobTitle", "jobUrl", "advertiser", "action", "changedFields", "triggeredBy", "currentYear"] },
  "DispatchCredentials.ejs": { name: "Dispatch Credentials", type: EmailTemplateType.CUSTOMER, variables: ["firstname", "credentials"] },
  "DispatchPreference.ejs": { name: "Dispatch Preference", type: EmailTemplateType.CUSTOMER, variables: ["firstname", "email", "link", "results"] },
  "document-update-admin.ejs": { name: "Admin: Document Updated", type: EmailTemplateType.ADMIN, variables: ["userName", "userEmail", "userLink", "currentYear"] },
  "document-update-user.ejs": { name: "Document Updated", type: EmailTemplateType.CUSTOMER, variables: [] },
  "document-upload-admin.ejs": { name: "Admin: Document Uploaded", type: EmailTemplateType.ADMIN, variables: [] },
  "document-upload-user.ejs": { name: "Document Uploaded", type: EmailTemplateType.CUSTOMER, variables: [] },
  "missing-info-delivery-report.ejs": { name: "Delivery Report: Missing Info Request Sent", type: EmailTemplateType.ADMIN, variables: ["clientName", "channel", "templateName", "fieldCount", "sentAt", "sentBy", "requestUrl"] },
  "new-otp.ejs": { name: "New OTP Issued", type: EmailTemplateType.CUSTOMER, variables: ["name", "email", "frontendUrl", "otp", "currentYear"] },
  "new-referral-alert.ejs": { name: "New Referral Alert", type: EmailTemplateType.CUSTOMER, variables: ["name", "email", "refName", "frontendUrl", "currentYear"] },
  "plan-changed.ejs": { name: "Plan Changed", type: EmailTemplateType.CUSTOMER, variables: ["name", "previousPlan", "planTo", "subEndDate", "frontendUrl", "currentYear"] },
  "plan-changed-admin.ejs": { name: "Admin: Plan Changed", type: EmailTemplateType.ADMIN, variables: ["customerId", "signupAs", "planFrom", "planTo", "subEndFrom", "subEndTo", "why", "adminName", "timestamp", "clientTold", "currentYear"] },
  "plan-extended.ejs": { name: "Plan Extended", type: EmailTemplateType.CUSTOMER, variables: ["name", "planTitle", "daysAdded", "newExpiresAt", "frontendUrl", "currentYear"] },
  "profile-update.ejs": { name: "Profile Updated", type: EmailTemplateType.CUSTOMER, variables: [] },
  "referral-claimed.ejs": { name: "Referral Claimed", type: EmailTemplateType.CUSTOMER, variables: ["email", "name", "claimedUserName", "frontendUrl", "currentYear"] },
  "referral-invitation.ejs": { name: "Referral Invitation", type: EmailTemplateType.CUSTOMER, variables: ["email", "firstName", "lastName", "middleName", "referrerName", "referralLink", "frontendUrl", "currentYear"] },
  "reset-password.ejs": { name: "Password Reset", type: EmailTemplateType.CUSTOMER, variables: ["name", "email", "frontendUrl", "otp", "currentYear"] },
  "service-subscription-admin.ejs": { name: "Admin: Service Subscription", type: EmailTemplateType.ADMIN, variables: ["name", "email", "plan", "link", "frontendUrl", "currentYear"] },
  "service-subscription-user.ejs": { name: "Service Subscription", type: EmailTemplateType.CUSTOMER, variables: ["name", "plan", "frontendUrl", "currentYear"] },
  "session-booked-admin.ejs": { name: "Admin: Session Booked", type: EmailTemplateType.ADMIN, variables: ["meetingTime", "meetingDate", "coachName", "clientName", "meetingLink", "sessionType", "timeZone", "clientEmail"] },
  "session-booked-client.ejs": { name: "Session Booked", type: EmailTemplateType.CUSTOMER, variables: ["meetingTime", "meetingDate", "coachName", "clientName", "meetingLink", "sessionType", "timeZone"] },
  "session-booked-coach.ejs": { name: "Coach: Session Booked", type: EmailTemplateType.CUSTOMER, variables: ["meetingTime", "meetingDate", "coachName", "clientName", "meetingLink", "sessionType", "timeZone"] },
  "session-confirmed.ejs": { name: "Session Confirmed", type: EmailTemplateType.CUSTOMER, variables: ["date", "time", "timezone", "sessionType", "meetingLink", "duration", "frontendUrl", "currentYear", "name", "coachName"] },
  "session-rescheduled.ejs": { name: "Session Rescheduled", type: EmailTemplateType.CUSTOMER, variables: ["date", "time", "timezone", "sessionType", "meetingLink", "duration", "frontendUrl", "currentYear", "name", "coachName", "clientName", "clientEmail", "coachEmail", "recipientType"] },
  "terms-conditions.ejs": { name: "Terms & Conditions", type: EmailTemplateType.CUSTOMER, variables: ["name", "planName", "validityPeriod", "frontendUrl", "currentYear"] },
  "vcs-prompt-change-admin.ejs": { name: "Admin: AI Prompt Changed", type: EmailTemplateType.ADMIN, variables: ["actionLabel", "key", "version", "active", "triggeredBy", "promptExcerpt", "currentYear"] },
  "welcome-email.ejs": { name: "Welcome Email", type: EmailTemplateType.CUSTOMER, variables: ["name", "email", "frontendUrl", "currentYear"] },
};

const titleFromFilename = (fileName: string) =>
  fileName
    .replace(/\.ejs$/i, "")
    .replace(/[-_]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (c) => c.toUpperCase());

/**
 * Upserts every .ejs file under views/emails into `email_templates`, keyed by
 * filename. Existing rows are left untouched (an admin may have already
 * edited them) unless SEED_EMAIL_TEMPLATES_FORCE=true, which re-syncs body
 * content from disk — useful right after adding/changing a template file.
 */
export const seedEmailTemplates = async (): Promise<void> => {
  if (!fs.existsSync(mailDirectory)) {
    logger.warn(`Mail directory not found, skipping seed: ${mailDirectory}`);
    return;
  }

  const forceUpdate = process.env.SEED_EMAIL_TEMPLATES_FORCE === "true";
  const files = fs.readdirSync(mailDirectory).filter((f) => f.endsWith(".ejs"));

  let created = 0;
  let updated = 0;

  for (const fileName of files) {
    const body = fs.readFileSync(path.join(mailDirectory, fileName), "utf-8");
    const meta = TEMPLATE_META[fileName] ?? {
      name: titleFromFilename(fileName),
      type: EmailTemplateType.CUSTOMER,
      variables: [],
    };

    const [row, wasCreated] = await EmailTemplate.findOrCreate({
      where: { key: fileName },
      defaults: {
        key: fileName,
        name: meta.name,
        type: meta.type,
        body,
        variables: meta.variables,
        updatedBy: "System",
      },
    });

    if (wasCreated) {
      created += 1;
    } else if (forceUpdate) {
      await row.update({ name: meta.name, type: meta.type, body, variables: meta.variables, updatedBy: "System" });
      updated += 1;
    }
  }

  logger.info(
    `Email template seed complete — ${created} created, ${updated} refreshed, ${files.length} total files scanned`,
  );
};

// Standalone entrypoint — run directly with:
//   npx tsx src/scripts/seed-email-templates.ts
// (add SEED_EMAIL_TEMPLATES_FORCE=true before it to overwrite existing rows
// from disk). Guarded so `connectDB()` importing seedEmailTemplates() above
// doesn't also trigger this block and exit the running server process.
if (require.main === module) {
  require("dotenv").config();
  const { getSequelize } = require("../utils/sequelize");

  (async () => {
    const sequelize = getSequelize();
    try {
      await sequelize.authenticate();
      logger.info("Connected to database");
      await seedEmailTemplates();
      await sequelize.close();
      process.exit(0);
    } catch (error) {
      logger.error("Email template seed failed:", error);
      try {
        await sequelize.close();
      } catch {
        // ignore
      }
      process.exit(1);
    }
  })();
}
