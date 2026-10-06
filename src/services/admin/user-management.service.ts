import { Op } from "sequelize";
import { getServiceLogger } from "../../utils/createLogger";
import ErrorHandler from "../../utils/errorHandler";
import { User } from "../../models/v1/user.model";
import { Upload } from "../../models/v1/upload.model";
import { JobsiteCredential } from "../../models/v1/jobsite-credential.model";
import { JobsiteCredentialAudit } from "../../models/v1/jobsite-credential-audit.model";
import { Message } from "../../models/v1/message.model";
import { AuditTrail } from "../../models/v1/audit-trail.model";
import { Feature } from "../../models/v1/feature.model";
import { Profile } from "../../models/v1/profile.model";
import { UserPreferenceHistory } from "../../models/v1/user-preference-history.model";
import { Referrer } from "../../models/v1/referrer.model";
import { Role, UploadStatus, Perception } from "../../utils/enum";
import { SlackService } from "../slack.service";
import { SlackChannel, SlackEventType, SlackNode, SlackProvider, SlackSeverity } from "../../utils/enum";
import { getEnvironmentFromHost } from "../../utils/slack-helpers";
import { Credentials } from "../../models/v1/credentials.model";
import { setCachedUser } from "../cache/user.cache.service";
import { markDocumentAccepted } from "../client-journey.service";
import { sendMail } from "../../config/sendGrid";
import { PROD_FRONTEND_URL, TEAM_EMAIL } from "../../config/env";

export interface IJobPreferenceQuery {
  step01?: boolean;
  step02?: boolean;
  step03?: boolean;
  step04?: boolean;
  step05?: boolean;
  isDashboard?: boolean;
}


const logger = getServiceLogger("user-management-service");

export const TRACKED_PREFERENCE_FIELDS: Array<{ key: string; label: string }> = [
  { key: "titles", label: "Role Titles to Include" },
  { key: "titlesExcluded", label: "Role Titles to Exclude" },
  { key: "keywords", label: "Keywords Within Role Titles" },
  { key: "keywordsExcluded", label: "Keywords Excluded" },
  { key: "situation", label: "Situation" },
  { key: "situationIncluded", label: "Situation" },
  { key: "country", label: "Country" },
  { key: "state", label: "State/Territory/Province to Include" },
  { key: "stateExcluded", label: "State/Territory/Province to Exclude" },
  { key: "city", label: "City/Town/Suburb to Include" },
  { key: "cityExcluded", label: "City/Town/Suburb Excluded" },
  { key: "jobTypes", label: "Job Type" },
  { key: "minSalary", label: "Min Salary" },
  { key: "maxSalary", label: "Max Salary" },
  { key: "currency", label: "Currency" },
  { key: "workingRight", label: "Working Right" },
  { key: "classifications", label: "Industries" },
  { key: "classificationsExcluded", label: "Industries Excluded" },
  { key: "advertisers", label: "Advertisers to Include" },
  { key: "advertisersExcluded", label: "Advertisers Excluded" },
  { key: "courseOfStudy", label: "Course of Study" },
  { key: "craft", label: "Course of Study" },
  { key: "isAiForCriteriaSelectionAllowed", label: "Allow AI for Criteria Selection" },
  { key: "coverletterIncluded", label: "Include Cover Letter" },
];

export function arePreferenceValuesEqual(val1: any, val2: any): boolean {
  if (val1 === val2) return true;
  if (!val1 && !val2) return true;
  if (Array.isArray(val1) && Array.isArray(val2)) {
    if (val1.length !== val2.length) return false;
    const s1 = [...val1].map((x) => (typeof x === "object" ? JSON.stringify(x) : String(x))).sort();
    const s2 = [...val2].map((x) => (typeof x === "object" ? JSON.stringify(x) : String(x))).sort();
    return JSON.stringify(s1) === JSON.stringify(s2);
  }
  if (typeof val1 === "object" || typeof val2 === "object") {
    return JSON.stringify(val1) === JSON.stringify(val2);
  }
  return String(val1 ?? "").trim() === String(val2 ?? "").trim();
}

class UserManagementService {
  /**
   * Admin can update any user details including role
   * @param userId ID of user to update
   * @param updateData Object containing fields to update
   * @param actorUserId ID of admin performing the update
   * @param actorEmail Email of admin performing the update (optional)
   * @param fullName Full name of admin performing the update (optional)
   */
  async updateUser(userId: string, updateData: any, actorUserId: string, actorEmail?: string, fullName?: string) {
    if (!userId) {
      throw new ErrorHandler("Invalid user ID.", 400);
    }

    const user = await User.findByPk(userId, { paranoid: false });
    if (!user) {
      throw new ErrorHandler("User not found.", 404);
    }

    // Prevent admin from modifying their own account via this endpoint
    if (user.id === actorUserId) {
      throw new ErrorHandler("You cannot modify your own account using this endpoint.", 400);
    }

    // If changing role, ensure at least one admin remains in system
    if (updateData.role && user.role === Role.ADMIN && updateData.role !== Role.ADMIN) {
      const adminCount = await User.count({
        where: {
          role: Role.ADMIN,
          deletedAt: null,
          id: { [Op.ne]: userId }
        }
      });

      if (adminCount < 1) {
        throw new ErrorHandler("Operation would remove the last admin. Keep at least one admin user.", 400);
      }
    }

    const beforeState = user.toJSON();

    // Allow updating all user fields
    const allowedFields = [
      'firstName', 'middleName', 'lastName', 'gender',
      'email', 'staffPerception', 'auditRequired', 'auditFindings', 'phoneNumber', 'whatsappNumber',
      'country', 'heritage', 'communication', 'role',
      'returnCount', 'revenue', 'cl', 'cr',
      'applicationStatus', 'prepSessionStatus', 'isSampleDispatched',
      'socials', 'progress', 'isActive', 'isUserSubscribed', 'isEmailVerified',
      'planId', 'plan', 'signUpAs', 'phone', 'address', 'city', 'state',
      'zipCode', 'company', 'jobTitle', 'bio', 'website', 'linkedinUrl',
      'zohoId', 'currentCityOfResidence',
      // SPR-21-41-013 AC8: admin may record approval. AC7 is enforced by
      // omission: isDocumentUploaded is deliberately NOT listed here, so the
      // upload process stays the only thing that can set it.
      'isDocumentApproved'
    ];

    // Map frontend field names to backend model columns
    const fieldAliases: Record<string, string> = {
      voiceNumber: 'phoneNumber',
    };

    // Remap aliased fields in updateData
    for (const [alias, column] of Object.entries(fieldAliases)) {
      if (updateData[alias] !== undefined && updateData[column] === undefined) {
        updateData[column] = updateData[alias];
        delete updateData[alias];
      }
    }

    // SPR-21-33-001: audit fields
    if (updateData.auditRequired !== undefined && typeof updateData.auditRequired !== 'boolean') {
      throw new ErrorHandler('auditRequired must be true or false', 400);
    }
    if (updateData.auditFindings !== undefined && updateData.auditFindings !== null) {
      if (typeof updateData.auditFindings !== 'string' || updateData.auditFindings.length > 2000) {
        throw new ErrorHandler('auditFindings must be text of at most 2000 characters', 400);
      }
    }

    // Validate staffPerception if provided
    if (updateData.staffPerception !== undefined) {
      const validPerceptions = Object.values(Perception);
      if (!validPerceptions.includes(updateData.staffPerception)) {
        throw new ErrorHandler(
          `Invalid staffPerception "${updateData.staffPerception}". Allowed values: ${validPerceptions.join(', ')}`,
          400
        );
      }
    }

    // Only update fields that actually changed
    let hasChanges = false;
    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        const currentValue = (user as any)[field];
        const newValue = updateData[field];
        
        // Only update if values are actually different
        if (JSON.stringify(currentValue) !== JSON.stringify(newValue)) {
          (user as any)[field] = newValue;
          hasChanges = true;
        }
      }
    }

    user.updatedBy = fullName || actorEmail || actorUserId;
    
    if (hasChanges) {
      await user.save();
    }

    await setCachedUser(userId, user);

    logger.info(`User ${userId} updated by admin ${actorEmail || actorUserId}`);

    // Send Slack notification for user update
    setImmediate(async () => {

      // Create audit trail
      await AuditTrail.create({
        action: "ADMIN_USER_UPDATE",
        actorUserId,
        actorEmail: actorEmail || null,
        targetType: "User",
        targetKey: user.id,
        before: beforeState,
        after: user.toJSON(),
        metadata: {
          mode: "admin-edit"
        }
      });

      try {
        const environment = getEnvironmentFromHost(process.env.LOCAL_FRONTEND_URL || 'localhost');
        
        // Get changed fields
        const changedFields = Object.keys(updateData).filter(key => 
          JSON.stringify(beforeState[key]) !== JSON.stringify(user.toJSON()[key])
        );

        await SlackService.notify({
          location: environment,
          host: process.env.LOCAL_FRONTEND_URL || 'localhost',
          node: SlackNode.USER_MANAGEMENT,
          provider: SlackProvider.SYSTEM,
          severity: SlackSeverity.INFO,
          trigger: `User Updated: ${user.email}`,
          type: SlackEventType.ADMIN_ACTION,
          channel: SlackChannel.TOWN_CRIER,
          teamMentions: "CSM",
          body: `User profile has been updated.\n\n👤 
          User: ${user.firstName} ${user.lastName} (${user.email})\n
          ✏️ Updated by: ${actorEmail || actorUserId}\n
          🔄 Changed fields: ${changedFields.join(', ')}
          Next Step: Validate whether this change is from the business`
        });
        
        logger.info(`✅ Slack notified of user update for ${user.email}`);
      } catch (err) {
        logger.error(`❌ Slack notification failed for user update: ${err}`);
      }
    });

    // Return updated user without sensitive fields
    const { password, accessToken, adminPassword, resetToken, ...userWithoutPassword } = user.toJSON();
    return userWithoutPassword;
  }

  /**
   * Approve user document
   * @param userId ID of user
   * @param documentId Type of document to approve
   * @param actorUserId ID of admin performing action
   * @param actorEmail Email of admin performing action
   */
  async approveUserDocument(documentId: string, actorUserId: string, actorEmail?: string, host?: string) {
    if (!documentId) {
      throw new ErrorHandler("Invalid document ID.", 400);
    }

    const upload = await Upload.findByPk(documentId);
    if (!upload) {
      throw new ErrorHandler("Document not found.", 404);
    }

    const user = await User.findByPk(upload.userId);
    if (!user) {
      throw new ErrorHandler("User not found.", 404);
    }

    const beforeState = user.toJSON();
    
    // Update upload model
    upload.status = UploadStatus.ACCEPTED;
    upload.approvedAt = new Date();
    upload.approvedBy = actorEmail || actorUserId;
    await upload.save();
    
    // Update user document status
    const documentType = upload.type;
    (user as any)[`${documentType}Status`] = 'ACCEPTED';
    (user as any)[`${documentType}ApprovedAt`] = new Date();
    (user as any)[`${documentType}ApprovedBy`] = actorEmail || actorUserId;
    
    user.updatedBy = actorEmail || actorUserId;
    await user.save();

    // Slack notification
    setImmediate(async () => {

      // Record the client journey completion this approval represents —
      // document_accepted has no separate "Attest" journey action, this
      // approval IS its trigger. Non-blocking: a failure here shouldn't
      // undo an otherwise-successful document approval.
      try {
        await markDocumentAccepted(user.id, actorUserId);
      } catch (err) {
        logger.error(`Failed to record document_accepted journey step for user ${user.id}: ${err}`);
      }

      // Audit trail
      await AuditTrail.create({
        action: "USER_DOCUMENT_APPROVE",
        actorUserId,
        actorEmail: actorEmail || null,
        targetType: "User",
        targetKey: user.id,
        before: beforeState,
        after: user.toJSON(),
        metadata: { documentType }
      });

      try {
        const slackHost = host || 'localhost';
        const environment = getEnvironmentFromHost(slackHost);
        await SlackService.notify({
          location: environment,
          host: slackHost,
          node: SlackNode.USER_MANAGEMENT,
          provider: SlackProvider.SYSTEM,
          severity: SlackSeverity.INFO,
          trigger: `Document Approved: ${documentType} for ${user.email}`,
          type: SlackEventType.USER_TRIGGERED,
          channel: SlackChannel.TOWN_CRIER,
          teamMentions: "CSM",
          body: `User document approved.\n\n👤 User: ${user.firstName} ${user.lastName}\n📄 Document: ${documentType}\n✅ Approved by: ${actorEmail || actorUserId}`
        });
        logger.info(`✅ Document ${documentType} approved for user ${user.id}`);
      } catch (err) {
        logger.error(`❌ Slack notification failed: ${err}`);
      }
    });

    // SPR-21-11-004: customer email confirming the document was accepted.
    // The journey tick (markDocumentAccepted above) and the #town-crier Slack
    // already fire for this approval — this adds the missing customer email.
    setImmediate(async () => {
      try {
        const frontendUrl = PROD_FRONTEND_URL || "https://rat.customer.cvtocareer.com";
        await sendMail({
          email: user.email,
          subject: "Your document has been accepted",
          templateName: "document-accepted-user.ejs",
          templateData: {
            name: user.firstName,
            documentType,
            frontendUrl,
            currentYear: new Date().getFullYear(),
          },
        });
        logger.info(`Document accepted email sent to ${user.email}`);
      } catch (err) {
        logger.error(`Document accepted email failed for user ${user.id}: ${err}`);
      }
    });

    const { password, ...userWithoutPassword } = user.toJSON();
    return userWithoutPassword;
  }

  /**
   * Reject user document
   * @param userId ID of user
   * @param documentType Type of document to reject
   * @param reason Rejection reason
   * @param actorUserId ID of admin performing action
   * @param actorEmail Email of admin performing action
   */
  async rejectUserDocument(documentId: string, reason: string, actorUserId: string, actorEmail?: string, host?: string) {
    if (!documentId) {
      throw new ErrorHandler("Invalid document ID.", 400);
    }

    const upload = await Upload.findByPk(documentId);
    if (!upload) {
      throw new ErrorHandler("Document not found.", 404);
    }

    const user = await User.findByPk(upload.userId);
    if (!user) {
      throw new ErrorHandler("User not found.", 404);
    }

    const beforeState = user.toJSON();
    
    // Update upload model
    upload.status = UploadStatus.REJECTED;
    upload.rejectedAt = new Date();
    upload.rejectedBy = actorEmail || actorUserId;
    upload.rejectionReason = reason;
    await upload.save();
    
    // Update user document status
    const documentType = upload.type;
    (user as any)[`${documentType}Status`] = 'REJECTED';
    (user as any)[`${documentType}RejectedAt`] = new Date();
    (user as any)[`${documentType}RejectedBy`] = actorEmail || actorUserId;
    (user as any)[`${documentType}RejectionReason`] = reason;
    
    user.updatedBy = actorEmail || actorUserId;
    await user.save();

    

    // Slack notification
    setImmediate(async () => {

      // Audit trail
      await AuditTrail.create({
        action: "USER_DOCUMENT_REJECT",
        actorUserId,
        actorEmail: actorEmail || null,
        targetType: "User",
        targetKey: user.id,
        before: beforeState,
        after: user.toJSON(),
        metadata: { documentType, reason }
      });

      try {
        const slackHost = host || 'localhost';
        const environment = getEnvironmentFromHost(slackHost);
        await SlackService.notify({
          location: environment,
          host: slackHost,
          node: SlackNode.USER_MANAGEMENT,
          provider: SlackProvider.SYSTEM,
          severity: SlackSeverity.INFO,
          trigger: `Document Rejected: ${documentType} for ${user.email}`,
          type: SlackEventType.USER_TRIGGERED,
          channel: SlackChannel.TOWN_CRIER,
          teamMentions: "CSM",
          body: `User document rejected.\n\n👤 User: ${user.firstName} ${user.lastName}\n📄 Document: ${documentType}\n❌ Rejected by: ${actorEmail || actorUserId}\n📝 Reason: ${reason}`
        });
        logger.info(`✅ Document ${documentType} rejected for user ${user.id}`);
      } catch (err) {
        logger.error(`❌ Slack notification failed: ${err}`);
      }
    });

    const { password, ...userWithoutPassword } = user.toJSON();
    return userWithoutPassword;
  }

  /**
   * Soft delete user (move to recycle bin)
   * @param userId ID of user to delete
   * @param actorUserId ID of admin performing delete
   * @param actorEmail Email of admin performing delete
   * @param host Host from request object
   */
   async deleteUser(userId: string, actorUserId: string, actorEmail?: string, host?: string) {
     if (!userId) {
       throw new ErrorHandler("Invalid user ID.", 400);
     }

     const user = await User.findByPk(userId);
     if (!user) {
       throw new ErrorHandler("User not found.", 404);
     }

     if (user.id === actorUserId) {
       throw new ErrorHandler("You cannot delete your own account.", 400);
     }

     if (user.role === Role.ADMIN) {
       const adminCount = await User.count({
         where: { role: Role.ADMIN, isDeleted: false, id: { [Op.ne]: userId } }
       });

       if (adminCount < 1) {
         throw new ErrorHandler("Cannot delete last admin user.", 400);
       }
     }

     const beforeState = user.toJSON();
     
     // Soft delete user using isDeleted flag
     user.isDeleted = true;
     user.deletedAt = new Date();
     user.deletedBy = actorEmail || actorUserId;
     await user.save();

     // Slack notification
     setImmediate(async () => {

      // Audit trail
      await AuditTrail.create({
        action: "USER_DELETE",
        actorUserId,
        actorEmail: actorEmail || null,
        targetType: "User",
        targetKey: user.id,
        before: beforeState,
        after: user.toJSON(),
        metadata: { mode: "soft-delete" }
      });

       try {
         const slackHost = host || 'localhost';
         const environment = getEnvironmentFromHost(slackHost);
         await SlackService.notify({
           location: environment,
           host: slackHost,
           node: SlackNode.USER_MANAGEMENT,
           provider: SlackProvider.SYSTEM,
           severity: SlackSeverity.INFO,
           trigger: `User Deleted: ${user.email}`,
           type: SlackEventType.USER_TRIGGERED,
           channel: SlackChannel.TOWN_CRIER,
           teamMentions: "CSM",
           body: `User has been deleted (moved to recycle bin).\n\n👤 User: ${user.firstName} ${user.lastName} (${user.email})\n🗑️ Deleted by: ${actorEmail || actorUserId}`
         });
         logger.info(`✅ User ${userId} deleted by admin ${actorEmail || actorUserId}`);
       } catch (err) {
         logger.error(`❌ Slack notification failed: ${err}`);
       }
     });

     return { success: true, message: "User deleted successfully" };
   }

   /**
    * Restore soft deleted user
    * @param userId ID of user to restore
    * @param actorUserId ID of admin performing restore
    * @param actorEmail Email of admin performing restore
    * @param host Host from request object
    */
   async restoreUser(userId: string, actorUserId: string, actorEmail?: string, host?: string) {
     if (!userId) {
       throw new ErrorHandler("Invalid user ID.", 400);
     }

     const user = await User.findByPk(userId, { paranoid: false });
     if (!user) {
       throw new ErrorHandler("User not found.", 404);
     }

     if (!user.isDeleted) {
       throw new ErrorHandler("User is not deleted, cannot restore.", 400);
     }

     const beforeState = user.toJSON();
     
     // Restore user
     user.isDeleted = false;
     user.updatedAt = new Date();
     user.updatedBy = actorEmail || actorUserId;
     await user.save();

     // Slack notification
     setImmediate(async () => {

      // Audit trail
      await AuditTrail.create({
        action: "USER_RESTORE",
        actorUserId,
        actorEmail: actorEmail || null,
        targetType: "User",
        targetKey: user.id,
        before: beforeState,
        after: user.toJSON(),
        metadata: { mode: "restore" }
      });

       try {
         const slackHost = host || 'localhost';
         const environment = getEnvironmentFromHost(slackHost);
         await SlackService.notify({
           location: environment,
           host: slackHost,
           node: SlackNode.USER_MANAGEMENT,
           provider: SlackProvider.SYSTEM,
           severity: SlackSeverity.INFO,
           trigger: `User Restored: ${user.email}`,
           type: SlackEventType.USER_TRIGGERED,
           channel: SlackChannel.TOWN_CRIER,
           teamMentions: "CSM",
           body: `User account has been restored.\n\n👤 User: ${user.firstName} ${user.lastName} (${user.email})\n✅ Restored by: ${actorEmail || actorUserId}`
         });
         logger.info(`✅ User ${userId} restored by admin ${actorEmail || actorUserId}`);
       } catch (err) {
         logger.error(`❌ Slack notification failed: ${err}`);
       }
     });

     return { success: true, message: "User restored successfully" };
   }

   /**
    * Deletes rows in tables with a live (uncascaded) FK to users.id that would
    * otherwise block a hard user delete. Extend this as new FK violations turn
    * up — each purge only needs to clear the tables the deleted user actually
    * has rows in, but there are ~39 tables referencing users.id in total, so
    * more of these can surface over time.
    *
    * Currently handles:
    *   jobsite_credential_audits.jobsiteCredentialId -> jobsite_credentials.id
    *   jobsite_credentials.clientId -> users.id
    *   jobsite_credential_audits.actorId -> users.id (this user acting as staff
    *     on someone else's credential — audit rows are non-nullable, so they
    *     have to be deleted rather than reassigned)
    *   messages.userId -> users.id
    * @param userId ID of user being permanently deleted
    */
   private async deletePurgeBlockingDependents(userId: string) {
     const ownCredentials = await JobsiteCredential.findAll({
       where: { clientId: userId },
       paranoid: false,
       attributes: ["id"],
     });
     const ownCredentialIds = ownCredentials.map((c) => c.id);

     if (ownCredentialIds.length > 0) {
       await JobsiteCredentialAudit.destroy({ where: { jobsiteCredentialId: ownCredentialIds } });
     }
     await JobsiteCredentialAudit.destroy({ where: { actorId: userId } });
     await JobsiteCredential.destroy({ where: { clientId: userId }, force: true });

     await Message.destroy({ where: { userId }, force: true });
   }

   /**
    * Permanently delete user account (irreversible)
    * @param userId ID of user to permanently delete
    * @param actorUserId ID of admin performing purge
    * @param actorEmail Email of admin performing purge
    * @param host Host from request object
    */
   async purgeUser(userId: string, actorUserId: string, actorEmail?: string, host?: string) {
     if (!userId) {
       throw new ErrorHandler("Invalid user ID.", 400);
     }

     const user = await User.findByPk(userId, { paranoid: false });
     if (!user) {
       throw new ErrorHandler("User not found.", 404);
     }

     if (!user.isDeleted) {
       throw new ErrorHandler("User must be soft deleted before permanent deletion.", 400);
     }

      // Permanent delete (hard delete) - delete all related records first
      // Delete user uploads first to resolve foreign key constraint
      await Upload.destroy({
        where: { userId: userId },
        force: true
      });

      // Delete dependent rows in other tables to resolve FK constraints
      await this.deletePurgeBlockingDependents(userId);

      // Now delete the user permanently
      await user.destroy({ force: true });

     // Snapshot the user we just purged so downstream side effects can
     // still render the person's details after the row is gone.
     const purgedSnapshot = {
       id: userId,
       firstName: user.firstName,
       lastName: user.lastName,
       email: user.email,
       toJSON: () => user.toJSON(),
     };
     const purgedByLabel = actorEmail || actorUserId;
     const frontendUrl = PROD_FRONTEND_URL || "https://rat.customer.cvtocareer.com";
     const currentYear = new Date().getFullYear();

     // Audit trail — must persist before the async fan-out, so a Slack
     // failure never leaves the deletion off the record.
     await AuditTrail.create({
       action: "USER_PURGE",
       actorUserId,
       actorEmail: actorEmail || null,
       targetType: "User",
       targetKey: userId,
       before: purgedSnapshot.toJSON(),
       after: { purged: true },
       metadata: { mode: "permanent-delete" }
     });

     setImmediate(async () => {
       try {
         const slackHost = host || 'localhost';
         const environment = getEnvironmentFromHost(slackHost);
         await SlackService.notify({
           location: environment,
           host: slackHost,
           node: SlackNode.USER_MANAGEMENT,
           provider: SlackProvider.SYSTEM,
           severity: SlackSeverity.CRITICAL,
           trigger: `User Permanently Deleted: ${purgedSnapshot.email}`,
           type: SlackEventType.USER_TRIGGERED,
           channel: SlackChannel.TOWN_CRIER,
           teamMentions: "CSM,WFC",
           body: `User account has been PERMANENTLY DELETED.\n\n👤 User: ${purgedSnapshot.firstName} ${purgedSnapshot.lastName} (${purgedSnapshot.email})\n⚠️ Purged by: ${purgedByLabel}\nThis action cannot be undone.`
         });
         logger.info(`✅ User ${userId} permanently deleted Slack posted`);
       } catch (err) {
         logger.error(`❌ Slack notification failed for purge: ${err}`);
       }
     });

     // Customer notification — an account they own has been permanently
     // deleted; still fire the email even though the account row is gone,
     // since the recipient address was captured before destroy().
     setImmediate(async () => {
       try {
         await sendMail({
           email: purgedSnapshot.email,
           subject: "Your CVtoCAREER account has been deleted",
           templateName: "account-deleted-user.ejs",
           templateData: {
             name: purgedSnapshot.firstName,
             frontendUrl,
             currentYear,
           },
         });
       } catch (err) {
         logger.error(`❌ Customer purge email failed for user ${userId}: ${err}`);
       }
     });

     setImmediate(async () => {
       try {
         await sendMail({
           email: TEAM_EMAIL,
           subject: `Account Permanently Deleted — ${purgedSnapshot.firstName} ${purgedSnapshot.lastName}`,
           templateName: "account-deleted-admin.ejs",
           templateData: {
             clientName: `${purgedSnapshot.firstName} ${purgedSnapshot.lastName}`,
             clientEmail: purgedSnapshot.email,
             purgedBy: purgedByLabel,
             frontendUrl,
             currentYear,
           },
         });
       } catch (err) {
         logger.error(`❌ Delivery team purge email failed for user ${userId}: ${err}`);
       }
     });

     return { success: true, message: "User permanently deleted successfully" };
   }

   /**
    * Bulk soft delete users (move to recycle bin).
    * Sends a single consolidated Slack notification instead of one per user
    * to avoid flooding the channel on large batches.
    * @param userIds IDs of users to delete
    * @param actorUserId ID of admin performing the bulk delete
    * @param actorEmail Email of admin performing the bulk delete
    * @param host Host from request object
    */
   async bulkDeleteUsers(userIds: string[], actorUserId: string, actorEmail?: string, host?: string) {
     if (!Array.isArray(userIds) || userIds.length === 0) {
       throw new ErrorHandler("userIds must be a non-empty array.", 400);
     }

     const uniqueIds = Array.from(new Set(userIds));
     const users = await User.findAll({ where: { id: uniqueIds } });

     const adminIdsInBatch = users.filter((u) => u.role === Role.ADMIN).map((u) => u.id);
     if (adminIdsInBatch.length > 0) {
       const remainingAdminCount = await User.count({
         where: { role: Role.ADMIN, isDeleted: false, id: { [Op.notIn]: adminIdsInBatch } }
       });
       if (remainingAdminCount < 1) {
         throw new ErrorHandler("Cannot delete all admin users. At least one admin must remain.", 400);
       }
     }

     const deletedUsers: { id: string; email: string; firstName: string; lastName: string }[] = [];
     const failures: { id: string; reason: string }[] = [];

     for (const id of uniqueIds) {
       if (id === actorUserId) {
         failures.push({ id, reason: "Cannot delete your own account" });
         continue;
       }

       const user = users.find((u) => u.id === id);
       if (!user) {
         failures.push({ id, reason: "User not found" });
         continue;
       }

       const beforeState = user.toJSON();
       user.isDeleted = true;
       user.deletedAt = new Date();
       user.deletedBy = actorEmail || actorUserId;
       await user.save();

       await AuditTrail.create({
         action: "USER_DELETE",
         actorUserId,
         actorEmail: actorEmail || null,
         targetType: "User",
         targetKey: user.id,
         before: beforeState,
         after: user.toJSON(),
         metadata: { mode: "soft-delete", bulk: true }
       });

       deletedUsers.push({ id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName });
     }

     if (deletedUsers.length > 0) {
       setImmediate(async () => {
         try {
           const slackHost = host || 'localhost';
           const environment = getEnvironmentFromHost(slackHost);
           const preview = deletedUsers.slice(0, 10).map((u) => `• ${u.firstName} ${u.lastName} (${u.email})`).join("\n");
           const more = deletedUsers.length > 10 ? `\n...and ${deletedUsers.length - 10} more` : "";

           await SlackService.notify({
             location: environment,
             host: slackHost,
             node: SlackNode.USER_MANAGEMENT,
             provider: SlackProvider.SYSTEM,
             severity: SlackSeverity.INFO,
             trigger: `${deletedUsers.length} Users Deleted (Bulk)`,
             type: SlackEventType.USER_TRIGGERED,
             channel: SlackChannel.TOWN_CRIER,
             teamMentions: "CSM",
             body: `${deletedUsers.length} user(s) have been deleted (moved to recycle bin).\n\n${preview}${more}\n\n🗑️ Deleted by: ${actorEmail || actorUserId}`
           });
           logger.info(`✅ Bulk deleted ${deletedUsers.length} user(s) by admin ${actorEmail || actorUserId}`);
         } catch (err) {
           logger.error(`❌ Slack notification failed for bulk delete: ${err}`);
         }
       });
     }

     return {
       success: true,
       deletedCount: deletedUsers.length,
       failedCount: failures.length,
       failures,
       message: `${deletedUsers.length} user(s) deleted successfully`
     };
   }

   /**
    * Bulk permanently delete users (irreversible).
    * Sends a single consolidated Slack notification instead of one per user.
    * @param userIds IDs of users to permanently delete
    * @param actorUserId ID of admin performing the bulk purge
    * @param actorEmail Email of admin performing the bulk purge
    * @param host Host from request object
    */
   async bulkPurgeUsers(userIds: string[], actorUserId: string, actorEmail?: string, host?: string) {
     if (!Array.isArray(userIds) || userIds.length === 0) {
       throw new ErrorHandler("userIds must be a non-empty array.", 400);
     }

     const uniqueIds = Array.from(new Set(userIds));
     const users = await User.findAll({ where: { id: uniqueIds }, paranoid: false });

     const purgedUsers: { id: string; email: string; firstName: string; lastName: string }[] = [];
     const failures: { id: string; reason: string }[] = [];

     for (const id of uniqueIds) {
       const user = users.find((u) => u.id === id);
       if (!user) {
         failures.push({ id, reason: "User not found" });
         continue;
       }
       if (!user.isDeleted) {
         failures.push({ id, reason: "User must be soft deleted before permanent deletion" });
         continue;
       }

       try {
         const beforeState = user.toJSON();
         const { email, firstName, lastName } = user;

         await Upload.destroy({ where: { userId: id }, force: true });
         await this.deletePurgeBlockingDependents(id);
         await user.destroy({ force: true });

         await AuditTrail.create({
           action: "USER_PURGE",
           actorUserId,
           actorEmail: actorEmail || null,
           targetType: "User",
           targetKey: id,
           before: beforeState,
           after: { purged: true },
           metadata: { mode: "permanent-delete", bulk: true }
         });

         purgedUsers.push({ id, email, firstName, lastName });
       } catch (err: any) {
         logger.error(`❌ Failed to permanently delete user ${id}: ${err?.message || err}`);
         failures.push({ id, reason: err?.message || "Failed to permanently delete user" });
       }
     }

     if (purgedUsers.length > 0) {
       setImmediate(async () => {
         try {
           const slackHost = host || 'localhost';
           const environment = getEnvironmentFromHost(slackHost);
           const preview = purgedUsers.slice(0, 10).map((u) => `• ${u.firstName} ${u.lastName} (${u.email})`).join("\n");
           const more = purgedUsers.length > 10 ? `\n...and ${purgedUsers.length - 10} more` : "";

           await SlackService.notify({
             location: environment,
             host: slackHost,
             node: SlackNode.USER_MANAGEMENT,
             provider: SlackProvider.SYSTEM,
             severity: SlackSeverity.CRITICAL,
             trigger: `${purgedUsers.length} Users Permanently Deleted (Bulk)`,
             type: SlackEventType.USER_TRIGGERED,
             channel: SlackChannel.TOWN_CRIER,
             teamMentions: "CSM",
             body: `${purgedUsers.length} user account(s) have been PERMANENTLY DELETED.\n\n${preview}${more}\n\n⚠️ Purged by: ${actorEmail || actorUserId}\nThis action cannot be undone.`
           });
           logger.info(`✅ Bulk purged ${purgedUsers.length} user(s) by admin ${actorEmail || actorUserId}`);
         } catch (err) {
           logger.error(`❌ Slack notification failed for bulk purge: ${err}`);
         }
       });
     }

     return {
       success: true,
       deletedCount: purgedUsers.length,
       failedCount: failures.length,
       failures,
       message: `${purgedUsers.length} user(s) permanently deleted successfully`
     };
   }

  /**
   * Get all pending documents for a user
   * @param userId ID of user
   */
  async getPendingDocumentsByUserId(userId: string) {
    if (!userId) {
      throw new ErrorHandler("Invalid user ID.", 400);
    }

    const user = await User.findByPk(userId);
    if (!user) {
      throw new ErrorHandler("User not found.", 404);
    }

    const pendingUploads = await Upload.findAll({
      where: {
        userId,
        status: UploadStatus.PENDING
      },
      order: [['createdAt', 'DESC']]
    });

    return pendingUploads;
  }

  /**
   * Approve user account
   * @param userId ID of user to approve
   * @param actorUserId ID of admin performing action
   * @param actorEmail Email of admin performing action
   * @param host Host from request object
   */
  async approveUserAccount(userId: string, actorUserId: string, actorEmail?: string, host?: string) {
    if (!userId) {
      throw new ErrorHandler("Invalid user ID.", 400);
    }

    const user = await User.findByPk(userId);
    if (!user) {
      throw new ErrorHandler("User not found.", 404);
    }

    // Check if account is already approved
    if (user.isDocumentApproved === true) {
      return {
        success: true,
        alreadyApproved: true,
        message: "Account already approved",
        user: user.toJSON()
      };
    }

    const beforeState = user.toJSON();

    // Approve the account
    user.isDocumentApproved = true;
    user.updatedBy = actorEmail || actorUserId;
    await user.save();

    // Create audit trail
    await AuditTrail.create({
      action: "USER_ACCOUNT_APPROVE",
      actorUserId,
      actorEmail: actorEmail || null,
      targetType: "User",
      targetKey: user.id,
      before: beforeState,
      after: user.toJSON(),
      metadata: { mode: "account-approval" }
    });

    // Slack + email side effects fire in the background so the admin
    // response returns immediately; each catches its own error so a
    // failing side channel never breaks the others.
    const frontendUrl = PROD_FRONTEND_URL || "https://rat.customer.cvtocareer.com";
    const currentYear = new Date().getFullYear();
    const approvedByLabel = actorEmail || actorUserId;

    setImmediate(async () => {
      try {
        const slackHost = host || 'localhost';
        const environment = getEnvironmentFromHost(slackHost);
        await SlackService.notify({
          location: environment,
          host: slackHost,
          node: SlackNode.USER_MANAGEMENT,
          provider: SlackProvider.SYSTEM,
          severity: SlackSeverity.INFO,
          trigger: `Account Approved: ${user.email}`,
          type: SlackEventType.ADMIN_ACTION,
          channel: SlackChannel.TOWN_CRIER,
          teamMentions: "CSM,WFC",
          body: `User account has been approved.\n\n👤 User: ${user.firstName} ${user.lastName} (${user.email})\n✅ Approved by: ${approvedByLabel}`
        });
        logger.info(`✅ Account approved Slack posted for user ${user.id}`);
      } catch (err) {
        logger.error(`❌ Slack notification failed for account approval: ${err}`);
      }
    });

    setImmediate(async () => {
      try {
        await sendMail({
          email: user.email,
          subject: "Your CVtoCAREER account has been approved",
          templateName: "account-approved-user.ejs",
          templateData: {
            name: user.firstName,
            frontendUrl,
            currentYear,
          },
        });
      } catch (err) {
        logger.error(`❌ Customer approval email failed for user ${user.id}: ${err}`);
      }
    });

    setImmediate(async () => {
      try {
        await sendMail({
          email: TEAM_EMAIL,
          subject: `Account Approved — ${user.firstName} ${user.lastName}`,
          templateName: "account-approved-admin.ejs",
          templateData: {
            clientName: `${user.firstName} ${user.lastName}`,
            clientEmail: user.email,
            approvedBy: approvedByLabel,
            frontendUrl,
            currentYear,
          },
        });
      } catch (err) {
        logger.error(`❌ Delivery team approval email failed for user ${user.id}: ${err}`);
      }
    });

    const { password, ...userWithoutPassword } = user.toJSON();

    return {
      success: true,
      alreadyApproved: false,
      message: "Account approved successfully",
      user: userWithoutPassword
    };
  }

  /**
   * Suspend user account — flips isActive to false and notifies both the
   * customer and the delivery team. Login is blocked on customer BE while
   * isActive is false (see customer BE auth service).
   */
  async suspendUserAccount(userId: string, actorUserId: string, actorEmail?: string, host?: string) {
    if (!userId) {
      throw new ErrorHandler("Invalid user ID.", 400);
    }

    const user = await User.findByPk(userId);
    if (!user) {
      throw new ErrorHandler("User not found.", 404);
    }

    if (user.isActive === false) {
      return {
        success: true,
        alreadySuspended: true,
        message: "Account already suspended",
        user: user.toJSON(),
      };
    }

    const beforeState = user.toJSON();

    user.isActive = false;
    user.updatedBy = actorEmail || actorUserId;
    await user.save();

    await AuditTrail.create({
      action: "USER_ACCOUNT_SUSPEND",
      actorUserId,
      actorEmail: actorEmail || null,
      targetType: "User",
      targetKey: user.id,
      before: beforeState,
      after: user.toJSON(),
      metadata: { mode: "account-suspend" },
    });

    const frontendUrl = PROD_FRONTEND_URL || "https://rat.customer.cvtocareer.com";
    const currentYear = new Date().getFullYear();
    const suspendedByLabel = actorEmail || actorUserId;

    setImmediate(async () => {
      try {
        const slackHost = host || "localhost";
        const environment = getEnvironmentFromHost(slackHost);
        await SlackService.notify({
          location: environment,
          host: slackHost,
          node: SlackNode.USER_MANAGEMENT,
          provider: SlackProvider.SYSTEM,
          severity: SlackSeverity.INFO,
          trigger: `Account Suspended: ${user.email}`,
          type: SlackEventType.ADMIN_ACTION,
          channel: SlackChannel.TOWN_CRIER,
          teamMentions: "CSM,WFC",
          body: `User account has been suspended.\n\n👤 User: ${user.firstName} ${user.lastName} (${user.email})\n🚫 Suspended by: ${suspendedByLabel}`,
        });
        logger.info(`✅ Account suspended Slack posted for user ${user.id}`);
      } catch (err) {
        logger.error(`❌ Slack notification failed for account suspension: ${err}`);
      }
    });

    setImmediate(async () => {
      try {
        await sendMail({
          email: user.email,
          subject: "Your CVtoCAREER account has been suspended",
          templateName: "account-suspended-user.ejs",
          templateData: {
            name: user.firstName,
            frontendUrl,
            currentYear,
          },
        });
      } catch (err) {
        logger.error(`❌ Customer suspension email failed for user ${user.id}: ${err}`);
      }
    });

    setImmediate(async () => {
      try {
        await sendMail({
          email: TEAM_EMAIL,
          subject: `Account Suspended — ${user.firstName} ${user.lastName}`,
          templateName: "account-suspended-admin.ejs",
          templateData: {
            clientName: `${user.firstName} ${user.lastName}`,
            clientEmail: user.email,
            suspendedBy: suspendedByLabel,
            frontendUrl,
            currentYear,
          },
        });
      } catch (err) {
        logger.error(`❌ Delivery team suspension email failed for user ${user.id}: ${err}`);
      }
    });

    const { password, ...userWithoutPassword } = user.toJSON();

    return {
      success: true,
      alreadySuspended: false,
      message: "Account suspended successfully",
      user: userWithoutPassword,
    };
  }

  /**
   * Restrict user account — flips isRestricted to true and notifies both
   * the customer and the delivery team. Login is blocked on customer BE
   * while isRestricted is true (see customer BE auth service).
   */
  async restrictUserAccount(userId: string, actorUserId: string, actorEmail?: string, host?: string) {
    if (!userId) {
      throw new ErrorHandler("Invalid user ID.", 400);
    }

    const user = await User.findByPk(userId);
    if (!user) {
      throw new ErrorHandler("User not found.", 404);
    }

    if (user.isRestricted === true) {
      return {
        success: true,
        alreadyRestricted: true,
        message: "Account already restricted",
        user: user.toJSON(),
      };
    }

    const beforeState = user.toJSON();

    user.isRestricted = true;
    user.updatedBy = actorEmail || actorUserId;
    await user.save();

    await AuditTrail.create({
      action: "USER_ACCOUNT_RESTRICT",
      actorUserId,
      actorEmail: actorEmail || null,
      targetType: "User",
      targetKey: user.id,
      before: beforeState,
      after: user.toJSON(),
      metadata: { mode: "account-restrict" },
    });

    const frontendUrl = PROD_FRONTEND_URL || "https://rat.customer.cvtocareer.com";
    const currentYear = new Date().getFullYear();
    const restrictedByLabel = actorEmail || actorUserId;

    setImmediate(async () => {
      try {
        const slackHost = host || "localhost";
        const environment = getEnvironmentFromHost(slackHost);
        await SlackService.notify({
          location: environment,
          host: slackHost,
          node: SlackNode.USER_MANAGEMENT,
          provider: SlackProvider.SYSTEM,
          severity: SlackSeverity.INFO,
          trigger: `Account Restricted: ${user.email}`,
          type: SlackEventType.ADMIN_ACTION,
          channel: SlackChannel.TOWN_CRIER,
          teamMentions: "CSM,WFC",
          body: `User account has been restricted.\n\n👤 User: ${user.firstName} ${user.lastName} (${user.email})\n⚠️ Restricted by: ${restrictedByLabel}`,
        });
        logger.info(`✅ Account restricted Slack posted for user ${user.id}`);
      } catch (err) {
        logger.error(`❌ Slack notification failed for account restriction: ${err}`);
      }
    });

    setImmediate(async () => {
      try {
        await sendMail({
          email: user.email,
          subject: "Your CVtoCAREER account has been restricted",
          templateName: "account-restricted-user.ejs",
          templateData: {
            name: user.firstName,
            frontendUrl,
            currentYear,
          },
        });
      } catch (err) {
        logger.error(`❌ Customer restriction email failed for user ${user.id}: ${err}`);
      }
    });

    setImmediate(async () => {
      try {
        await sendMail({
          email: TEAM_EMAIL,
          subject: `Account Restricted — ${user.firstName} ${user.lastName}`,
          templateName: "account-restricted-admin.ejs",
          templateData: {
            clientName: `${user.firstName} ${user.lastName}`,
            clientEmail: user.email,
            restrictedBy: restrictedByLabel,
            frontendUrl,
            currentYear,
          },
        });
      } catch (err) {
        logger.error(`❌ Delivery team restriction email failed for user ${user.id}: ${err}`);
      }
    });

    const { password, ...userWithoutPassword } = user.toJSON();

    return {
      success: true,
      alreadyRestricted: false,
      message: "Account restricted successfully",
      user: userWithoutPassword,
    };
  }

  /**
   * Send user details sample to Slack
   * @param userId ID of user
   * @param actorUserId ID of admin performing action
   * @param actorEmail Email of admin performing action
   * @param host Host from request object
   */
  async sendUserDetailsToSlack(userId: string, actorUserId: string, actorEmail?: string, host?: string) {
    if (!userId) {
      throw new ErrorHandler("Invalid user ID.", 400);
    }

    const user = await User.findByPk(userId);
    if (!user) {
      throw new ErrorHandler("User not found.", 404);
    }

    const slackHost = host || 'localhost';
    const environment = getEnvironmentFromHost(slackHost);

    // Send formatted user details to Slack
    await SlackService.notify({
      location: environment,
      host: slackHost,
      node: SlackNode.USER_MANAGEMENT,
      provider: SlackProvider.SYSTEM,
      severity: SlackSeverity.INFO,
      trigger: `User Details Sample: ${user.email}`,
      type: SlackEventType.ADMIN_ACTION,
      channel: SlackChannel.TOWN_CRIER,
      teamMentions: "CSM",
      body: `📋 User Details Sample Requested\n
👤 **User**: ${user.firstName} ${user.lastName}
📧 **Email**: ${user.email}
🆔 **User ID**: ${user.id}
🌍 **Country**: ${user.country}
📊 **Staff Perception**: ${user.staffPerception}
👑 **Role**: ${user.role}
✅ **Active**: ${user.isActive ? 'Yes' : 'No'}
📧 **Verified**: ${user.isEmailVerified ? 'Yes' : 'No'}
📄 **Approved**: ${user.isDocumentApproved ? 'Yes' : 'No'}

🔍 Requested by: ${actorEmail || actorUserId}`
    });

    logger.info(`✅ User details sent to Slack for user ${user.id} by ${actorEmail || actorUserId}`);

    return {
      success: true,
      message: "User details sent to Slack successfully"
    };
  }

  /**
   * Get all feature titles (unique only)
   */
  async getAllFeatureTitles() {
    logger.info(`Retrieving unique feature titles from feature model`);
    
    const features = await Feature.findAll({
      attributes: ['id', 'title', 'description', 'isActive'],
      order: [['title', 'ASC']]
    });

    // Remove duplicate titles, keep first occurrence only
    const seenTitles = new Set();
    const uniqueFeatures = features.filter(feature => {
      if (seenTitles.has(feature.title.toLowerCase())) {
        return false;
      }
      seenTitles.add(feature.title.toLowerCase());
      return true;
    });

    logger.info(`Retrieved ${uniqueFeatures.length} unique feature titles out of ${features.length} total`);
    return { features: uniqueFeatures };
  }

  /**
   * Get user preferences by user ID (primary and secondary)
   * @param userId ID of user
   */
  async getUserPreferences(userId: string) {
    if (!userId) {
      throw new ErrorHandler("Invalid user ID.", 400);
    }

    logger.info(`Retrieving preferences for user ID: ${userId}`);

    const user = await User.findByPk(userId);
    if (!user) {
      throw new ErrorHandler("User not found.", 404);
    }

    // Fetch primary and secondary profiles directly
    const primaryProfile = await Profile.findByPk(user.profileId);
    const secondaryProfile = await Profile.findByPk(user.secondaryProfileId);

    // Return all fields for both profiles
    return {
      primary: primaryProfile ? primaryProfile.toJSON() : null,
      secondary: secondaryProfile ? secondaryProfile.toJSON() : null,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName
      }
    };
  }

  /**
   * Get job preferences history for user
   * @param userId ID of user
   * @param queryParams Filter, search, and pagination parameters
   */
  async getJobPreferencesHistory(
    userId: string,
    queryParams?: { field?: string; search?: string; page?: number; limit?: number }
  ) {
    if (!userId) {
      throw new ErrorHandler("Invalid user ID.", 400);
    }

    logger.info(`Retrieving job preferences history for user ID: ${userId}`);

    let user: any = null;
    try {
      user = await User.findByPk(userId);
    } catch (err: any) {
      logger.warn(`Database connection error while checking user ${userId}: ${err?.message}`);
      return {
        history: [],
        total: 0,
        page: 1,
        limit: queryParams?.limit || 50,
        totalPages: 1,
      };
    }

    if (!user) {
      throw new ErrorHandler("User not found.", 404);
    }

    let rawHistory: any[] = [];
    try {
      rawHistory = await UserPreferenceHistory.findAll({
        where: { userId },
        order: [['createdAt', 'DESC']],
        limit: 200,
      });
    } catch (dbErr: any) {
      logger.warn(`Failed to fetch history from DB: ${dbErr?.message}`);
      rawHistory = [];
    }

    const records: Array<{
      id: string;
      createdAt: Date;
      fieldChanged: string;
      previousValue: any;
      newValue: any;
    }> = [];

    // 1. Process structured __fieldChanges stored in preferenceSnapshot (or fieldChanged if present)
    for (const item of rawHistory) {
      const snap = item.preferenceSnapshot;
      if (snap && Array.isArray(snap.__fieldChanges) && snap.__fieldChanges.length > 0) {
        for (const change of snap.__fieldChanges) {
          records.push({
            id: `${item.id}-${change.fieldChanged}`,
            createdAt: item.createdAt,
            fieldChanged: change.fieldChanged,
            previousValue: change.previousValue ?? null,
            newValue: change.newValue,
          });
        }
      } else if ((item as any).fieldChanged) {
        records.push({
          id: item.id,
          createdAt: item.createdAt,
          fieldChanged: (item as any).fieldChanged,
          previousValue: (item as any).previousValue ?? null,
          newValue: (item as any).newValue,
        });
      }
    }

    // 2. Fallback: Reconstruct field diffs from legacy snapshot records if no fieldChanged rows exist
    if (records.length === 0 && rawHistory.length > 0) {
      const sortedSnapshots = [...rawHistory].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );

      let prevSnap: Record<string, any> | null = null;
      for (const entry of sortedSnapshots) {
        const currSnap = entry.preferenceSnapshot || {};
        if (prevSnap) {
          for (const { key, label } of TRACKED_PREFERENCE_FIELDS) {
            const oldVal = prevSnap[key];
            const newVal = currSnap[key];
            if (!arePreferenceValuesEqual(oldVal, newVal)) {
              records.push({
                id: `${entry.id}-${key}`,
                createdAt: entry.createdAt,
                fieldChanged: label,
                previousValue:
                  oldVal === undefined ||
                  oldVal === null ||
                  (Array.isArray(oldVal) && oldVal.length === 0)
                    ? null
                    : oldVal,
                newValue: newVal,
              });
            }
          }
        } else {
          // Initial save: fields set for the first time have previousValue = null ("Not set")
          for (const { key, label } of TRACKED_PREFERENCE_FIELDS) {
            const val = currSnap[key];
            if (
              val !== undefined &&
              val !== null &&
              (!Array.isArray(val) || val.length > 0)
            ) {
              records.push({
                id: `${entry.id}-${key}`,
                createdAt: entry.createdAt,
                fieldChanged: label,
                previousValue: null,
                newValue: val,
              });
            }
          }
        }
        prevSnap = currSnap;
      }
      records.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    }

    // 3. Fallback: If no history recorded yet, synthesize onboarding preferences from Profile
    if (records.length === 0) {
      try {
        const profile = await Profile.findOne({
          where: { userId, name: 'primary' },
        });

        if (profile) {
          const currentSnap = profile.toJSON ? profile.toJSON() : profile.get();
          for (const { key, label } of TRACKED_PREFERENCE_FIELDS) {
            const val = currentSnap[key];
            if (
              val !== undefined &&
              val !== null &&
              (!Array.isArray(val) || val.length > 0)
            ) {
              records.push({
                id: `onboarding-${profile.id}-${key}`,
                createdAt: profile.createdAt || new Date(),
                fieldChanged: label,
                previousValue: null,
                newValue: val,
              });
            }
          }
        }
      } catch (profileErr: any) {
        logger.warn(`Could not fetch profile for onboarding history synthesis: ${profileErr?.message}`);
      }
    }

    // Filter by field
    let filtered = records;
    if (queryParams?.field && queryParams.field !== 'all') {
      const targetField = queryParams.field.toLowerCase();
      filtered = filtered.filter(
        (r) => r.fieldChanged.toLowerCase() === targetField
      );
    }

    // Search filter across field name, previous value, and new value
    if (queryParams?.search && queryParams.search.trim()) {
      const q = queryParams.search.trim().toLowerCase();
      filtered = filtered.filter((r) => {
        const prevText = Array.isArray(r.previousValue)
          ? r.previousValue.join(' ')
          : String(r.previousValue ?? '');
        const newText = Array.isArray(r.newValue)
          ? r.newValue.join(' ')
          : String(r.newValue ?? '');
        return (r.fieldChanged + ' ' + prevText + ' ' + newText)
          .toLowerCase()
          .includes(q);
      });
    }

    const total = filtered.length;
    const page = queryParams?.page || 1;
    const limit = queryParams?.limit || 50;
    const startIndex = (page - 1) * limit;
    const paginated = filtered.slice(startIndex, startIndex + limit);

    logger.info(
      `Retrieved ${paginated.length} of ${total} preference history entries for user ${userId}`
    );
    return {
      history: paginated,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Get all referrals for user
   * @param userId ID of user
   */
  async getUserReferrals(userId: string) {
    if (!userId) {
      throw new ErrorHandler("Invalid user ID.", 400);
    }

    logger.info(`Retrieving referrals for user ID: ${userId}`);

    const user = await User.findByPk(userId);
    if (!user) {
      throw new ErrorHandler("User not found.", 404);
    }

    // Get all referrals from referrer model
    const referrals = await Referrer.findAll({
      where: {
        referrer: user.email
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email', 'createdAt', 'isActive', 'isDocumentApproved', 'staffPerception']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    logger.info(`Retrieved ${referrals.length} referrals for user ${userId}`);
    
    return {
      referrals,
      count: referrals.length,
      referrer: {
        id: user.id,
        email: user.email,
        firstname: user.firstName,
        lastName: user.lastName,
        phoneNumber: user.phoneNumber
      }
    };
  }

  /**
   * Get all uploaded documents for user
   * @param userId ID of user
   */
  async getUserUploadedDocuments(userId: string) {
    if (!userId) {
      throw new ErrorHandler("Invalid user ID.", 400);
    }

    logger.info(`Retrieving uploaded documents for user ID: ${userId}`);

    const user = await User.findByPk(userId);
    if (!user) {
      throw new ErrorHandler("User not found.", 404);
    }

    const documents = await Upload.findAll({
      where: {
        userId: userId
      },
      order: [['createdAt', 'ASC']]
    });

    logger.info(`Retrieved ${documents.length} uploaded documents for user ${userId}`);
    
    return {
      documents,
      count: documents.length,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName
      }
    };
  }

  /**
   * Get user progress by user ID
   * @param userId ID of user
   */
  async getUserProgress(userId: string) {
    if (!userId) {
      throw new ErrorHandler("Invalid user ID.", 400);
    }

    logger.info(`Retrieving progress for user ID: ${userId}`);

    const user = await User.findByPk(userId, {
      attributes: ['id', 'firstName', 'lastName', 'email', 'progress', 'role', 'updatedAt']
    });
    if (!user) {
      throw new ErrorHandler("User not found.", 404);
    }

    logger.info(`Progress retrieved for user ID: ${userId}`);

    return {
      userId: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      progress: user.progress,
      updatedAt: user.updatedAt
    };
  }

  /**
   * Get user profile by user ID (excludes sensitive data)
   * @param userId ID of user
   */
  async getUserProfile(userId: string) {
    if (!userId) {
      throw new ErrorHandler("Invalid user ID.", 400);
    }

    logger.info(`Retrieving user profile for ID: ${userId}`);

    const user = await User.findByPk(userId);
    if (!user) {
      throw new ErrorHandler("User not found.", 404);
    }

    const userData = user.toJSON();

    // Get referrer email from the referral model, if the user was referred
    const referral = await Referrer.findOne({
      where: { userId }
    });
    const referrerEmail = referral?.referrer || null;

    // Exclude sensitive fields
    const { 
      password, 
      accessToken, 
      adminPassword, 
      resetToken,
      refreshToken,
      verificationToken,
      ...safeProfile
    } = userData;

    logger.info(`User profile retrieved for ID: ${userId}`);
    
    return {
      profile: safeProfile,
      referrerEmail
    };
  }

  /**
   * Get all users with in-flight campaigns (capitalized INFLIGHT or FLIGHT)
   * for Dashboard display — same population as the Pipeline card's
   * "In-Flight" tile.
   */
  async getInflightUsers() {
    logger.info(`Retrieving users with in-flight campaigns`);

    const inflightCredentials = await Credentials.findAll({
      where: {
        capitalized: { [Op.in]: ["INFLIGHT", "FLIGHT"] },
        isDeleted: false
      }
    });

    logger.info(`Retrieved ${inflightCredentials.length} users with in-flight campaigns`);

    return {
      inflightCredentials,
      count: inflightCredentials.length
    };
  }

  /**
   * Update job preference for a user based on profile type and query parameters.
   * For use by admin/assistant from user management.
   */
  async updateJobPreference(
    userId: string,
    profileType: 'primary' | 'secondary', 
    updateData: any,
    query: IJobPreferenceQuery,
    host: string,
  ): Promise<any> {
    // Find or create profile for the user
    let profile = await Profile.findOne({
      where: { userId, name: profileType },
    });

    if (!profile) {
      profile = await Profile.create({
        userId,
        name: profileType,
      });
      logger.info(`Initialized empty ${profileType} profile shell for user: ${userId}`);
    }

    // Capture stored state before applying any incoming changes for field-level comparison
    const previousSnapshot = JSON.parse(JSON.stringify(profile.toJSON ? profile.toJSON() : profile.get()));

    // Handle step mapping for all profiles
    let updatedSteps: string[] = [];

    if (query.step01) {
      const {
        role,
        courseOfStudy,
        roleTitlesInclude,
        roleTitlesExclude,
        keywordsWithinTitlesInclude,
        keywordsWithinTitlesExclude,
        country,
        statesInclude,
        statesExclude,
        citiesInclude,
        citiesExclude,
      } = updateData;

      if (role !== undefined) profile.role = role;
      if (courseOfStudy !== undefined) profile.courseOfStudy = courseOfStudy;
      if (roleTitlesInclude !== undefined) profile.titles = roleTitlesInclude;
      if (roleTitlesExclude !== undefined) profile.titlesExcluded = roleTitlesExclude;
      if (keywordsWithinTitlesInclude !== undefined) profile.keywords = keywordsWithinTitlesInclude;
      if (keywordsWithinTitlesExclude !== undefined) profile.keywordsExcluded = keywordsWithinTitlesExclude;

      if (country !== undefined) {
        profile.country = typeof country === 'object' && country !== null ? country.value : country;
      }
      if (statesInclude !== undefined) {
        profile.state = (statesInclude as any[] | undefined)?.map(
          (option: any) => typeof option === 'object' && option !== null ? option.value : option
        ) || [];
      }
      if (statesExclude !== undefined) {
        profile.stateExcluded = (statesExclude as any[] | undefined)?.map(
          (option: any) => typeof option === 'object' && option !== null ? option.value : option
        ) || [];
      }
      if (citiesInclude !== undefined) {
        profile.city = (citiesInclude as any[] | undefined)?.map(
          (option: any) => typeof option === 'object' && option !== null ? option.value : option
        ) || [];
      }
      if (citiesExclude !== undefined) {
        profile.cityExcluded = (citiesExclude as any[] | undefined)?.map(
          (option: any) => typeof option === 'object' && option !== null ? option.value : option
        ) || [];
      }
      updatedSteps.push('01');
    }

    if (query.step02 || query.step03) {
      const {
        jobTypesInclude,
        jobTypesExclude,
        minSalary,
        maxSalary,
        classificationsIncluded,
        classificationsExcluded,
        industriesIncluded,
        industriesExcluded,
        situationIncluded,
        situationExcluded,
        advertisers,
        advertisersInclude,
        advertisersExcluded,
        advertisersExclude,
        workingRight,
      } = updateData;

      if (jobTypesInclude !== undefined) profile.jobTypes = jobTypesInclude;
      if (minSalary !== undefined) profile.minSalary = minSalary.value ?? minSalary;
      if (maxSalary !== undefined) profile.maxSalary = maxSalary.value ?? maxSalary;
      if (classificationsIncluded !== undefined) profile.classifications = classificationsIncluded?.values ? classificationsIncluded.values() : classificationsIncluded;
      if (classificationsExcluded !== undefined) profile.classificationsExcluded = classificationsExcluded?.values ? classificationsExcluded.values() : classificationsExcluded;
      if (advertisers !== undefined) { profile.advertisers = advertisers; profile.advertisersInclude = advertisers; }
      if (advertisersInclude !== undefined) { profile.advertisers = advertisersInclude; profile.advertisersInclude = advertisersInclude; }
      if (advertisersExcluded !== undefined) { profile.advertisersExcluded = advertisersExcluded; profile.advertisersExclude = advertisersExcluded; }
      if (advertisersExclude !== undefined) { profile.advertisersExcluded = advertisersExclude; profile.advertisersExclude = advertisersExclude; }
      if (industriesIncluded !== undefined) profile.industriesInclude = industriesIncluded;
      if (industriesExcluded !== undefined) profile.industriesExclude = industriesExcluded;
      if (situationIncluded !== undefined) profile.situationIncluded = situationIncluded;
      if (situationExcluded !== undefined) profile.situationExcluded = situationExcluded;
      if (workingRight !== undefined) profile.workingRight = workingRight;
      if (query.step02) updatedSteps.push('02');
      if (query.step03) updatedSteps.push('03');
    }

    if (query.step04) {
      const { isResumeVariationDeveloped, isAiForCriteriaSelectionAllowed } = updateData;
      if (isResumeVariationDeveloped !== undefined) profile.isResumeVariationDeveloped = isResumeVariationDeveloped;
      if (isAiForCriteriaSelectionAllowed !== undefined) profile.isAiForCriteriaSelectionAllowed = isAiForCriteriaSelectionAllowed;
      updatedSteps.push('04');
    }

    if (query.step05) {
      const { questions, maritalStatus, disabilityStatus, dateOfBirth, veteran, taxIdentificationNumber, socialSecurityNumber, body, bodyExcluded, coverletterIncluded, roleKeywordExclusive, additionalComments, aggregators } = updateData;
      if (questions !== undefined) profile.questions = questions;
      if (maritalStatus !== undefined) profile.maritalStatus = maritalStatus;
      if (disabilityStatus !== undefined) profile.disabilityStatus = disabilityStatus;
      if (dateOfBirth !== undefined) profile.dateOfBirth = dateOfBirth;
      if (veteran !== undefined) profile.veteran = veteran;
      if (taxIdentificationNumber !== undefined) profile.taxIdentificationNumber = taxIdentificationNumber;
      if (socialSecurityNumber !== undefined) profile.socialSecurityNumber = socialSecurityNumber;
      if (body !== undefined) profile.body = body;
      if (bodyExcluded !== undefined) profile.bodyExcluded = bodyExcluded;
      if (coverletterIncluded !== undefined) profile.coverletterIncluded = coverletterIncluded;
      if (roleKeywordExclusive !== undefined) profile.roleKeywordExclusive = roleKeywordExclusive;
      if (additionalComments !== undefined) profile.additionalComments = additionalComments;
      if (aggregators !== undefined) profile.aggregators = aggregators;
      updatedSteps.push('05');
    }

    // If NO step parameters provided - update ALL fields directly
    if (updatedSteps.length === 0) {
      if (updateData.country && typeof updateData.country === 'object' && updateData.country !== null) {
        updateData.country = updateData.country.value;
      }
      if (updateData.statesInclude) {
        updateData.state = (updateData.statesInclude as any[] | undefined)?.map(
          (option: any) => typeof option === 'object' && option !== null ? option.value : option
        ) || [];
      }
      if (updateData.statesExclude) {
        updateData.stateExcluded = (updateData.statesExclude as any[] | undefined)?.map(
          (option: any) => typeof option === 'object' && option !== null ? option.value : option
        ) || [];
      }
      if (updateData.citiesInclude) {
        updateData.city = (updateData.citiesInclude as any[] | undefined)?.map(
          (option: any) => typeof option === 'object' && option !== null ? option.value : option
        ) || [];
      }
      if (updateData.citiesExclude) {
        updateData.cityExcluded = (updateData.citiesExclude as any[] | undefined)?.map(
          (option: any) => typeof option === 'object' && option !== null ? option.value : option
        ) || [];
      }
      if (updateData.classifications) {
        updateData.classifications = (updateData.classifications as any[] | undefined)?.map(
          (item: any) => typeof item === 'object' && item !== null ? item : item
        );
      }
      if (updateData.industries) {
        updateData.industriesInclude = (updateData.industries as any[] | undefined)?.map(
          (item: any) => typeof item === 'object' && item !== null ? item : item
        );
      }
      if (updateData.jobTypesExcluded) {
        updateData.jobTypesExcluded = (updateData.jobTypesExcluded as any[] | undefined)?.map(
          (item: any) => typeof item === 'object' && item !== null ? item.value : item
        );
      }
      if (updateData.industriesExcluded !== undefined) {
        updateData.industriesExcluded = (updateData.industriesExcluded as any[] | undefined)?.map(
          (item: any) => typeof item === 'object' && item !== null ? item : item
        );
        updateData.industriesExclude = updateData.industriesExcluded;
      }
      if (updateData.advertisers !== undefined) {
        updateData.advertisers = updateData.advertisers;
        updateData.advertisersInclude = updateData.advertisers;
      }
      if (updateData.advertisersInclude !== undefined) {
        updateData.advertisers = updateData.advertisersInclude;
        updateData.advertisersInclude = updateData.advertisersInclude;
      }
      if (updateData.advertisersExcluded !== undefined) {
        updateData.advertisersExcluded = updateData.advertisersExcluded;
        updateData.advertisersExclude = updateData.advertisersExcluded;
      }
      if (updateData.advertisersExclude !== undefined) {
        updateData.advertisersExcluded = updateData.advertisersExclude;
        updateData.advertisersExclude = updateData.advertisersExclude;
      }
      if (updateData.advertisersInclude) {
        updateData.advertisersInclude = (updateData.advertisersInclude as any[] | undefined)?.map(
          (item: any) => typeof item === 'object' && item !== null ? item : item
        );
      }
      if (updateData.advertisers) {
        updateData.advertisers = (updateData.advertisers as any[] | undefined)?.map(
          (item: any) => typeof item === 'object' && item !== null ? item : item
        );
      }
      if (updateData.advertisersExcluded) {
        updateData.advertisersExcluded = (updateData.advertisersExcluded as any[] | undefined)?.map(
          (item: any) => typeof item === 'object' && item !== null ? item : item
        );
      }
      if (updateData.advertisersExclude) {
        updateData.advertisersExclude = (updateData.advertisersExclude as any[] | undefined)?.map(
          (item: any) => typeof item === 'object' && item !== null ? item : item
        );
      }
      Object.assign(profile, updateData);
      updatedSteps.push('full');
    }

    await profile.save();
    const newSnapshot = JSON.parse(JSON.stringify(profile.toJSON ? profile.toJSON() : profile.get()));

    // Field-level comparison: identify each field that actually changed
    const changedFields: Array<{ fieldChanged: string; previousValue: any; newValue: any }> = [];
    for (const { key, label } of TRACKED_PREFERENCE_FIELDS) {
      const oldVal = previousSnapshot[key];
      const newVal = newSnapshot[key];
      if (!arePreferenceValuesEqual(oldVal, newVal)) {
        changedFields.push({
          fieldChanged: label,
          previousValue:
            oldVal === undefined || oldVal === null || (Array.isArray(oldVal) && oldVal.length === 0)
              ? null
              : oldVal,
          newValue: newVal,
        });
      }
    }

    // Save preference history record containing snapshot and field-level diffs
    setImmediate(async () => {
      try {
        const saveTimestamp = new Date();
        const historySnapshot = {
          ...newSnapshot,
          __fieldChanges: changedFields,
        };

        await UserPreferenceHistory.create({
          userId,
          profileId: profile.id,
          profileType,
          updatedFields: updatedSteps,
          updateSource: 'user_update',
          createdAt: saveTimestamp,
          preferenceSnapshot: historySnapshot,
        });

        logger.debug(`Saved preference history with ${changedFields.length} changed fields for user: ${userId}`);
      } catch (historyError) {
        logger.error(`Failed to save preference history: ${historyError}`);
      }
    });

    logger.info(`${profileType} job preference ${updatedSteps.includes('full') ? 'FULL UPDATE' : `steps [${updatedSteps.join(', ')}]`} updated for user: ${userId}`);

    const updatedProfile = profile.get();
    return {
      success: true,
      message: `${profileType} job preference updated successfully`,
      profile: updatedProfile,
    };
  }

  /**
   * Assign, update, or (re)allow a referrer relationship for a client.
   * Idempotent: if a Referrer row already exists for the client it is
   * updated in place rather than duplicated. Fires a #town-crier Slack
   * post (CSM,WFC) and a delivery-team email as confirmation side channels.
   */
  async assignReferrer(
    userId: string,
    payload: {
      referrer: string;
      referralNumber?: string | null;
      freeBeforeReferral?: boolean;
    },
    actorUserId: string,
    actorEmail?: string,
    host?: string,
  ) {
    if (!userId) {
      throw new ErrorHandler("Invalid user ID.", 400);
    }
    const referrerLabel = (payload.referrer || "").trim();
    if (!referrerLabel) {
      throw new ErrorHandler("Referrer is required.", 400);
    }

    const user = await User.findByPk(userId);
    if (!user) {
      throw new ErrorHandler("User not found.", 404);
    }

    const existing = await Referrer.findOne({ where: { userId } });
    const nextValues = {
      userId,
      referrer: referrerLabel,
      referralNumber: payload.referralNumber?.trim() || null,
      freeBeforeReferral: !!payload.freeBeforeReferral,
      updatedBy: actorEmail || actorUserId,
    };

    let mode: "assigned" | "updated";
    let record: Referrer;
    if (existing) {
      await existing.update(nextValues);
      record = existing;
      mode = "updated";
    } else {
      record = await Referrer.create(nextValues as any);
      mode = "assigned";
    }

    await AuditTrail.create({
      action: mode === "assigned" ? "REFERRER_ASSIGNED" : "REFERRER_UPDATED",
      actorUserId,
      actorEmail: actorEmail || null,
      targetType: "Referrer",
      targetKey: record.id,
      before: existing ? existing.toJSON() : null,
      after: record.toJSON(),
      metadata: { userId, mode },
    });

    const frontendUrl = PROD_FRONTEND_URL || "https://rat.customer.cvtocareer.com";
    const currentYear = new Date().getFullYear();
    const assignedByLabel = actorEmail || actorUserId;
    const humanMode =
      mode === "assigned" ? "Referrer Assigned" : "Referral Numbers Updated";
    const freeLabel = nextValues.freeBeforeReferral ? "Yes" : "No";

    setImmediate(async () => {
      try {
        const slackHost = host || "localhost";
        const environment = getEnvironmentFromHost(slackHost);
        await SlackService.notify({
          location: environment,
          host: slackHost,
          node: SlackNode.USER_MANAGEMENT,
          provider: SlackProvider.SYSTEM,
          severity: SlackSeverity.INFO,
          trigger: `${humanMode}: ${user.email}`,
          type: SlackEventType.ADMIN_ACTION,
          channel: SlackChannel.TOWN_CRIER,
          teamMentions: "CSM,WFC",
          body:
            `👥 ${humanMode}\n\n` +
            `Client: ${user.firstName} ${user.lastName} (${user.email})\n` +
            `Referrer: ${referrerLabel}\n` +
            `Referral Number: ${nextValues.referralNumber ?? "—"}\n` +
            `Free plan before referral: ${freeLabel}\n` +
            `Actioned by: ${assignedByLabel}`,
        });
      } catch (err) {
        logger.error(`❌ Slack notification failed for referrer ${mode}: ${err}`);
      }
    });

    setImmediate(async () => {
      try {
        await sendMail({
          email: TEAM_EMAIL,
          subject: `${humanMode} — ${user.firstName} ${user.lastName}`,
          templateName: "referrer-assigned-admin.ejs",
          templateData: {
            clientName: `${user.firstName} ${user.lastName}`,
            clientEmail: user.email,
            referrerLabel,
            referralNumber: nextValues.referralNumber ?? "—",
            freeBeforeReferral: freeLabel,
            assignedBy: assignedByLabel,
            frontendUrl,
            currentYear,
          },
        });
      } catch (err) {
        logger.error(`❌ Delivery team ${mode} email failed for user ${userId}: ${err}`);
      }
    });

    setImmediate(async () => {
      try {
        await sendMail({
          email: user.email,
          subject: `${humanMode} on your CVtoCAREER account`,
          templateName: "referrer-assigned-user.ejs",
          templateData: {
            name: user.firstName,
            humanMode,
            referrerLabel,
            referralNumber: nextValues.referralNumber ?? "—",
            freeBeforeReferral: freeLabel,
            frontendUrl,
            currentYear,
          },
        });
      } catch (err) {
        logger.error(`❌ Client ${mode} email failed for user ${userId}: ${err}`);
      }
    });

    return {
      success: true,
      mode,
      message: `${humanMode} successfully`,
      referrer: record.toJSON(),
    };
  }
}

export const userManagementService = new UserManagementService();
