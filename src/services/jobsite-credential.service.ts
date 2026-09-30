import crypto from "crypto";
import { getServiceLogger } from "../utils/createLogger";
import { sendMail } from "../config/sendGrid";
import ErrorHandler from "../utils/errorHandler";
import { fieldEncryption } from "../utils/field-encryption";
import {
  JobsiteCredentialSource,
  JobsiteCredentialStatus,
  JobsiteCredentialRejectionReason,
  SlackChannel,
  SlackEventType,
  SlackNode,
  SlackProvider,
  SlackSeverity,
} from "../utils/enum";
import { JobsiteCredential } from "../models/v1/jobsite-credential.model";
import { JobsiteCredentialAudit } from "../models/v1/jobsite-credential-audit.model";
import { User } from "../models/v1/user.model";
import { Credentials } from "../models/v1/credentials.model";
import { Plan } from "../models/v1/plan.model";
import { SlackService } from "./slack.service";
import { PROD_FRONTEND_URL, TEAM_EMAIL } from "../config/env";
import { activateCoralPlan } from "./admin-plan.service";
import { isSocialVerificationCompleteForUser } from "./admin/social-verification.service";

const logger = getServiceLogger("JobsiteCredentialService");

// User.email is a virtual field populated only by User's own @AfterFind
// hook, which decrypts it -- but that hook only fires for a *direct* query
// against User. It never runs for a User pulled in via `include` (Sequelize
// does not re-dispatch a nested model's find hooks), so `client.email` off
// an included/associated User is always undefined here, no matter what its
// own `attributes` list requests. Same fallback pattern already used in
// missing-info-request-staff.service.ts.
async function resolveClientEmail(client: User): Promise<string | null> {
  if (client.email) return client.email;
  try {
    const decrypted = await fieldEncryption.getDecryptedUsersBatch([client.id]);
    return decrypted.get(client.id)?.email ?? null;
  } catch (err: any) {
    logger.warn(
      `Failed to resolve client email via field_encryption fallback for ${client.id}: ${err?.message || err}`,
    );
    return null;
  }
}

function generateJobsitePassword(): string {
  // System-generated password for the jobsite accounts the SPC opens by
  // hand. Never the client's own email password — that is never requested.
  // Matches the charset used by the existing generateExternalPassword
  // (campaign.service.ts) so generated passwords are consistent across
  // both systems.
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
  let password = "";
  for (let i = 0; i < 16; i++) {
    password += chars.charAt(crypto.randomInt(chars.length));
  }
  return password;
}

export async function submitJobsiteCredential(
  clientId: string,
  email: string,
): Promise<JobsiteCredential> {
  try {
    if (!email || !email.trim()) {
      throw new ErrorHandler("Application email is required", 400);
    }

    const client = await User.findByPk(clientId, {
      attributes: ["id", "firstName", "lastName"],
    });

    if (!client) {
      throw new ErrorHandler("Client not found", 404);
    }

    const credential = await JobsiteCredential.create({
      clientId,
      email: email.trim(),
      status: JobsiteCredentialStatus.PENDING,
      source: JobsiteCredentialSource.CUSTOMER,
    } as any);

    await JobsiteCredentialAudit.create({
      jobsiteCredentialId: credential.id,
      action: "SUBMITTED",
      actorId: clientId,
      statusTo: JobsiteCredentialStatus.PENDING,
    } as any);

    logger.info(
      `Client ${clientId} submitted jobsite credential ${credential.id} (${email})`,
    );

    setImmediate(async () => {
      try {
        await sendSubmittedNotifications(credential, client);
      } catch (err) {
        logger.error("Background submit notification error:", err);
      }
    });

    return credential;
  } catch (error: any) {
    logger.error("Failed to submit jobsite credential:", error);
    if (error instanceof ErrorHandler) throw error;
    throw new ErrorHandler("Failed to submit jobsite credential", 500);
  }
}

// Redesign: Slack fires only on the two events that move work forward or
// hold it up (email forwarding completed -> needs approval; Validate/Test
// failed). A routine submission that hasn't been forwarded yet is not one
// of those — no Slack post here, only the client-facing pending email.
async function sendSubmittedNotifications(
  credential: JobsiteCredential,
  client: User,
): Promise<void> {
  const frontendUrl = PROD_FRONTEND_URL || "https://rat.customer.cvtocareer.com";
  const currentYear = new Date().getFullYear();
  const clientEmail = await resolveClientEmail(client);

  const [clientResult, teamResult] = await Promise.allSettled([
    sendMail({
      email: clientEmail!,
      subject: "One more step ⏳ — CVtoCAREER",
      templateName: "jobsite-credential-pending.ejs",
      templateData: {
        name: client.firstName,
        email: credential.email,
        isStaffAdded: credential.source === JobsiteCredentialSource.STAFF,
        frontendUrl,
        currentYear,
      },
    }),
    sendMail({
      email: TEAM_EMAIL!,
      subject: `Jobsite Credential Submitted — ${client.firstName} ${client.lastName}`,
      templateName: "jobsite-credential-pending-admin.ejs",
      templateData: {
        clientName: `${client.firstName} ${client.lastName}`,
        credentialEmail: credential.email,
        currentYear,
      },
    }),
  ]);

  if (clientResult.status === "rejected") {
    logger.error(
      `Failed to send jobsite-credential-pending email to ${clientEmail}:`,
      clientResult.reason,
    );
  }
  if (teamResult.status === "rejected") {
    logger.error(
      `Failed to send jobsite-credential-pending-admin email to ${TEAM_EMAIL}:`,
      teamResult.reason,
    );
  }
}

// Manual entry for one client, when they cannot self-serve (C2C-179).
// Same lifecycle as a client submission — starts PENDING, same forwarding
// check applies — the only difference is who initiated it, which the
// audit trail records.
export async function addJobsiteCredentialManually(
  clientId: string,
  email: string,
  adminId: string,
): Promise<JobsiteCredential> {
  try {
    if (!email || !email.trim()) {
      throw new ErrorHandler("Application email is required", 400);
    }

    const client = await User.findByPk(clientId, {
      attributes: ["id", "firstName", "lastName"],
    });

    if (!client) {
      throw new ErrorHandler("Client not found", 404);
    }

    const credential = await JobsiteCredential.create({
      clientId,
      email: email.trim(),
      status: JobsiteCredentialStatus.PENDING,
      source: JobsiteCredentialSource.STAFF,
    } as any);

    await JobsiteCredentialAudit.create({
      jobsiteCredentialId: credential.id,
      action: "SUBMITTED",
      actorId: adminId,
      statusTo: JobsiteCredentialStatus.PENDING,
      note: "Added manually by staff — client could not self-serve",
    } as any);

    logger.info(
      `Admin ${adminId} manually added jobsite credential ${credential.id} for client ${clientId} (${email})`,
    );

    setImmediate(async () => {
      try {
        await sendSubmittedNotifications(credential, client);
      } catch (err) {
        logger.error("Background submit notification error:", err);
      }
    });

    return credential;
  } catch (error: any) {
    logger.error("Failed to manually add jobsite credential:", error);
    if (error instanceof ErrorHandler) throw error;
    throw new ErrorHandler("Failed to add jobsite credential", 500);
  }
}

// Requires the client to have already completed email forwarding
// (FORWARDED) — "you cannot accept a mailbox you cannot yet reach."
// Moves FORWARDED -> ACCEPTED. This is also the point where the client
// loses the ability to edit their application email (see
// updateMyJobsiteCredentialEmail in the customer backend). No Slack post
// on Accept specifically — every other action in this pipeline does
// post. Once accepted, staff can send as many Test emails as they like;
// Approve/Reject stay disabled in the UI until Test has been clicked at
// least once.
export async function acceptJobsiteCredential(
  credentialId: string,
  adminId: string,
): Promise<JobsiteCredential> {
  try {
    const credential = await JobsiteCredential.findOne({
      where: { id: credentialId },
      include: [
        {
          model: User,
          as: "client",
          attributes: ["id", "firstName", "lastName"],
          required: true,
        },
      ],
    });

    if (!credential) {
      throw new ErrorHandler("Jobsite credential not found", 404);
    }

    if (credential.status !== JobsiteCredentialStatus.FORWARDED) {
      throw new ErrorHandler(
        "Only a credential with completed email forwarding can be accepted",
        400,
      );
    }

    const statusFrom = credential.status;

    await credential.update({
      status: JobsiteCredentialStatus.ACCEPTED,
      rejectionReason: null,
      rejectionNote: null,
      acceptedAt: new Date(),
    } as any);

    await JobsiteCredentialAudit.create({
      jobsiteCredentialId: credential.id,
      action: "ACCEPTED",
      actorId: adminId,
      statusFrom,
      statusTo: JobsiteCredentialStatus.ACCEPTED,
    } as any);

    logger.info(
      `Admin ${adminId} accepted jobsite credential ${credentialId} — client can no longer edit; next: Test`,
    );

    setImmediate(async () => {
      try {
        await sendAcceptedNotification(credential, adminId);
      } catch (err) {
        logger.error("Background accepted notification error:", err);
      }
    });

    return credential;
  } catch (error: any) {
    logger.error("Failed to accept jobsite credential:", error);
    if (error instanceof ErrorHandler) throw error;
    throw new ErrorHandler("Failed to accept jobsite credential", 500);
  }
}

// Internal-only — no client email on Accept (client already knows they
// finished forwarding); this just keeps the team in the loop.
async function sendAcceptedNotification(
  credential: JobsiteCredential,
  adminId: string,
): Promise<void> {
  const client = (credential as any).client as User;
  const currentYear = new Date().getFullYear();

  await sendMail({
    email: TEAM_EMAIL!,
    subject: `Jobsite Credential Accepted — ${client.firstName} ${client.lastName}`,
    templateName: "jobsite-credential-accepted-admin.ejs",
    templateData: {
      clientName: `${client.firstName} ${client.lastName}`,
      credentialEmail: credential.email,
      adminId,
      currentYear,
    },
  });
}

// Soft reversal, not a rejection — no reason required, no client
// notification. Moves one stage backward: ACTIVE -> ACCEPTED
// ("unapprove" — the mailbox stopped working after going live, or staff
// approved too hastily), or ACCEPTED -> FORWARDED (undoes Accept, hands
// the client back the ability to edit their email). Lets staff undo a
// decision and immediately re-accept/re-test/re-approve once whatever
// was wrong is fixed, without going through the closed-reason Reject
// flow. Posts to Slack only — no client-facing email, since this is a
// staff-side correction, not a decision the client needs to act on.
export async function unapproveJobsiteCredential(
  credentialId: string,
  adminId: string,
  host: string,
): Promise<JobsiteCredential> {
  try {
    const credential = await JobsiteCredential.findOne({
      where: { id: credentialId },
      include: [
        {
          model: User,
          as: "client",
          attributes: ["id", "firstName", "lastName"],
          required: true,
        },
      ],
    });

    if (!credential) {
      throw new ErrorHandler("Jobsite credential not found", 404);
    }

    const statusFrom = credential.status;
    let statusTo: JobsiteCredentialStatus;
    const updates: Record<string, any> = {};

    if (statusFrom === JobsiteCredentialStatus.ACTIVE) {
      statusTo = JobsiteCredentialStatus.ACCEPTED;
      updates.generatedPassword = null;
    } else if (statusFrom === JobsiteCredentialStatus.ACCEPTED) {
      statusTo = JobsiteCredentialStatus.FORWARDED;
      updates.acceptedAt = null;
      updates.testedAt = null;
    } else {
      throw new ErrorHandler(
        "Only an active or accepted credential can be unapproved",
        400,
      );
    }

    await credential.update({ status: statusTo, ...updates } as any);

    await JobsiteCredentialAudit.create({
      jobsiteCredentialId: credential.id,
      action: "UNAPPROVED",
      actorId: adminId,
      statusFrom,
      statusTo,
    } as any);

    logger.info(
      `Admin ${adminId} unapproved jobsite credential ${credentialId} — back to ${statusTo}`,
    );

    setImmediate(async () => {
      try {
        await sendUnapprovedNotification(credential, statusFrom, statusTo, host);
      } catch (err) {
        logger.error("Background unapproved Slack notification error:", err);
      }
    });

    return credential;
  } catch (error: any) {
    logger.error("Failed to unapprove jobsite credential:", error);
    if (error instanceof ErrorHandler) throw error;
    throw new ErrorHandler("Failed to unapprove jobsite credential", 500);
  }
}

// Slack-only — staff-side correction, not a client-facing event.
async function sendUnapprovedNotification(
  credential: JobsiteCredential,
  statusFrom: JobsiteCredentialStatus,
  statusTo: JobsiteCredentialStatus,
  host: string,
): Promise<void> {
  const client = (credential as any).client as User;

  await SlackService.notify({
    host,
    node: SlackNode.USER_MANAGEMENT,
    provider: SlackProvider.SYSTEM,
    severity: SlackSeverity.INFO,
    type: SlackEventType.ADMIN_ACTION,
    trigger: "jobsite-credential-unapproved",
    channel: SlackChannel.TOWN_CRIER,
    body: `↩️ Credential unapproved — back to ${statusTo.toUpperCase()}\nClient: ${client.firstName} ${client.lastName}\nApplication email: ${credential.email}\nWas: ${statusFrom.toUpperCase()}`,
  });
}

// Sends an actual test email to the delegated mailbox so staff can
// confirm — outside this app, in Gmail — whether it really arrives.
// Purely informational: does NOT change status and can be sent any
// number of times while ACCEPTED. The real decision (does the mailbox
// actually work) is made separately via approveJobsiteCredential or
// rejectJobsiteCredential, based on what staff observed.
export async function sendTestEmail(
  credentialId: string,
  adminId: string,
  host: string,
): Promise<JobsiteCredential> {
  try {
    const credential = await JobsiteCredential.findOne({
      where: { id: credentialId },
      include: [
        {
          model: User,
          as: "client",
          attributes: ["id", "firstName", "lastName"],
          required: true,
        },
      ],
    });

    if (!credential) {
      throw new ErrorHandler("Jobsite credential not found", 404);
    }

    if (credential.status !== JobsiteCredentialStatus.ACCEPTED) {
      throw new ErrorHandler(
        "Only an accepted credential can receive a test email",
        400,
      );
    }

    await credential.update({ testedAt: new Date() } as any);

    await JobsiteCredentialAudit.create({
      jobsiteCredentialId: credential.id,
      action: "TEST_EMAIL_SENT",
      actorId: adminId,
    } as any);

    logger.info(
      `Admin ${adminId} sent a test email for jobsite credential ${credentialId}`,
    );

    setImmediate(async () => {
      try {
        await sendTestEmailMessage(credential, adminId, host);
      } catch (err) {
        logger.error("Background test email send error:", err);
      }
    });

    return credential;
  } catch (error: any) {
    logger.error("Failed to send test email:", error);
    if (error instanceof ErrorHandler) throw error;
    throw new ErrorHandler("Failed to send test email", 500);
  }
}

async function sendTestEmailMessage(
  credential: JobsiteCredential,
  adminId: string,
  host: string,
): Promise<void> {
  const client = (credential as any).client as User;
  const currentYear = new Date().getFullYear();

  const [clientResult, teamResult] = await Promise.allSettled([
    sendMail({
      email: credential.email,
      subject: "Test email — CVtoCAREER",
      templateName: "jobsite-credential-test.ejs",
      templateData: {
        name: client.firstName,
        currentYear,
      },
    }),
    sendMail({
      email: TEAM_EMAIL!,
      subject: `Jobsite Credential Test Email Sent — ${client.firstName} ${client.lastName}`,
      templateName: "jobsite-credential-test-admin.ejs",
      templateData: {
        clientName: `${client.firstName} ${client.lastName}`,
        credentialEmail: credential.email,
        adminId,
        currentYear,
      },
    }),
  ]);

  if (clientResult.status === "rejected") {
    logger.error(
      `Failed to send jobsite-credential-test email to ${credential.email}:`,
      clientResult.reason,
    );
  }
  if (teamResult.status === "rejected") {
    logger.error(
      `Failed to send jobsite-credential-test-admin email to ${TEAM_EMAIL}:`,
      teamResult.reason,
    );
  }

  await SlackService.notify({
    host,
    node: SlackNode.USER_MANAGEMENT,
    provider: SlackProvider.SYSTEM,
    severity: SlackSeverity.INFO,
    type: SlackEventType.ADMIN_ACTION,
    trigger: "jobsite-credential-test-email-sent",
    channel: SlackChannel.TOWN_CRIER,
    body: `✉️ Test email sent\nClient: ${client.firstName} ${client.lastName}\nApplication email: ${credential.email}`,
  });
}

// Requires ACCEPTED, and staff must have clicked Test at least once
// first (UI-enforced, see the frontend's disabled state). Moves
// ACCEPTED -> ACTIVE, generates the jobsite password (once, only on
// approval, not before), sends the client the approved email, and posts
// to Slack. This is the only state that clears the application gate.
export async function approveJobsiteCredential(
  credentialId: string,
  adminId: string,
  host: string,
): Promise<JobsiteCredential> {
  try {
    const credential = await JobsiteCredential.findOne({
      where: { id: credentialId },
      include: [
        {
          model: User,
          as: "client",
          // "email" here does NOT actually decrypt the field -- User's
          // @AfterFind decrypt hook never fires for an included/associated
          // model (Sequelize only dispatches find hooks for the model a
          // query is run directly against), so listing it is a no-op for
          // an include. Kept anyway since it's harmless and documents
          // intent; sendActiveNotifications resolves the real value via
          // resolveClientEmail()'s field_encryption fallback instead.
          attributes: ["id", "firstName", "lastName", "email", "isAmbassador"],
          required: true,
        },
      ],
    });

    if (!credential) {
      throw new ErrorHandler("Jobsite credential not found", 404);
    }

    if (credential.status !== JobsiteCredentialStatus.ACCEPTED) {
      throw new ErrorHandler(
        "Only an accepted credential can be approved",
        400,
      );
    }

    const generatedPassword = generateJobsitePassword();

    await credential.update({
      status: JobsiteCredentialStatus.ACTIVE,
      approvedBy: adminId,
      approvedAt: new Date(),
      generatedPassword,
    } as any);

    await JobsiteCredentialAudit.create({
      jobsiteCredentialId: credential.id,
      action: "APPROVED",
      actorId: adminId,
      statusFrom: JobsiteCredentialStatus.ACCEPTED,
      statusTo: JobsiteCredentialStatus.ACTIVE,
    } as any);

    logger.info(
      `Admin ${adminId} approved jobsite credential ${credentialId} — now ACTIVE`,
    );

    setImmediate(async () => {
      try {
        await sendActiveNotifications(credential, adminId, host);
      } catch (err) {
        logger.error("Background active notification error:", err);
      }
    });

    // Coral auto-activation for Ambassador (SPR-21-43-008): once the
    // client's jobsite credential is approved AND their social
    // verification is complete, activate the 14-day Coral trial without
    // any further admin action. The activateCoralPlan service already
    // guards on isAmbassador and rejects if an active plan exists, so
    // extra guards here would only duplicate its checks. Non-ambassador
    // approvals fall through untouched. Emerald activation is not
    // triggered here — for partner-referred guests the Emerald plan is
    // created by the customer BE at signup (handleEmeraldPlanCreation),
    // so by the time credential approval runs the plan already exists.
    const client = (credential as any).client as User;
    if (client?.isAmbassador) {
      setImmediate(async () => {
        try {
          const socialComplete = await isSocialVerificationCompleteForUser(client.id);
          if (!socialComplete) {
            logger.info(
              `[CoralAutoActivate] Skipping — social verification incomplete for ambassador ${client.id}`,
            );
            return;
          }
          const activePlan = await Plan.findOne({
            where: { userId: client.id, hasExpired: false },
          });
          if (activePlan) {
            logger.info(
              `[CoralAutoActivate] Skipping — ambassador ${client.id} already has an active plan (${activePlan.id})`,
            );
            return;
          }
          logger.info(
            `[CoralAutoActivate] Activating Coral for ambassador ${client.id} via credential approval`,
          );
          await activateCoralPlan(host, client.id);
        } catch (err: any) {
          // Best-effort — activation failures must not roll back the
          // credential approval itself. Slack alert is already fired by
          // activateCoralPlan for its own internal errors; log here for
          // failures before it runs (e.g. social-verification lookup
          // error).
          logger.error(
            `[CoralAutoActivate] Failed for ambassador ${client.id}: ${err?.message || err}`,
          );
        }
      });
    }

    return credential;
  } catch (error: any) {
    logger.error("Failed to approve jobsite credential:", error);
    if (error instanceof ErrorHandler) throw error;
    throw new ErrorHandler("Failed to approve jobsite credential", 500);
  }
}

// Client-facing notification once the mailbox is approved and live.
async function sendActiveNotifications(
  credential: JobsiteCredential,
  adminId: string,
  host: string,
): Promise<void> {
  const client = (credential as any).client as User;
  const frontendUrl = PROD_FRONTEND_URL || "https://rat.customer.cvtocareer.com";
  const currentYear = new Date().getFullYear();
  const clientEmail = await resolveClientEmail(client);

  const [clientResult, teamResult] = await Promise.allSettled([
    sendMail({
      email: clientEmail!,
      subject: "Email approved ✓ — CVtoCAREER",
      templateName: "jobsite-credential-approved.ejs",
      templateData: {
        name: client.firstName,
        email: credential.email,
        isAmbassador: !!(client as any).isAmbassador,
        frontendUrl,
        currentYear,
      },
    }),
    sendMail({
      email: TEAM_EMAIL!,
      subject: `Jobsite Credential Approved — ${client.firstName} ${client.lastName}`,
      templateName: "jobsite-credential-approved-admin.ejs",
      templateData: {
        clientName: `${client.firstName} ${client.lastName}`,
        credentialEmail: credential.email,
        adminId,
        currentYear,
      },
    }),
  ]);

  if (clientResult.status === "rejected") {
    logger.error(
      `Failed to send jobsite-credential-approved email to ${clientEmail}:`,
      clientResult.reason,
    );
  }
  if (teamResult.status === "rejected") {
    logger.error(
      `Failed to send jobsite-credential-approved-admin email to ${TEAM_EMAIL}:`,
      teamResult.reason,
    );
  }

  await SlackService.notify({
    host,
    node: SlackNode.USER_MANAGEMENT,
    provider: SlackProvider.SYSTEM,
    severity: SlackSeverity.INFO,
    type: SlackEventType.ADMIN_ACTION,
    trigger: "jobsite-credential-approved",
    channel: SlackChannel.TOWN_CRIER,
    body: `✅ Credential approved — now ACTIVE\nClient: ${client.firstName} ${client.lastName}\nApplication email: ${credential.email}\nNext step: SPC to create the accounts`,
  });
}

export async function rejectJobsiteCredential(
  credentialId: string,
  adminId: string,
  reason: JobsiteCredentialRejectionReason,
  host: string,
  note: string | undefined,
): Promise<JobsiteCredential> {
  try {
    if (
      !reason ||
      !Object.values(JobsiteCredentialRejectionReason).includes(reason)
    ) {
      throw new ErrorHandler(
        "A valid rejection reason is required — free text is not accepted",
        400,
      );
    }

    const credential = await JobsiteCredential.findOne({
      where: { id: credentialId },
      include: [
        {
          model: User,
          as: "client",
          // See approveJobsiteCredential's include above — "email" here is
          // a no-op (AfterFind never fires for includes); sendRejected-
          // Notifications resolves the real value via resolveClientEmail().
          attributes: ["id", "firstName", "lastName", "email"],
          required: true,
        },
      ],
    });

    if (!credential) {
      throw new ErrorHandler("Jobsite credential not found", 404);
    }

    const statusFrom = credential.status;

    await credential.update({
      status: JobsiteCredentialStatus.FAILED,
      rejectionReason: reason,
      rejectionNote: note?.trim() || null,
    } as any);

    await JobsiteCredentialAudit.create({
      jobsiteCredentialId: credential.id,
      action: "REJECTED",
      actorId: adminId,
      statusFrom,
      statusTo: JobsiteCredentialStatus.FAILED,
      reasonCode: reason,
      note: note?.trim() || undefined,
    } as any);

    logger.info(
      `Admin ${adminId} rejected jobsite credential ${credentialId} — ${reason}`,
    );

    setImmediate(async () => {
      try {
        await sendRejectedNotifications(credential, adminId, reason, host, note);
      } catch (err) {
        logger.error("Background reject notification error:", err);
      }
    });

    return credential;
  } catch (error: any) {
    logger.error("Failed to reject jobsite credential:", error);
    if (error instanceof ErrorHandler) throw error;
    throw new ErrorHandler("Failed to reject jobsite credential", 500);
  }
}

async function sendRejectedNotifications(
  credential: JobsiteCredential,
  adminId: string,
  reason: JobsiteCredentialRejectionReason,
  host: string,
  note: string | undefined,
): Promise<void> {
  const client = (credential as any).client as User;
  const frontendUrl = PROD_FRONTEND_URL || "https://rat.customer.cvtocareer.com";
  const currentYear = new Date().getFullYear();
  const clientEmail = await resolveClientEmail(client);

  // Email → client (exact reason, never "something went wrong") + team,
  // sent concurrently so one failing send never suppresses the other.
  const [clientResult, teamResult] = await Promise.allSettled([
    sendMail({
      email: clientEmail!,
      subject: "Email approval failed — CVtoCAREER",
      templateName: "jobsite-credential-failed.ejs",
      templateData: {
        name: client.firstName,
        email: credential.email,
        reasonCode: reason,
        optionalNote: note?.trim() || null,
        frontendUrl,
        currentYear,
      },
    }),
    sendMail({
      email: TEAM_EMAIL!,
      subject: `Jobsite Credential Rejected — ${client.firstName} ${client.lastName}`,
      templateName: "jobsite-credential-rejected-admin.ejs",
      templateData: {
        clientName: `${client.firstName} ${client.lastName}`,
        credentialEmail: credential.email,
        adminId,
        reason,
        note: note?.trim() || null,
        currentYear,
      },
    }),
  ]);

  if (clientResult.status === "rejected") {
    logger.error(
      `Failed to send jobsite-credential-failed email to ${clientEmail}:`,
      clientResult.reason,
    );
  }
  if (teamResult.status === "rejected") {
    logger.error(
      `Failed to send jobsite-credential-rejected-admin email to ${TEAM_EMAIL}:`,
      teamResult.reason,
    );
  }

  // Slack → TOWN_CRIER
  await SlackService.notify({
    host,
    node: SlackNode.USER_MANAGEMENT,
    provider: SlackProvider.SYSTEM,
    severity: SlackSeverity.ERROR,
    type: SlackEventType.ADMIN_ACTION,
    trigger: "jobsite-credential-rejected",
    channel: SlackChannel.TOWN_CRIER,
    body: `✕ *Credential REJECTED — ${client.firstName} ${client.lastName}*\n\n*Email:* ${credential.email}\n*Reason:* ${reason}${note ? `\n*Note:* "${note.trim()}"` : ""}\n*Client notified:* yes — with the reason\n*Submissions:* 🛑 STILL BLOCKED`,
  });
}

export interface EditJobsiteCredentialPayload {
  email?: string;
  generatedPassword?: string;
}

// Inline edit from the admin table — every edit writes its own audit
// entry (S.ADM.19.01.IR08), same as a status change.
export async function editJobsiteCredential(
  credentialId: string,
  adminId: string,
  payload: EditJobsiteCredentialPayload,
): Promise<JobsiteCredential> {
  try {
    const credential = await JobsiteCredential.findByPk(credentialId);

    if (!credential) {
      throw new ErrorHandler("Jobsite credential not found", 404);
    }

    const updates: Partial<EditJobsiteCredentialPayload> = {};
    if (payload.email !== undefined && payload.email.trim()) {
      updates.email = payload.email.trim();
    }
    if (payload.generatedPassword !== undefined) {
      updates.generatedPassword = payload.generatedPassword;
    }

    if (Object.keys(updates).length === 0) {
      throw new ErrorHandler("No changes provided", 400);
    }

    await credential.update(updates as any);

    await JobsiteCredentialAudit.create({
      jobsiteCredentialId: credential.id,
      action: "EDITED",
      actorId: adminId,
      note: `Fields changed: ${Object.keys(updates).join(", ")}`,
    } as any);

    logger.info(
      `Admin ${adminId} edited jobsite credential ${credentialId} — fields: ${Object.keys(updates).join(", ")}`,
    );

    return credential;
  } catch (error: any) {
    logger.error("Failed to edit jobsite credential:", error);
    if (error instanceof ErrorHandler) throw error;
    throw new ErrorHandler("Failed to edit jobsite credential", 500);
  }
}

export async function revealJobsiteCredentialPassword(
  credentialId: string,
  adminId: string,
): Promise<string | null> {
  try {
    const credential = await JobsiteCredential.findByPk(credentialId);

    if (!credential) {
      throw new ErrorHandler("Jobsite credential not found", 404);
    }

    // The reveal itself is the audited act — not a courtesy log.
    await JobsiteCredentialAudit.create({
      jobsiteCredentialId: credential.id,
      action: "PASSWORD_REVEALED",
      actorId: adminId,
    } as any);

    logger.info(
      `Admin ${adminId} revealed the jobsite password for credential ${credentialId}`,
    );

    return credential.generatedPassword ?? null;
  } catch (error: any) {
    logger.error("Failed to reveal jobsite credential password:", error);
    if (error instanceof ErrorHandler) throw error;
    throw new ErrorHandler("Failed to reveal jobsite credential password", 500);
  }
}

export interface CsvImportRow {
  clientEmail: string;
  applicationEmail: string;
}

export interface CsvImportResult {
  created: number;
  skipped: { row: number; reason: string }[];
}

// One-time migration of the existing book (C2C-180). Validated on upload;
// creates no jobsite accounts — that stays manual SPC work. Rows are
// matched to an existing client by clientEmail; a row with no matching
// client, or a client who already has a credential, is skipped and
// reported back, not silently dropped.
export async function importJobsiteCredentialsFromCsv(
  rows: CsvImportRow[],
  adminId: string,
): Promise<CsvImportResult> {
  const result: CsvImportResult = { created: 0, skipped: [] };

  for (let i = 0; i < rows.length; i++) {
    const rowNumber = i + 2; // +1 for 0-index, +1 for the header row
    const { clientEmail, applicationEmail } = rows[i];

    if (!clientEmail?.trim() || !applicationEmail?.trim()) {
      result.skipped.push({
        row: rowNumber,
        reason: "Missing clientEmail or applicationEmail",
      });
      continue;
    }

    try {
      const clientUserId = await fieldEncryption.findUserByEmail(clientEmail.trim());
      const client = clientUserId ? await User.findByPk(clientUserId, {
        attributes: ["id"],
      }) : null;

      if (!client) {
        result.skipped.push({
          row: rowNumber,
          reason: `No client found with email ${clientEmail.trim()}`,
        });
        continue;
      }

      const existing = await JobsiteCredential.findOne({
        where: { clientId: client.id },
      });

      if (existing) {
        result.skipped.push({
          row: rowNumber,
          reason: `Client already has a jobsite credential (${existing.status})`,
        });
        continue;
      }

      const credential = await JobsiteCredential.create({
        clientId: client.id,
        email: applicationEmail.trim(),
        status: JobsiteCredentialStatus.PENDING,
        source: JobsiteCredentialSource.STAFF,
      } as any);

      await JobsiteCredentialAudit.create({
        jobsiteCredentialId: credential.id,
        action: "SUBMITTED",
        actorId: adminId,
        statusTo: JobsiteCredentialStatus.PENDING,
        note: `Imported from CSV, row ${rowNumber}`,
      } as any);

      result.created++;
    } catch (error: any) {
      logger.error(`CSV import failed on row ${rowNumber}:`, error);
      result.skipped.push({
        row: rowNumber,
        reason: "Unexpected error — see server logs",
      });
    }
  }

  logger.info(
    `Admin ${adminId} imported jobsite credentials from CSV: ${result.created} created, ${result.skipped.length} skipped`,
  );

  return result;
}

export async function getMyJobsiteCredential(
  clientId: string,
): Promise<JobsiteCredential | null> {
  try {
    // Never returns generatedPassword — that field is staff-only, revealed
    // (and audited) exclusively through revealJobsiteCredentialPassword.
    const credential = await JobsiteCredential.findOne({
      where: { clientId },
      order: [["createdAt", "DESC"]],
    });

    return credential;
  } catch (error: any) {
    logger.error(`Failed to retrieve jobsite credential for client ${clientId}:`, error);
    throw new ErrorHandler("Failed to retrieve jobsite credential", 500);
  }
}

// SPC = Submission Placement Controller, the existing staff role (see
// AssignVA.tsx / Credentials.AssignedCompletedName+Email) already
// responsible for the submission stage of the DPC -> VPC -> SPC pipeline.
// Once a credential is ACTIVE, creating the actual jobsite accounts is
// this same role's job by hand — surfacing who that is here ties the new
// workflow into the existing assignment instead of leaving it unlinked.
async function attachSpc<T extends { clientId: string }>(
  credential: T,
): Promise<T & { spcName: string | null; spcEmail: string | null }> {
  const assignment = await Credentials.findOne({
    where: { clientId: credential.clientId },
  });

  return {
    ...credential,
    spcName: assignment?.AssignedCompletedName ?? null,
    spcEmail: assignment?.AssignedCompletedEmail ?? null,
  };
}

export async function getClientJobsiteCredential(
  clientId: string,
): Promise<(JobsiteCredential & { spcName: string | null; spcEmail: string | null }) | null> {
  try {
    // Staff-facing lookup, scoped to one client (e.g. the client detail
    // page). Password stays masked here too — reveal is a distinct,
    // audited action, not a side effect of loading this page.
    const credential = await JobsiteCredential.findOne({
      where: { clientId },
      order: [["createdAt", "DESC"]],
    });

    if (!credential) return null;

    return await attachSpc(credential.toJSON() as JobsiteCredential);
  } catch (error: any) {
    logger.error(
      `Failed to retrieve jobsite credential for client ${clientId}:`,
      error,
    );
    throw new ErrorHandler("Failed to retrieve jobsite credential", 500);
  }
}

export async function getAllJobsiteCredentials(): Promise<
  (JobsiteCredential & { spcName: string | null; spcEmail: string | null })[]
> {
  try {
    const credentials = await JobsiteCredential.findAll({
      include: [
        {
          model: User,
          as: "client",
          attributes: ["id", "firstName", "lastName"],
          required: true,
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    logger.info(`Retrieved ${credentials.length} jobsite credentials`);

    return await Promise.all(
      credentials.map((credential) => attachSpc(credential.toJSON() as JobsiteCredential)),
    );
  } catch (error: any) {
    logger.error("Failed to retrieve jobsite credentials:", error);
    throw new ErrorHandler("Failed to retrieve jobsite credentials", 500);
  }
}
