import { Op } from "sequelize";
import { validate as isUuid } from "uuid";
import { getServiceLogger } from "../../utils/createLogger";
import ErrorHandler from "../../utils/errorHandler";
import { User } from "../../models/v1/user.model";
import { Upload } from "../../models/v1/upload.model";
import { AuditTrail } from "../../models/v1/audit-trail.model";
import { Role, UploadStatus } from "../../utils/enum";
import { SlackService } from "../slack.service";
import { SlackChannel, SlackEventType, SlackNode, SlackProvider, SlackSeverity } from "../../utils/enum";
import { getEnvironmentFromHost } from "../../utils/slack-helpers";

const logger = getServiceLogger("user-management-service");

class UserManagementService {
  /**
   * Admin can update any user details including role
   * @param userId ID of user to update
   * @param updateData Object containing fields to update
   * @param actorUserId ID of admin performing the update
   * @param actorEmail Email of admin performing the update (optional)
   */
  async updateUser(userId: string, updateData: any, actorUserId: string, actorEmail?: string) {
    if (!isUuid(userId)) {
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
      'email', 'customerClass', 'voiceNumber', 'whatsappNumber',
      'country', 'heritage', 'communication', 'role',
      'returnCount', 'revenue', 'cl', 'cr',
      'socials', 'progress', 'isActive', 'isEmailVerified',
      'planId', 'phone', 'address', 'city', 'state', 
      'zipCode', 'company', 'jobTitle', 'bio', 'website', 'linkedinUrl'
    ];

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

    user.updatedBy = actorEmail || actorUserId;
    
    if (hasChanges) {
      await user.save();
    }

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

    logger.info(`User ${userId} updated by admin ${actorEmail || actorUserId}`);

    // Send Slack notification for user update
    setImmediate(async () => {
      try {
        const environment = getEnvironmentFromHost(process.env.HOST || 'localhost');
        
        // Get changed fields
        const changedFields = Object.keys(updateData).filter(key => 
          JSON.stringify(beforeState[key]) !== JSON.stringify(user.toJSON()[key])
        );

        await SlackService.notify({
          location: environment,
          host: process.env.HOST || 'localhost',
          node: SlackNode.USER_MANAGEMENT,
          provider: SlackProvider.SYSTEM,
          severity: SlackSeverity.INFO,
          trigger: `User Updated: ${user.email}`,
          type: SlackEventType.ADMIN_ACTION,
          channel: SlackChannel.TOWN_CRIER,
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
    if (!isUuid(documentId)) {
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

    // Slack notification
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
          trigger: `Document Approved: ${documentType} for ${user.email}`,
          type: SlackEventType.USER_TRIGGERED,
          channel: SlackChannel.TOWN_CRIER,
          body: `User document approved.\n\n👤 User: ${user.firstName} ${user.lastName}\n📄 Document: ${documentType}\n✅ Approved by: ${actorEmail || actorUserId}`
        });
        logger.info(`✅ Document ${documentType} approved for user ${user.id}`);
      } catch (err) {
        logger.error(`❌ Slack notification failed: ${err}`);
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
    if (!isUuid(documentId)) {
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

    // Slack notification
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
          trigger: `Document Rejected: ${documentType} for ${user.email}`,
          type: SlackEventType.USER_TRIGGERED,
          channel: SlackChannel.TOWN_CRIER,
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
     if (!isUuid(userId)) {
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

     // Slack notification
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
           trigger: `User Deleted: ${user.email}`,
           type: SlackEventType.USER_TRIGGERED,
           channel: SlackChannel.TOWN_CRIER,
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
     if (!isUuid(userId)) {
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

     // Slack notification
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
           trigger: `User Restored: ${user.email}`,
           type: SlackEventType.USER_TRIGGERED,
           channel: SlackChannel.TOWN_CRIER,
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
    * Permanently delete user account (irreversible)
    * @param userId ID of user to permanently delete
    * @param actorUserId ID of admin performing purge
    * @param actorEmail Email of admin performing purge
    * @param host Host from request object
    */
   async purgeUser(userId: string, actorUserId: string, actorEmail?: string, host?: string) {
     if (!isUuid(userId)) {
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
      
      // Now delete the user permanently
      await user.destroy({ force: true });

     // Audit trail
     await AuditTrail.create({
       action: "USER_PURGE",
       actorUserId,
       actorEmail: actorEmail || null,
       targetType: "User",
       targetKey: userId,
       before: user.toJSON(),
       after: { purged: true },
       metadata: { mode: "permanent-delete" }
     });

     // Slack notification
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
           trigger: `User Permanently Deleted: ${user.email}`,
           type: SlackEventType.USER_TRIGGERED,
           channel: SlackChannel.TOWN_CRIER,
           body: `User account has been PERMANENTLY DELETED.\n\n👤 User: ${user.firstName} ${user.lastName} (${user.email})\n⚠️ Purged by: ${actorEmail || actorUserId}\nThis action cannot be undone.`
         });
         logger.info(`✅ User ${userId} permanently deleted by admin ${actorEmail || actorUserId}`);
       } catch (err) {
         logger.error(`❌ Slack notification failed: ${err}`);
       }
     });

     return { success: true, message: "User permanently deleted successfully" };
   }

  /**
   * Get all pending documents for a user
   * @param userId ID of user
   */
  async getPendingDocumentsByUserId(userId: string) {
    if (!isUuid(userId)) {
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
    if (!isUuid(userId)) {
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

    // Slack notification
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
          body: `User account has been approved.\n\n👤 User: ${user.firstName} ${user.lastName} (${user.email})\n✅ Approved by: ${actorEmail || actorUserId}`
        });
        logger.info(`✅ Account approved for user ${user.id}`);
      } catch (err) {
        logger.error(`❌ Slack notification failed for account approval: ${err}`);
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
   * Send user details sample to Slack
   * @param userId ID of user
   * @param actorUserId ID of admin performing action
   * @param actorEmail Email of admin performing action
   * @param host Host from request object
   */
  async sendUserDetailsToSlack(userId: string, actorUserId: string, actorEmail?: string, host?: string) {
    if (!isUuid(userId)) {
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
      body: `📋 User Details Sample Requested\n
👤 **User**: ${user.firstName} ${user.lastName}
📧 **Email**: ${user.email}
🆔 **User ID**: ${user.id}
🌍 **Country**: ${user.country}
📊 **Customer Class**: ${user.customerClass}
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
}

export const userManagementService = new UserManagementService();
