export interface EmailTriggerDefinition {
  /** The literal templateName string a sendMail() call site already passes. */
  key: string;
  label: string;
  /** Whether an admin may rebind this trigger to a different template.
   * Server-enforced in CommunicationTemplateService.rebindTrigger — this
   * flag is the actual gate, not just a UI hint. */
  reassignable: boolean;
}

/**
 * Canonical registry of every known email trigger, built from the literal
 * templateName strings sendMail() call sites pass across the codebase.
 * There is no other source of truth for this list — a new sendMail() call
 * site should add its key here too, or it simply won't show up in the
 * admin Triggers UI (it'll still send fine via the default key match).
 */
export const EMAIL_TRIGGERS: EmailTriggerDefinition[] = [
  { key: "deployment-success.ejs", label: "Deploy Succeeded", reassignable: true },
  { key: "deployment-failure.ejs", label: "Deploy Failed", reassignable: true },
  { key: "activation.ejs", label: "Account Activation", reassignable: false },
  { key: "new-referral-alert.ejs", label: "New Referral Alert", reassignable: true },
  { key: "admin-activation.ejs", label: "Admin: Account Activation", reassignable: false },
  { key: "welcome-email.ejs", label: "Client Welcome Email", reassignable: true },
  { key: "admin-welcome-email.ejs", label: "Admin: New Client Registered", reassignable: true },
  { key: "new-otp.ejs", label: "New OTP", reassignable: false },
  { key: "admin-new-otp.ejs", label: "Admin: New OTP", reassignable: false },
  { key: "reset-password.ejs", label: "Password Reset", reassignable: false },
  { key: "terms-conditions.ejs", label: "Terms & Conditions", reassignable: true },
  { key: "referral-invitation.ejs", label: "Referral Invitation Sent", reassignable: true },
  { key: "referral-claimed.ejs", label: "Referral Claimed", reassignable: true },
  { key: "application-action-user.ejs", label: "Application Action (Client)", reassignable: true },
  { key: "coral-active.ejs", label: "Coral Plan Activated", reassignable: true },
  { key: "plan-changed.ejs", label: "Plan Changed (Client)", reassignable: true },
  { key: "plan-changed-admin.ejs", label: "Plan Changed (Admin)", reassignable: true },
  { key: "plan-extended.ejs", label: "Plan Extended", reassignable: true },
  { key: "application-action-admin.ejs", label: "Application Action (Admin)", reassignable: true },
  { key: "discovery-tracker-change-admin.ejs", label: "Manual Application Record Changed", reassignable: true },
  { key: "grp-confirmed.ejs", label: "GRP Referral Approved", reassignable: true },
  { key: "grp-declined.ejs", label: "GRP Referral Declined", reassignable: true },
  { key: "crp-paid.ejs", label: "CRP Paid", reassignable: false },
  { key: "crp-payout-owed.ejs", label: "CRP Payout Owed", reassignable: false },
  { key: "internal-referral.ejs", label: "Internal Referral Status Change", reassignable: true },
  { key: "prp-internal.ejs", label: "Channel-Partner Referral Internal Notice", reassignable: true },
  { key: "prp-thankyou.ejs", label: "Channel-Partner Thank You", reassignable: true },
  { key: "admin-revised-documents.ejs", label: "CV Revision Uploaded (Admin)", reassignable: true },
  { key: "client-revised-documents.ejs", label: "CV Revision Uploaded (Client)", reassignable: true },
  { key: "vcs-prompt-change-admin.ejs", label: "VCS Prompt Changed", reassignable: true },
  { key: "availability-declined-client.ejs", label: "Availability Slot Declined", reassignable: true },
  { key: "availability-reschedule-proposed.ejs", label: "Reschedule Proposed", reassignable: true },
  { key: "session-rescheduled.ejs", label: "Session Rescheduled", reassignable: true },
  { key: "session-confirmed.ejs", label: "Client: Session Confirmed", reassignable: true },
  { key: "coach-session-confirmed.ejs", label: "Coach: Session Confirmed", reassignable: true },
  { key: "admin-session-booked.ejs", label: "Admin: Session Booked", reassignable: true },
  { key: "session-booked-client.ejs", label: "Session Booked (Client)", reassignable: true },
  { key: "session-booked-coach.ejs", label: "Session Booked (Coach)", reassignable: true },
  { key: "session-booked-admin.ejs", label: "Session Booked (Admin)", reassignable: true },
  { key: "coach-availability-proposal.ejs", label: "Coach Proposes Availability", reassignable: true },
  { key: "availability-declined.ejs", label: "Availability Declined", reassignable: true },
  { key: "service-subscription-user.ejs", label: "Service Subscription (User)", reassignable: true },
  { key: "service-subscription-admin.ejs", label: "Service Subscription (Admin)", reassignable: true },
  { key: "service-selection-confirmed-client.ejs", label: "Service Selection Confirmed (Client)", reassignable: true },
  { key: "service-selection-confirmed-admin.ejs", label: "Service Selection Recorded (Admin)", reassignable: true },
  { key: "DispatchPreference.ejs", label: "Campaign Preference Dispatch", reassignable: true },
  { key: "AdminNotificationTemplate.ejs", label: "Campaign Admin Notification", reassignable: true },
  { key: "DispatchCredentials.ejs", label: "Campaign Credentials Dispatch", reassignable: true },
  { key: "content-generated.ejs", label: "AI Content Generation Done", reassignable: true },
  { key: "jobsite-credential-pending.ejs", label: "Jobsite Credential: Pending", reassignable: true },
  { key: "jobsite-credential-pending-admin.ejs", label: "Jobsite Credential: Pending (Admin)", reassignable: true },
  { key: "jobsite-credential-accepted-admin.ejs", label: "Jobsite Credential: Accepted (Admin)", reassignable: true },
  { key: "jobsite-credential-test.ejs", label: "Jobsite Credential: Test", reassignable: true },
  { key: "jobsite-credential-test-admin.ejs", label: "Jobsite Credential: Test (Admin)", reassignable: true },
  { key: "jobsite-credential-approved.ejs", label: "Jobsite Credential: Approved", reassignable: true },
  { key: "jobsite-credential-approved-admin.ejs", label: "Jobsite Credential: Approved (Admin)", reassignable: true },
  { key: "jobsite-credential-failed.ejs", label: "Jobsite Credential: Failed", reassignable: true },
  { key: "jobsite-credential-rejected-admin.ejs", label: "Jobsite Credential: Rejected (Admin)", reassignable: true },
  { key: "client-missing-info.ejs", label: "Missing Info Request (Client, v1)", reassignable: true },
  { key: "admin-missing-info.ejs", label: "Missing Info Request (Admin, v1)", reassignable: true },
  { key: "client-missing-info-v2.ejs", label: "Missing Info Request (Client, v2)", reassignable: true },
  { key: "admin-missing-info-v2.ejs", label: "Missing Info Request (Admin, v2)", reassignable: true },
  { key: "missing-info-delivery-report.ejs", label: "Missing Info Delivery Report", reassignable: true },
  { key: "client-support-documents-admin.ejs", label: "Support Document Uploaded (Admin)", reassignable: true },
];

export const isReassignableTrigger = (triggerKey: string): boolean =>
  EMAIL_TRIGGERS.find((t) => t.key === triggerKey)?.reassignable ?? false;

export const findTriggerDefinition = (triggerKey: string): EmailTriggerDefinition | undefined =>
  EMAIL_TRIGGERS.find((t) => t.key === triggerKey);
