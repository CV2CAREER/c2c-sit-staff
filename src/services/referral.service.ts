import { Op } from "sequelize";
import { getServiceLogger } from "../utils/createLogger";
import { User } from "../models/v1/user.model";
import { Plan } from "../models/v1/plan.model";
import { Referrer } from "../models/v1/referrer.model";
import { Partner } from "../models/v1/partner.model";
import { SlackService } from "./slack.service";
import { getEnvironmentFromHost } from "../utils/slack-helpers";
import { PaymentStatus, ReferrerStatus, RevenueStatus, SlackChannel, SlackEventType, SlackNode, SlackProvider, SlackSeverity } from "../utils/enum";
import ErrorHandler from "@/utils/errorHandler";
import { getFrontendUrl, getFullName, updateReferrerStats } from "@/utils/helpers";
import { EMAIL_QUEUE } from "@/jobs/background/emailWorker";
import { getQueue } from "@/config/bullMQ";
import { sendGrpConfirmedEmail, sendGrpDeclinedEmail, sendCrpPaidEmail, sendCrpPayoutOwedEmail, sendInternalReferralEmail, sendPrpThankyouEmail, sendPrpInternalEmail, sendRCFollowUpTag } from "./email.service";
import { AuditLogService } from "./admin/audit-log.service";

const logger = getServiceLogger("referral-service");

// Claim Referral Request
export interface IClaimReferralRequest {
  firstName: string;
  middleName?: string;
  lastName: string;
  phoneNumber: string;
  email: string;
}

// Claim Referral Response
export interface IClaimReferralResponse {
  success: boolean;
  message: string;
  referrerName?: string;
}

// Send Referral Email Request
export interface ISendReferralEmailRequest {
  firstName: string;
  middleName?: string;
  lastName: string;
  phoneNumber: string;
  email: string;
}

// Send Referral Email Response
export interface ISendReferralEmailResponse {
  success: boolean;
  message: string;
  referralLink: string;
}

// Bulk Upload Referral Item
export interface IBulkReferralItem {
  firstName: string;
  lastName: string;
  middleName?: string;
  email: string;
  phoneNumber: string;
}

// Bulk Upload Referral Response
export interface IBulkUploadReferralResponse {
  success: boolean;
  message: string;
  totalSent: number;
  failed: number;
  failedEmails: string[];
}


export class ReferralService {
  /**
   * ⚡ Get ALL referrals — each record is an individual referred user (not grouped by referrer)
   */
  static async getAllReferrals(page: number = 1, pageSize: number = 15, filters?: { isDeleted?: boolean; claimStatus?: string }) {
    try {
      logger.info(`⚡ Fetching individual referrals (page: ${page}, size: ${pageSize})`);

      const whereClause: any = {};

      if (filters?.isDeleted !== undefined) {
        whereClause.isDeleted = filters.isDeleted;
      } else {
        whereClause.isDeleted = false;
      }

      if (filters?.claimStatus) {
        whereClause.status = filters.claimStatus;
      }

      const { count, rows } = await Referrer.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'email', 'firstName', 'lastName', 'role', 'paymentStatus', 'isUserSubscribed', 'businessName']
          }
        ],
        order: [['createdAt', 'DESC']],
        limit: pageSize,
        offset: (page - 1) * pageSize,
        raw: true,
        nest: true
      });

      // Fetch isAmbassador + referrer names in one batch query
      const referrerEmails = [...new Set(rows.map((ref: any) => ref.referrer).filter(Boolean))];
      const referrerUsers = await User.findAll({
        where: { email: { [Op.in]: referrerEmails } },
        attributes: ['email', 'isAmbassador', 'firstName', 'lastName'],
        raw: true,
      });
      const ambassadorMap = new Map(referrerUsers.map((u: any) => [u.email, u.isAmbassador]));
      const referrerNameMap = new Map(referrerUsers.map((u: any) => [
        u.email,
        u.firstName ? `${u.firstName} ${u.lastName || ''}`.trim() : u.email,
      ]));

      const mapped = rows.map((ref: any) => {
        const isClient = ref.user?.role === 'client' || ref.user?.paymentStatus === PaymentStatus.PAID || ref.user?.isUserSubscribed === true;

        return {
          referralId: ref.id,
          sequentialId: ref.sequentialId || null,
          type: ref.type || null,
          referrerEmail: ref.referrer,
          referrerName: referrerNameMap.get(ref.referrer) || ref.referrer,
          referredUserId: ref.userId,
          referredEmail: ref.user?.email,
          referredName: ref.user?.firstName ? `${ref.user.firstName} ${ref.user.lastName || ''}`.trim() : ref.user?.email,
          status: ref.status,
          declinedReason: ref.declinedReason || null,
          role: ref.user?.role || 'N/A',
          isClient,
          isAmbassador: ambassadorMap.get(ref.referrer) ?? false,
          paymentStatus: ref.referralStatus || RevenueStatus.UNPAID,
          payId: ref.payId || null,
          businessName: ref.user?.businessName || '',
          amountOwed: ref.type === 'CRP' && isClient ? 50 : 0,
          updatedBy: ref.updatedBy || null,
          isDeleted: ref.isDeleted || false,
          createdAt: ref.createdAt
        };
      });

      logger.info(`✅ Found ${count} referrals, returning ${mapped.length}`);

      return {
        users: mapped,
        total: count
      };

    } catch (error: any) {
      logger.error(`❌ Failed to fetch referrals: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get referral claims pending approval
   */
  static async getPendingClaims(page: number = 1, pageSize: number = 15, filters?: { isDeleted?: boolean; claimStatus?: string }) {
    try {
      const whereClause: any = {};

      if (filters?.claimStatus) {
        whereClause.status = filters.claimStatus;
      } else {
        whereClause.status = ReferrerStatus.CLAIMED;
      }

      if (filters?.isDeleted !== undefined) {
        whereClause.isDeleted = filters.isDeleted;
      } else {
        whereClause.isDeleted = false;
      }

      const { count, rows } = await Referrer.findAndCountAll({
        where: whereClause,
        include: [
          { model: User, as: 'user', attributes: ['id', 'email', 'firstName', 'lastName'] }
        ],
        limit: pageSize,
        offset: (page - 1) * pageSize,
        order: [['createdAt', 'DESC']],
        raw: true,
        nest: true,
      });

      const referrerEmails = [...new Set(rows.map((ref: any) => ref.referrer).filter(Boolean))];
      const referrerUsers = await User.findAll({
        where: { email: { [Op.in]: referrerEmails } },
        attributes: ['email', 'isAmbassador', 'firstName', 'lastName'],
        raw: true,
      });
      const ambassadorMap = new Map(referrerUsers.map((u: any) => [u.email, u.isAmbassador]));
      const referrerNameMap = new Map(referrerUsers.map((u: any) => [
        u.email,
        u.firstName ? `${u.firstName} ${u.lastName || ''}`.trim() : u.email,
      ]));

      const mapped = rows.map((ref: any) => ({
        ...ref,
        referrerName: referrerNameMap.get(ref.referrer) || ref.referrer,
        isAmbassador: ambassadorMap.get(ref.referrer) ?? false,
      }));

      return {
        users: mapped,
        total: count
      };
    } catch (error: any) {
      logger.error(`❌ Failed to fetch pending claims: ${error.message}`);
      throw error;
    }
  }

  /**
   * Approve referral claim
   */
  static async approveClaim(req: any, referralId: string) {
    const host = req.headers.host || req.headers.origin || "localhost";
    const location = getEnvironmentFromHost(host);
    try {
      const referral = await Referrer.findByPk(referralId);
      
      if (!referral) {
        throw new Error("Referral not found");
      }

      if (referral.status === ReferrerStatus.APPROVED) {
        throw new Error("Referral already approved");
      }

      const adminName = req.user ? `${(req.user as any).firstName || ''} ${(req.user as any).lastName || ''}`.trim() || (req.user as any).email : 'system';

      await referral.update({
        status: ReferrerStatus.APPROVED,
        referralStatus: RevenueStatus.PAID,
        updatedBy: adminName
      });

      logger.info(`✅ Referral ${referralId} approved by ${adminName} — revenue marked as PAID`);

      // JIR-049 + JIR-057: GRP plan extension + audit entry
      let planExtended = false;
      let newExpiresAt: Date | null = null;
      let oldExpiresAt: Date | null = null;
      if ((referral as any).type === "GRP") {
        try {
          const referrerUser = await User.findOne({ where: { email: referral.referrer } });
          const referredUser = await User.findByPk(referral.userId, { attributes: ["id", "uniqueId"] });

          if (req.user) {
            AuditLogService.log({
              userId: (req.user as any).id,
              userFullName: adminName,
              userRole: (req.user as any).role || "admin",
              method: "POST",
              url: `/v1/referrals/${referralId}/approve`,
              description: `GRP referral ${referralId} approved — referrer: ${referral.referrer}`,
              dataEntry: {
                referral_id: (referral as any).sequentialId ?? referralId,
                program: "GRP",
                action: "APPROVED",
                actor: adminName,
                referrer_id: referrerUser?.uniqueId ?? null,
                referred_id: referredUser?.uniqueId ?? null,
                reason_code: null,
                note: "",
                reward: "+14 days",
                applied_via: "S.ADM.03.03.IR07B",
              },
            });
          }
          if (referrerUser?.isAmbassador) {
            const coralPlan = await Plan.findOne({
              where: { userId: referrerUser.id, hasExpired: false, title: "Coral" },
            });
            if (coralPlan) {
              const currentExpiry = coralPlan.expiresAt ? new Date(coralPlan.expiresAt) : new Date();
              oldExpiresAt = new Date(currentExpiry);
              newExpiresAt = new Date(currentExpiry);
              newExpiresAt.setDate(newExpiresAt.getDate() + 14);
              await coralPlan.update({ expiresAt: newExpiresAt });
              planExtended = true;
              logger.info(`✅ Ambassador ${referrerUser.email} Coral plan extended by 14 days — new expiry: ${newExpiresAt.toISOString()}`);
            }
          }
        } catch (extErr: any) {
          logger.error(`❌ Failed to extend ambassador Coral plan: ${extErr.message}`);
        }
      }

      // Send Slack + email notifications
      setImmediate(async () => {
        try {
          const user = await User.findByPk(referral.userId);
          const frontendUrl = getFrontendUrl();
          const referrerUser = await User.findOne({ where: { email: referral.referrer } });
          const refereeName = user ? `${user.firstName} ${user.lastName || ""}`.trim() : "Unknown";
          const referrerName = referrerUser ? `${referrerUser.firstName} ${referrerUser.lastName || ""}`.trim() : referral.referrer ?? "";

          const message = `
✅ **Referral Claim Approved** ✅
• Referrer: ${referral.referrer}
• Referred: ${user?.email}
• Referral ID: ${referralId}
• Revenue Status: Paid${planExtended && newExpiresAt ? `\n• Ambassador Coral plan extended — new expiry: ${newExpiresAt.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}` : ""}
          `;

          await SlackService.notify({
            location,
            host,
            node: SlackNode.MESSAGING,
            provider: SlackProvider.SYSTEM,
            severity: SlackSeverity.INFO,
            trigger: "Referral Approved",
            type: SlackEventType.ADMIN_ACTION,
            channel: SlackChannel.TOWN_CRIER,
            teamMentions: "CSM",
            body: message.trim(),
          });

          // JIR-053: SG-GRP-CONFIRMED — email to referee (referrer who made the referral)
          if (referral.type === "GRP" && referrerUser) {
            await sendGrpConfirmedEmail({
              name: referrerUser.firstName,
              email: referrerUser.email,
              referrerName: refereeName,
              frontendUrl,
            });
            logger.info(`✅ GRP confirmed email sent to ${referrerUser.email}`);
          }

          // JIR-071: SG-INT-GRP-APPROVED — internal email to team
          if (referral.type === "GRP") {
            const confirmedCount = await Referrer.count({
              where: { referrer: referral.referrer, status: ReferrerStatus.APPROVED, type: "GRP" },
            });
            await sendInternalReferralEmail({
              referralType: "GRP",
              action: "Approved",
              adminUrl: `${frontendUrl}/admin-dashboard/referrals`,
              referrerName: referrerName ?? "",
              referrerEmail: referral.referrer || "",
              referrerId: referrerUser?.uniqueId ?? undefined,
              refereeName: refereeName ?? "",
              refereeEmail: user?.email || "",
              referralId: (referral as any).sequentialId ?? referralId,
              adminName,
              oldEndDate: oldExpiresAt ? oldExpiresAt.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" }) : undefined,
              newEndDate: newExpiresAt ? newExpiresAt.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" }) : undefined,
              confirmedCount,
            });
            logger.info(`✅ Internal GRP approved email sent to team`);

            // RC follow-up alongside SG-GRP-CONFIRMED
            if (referrerUser) {
              sendRCFollowUpTag({
                host,
                fullName: referrerName ?? "",
                customerId: referrerUser.uniqueId ?? null,
                templateId: "SG-GRP-CONFIRMED",
              }).catch((e) => logger.error(`RC follow-up failed: ${e}`));
            }
          }
        } catch (err) {
          logger.error(`❌ Notification failed after GRP approve: ${err}`);
        }
      });

      return {
        success: true,
        message: "Referral approved successfully"
      };
    } catch (error: any) {
      logger.error(`❌ Failed to approve referral: ${error.message}`);
      throw error;
    }
  }

  /**
   * Restore a soft-deleted referral record (sets isDeleted = false)
   */
  static async restoreReferral(req: any, referralId: string) {
    const host = req.headers.host || req.headers.origin || "localhost";
    const location = getEnvironmentFromHost(host);
    try {
      const referral = await Referrer.findByPk(referralId);

      if (!referral) {
        throw new Error("Referral not found");
      }

      if (!referral.isDeleted) {
        throw new Error("Referral is not deleted");
      }

      const adminName = req.user ? `${(req.user as any).firstName || ''} ${(req.user as any).lastName || ''}`.trim() || (req.user as any).email : 'system';

      await referral.update({
        isDeleted: false,
        updatedBy: adminName
      });

      logger.info(`✅ Referral ${referralId} restored by ${adminName}`);

      // Send Slack notification
      setImmediate(async () => {
        try {
          const user = await User.findByPk(referral.userId);
          
          const message = `
♻️ **Referral Record Restored** ♻️
• Restored by: ${adminName}
• Referrer: ${referral.referrer}
• Referred: ${user?.email}
• Referral ID: ${referralId}
          `;

          await SlackService.notify({
            location,
            host,
            node: SlackNode.MESSAGING,
            provider: SlackProvider.SYSTEM,
            severity: SlackSeverity.INFO,
            trigger: "Referral Restored",
            type: SlackEventType.ADMIN_ACTION,
            channel: SlackChannel.TOWN_CRIER,
            teamMentions: "CSM",
            body: message.trim(),
          });
        } catch (err) {
          logger.error(`❌ Slack notification failed: ${err}`);
        }
      });

      return {
        success: true,
        message: "Referral restored successfully"
      };
    } catch (error: any) {
      logger.error(`❌ Failed to restore referral: ${error.message}`);
      throw error;
    }
  }

  /**
   * Permanently delete a referral record from the database
   */
  static async permanentDeleteReferral(req: any, referralId: string) {
    const host = req.headers.host || req.headers.origin || "localhost";
    const location = getEnvironmentFromHost(host);
    try {
      const referral = await Referrer.findByPk(referralId);

      if (!referral) {
        throw new Error("Referral not found");
      }

      const adminName = req.user ? `${(req.user as any).firstName || ''} ${(req.user as any).lastName || ''}`.trim() || (req.user as any).email : 'system';

      const user = await User.findByPk(referral.userId);
      const referrerEmail = referral.referrer;

      await referral.destroy();

      logger.info(`✅ Referral ${referralId} permanently deleted by ${adminName}`);

      // Send Slack notification
      setImmediate(async () => {
        try {
          const message = `
🔥 **Referral Record Permanently Deleted** 🔥
• Deleted by: ${adminName}
• Referrer: ${referrerEmail}
• Referred: ${user?.email}
• Referral ID: ${referralId}
          `;

          await SlackService.notify({
            location,
            host,
            node: SlackNode.MESSAGING,
            provider: SlackProvider.SYSTEM,
            severity: SlackSeverity.INFO,
            trigger: "Referral Permanently Deleted",
            type: SlackEventType.ADMIN_ACTION,
            channel: SlackChannel.TOWN_CRIER,
            teamMentions: "CSM",
            body: message.trim(),
          });
        } catch (err) {
          logger.error(`❌ Slack notification failed: ${err}`);
        }
      });

      return {
        success: true,
        message: "Referral permanently deleted"
      };
    } catch (error: any) {
      logger.error(`❌ Failed to permanently delete referral: ${error.message}`);
      throw error;
    }
  }

  /**
   * Soft-delete a referral record (sets isDeleted = true)
   */
  static async deleteReferral(req: any, referralId: string) {
    const host = req.headers.host || req.headers.origin || "localhost";
    const location = getEnvironmentFromHost(host);
    try {
      const referral = await Referrer.findByPk(referralId);

      if (!referral) {
        throw new Error("Referral not found");
      }

      const adminName = req.user ? `${(req.user as any).firstName || ''} ${(req.user as any).lastName || ''}`.trim() || (req.user as any).email : 'system';

      await referral.update({
        isDeleted: true,
        updatedBy: adminName
      });

      logger.info(`✅ Referral ${referralId} soft-deleted by ${adminName}`);

      // Send Slack notification
      setImmediate(async () => {
        try {
          const user = await User.findByPk(referral.userId);
          
          const message = `
🗑️ **Referral Record Deleted** 🗑️
• Deleted by: ${adminName}
• Referrer: ${referral.referrer}
• Referred: ${user?.email}
• Referral ID: ${referralId}
          `;

          await SlackService.notify({
            location,
            host,
            node: SlackNode.MESSAGING,
            provider: SlackProvider.SYSTEM,
            severity: SlackSeverity.INFO,
            trigger: "Referral Deleted",
            type: SlackEventType.ADMIN_ACTION,
            channel: SlackChannel.TOWN_CRIER,
            teamMentions: "CSM",
            body: message.trim(),
          });
        } catch (err) {
          logger.error(`❌ Slack notification failed: ${err}`);
        }
      });

      return {
        success: true,
        message: "Referral deleted successfully"
      };
    } catch (error: any) {
      logger.error(`❌ Failed to delete referral: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update referral payment status (e.g. mark CRP as paid)
   */
  static async updatePaymentStatus(req: any, referralId: string, paymentStatus: string) {
    const host = req.headers.host || req.headers.origin || "localhost";
    const location = getEnvironmentFromHost(host);
    try {
      const referral = await Referrer.findByPk(referralId);
      if (!referral) {
        throw new Error("Referral not found");
      }

      const statusMap: Record<string, string> = {
        paid: RevenueStatus.PAID,
        unpaid: RevenueStatus.UNPAID,
        pending: "Pending",
      };
      const resolvedStatus = statusMap[paymentStatus.toLowerCase()] ?? paymentStatus;
      const adminName = req.user ? `${(req.user as any).firstName || ''} ${(req.user as any).lastName || ''}`.trim() || (req.user as any).email : 'system';

      await referral.update({
        referralStatus: resolvedStatus,
        status: resolvedStatus === RevenueStatus.PAID ? ReferrerStatus.APPROVED : referral.status,
        updatedBy: adminName,
      });

      logger.info(`✅ Referral ${referralId} payment status updated to ${resolvedStatus} by ${adminName}`);

      setImmediate(async () => {
        try {
          const referredUser = await User.findByPk(referral.userId);
          const referrerUser = await User.findOne({ where: { email: referral.referrer } });
          const frontendUrl = getFrontendUrl();
          const refereeName = referredUser ? `${referredUser.firstName} ${referredUser.lastName || ""}`.trim() : "Unknown";
          const referrerName = referrerUser ? `${referrerUser.firstName} ${referrerUser.lastName || ""}`.trim() : referral.referrer ?? "";

          const message = `
💰 **CRP Payout Marked as Paid**
• Referral ID: ${referralId}
• Referrer: ${referral.referrer}
• Referred: ${referredUser?.email || 'N/A'}
• Marked by: ${adminName}
• Payment status: ${resolvedStatus}
          `.trim();

          await SlackService.notify({
            location,
            host,
            node: SlackNode.MESSAGING,
            provider: SlackProvider.SYSTEM,
            severity: SlackSeverity.INFO,
            trigger: "CRP Payout Marked Paid",
            type: SlackEventType.ADMIN_ACTION,
            channel: SlackChannel.TOWN_CRIER,
            teamMentions: "CSM",
            body: message,
          });

          // JIR-064: SG-CRP-PAID — email to referrer confirming payout
          if (resolvedStatus === RevenueStatus.PAID && referrerUser) {
            await sendCrpPaidEmail({
              name: referrerUser.firstName,
              email: referrerUser.email,
              payoutAmount: "$50",
              frontendUrl,
            });
            logger.info(`✅ CRP paid email sent to referrer ${referrerUser.email}`);
          }

          // JIR-073: SG-INT-CRP-PAID — internal email to team
          if (resolvedStatus === RevenueStatus.PAID) {
            await sendInternalReferralEmail({
              referralType: referral.type || "CRP",
              action: "Payout Paid",
              adminUrl: `${frontendUrl}/admin-dashboard/referrals`,
              referrerName: referrerName ?? "",
              referrerEmail: referral.referrer || "",
              refereeName: refereeName ?? "",
              refereeEmail: referredUser?.email || "",
              referralId: (referral as any).sequentialId ?? referralId,
              adminName,
              payId: referral.payId ?? undefined,
              paidDate: new Date().toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" }),
            });
            logger.info(`✅ Internal CRP paid email sent to team`);

            // RC follow-up alongside SG-CRP-PAID
            if (referrerUser) {
              sendRCFollowUpTag({
                host,
                fullName: referrerName ?? "",
                customerId: referrerUser.uniqueId ?? null,
                templateId: "SG-CRP-PAID",
              }).catch((e) => logger.error(`RC follow-up failed: ${e}`));
            }
          }
        } catch (err) {
          logger.error(`❌ Slack/email notification failed after markPaid: ${err}`);
        }
      });

      return { success: true, message: "Payment status updated" };
    } catch (error: any) {
      logger.error(`❌ Failed to update payment status: ${error.message}`);
      throw error;
    }
  }

  /**
   * Decline referral claim
   */
  static async declineClaim(req: any, referralId: string, reason?: string) {
    const host = req.headers.host || req.headers.origin || "localhost";
    const location = getEnvironmentFromHost(host);
    try {
      const referral = await Referrer.findByPk(referralId);
      
      if (!referral) {
        throw new Error("Referral not found");
      }

      const adminName = req.user ? `${(req.user as any).firstName || ''} ${(req.user as any).lastName || ''}`.trim() || (req.user as any).email : 'system';

      await referral.update({
        status: ReferrerStatus.REJECTED,
        declinedReason: reason || null,
        updatedBy: adminName
      });

      logger.info(`✅ Referral ${referralId} declined by ${adminName}`);

      // JIR-057: Audit entry — GRP decline
      if ((referral as any).type === "GRP" && req.user) {
        const referrerUser = await User.findOne({ where: { email: referral.referrer }, attributes: ["id", "uniqueId"] });
        const referredUser = await User.findByPk(referral.userId, { attributes: ["id", "uniqueId"] });
        AuditLogService.log({
          userId: (req.user as any).id,
          userFullName: adminName,
          userRole: (req.user as any).role || "admin",
          method: "POST",
          url: `/v1/referrals/${referralId}/decline`,
          description: `GRP referral ${referralId} declined — referrer: ${referral.referrer}${reason ? ` | reason: ${reason}` : ""}`,
          dataEntry: {
            referral_id: (referral as any).sequentialId ?? referralId,
            program: "GRP",
            action: "DECLINED",
            actor: adminName,
            referrer_id: referrerUser?.uniqueId ?? null,
            referred_id: referredUser?.uniqueId ?? null,
            reason_code: reason || null,
            note: "",
            reward: null,
            applied_via: null,
          },
        });
      }

      // Send Slack + email notifications
      setImmediate(async () => {
        try {
          const user = await User.findByPk(referral.userId);
          const frontendUrl = getFrontendUrl();
          const referrerUser = await User.findOne({ where: { email: referral.referrer } });
          const refereeName = user ? `${user.firstName} ${user.lastName || ""}`.trim() : "Unknown";
          const referrerName = referrerUser ? `${referrerUser.firstName} ${referrerUser.lastName || ""}`.trim() : referral.referrer ?? "";

          const message = `
❌ **Referral Claim Declined** ❌
• Referrer: ${referral.referrer}
• Referred: ${user?.email}
• Referral ID: ${referralId}
• Reason: ${reason || 'No reason provided'}
          `;

          await SlackService.notify({
            location,
            host,
            node: SlackNode.MESSAGING,
            provider: SlackProvider.SYSTEM,
            severity: SlackSeverity.INFO,
            trigger: "Referral Declined",
            type: SlackEventType.ADMIN_ACTION,
            channel: SlackChannel.TOWN_CRIER,
            teamMentions: "CSM",
            body: message.trim(),
          });

          // JIR-054: SG-GRP-DECLINED — email to referee (referrer whose referral was declined)
          if (referral.type === "GRP" && referrerUser) {
            await sendGrpDeclinedEmail({
              name: referrerUser.firstName,
              email: referrerUser.email,
              referrerName: refereeName,
              declinedReason: reason || "No reason provided",
              frontendUrl,
            });
            logger.info(`✅ GRP declined email sent to ${referrerUser.email}`);
          }

          // JIR-072: SG-INT-GRP-DECLINED — internal email to team
          if (referral.type === "GRP") {
            await sendInternalReferralEmail({
              referralType: "GRP",
              action: "Declined",
              adminUrl: `${frontendUrl}/admin-dashboard/referrals`,
              referrerName: referrerName ?? "",
              referrerEmail: referral.referrer || "",
              referrerId: referrerUser?.uniqueId ?? undefined,
              refereeName: refereeName ?? "",
              refereeEmail: user?.email || "",
              referralId: (referral as any).sequentialId ?? referralId,
              adminName,
              reasonCode: reason || undefined,
            });
            logger.info(`✅ Internal GRP declined email sent to team`);

            // RC follow-up alongside SG-GRP-DECLINED
            if (referrerUser) {
              sendRCFollowUpTag({
                host,
                fullName: referrerName ?? "",
                customerId: referrerUser.uniqueId ?? null,
                templateId: "SG-GRP-DECLINED",
              }).catch((e) => logger.error(`RC follow-up failed: ${e}`));
            }
          }

          // SG-INT-PRP-REFERRAL — internal email for PRP referrals
          if (referral.type === "PRP") {
            await sendPrpInternalEmail({
              partnerName: referrerName ?? "",
              partnerEmail: referral.referrer || "",
              refereeName: refereeName ?? "",
              refereeEmail: user?.email || "",
              adminUrl: `${frontendUrl}/admin-dashboard/referrals`,
            });
            logger.info(`✅ Internal PRP email sent to team`);
          }
        } catch (err) {
          logger.error(`❌ Notification failed after GRP decline: ${err}`);
        }
      });

      return {
        success: true,
        message: "Referral declined successfully"
      };
    } catch (error: any) {
      logger.error(`❌ Failed to decline referral: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get referrals for specific user
   */
  static async getUserReferrals(userId: string) {
    try {
      // First find user email by ID
      const user = await User.findByPk(userId);
      if (!user) {
        logger.warn(`⚠️ User with ID ${userId} not found when fetching referrals`);
        return { referrals: [], totalReferrals: 0, totalSuccessfulReferrals: 0 };
      }

      // Referrer field stores EMAIL not user ID
      const referrals = await Referrer.findAll({
        where: { referrer: user.email },
        include: [{ model: User, as: 'user', attributes: ['id', 'email', 'firstName', 'lastName', 'role', 'paymentStatus', 'isUserSubscribed'] }],
        order: [['createdAt', 'DESC']]
      });

      const totalReferrals = referrals.length;
      let totalPaidReferrals = 0;
      let totalUnpaidReferrals = 0;
      let totalEarnings = 0;

      referrals.forEach(ref => {
        const isClient = ref.user?.role === 'client' || ref.user?.paymentStatus === PaymentStatus.PAID || ref.user?.isUserSubscribed === true;

        if (ref.status === 'APPROVED') {
          totalPaidReferrals++;
          if (isClient) {
            totalEarnings += 50;
          }
        } else if (ref.status === 'PENDING') {
          totalUnpaidReferrals++;
        }
      });

      logger.info(`✅ User ${user.email} has ${totalReferrals} referrals ($${totalEarnings} earnings)`);

      return {
        referrals,
        totalReferrals,
        totalPaidReferrals,
        totalUnpaidReferrals,
        totalEarnings
      };
    } catch (error: any) {
      logger.error(`❌ Failed to fetch user referrals: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get referrals by email directly — skips the userId→email lookup for lower latency
   */
  static async getUserReferralsByEmail(email: string) {
    try {
      const referrals = await Referrer.findAll({
        where: { referrer: email },
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'firstName', 'lastName', 'email', 'role', 'paymentStatus', 'isUserSubscribed', 'createdAt'],
          },
        ],
        order: [['createdAt', 'DESC']],
        raw: true,
        nest: true,
      });

      const totalReferrals = referrals.length;
      let totalPaidReferrals = 0;
      let totalUnpaidReferrals = 0;
      let totalEarnings = 0;

      const mapped = referrals.map((ref: any) => {
        const isClient =
          ref.user?.role === 'client' ||
          ref.user?.paymentStatus === PaymentStatus.PAID ||
          ref.user?.isUserSubscribed === true;

        if (ref.status === 'APPROVED') {
          totalPaidReferrals++;
          if (isClient) totalEarnings += 50;
        } else if (ref.status === 'PENDING') {
          totalUnpaidReferrals++;
        }

        return {
          ...ref,
          referralStatus: ref.status ?? 'PENDING',
          'Referral Status': ref.status,
        };
      });

      logger.info(`✅ Email ${email} has ${totalReferrals} referrals ($${totalEarnings} earnings)`);

      return {
        referrals: mapped,
        totalReferrals,
        totalPaidReferrals,
        totalUnpaidReferrals,
        totalEarnings,
      };
    } catch (error: any) {
      logger.error(`❌ Failed to fetch referrals by email: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Get partner summary — total referral stats + users invited by the authenticated partner
   */
  static async getPartnerSummary(userId: string, partnerUser: any) {
    try {
      const partnerEmail = partnerUser.email;
      const baseReferralUrl = process.env.CLIENT_APP_DOMAIN || "http://localhost:3001";

      // Find partner's referral code
      const partnerRecord = await User.findOne({ where: { id: userId } });
      const referralCode = partnerRecord?.email;
      const referralLink = `${baseReferralUrl}/register?referralCode=${referralCode}-partner`;

      // Find all referred users where referrer = partner's email
      const referrals = await Referrer.findAll({
        where: { referrer: partnerEmail },
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'email', 'firstName', 'lastName', 'role', 'paymentStatus', 'isUserSubscribed', 'isDeleted', 'deletedAt', 'createdAt', 'plan'],
          },
        ],
        order: [['createdAt', 'DESC']],
      });

      // --- Batch plan validation: query all referred users' plans at once ---
      const referredUserIds = referrals
        .map(ref => (ref as any).user?.id)
        .filter(Boolean) as string[];

      logger.info(`getPartnerSummary referredUserIds: ${JSON.stringify(referredUserIds)}`);

      const planResults = new Map<string, boolean>();
      if (referredUserIds.length > 0) {
        // Pull all non-expired, non-deleted plans for these users
        const plans = await Plan.findAll({
          where: {
            userId: { [Op.in]: referredUserIds },
            hasExpired: false,
            deletedAt: null,
          },
        });

        logger.info(`getPartnerSummary raw plans found: ${plans.length}`);
        if (plans.length > 0) {
          for (const p of plans) {
            logger.info(`getPartnerSummary plan: userId=${p.userId}, title="${p.title}", paymentStatus="${p.paymentStatus}", hasExpired=${p.hasExpired}, expiresAt=${p.expiresAt}`);
          }
        }

        // Build map of userId → has valid plan using same logic as userHasValidPlan
        for (const userId of referredUserIds) {
          const userPlans = plans.filter(p => p.userId === userId);

          if (userPlans.length === 0) {
            logger.warn(`getPartnerSummary userId=${userId} → No plans found at all`);
            planResults.set(userId, false);
            continue;
          }

          const valid = userPlans.some(p => {
            // 1) Case-insensitive title match
            const titleMatch = Plan.VALID_PLAN_TITLES.some(
              t => p.title?.toLowerCase() === t.toLowerCase(),
            );
            if (!titleMatch) {
              logger.warn(`getPartnerSummary userId=${userId} → title "${p.title}" not valid`);
              return false;
            }

            // 2) Must not be failed/refunded
            if (p.paymentStatus === 'failed' || p.paymentStatus === 'refunded') {
              logger.warn(`getPartnerSummary userId=${userId} → paymentStatus is "${p.paymentStatus}"`);
              return false;
            }

            // 3) Check expiry
            if (p.expiresAt) {
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const expiry = new Date(p.expiresAt);
              expiry.setHours(23, 59, 59, 999);
              if (expiry < today) {
                logger.warn(`getPartnerSummary userId=${userId} → plan expired at ${p.expiresAt}`);
                return false;
              }
            }

            logger.info(`getPartnerSummary userId=${userId} → VALID plan: id="${p.id}", title="${p.title}"`);
            return true;
          });

          planResults.set(userId, valid);
        }
      }

      // Calculate stats
      const totalReferrals = referrals.length;

      const invitedReferrals = referrals.filter(ref => ref.status === 'PENDING' || ref.status === 'CLAIMED').length;

      const registeredReferrals = referrals.filter(ref => {
        const referredUser = (ref as any).user;
        return referredUser && !referredUser.isDeleted;
      }).length;

      const paidReferrals = referrals.filter(ref => {
        const referredUser = (ref as any).user;
        const hasValidPlan = planResults.get(referredUser?.id) === true;
        const isPaid = (ref.referralStatus === 'PAID' && hasValidPlan) ||
          (referredUser?.paymentStatus === 'Paid' && hasValidPlan) ||
          (referredUser?.isUserSubscribed === true && hasValidPlan);
        return isPaid;
      }).length;

      // Total earnings: paymentStatus === 'Paid' referrals * 50
      const totalEarnings = referrals.reduce((sum, ref) => {
        const referredUser = (ref as any).user;
        const hasValidPlan = planResults.get(referredUser?.id) === true;
        const isPaid = (ref.referralStatus === 'PAID' && hasValidPlan) ||
          (referredUser?.paymentStatus === 'Paid' && hasValidPlan) ||
          (referredUser?.isUserSubscribed === true && hasValidPlan);
        return sum + (isPaid ? 50 : 0);
      }, 0);

      // Detailed list of referred users
      const referredUsers = referrals.map(ref => {
        const referredUser = (ref as any).user;
        const hasValidPlan = planResults.get(referredUser?.id) === true;
        return {
          referralId: ref.id,
          userId: ref.userId,
          email: referredUser?.email || null,
          firstName: referredUser?.firstName || null,
          lastName: referredUser?.lastName || null,
          status: ref.status,
          referralStatus: ref.referralStatus,
          paymentStatus: referredUser?.paymentStatus || null,
          isUserSubscribed: (referredUser?.isUserSubscribed === true && hasValidPlan) || false,
          createdAt: ref.createdAt,
        };
      });

      logger.info(`✅ Partner summary for ${partnerEmail}: ${totalReferrals} total referrals, ${totalEarnings} earnings`);

      return {
        summary: {
          totalReferrals,
          invitedReferrals,
          registeredReferrals,
          paidReferrals,
          totalEarnings,
        },
        referralLink,
        referredUsers,
      };
    } catch (error: any) {
      logger.error(`❌ Failed to fetch partner summary: ${error.message}`);
      throw error;
    }
  }

  /**
   * Send referral email to a potential referral
   */
  static async handleSendReferralEmail(
    userId: string,
    referralData: ISendReferralEmailRequest,
    host: string,
  ): Promise<ISendReferralEmailResponse> {
    // Find the authenticated user with partner association
    const user = await User.findByPk(userId, {
      include: [{ model: Partner, as: 'partner' }],
    });

    if (!user) {
      throw new ErrorHandler("User not found", 404);
    }

    // Check if trying to refer themselves
    if (user.email.toLowerCase() === referralData.email.toLowerCase()) {
      throw new ErrorHandler("You cannot refer yourself", 400);
    }

    // Check if email already exists as registered user
    const existingEmailUser = await User.findOne({ 
      where: { email: referralData.email.toLowerCase() } 
    });
    if (existingEmailUser) {
      throw new ErrorHandler(`User with email ${referralData.email} is already registered`, 400);
    }

    // Check if phone number already exists as registered user
    if (referralData.phoneNumber) {
      const existingPhoneUser = await User.findOne({ 
        where: { phoneNumber: referralData.phoneNumber } 
      });
      if (existingPhoneUser) {
        throw new ErrorHandler(`User with phone number ${referralData.phoneNumber} is already registered`, 400);
      }
    }

    // Generate referral link
    let referralLink = "";
    const frontendUrl = process.env.CLIENT_APP_DOMAIN || "http://localhost:3001";

    if ((user as any).partner?.referralCode) {
      referralLink = `${frontendUrl}/register?ref=${(user as any).partner.referralCode}`;
    } else {
      referralLink = `${frontendUrl}/register?ref=${user.email}-partner`;
    }

    // Send referral email
    setImmediate(async () => {
      logger.info("Sending referrals email");
      try {
        await getQueue(EMAIL_QUEUE).add("sendReferral", {
          type: "sendReferral",
          referral: {
            firstName: referralData.firstName,
            lastName: referralData.lastName,
            middleName: referralData.middleName,
            email: referralData.email,
            phoneNumber: referralData.phoneNumber,
          },
          referrer: {
            name: getFullName({
              firstName: user.firstName,
              lastName: user.lastName,
              middleName: user.middleName,
            }),
            email: user.email,
          },
          referralLink,
          frontendUrl,
        });
      } catch (error) {
        logger.error("Failed to send referral email:", error);
        throw new ErrorHandler("Failed to send referral email", 500);
      }
    });

    // Send Slack notification
    setImmediate(async () => {
      try {
        await SlackService.notify({
          location: getEnvironmentFromHost(host),
          host,
          node: SlackNode.USER_MANAGEMENT,
          provider: SlackProvider.SYSTEM,
          severity: SlackSeverity.INFO,
          trigger: `Referral email sent: ${user.email}`,
          type: SlackEventType.REFERRAL_SIGNUP,
          channel: SlackChannel.TOWN_CRIER,
          teamMentions: "CSM",
          body: `Referral invitation email sent.
Sent by: ${user.firstName} ${user.lastName} (${user.email})
Sent to: ${referralData.firstName} ${referralData.lastName} (${referralData.email})
Phone: ${referralData.phoneNumber}`,
        });
        logger.info(`✅ Slack notification sent for referral email: ${user.email}`);
      } catch (error: any) {
        logger.error(`❌ Failed to send Slack notification: ${error.message}`);
      }
    });

    logger.info(`Referral email sent by user: ${userId} to ${referralData.email}`);

    return {
      success: true,
      message: "Referral email sent successfully",
      referralLink,
    };
  }

  /**
   * Claim a referral — validate if the authenticated user was invited by the provided details
   * Called when the referred person has isUserSubscribed = true
   */
  static async handleClaimReferral(
    userId: string,
    claimData: IClaimReferralRequest,
    host: string,
  ): Promise<IClaimReferralResponse> {
    // Find the authenticated user
    const user = await User.findByPk(userId);

    if (!user) {
      throw new ErrorHandler("User not found", 404);
    }

    // Find the referrer by email or phone number
    const referrer = await User.findOne({
      where: {
        [Op.or]: [
          { email: claimData.email.toLowerCase() },
          { phoneNumber: claimData.phoneNumber },
        ],
      }
    });

    if (!referrer) {
      throw new ErrorHandler(
        "No referrer found with the provided email or phone number",
        404,
      );
    }

    // Check if the authenticated user was actually referred by this referrer
    const existingReferral = await Referrer.findOne({
      where: {
        userId: referrer.id,
        referrer: user.email,
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'isUserSubscribed', 'email', 'firstName', 'lastName', 'plan'],
        },
      ],
    });

    logger.info(`Existing Referrals: ${existingReferral}`);

    if (!existingReferral) {
      throw new ErrorHandler(
        "Invalid referral claim: this user is not your referrer.",
        400,
      );
    }

    // Validate plan via the Plan model (authoritative source) instead of User.plan string
    const hasValidPlan = await Plan.userHasValidPlan(user.id);

    // Also check isUserSubscribed as a secondary guard
    if (!user.isUserSubscribed || !hasValidPlan) {
      throw new ErrorHandler(
        "You must have an active subscription with a Bronze, Silver, Gold, or Platinum plan before the referral can be claimed.",
        400,
      );
    }

    // Update the referral status to CLAIMED
    await existingReferral.update({ status: ReferrerStatus.CLAIMED });

    // Update referrer stats
    if (referrer.partner) {
      await updateReferrerStats(referrer.partner);
    }

    const referrerName = getFullName({
      firstName: referrer.firstName,
      lastName: referrer.lastName,
      middleName: referrer.middleName,
    });

    // Send Slack notification
    setImmediate(async () => {
      try {
        await SlackService.notify({
          location: getEnvironmentFromHost(host),
          host,
          node: SlackNode.USER_MANAGEMENT,
          provider: SlackProvider.SYSTEM,
          severity: SlackSeverity.INFO,
          trigger: `Referral claimed: ${user.email}`,
          type: SlackEventType.REFERRAL_SIGNUP,
          channel: SlackChannel.TOWN_CRIER,
          teamMentions: "CSM",
          body: `Referral claimed successfully.
Claimed by: ${user.firstName} ${user.lastName} (${user.email})
Referrer: ${referrerName} (${referrer.email})
Status: Claimed
Next step: Confirm referral claimed, process any applicable rewards for the referrer.`,
        });
        logger.info(`✅ Slack notification sent for referral claim: ${user.email}`);
      } catch (error: any) {
        logger.error(`❌ Failed to send Slack notification: ${error.message}`);
      }
    });

    // Send email notification to referrer
    setImmediate(async () => {
      try {
        await getQueue(EMAIL_QUEUE).add("referralClaimed", {
          type: "referralClaimed",
          user: {
            name: referrer.firstName,
            email: referrer.email,
          },
          claimedUser: getFullName({
            firstName: user.firstName,
            lastName: user.lastName,
            middleName: user.middleName,
          }),
          frontendUrl: getFrontendUrl(),
        });
      } catch (error) {
        logger.error("Failed to send email notification for referral claim:", error);
      }
    });

    logger.info(`Referral claimed successfully by user: ${userId}`);

    return {
      success: true,
      message: "Referral claimed successfully",
      referrerName,
    };
  }

  /**
   * Bulk upload referrals from spreadsheet
   */
  static async handleBulkUploadReferrals(
    userId: string,
    referrals: IBulkReferralItem[],
    host: string,
  ): Promise<IBulkUploadReferralResponse> {
    // Find the authenticated user
    const user = await User.findByPk(userId, {
      include: [
        {
          model: Partner,
          as: "partner",
        },
      ],
    });

    if (!user) {
      throw new ErrorHandler("User not found", 404);
    }

    // Generate referral link
    let referralLink = "";
    const frontendUrl = process.env.CLIENT_APP_DOMAIN || "http://localhost:3001";

    if ((user as any).partner?.referralCode) {
      referralLink = `${frontendUrl}/register?ref=${(user as any).partner.referralCode}`;
    } else {
      referralLink = `${frontendUrl}/register?ref=${user.email}-partner`;
    }

    const failedEmails: string[] = [];
    
    // Count valid referrals before processing
    const validReferrals = referrals.filter(referral => {
      if (user.email.toLowerCase() === referral.email.toLowerCase()) {
        failedEmails.push(referral.email);
        return false;
      }
      return true;
    });

    // Process each referral
    validReferrals.forEach(referral => {
      setImmediate(async () => {
        try {
          await getQueue(EMAIL_QUEUE).add("sendReferral", {
            type: "sendReferral",
            referral: {
              firstName: referral.firstName,
              lastName: referral.lastName,
              middleName: referral.middleName,
              email: referral.email,
              phoneNumber: referral.phoneNumber,
            },
            referrer: {
              name: getFullName({
                firstName: user.firstName,
                lastName: user.lastName,
                middleName: user.middleName,
              }),
              email: user.email,
            },
            referralLink,
            frontendUrl,
          });
        } catch (error) {
          logger.error(`Failed to send referral email to ${referral.email}:`, error);
        }
      });
    });

    // Send Slack notification
    setImmediate(async () => {
      try {
        await SlackService.notify({
          location: getEnvironmentFromHost(host),
          host,
          node: SlackNode.USER_MANAGEMENT,
          provider: SlackProvider.SYSTEM,
          severity: SlackSeverity.INFO,
          trigger: `Bulk referral emails sent: ${user.email}`,
          type: SlackEventType.REFERRAL_SIGNUP,
          channel: SlackChannel.TOWN_CRIER,
          teamMentions: "CSM",
          body: `Bulk referral invitation emails queued.
Sent by: ${user.firstName} ${user.lastName} (${user.email})
Total Queued: ${validReferrals.length}
Total Attempted: ${referrals.length}
Skipped: ${failedEmails.length}`,
        });
        logger.info(`✅ Slack notification sent for bulk referral: ${user.email}`);
      } catch (error: any) {
        logger.error(`❌ Failed to send Slack notification: ${error.message}`);
      }
    });

    logger.info(
      `Bulk referral emails sent by user: ${userId}. Total Queued: ${validReferrals.length}, Skipped: ${failedEmails.length}`,
    );

    return {
      success: true,
      message: `Successfully queued ${validReferrals.length} referral emails`,
      totalSent: validReferrals.length,
      failed: failedEmails.length,
      failedEmails,
    };
  }

  /**
   * ⚡ JIR-061 — RC saves PayID → flips AWAITING_PAYID → UNPAID, fires payout-owed email
   */
  static async savePayId(req: any, referralId: string, payId: string) {
    const referral = await Referrer.findByPk(referralId);
    if (!referral) throw new ErrorHandler("Referral not found", 404);
    if (referral.type !== "CRP") throw new ErrorHandler("PayID only applies to CRP referrals", 400);

    const host = req.headers?.host || req.headers?.origin || "localhost";
    const location = getEnvironmentFromHost(host);
    const actor = req.user?.email || "system";

    await referral.update({
      payId,
      referralStatus: RevenueStatus.UNPAID,
      updatedBy: actor,
    });

    setImmediate(async () => {
      try {
        const referrerUser = await User.findOne({ where: { email: referral.referrer ?? "" }, attributes: ["firstName", "lastName", "email", "uniqueId"] });
        const referredUser = await User.findByPk(referral.userId, { attributes: ["firstName", "lastName", "email"] });
        const referrerName = referrerUser ? `${referrerUser.firstName} ${referrerUser.lastName}` : (referral.referrer ?? "Unknown");
        const refereeName = referredUser ? `${referredUser.firstName} ${referredUser.lastName}` : "Unknown";

        await SlackService.notify({
          location,
          host,
          node: SlackNode.FINANCE,
          provider: SlackProvider.SYSTEM,
          severity: SlackSeverity.INFO,
          trigger: "CRP PayID Saved",
          type: SlackEventType.ADMIN_ACTION,
          channel: SlackChannel.TOWN_CRIER,
          teamMentions: "CSM",
          body: `💳 *CRP PayID Saved — Payout Now Unpaid*\n• Referrer: ${referrerName} (${referral.referrer})\n• Referred: ${refereeName}\n• PayID: ${payId}\n• Amount Owed: $50\n• Actioned by: ${actor}`,
        });

        await sendCrpPayoutOwedEmail({
          referrerName,
          referrerEmail: referral.referrer ?? "",
          referrerId: (referrerUser as any)?.uniqueId ?? undefined,
          refereeName,
          refereeEmail: referredUser?.email ?? "",
          payoutAmount: "$50",
          adminUrl: getFrontendUrl(),
          referralId: (referral as any).sequentialId ?? referralId,
          payId,
        });
      } catch (err: any) {
        logger.error(`❌ savePayId side-effects failed: ${err.message}`);
      }
    });

    if (req.user) {
      AuditLogService.log({
        userId: (req.user as any).id,
        userFullName: actor,
        userRole: (req.user as any).role || "admin",
        method: "PATCH",
        url: `/v1/referrals/${referralId}/payid`,
        description: `CRP referral ${referralId} — PayID saved, payout set to UNPAID`,
        dataEntry: {
          referral_id: referralId,
          program: "CRP",
          action: "PAYID_SAVED",
          actor,
          trigger: "admin_payid_save",
          payid: payId,
          payout_status: "UNPAID",
          paid_by: null,
          attribution: "FINAL",
        },
      });
    }

    return { referralId, payId, paymentStatus: RevenueStatus.UNPAID };
  }

  /**
   * ⚡ JIR-063 — Mark CRP payout as PAID, fires SG-CRP-PAID + internal email
   */
  static async markPaid(req: any, referralId: string) {
    const referral = await Referrer.findByPk(referralId);
    if (!referral) throw new ErrorHandler("Referral not found", 404);
    if (referral.type !== "CRP") throw new ErrorHandler("Mark-paid only applies to CRP referrals", 400);
    if (!referral.payId) throw new ErrorHandler("Cannot mark paid — PayID has not been entered yet", 400);

    const host = req.headers?.host || req.headers?.origin || "localhost";
    const location = getEnvironmentFromHost(host);
    const actor = req.user?.email || "system";

    await referral.update({
      referralStatus: RevenueStatus.PAID,
      updatedBy: actor,
    });

    setImmediate(async () => {
      try {
        const referrerUser = await User.findOne({ where: { email: referral.referrer ?? "" }, attributes: ["firstName", "lastName", "email"] });
        const referredUser = await User.findByPk(referral.userId, { attributes: ["firstName", "lastName", "email"] });
        const referrerName = referrerUser ? `${referrerUser.firstName} ${referrerUser.lastName}` : (referral.referrer ?? "Unknown");
        const refereeName = referredUser ? `${referredUser.firstName} ${referredUser.lastName}` : "Unknown";

        await SlackService.notify({
          location,
          host,
          node: SlackNode.FINANCE,
          provider: SlackProvider.SYSTEM,
          severity: SlackSeverity.INFO,
          trigger: "CRP Payout Marked Paid",
          type: SlackEventType.ADMIN_ACTION,
          channel: SlackChannel.PAID_SUB,
          teamMentions: "CSM",
          body: `💸 *CRP Payout Paid — $50 Dispatched*\n• Referrer: ${referrerName} (${referral.referrer})\n• Referred: ${refereeName}\n• PayID: ${referral.payId}\n• Amount Paid: $50\n• Actioned by: ${actor}`,
        });

        if (referrerUser) {
          await sendCrpPaidEmail({
            name: `${referrerUser.firstName} ${referrerUser.lastName}`.trim(),
            email: referrerUser.email,
            payoutAmount: "$50",
            frontendUrl: getFrontendUrl(),
          });
        }
        await sendInternalReferralEmail({
          referralType: "CRP",
          action: "Payout Paid",
          adminUrl: getFrontendUrl(),
          referrerName,
          referrerEmail: referral.referrer ?? "",
          referrerId: referrerUser?.uniqueId ?? undefined,
          refereeName,
          refereeEmail: referredUser?.email ?? "",
          referralId: (referral as any).sequentialId ?? referralId,
          adminName: actor,
          payId: referral.payId ?? undefined,
          paidDate: new Date().toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" }),
        });

        if (referrerUser) {
          sendRCFollowUpTag({
            host,
            fullName: referrerName,
            customerId: referrerUser.uniqueId ?? null,
            templateId: "SG-CRP-PAID",
          }).catch(() => {});
        }
      } catch (err: any) {
        logger.error(`❌ markPaid side-effects failed: ${err.message}`);
      }
    });

    if (req.user) {
      AuditLogService.log({
        userId: (req.user as any).id,
        userFullName: actor,
        userRole: (req.user as any).role || "admin",
        method: "POST",
        url: `/v1/referrals/${referralId}/mark-paid`,
        description: `CRP referral ${referralId} — $50 payout marked as PAID`,
        dataEntry: {
          referral_id: referralId,
          program: "CRP",
          action: "PAID",
          actor,
          trigger: "admin_mark_paid",
          amount: 50,
          payid: referral.payId,
          payout_status: "PAID",
          paid_by: actor,
          attribution: "FINAL",
        },
      });
    }

    return { referralId, paymentStatus: RevenueStatus.PAID };
  }
}
