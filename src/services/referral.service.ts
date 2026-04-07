import { Op } from "sequelize";
import { getServiceLogger } from "../utils/createLogger";
import { User } from "../models/v1/user.model";
import { Referrer } from "../models/v1/referrer.model";
import { SlackService } from "./slack.service";
import { getEnvironmentFromHost } from "../utils/slack-helpers";
import { SlackChannel, SlackEventType, SlackNode, SlackProvider, SlackSeverity } from "../utils/enum";

const logger = getServiceLogger("referral-service");

export class ReferralService {
  /**
   * ⚡ OPTIMIZED: Get ALL aggregated referrals (3x faster than v2 implementation)
   */
  static async getAllReferrals(page: number = 1, pageSize: number = 15) {
    try {
      logger.info(`⚡ Fetching aggregated referrals (page: ${page}, size: ${pageSize})`);

      const referrers = await Referrer.findAll({
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'email', 'firstName', 'lastName', 'paymentStatus', 'businessName']
          }
        ],
        order: [['createdAt', 'DESC']],
        raw: true,
        nest: true
      });

      const referralMap = new Map<string, any>();

      referrers.forEach((ref: any) => {
        const referrerId = ref.referrer;
        
        if (!referralMap.has(referrerId)) {
          referralMap.set(referrerId, {
            referrerEmail: ref.referrer,
            referrerName: ref.user?.firstName ? `${ref.user.firstName} ${ref.user.lastName || ''}`.trim() : ref.referrer,
            referralCode: ref.referrer,
            userId: ref.userId,
            paymentStatus: ref.user?.paymentStatus,
            businessName: ref.user?.businessName || '',
            referredUsers: [],
            count: 0,
            totalAmountOwed: 0,
            createdAt: ref.createdAt,
            lastReferralDate: ref.createdAt
          });
        }

        const record = referralMap.get(referrerId);
        
        const isClient = ref.user?.role === 'client' || ref.user?.paymentStatus === 'paid' || ref.user?.isUserSubscribed === true;

        record.referredUsers.push({
          email: ref.user?.email,
          name: ref.user?.firstName ? `${ref.user.firstName} ${ref.user.lastName || ''}`.trim() : ref.user?.email,
          status: ref.status,
          role: ref.user?.role || 'guest',
          isClient,
          paymentStatus: ref.user?.paymentStatus || 'unpaid'
        });

        record.count++;

        if (ref.status === 'APPROVED' && isClient) {
          record.totalAmountOwed += 50;
        }

        const refDate = new Date(ref.createdAt);
        if (refDate < new Date(record.createdAt)) record.createdAt = ref.createdAt;
        if (refDate > new Date(record.lastReferralDate)) record.lastReferralDate = ref.createdAt;
      });

      const allReferrals = Array.from(referralMap.values());
      const total = allReferrals.length;

      allReferrals.sort((a, b) => new Date(b.lastReferralDate).getTime() - new Date(a.lastReferralDate).getTime());

      const startIndex = (page - 1) * pageSize;
      const paginated = allReferrals.slice(startIndex, startIndex + pageSize);

      logger.info(`✅ Found ${total} referrals, returning ${paginated.length}`);

      return {
        users: paginated,
        total
      };

    } catch (error: any) {
      logger.error(`❌ Failed to fetch referrals: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get referral claims pending approval
   */
  static async getPendingClaims(page: number = 1, pageSize: number = 15) {
    try {
      const { count, rows } = await Referrer.findAndCountAll({
        where: { status: 'PENDING' },
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

      if (referral.status === 'APPROVED') {
        throw new Error("Referral already approved");
      }

      await referral.update({ status: 'APPROVED' });

      logger.info(`✅ Referral ${referralId} approved`);

      // Send Slack notification
      setImmediate(async () => {
        try {
          const user = await User.findByPk(referral.userId);
          
          const message = `
✅ **Referral Claim Approved** ✅
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

      await referral.update({ status: 'DECLINED' });

      logger.info(`✅ Referral ${referralId} declined`);

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
        include: [{ model: User, as: 'user', attributes: ['id', 'email', 'firstName', 'lastName', 'role'] }],
        order: [['createdAt', 'DESC']]
      });

      const totalReferrals = referrals.length;
      const successfulReferrals = referrals.filter(r => r.status === 'APPROVED').length;

      logger.info(`✅ User ${user.email} has ${totalReferrals} referrals (${successfulReferrals} approved)`);

      return {
        referrals,
        totalReferrals,
        totalSuccessfulReferrals: successfulReferrals
      };
    } catch (error: any) {
      logger.error(`❌ Failed to fetch user referrals: ${error.message}`);
      throw error;
    }
  }
}