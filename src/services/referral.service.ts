import { Op } from "sequelize";
import { getServiceLogger } from "../utils/createLogger";
import { User } from "../models/v1/user.model";
import { Referrer } from "../models/v1/referrer.model";
import { SlackService } from "./slack.service";
import { getEnvironmentFromHost } from "../utils/slack-helpers";
import { PaymentStatus, ReferrerStatus, RevenueStatus, SlackChannel, SlackEventType, SlackNode, SlackProvider, SlackSeverity } from "../utils/enum";

const logger = getServiceLogger("referral-service");

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

      const mapped = rows.map((ref: any) => {
        const isClient = ref.user?.role === 'client' || ref.user?.paymentStatus === PaymentStatus.PAID || ref.user?.isUserSubscribed === true;

        return {
          referralId: ref.id,
          referrerEmail: ref.referrer,
          referrerName: ref.user?.firstName ? `${ref.user.firstName} ${ref.user.lastName || ''}`.trim() : ref.referrer,
          referralCode: ref.referrer,
          referredUserId: ref.userId,
          referredEmail: ref.user?.email,
          referredName: ref.user?.firstName ? `${ref.user.firstName} ${ref.user.lastName || ''}`.trim() : ref.user?.email,
          status: ref.status,
          role: ref.user?.role || 'N/A',
          isClient,
          paymentStatus: ref.user?.paymentStatus || 'unpaid',
          businessName: ref.user?.businessName || '',
          amountOwed: ref.status === 'CLAIMED' && isClient ? 10 : 0,
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
        order: [['createdAt', 'DESC']]
      });

      return {
        users: rows,
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

      // Send Slack notification
      setImmediate(async () => {
        try {
          const user = await User.findByPk(referral.userId);
          
          const message = `
✅ **Referral Claim Approved** ✅
• Referrer: ${referral.referrer}
• Referred: ${user?.email}
• Referral ID: ${referralId}
• Revenue Status: Paid
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
        } catch (err) {
          logger.error(`❌ Slack notification failed: ${err}`);
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
        updatedBy: adminName
      });

      logger.info(`✅ Referral ${referralId} declined by ${adminName}`);

      // Send Slack notification
      setImmediate(async () => {
        try {
          const user = await User.findByPk(referral.userId);
          
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
        } catch (err) {
          logger.error(`❌ Slack notification failed: ${err}`);
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
}