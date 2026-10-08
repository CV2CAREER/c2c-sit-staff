import { Op, Sequelize } from "sequelize";
import { JobsiteVerification, JobsiteVerificationStatus } from "../models/v1/jobsite-verification.model";
import { JobsiteConfig } from "../models/v1/jobsite-config.model";
import { JobsiteRejectReason } from "../models/v1/jobsite-reject-reason.model";
import { User } from "../models/v1/user.model";
import ErrorHandler from "../utils/errorHandler";
import { getServiceLogger } from "../utils/createLogger";

const logger = getServiceLogger("jobsite-verification-service");

export interface ListVerificationFilter {
  status?: JobsiteVerificationStatus | "all";
  country?: string;
  jobsiteId?: string;
  clientId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

import crypto from "crypto";
import { sendMail } from "../config/sendGrid";
import { PROD_FRONTEND_URL, TEAM_EMAIL } from "../config/env";
import { fieldEncryption } from "../utils/field-encryption";
import {
  SlackChannel,
  SlackEventType,
  SlackNode,
  SlackProvider,
  SlackSeverity,
} from "../utils/enum";
import { SlackService } from "./slack.service";

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

async function sendApprovedNotifications(
  verification: JobsiteVerification,
  reviewedBy: string,
  host?: string,
): Promise<void> {
  const client = (verification as any).client as User;
  if (!client) return;

  const frontendUrl = PROD_FRONTEND_URL || "https://rat.customer.cvtocareer.com";
  const currentYear = new Date().getFullYear();
  const clientEmail = await resolveClientEmail(client);

  if (clientEmail) {
    sendMail({
      email: clientEmail,
      subject: "Jobsite verification approved ✓ — CVtoCAREER",
      templateName: "jobsite-credential-approved.ejs",
      templateData: {
        name: client.firstName,
        email: clientEmail,
        isAmbassador: !!(client as any).isAmbassador,
        frontendUrl,
        currentYear,
      },
    }).catch((err) => {
      logger.error(`Failed to send jobsite verification approved email to ${clientEmail}:`, err);
    });
  }

  SlackService.notify({
    host: host || "staff.cvtocareer.com",
    node: SlackNode.USER_MANAGEMENT,
    provider: SlackProvider.SYSTEM,
    severity: SlackSeverity.INFO,
    type: SlackEventType.ADMIN_ACTION,
    trigger: "jobsite-credential-approved",
    channel: SlackChannel.TOWN_CRIER,
    body: `✅ Jobsite verification approved\nClient: ${client.firstName} ${client.lastName}\nJobsite: ${verification.jobsiteId} (${verification.country})\nReviewed by: ${reviewedBy}`,
  }).catch((err) => {
    logger.error("Failed to send Slack notification for jobsite verification approval:", err);
  });
}

function normalizeCountryName(countryStr?: string | null): string[] {
  if (!countryStr || !countryStr.trim()) return ["Australia", "AU", "australia"];
  const trimmed = countryStr.trim();
  const lower = trimmed.toLowerCase();

  if (lower === "australia" || lower === "au" || lower === "aus") {
    return ["Australia", "AU", "australia", "AUS"];
  }
  if (lower === "canada" || lower === "ca" || lower === "can") {
    return ["Canada", "CA", "canada", "CAN"];
  }
  if (
    lower === "united kingdom" ||
    lower === "uk" ||
    lower === "gb" ||
    lower === "great britain" ||
    lower === "england"
  ) {
    return ["United Kingdom", "UK", "GB", "united kingdom", "Great Britain", "England"];
  }
  if (
    lower === "united states" ||
    lower === "united states of america" ||
    lower === "us" ||
    lower === "usa"
  ) {
    return ["United States", "US", "USA", "united states", "United States of America"];
  }
  if (lower === "new zealand" || lower === "nz" || lower === "nzl") {
    return ["New Zealand", "NZ", "new zealand", "NZL"];
  }
  if (lower === "ireland" || lower === "ie" || lower === "irl") {
    return ["Ireland", "IE", "ireland", "IRL"];
  }

  return [trimmed, lower];
}

function getCountryMatchCondition(country?: string | null) {
  const normalized = normalizeCountryName(country);
  const lowerVariants = normalized.map((c) => c.toLowerCase());

  return {
    [Op.or]: [
      { country: { [Op.in]: normalized } },
      Sequelize.where(
        Sequelize.fn("LOWER", Sequelize.col("country")),
        { [Op.in]: lowerVariants }
      ),
    ],
  };
}

export class JobsiteVerificationService {
  /**
   * List verification queue with search, filter, and stats
   */
  async listVerifications(filters: ListVerificationFilter = {}) {
    const page = Math.max(1, Number(filters.page) || 1);
    const limit = Math.max(1, Math.min(200, Number(filters.limit) || 50));
    const offset = (page - 1) * limit;

    const where: any = {};
    if (filters.status && filters.status !== "all") {
      where.status = filters.status;
    }
    if (filters.country) {
      where.country = filters.country;
    }
    if (filters.jobsiteId) {
      where.jobsiteId = filters.jobsiteId;
    }
    if (filters.clientId) {
      where.clientId = filters.clientId;
    }

    const userWhere: any = {};
    if (filters.search && filters.search.trim()) {
      const q = `%${filters.search.trim().toLowerCase()}%`;
      userWhere[Op.or] = [
        { firstName: { [Op.iLike]: q } },
        { lastName: { [Op.iLike]: q } },
        { email: { [Op.iLike]: q } },
      ];
    }

    const { rows, count } = await JobsiteVerification.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: "client",
          where: Object.keys(userWhere).length > 0 ? userWhere : undefined,
          attributes: ["id", "firstName", "lastName", "email", "phoneNumber", "country"],
          required: Object.keys(userWhere).length > 0,
        },
      ],
      order: [["createdAt", "DESC"]],
      limit,
      offset,
    });

    // Compute overall stats across all verifications
    const allVerifications = await JobsiteVerification.findAll({
      attributes: ["status", "clientId"],
    });

    const pendingCount = allVerifications.filter((v) => v.status === "pending").length;
    const approvedCount = allVerifications.filter((v) => v.status === "verified").length;
    const uniqueClients = new Set(allVerifications.map((v) => v.clientId)).size;

    return {
      verifications: rows,
      total: count,
      page,
      totalPages: Math.ceil(count / limit),
      stats: {
        pendingCount,
        approvedCount,
        totalClients: uniqueClients,
      },
    };
  }

  /**
   * Get all verifications for a specific client with exemption status
   */
  async getClientVerifications(clientId: string) {
    if (!clientId) {
      throw new ErrorHandler("clientId is required", 400);
    }

    const client = await User.findByPk(clientId, {
      attributes: ["id", "firstName", "lastName", "email", "country"],
    });

    if (!client) {
      throw new ErrorHandler("Client not found", 404);
    }

    // Get configs for client's country
    const countryWhere = getCountryMatchCondition(client.country);
    const configs = await JobsiteConfig.findAll({
      where: countryWhere,
      order: [["jobsiteId", "ASC"]],
    });

    const verifications = await JobsiteVerification.findAll({
      where: { clientId },
      order: [["createdAt", "DESC"]],
    });

    const isExempt = verifications.some((v) => v.status === "exempt");
    const pendingCount = verifications.filter((v) => v.status === "pending").length;
    const verifiedCount = verifications.filter((v) => v.status === "verified").length;

    return {
      client,
      verifications,
      configs,
      isExempt,
      pendingCount,
      verifiedCount,
    };
  }

  /**
   * Get verification by ID
   */
  async getVerificationById(id: string) {
    const verification = await JobsiteVerification.findByPk(id, {
      include: [
        {
          model: User,
          as: "client",
          attributes: ["id", "firstName", "lastName", "email", "phoneNumber", "country"],
        },
      ],
    });

    if (!verification) {
      throw new ErrorHandler("Jobsite verification not found", 404);
    }

    return verification;
  }

  /**
   * Verify / approve a verification submission
   */
  async verifyVerification(id: string, reviewedBy: string) {
    const verification = await this.getVerificationById(id);

    verification.status = "verified";
    verification.reviewedAt = new Date();
    verification.reviewedBy = reviewedBy;
    verification.rejectReason = null;

    await verification.save();
    logger.info(`Verification ${id} approved by ${reviewedBy}`);

    // Trigger notification email + Slack message
    sendApprovedNotifications(verification, reviewedBy).catch((err) => {
      logger.error(`Error sending approved notifications for verification ${id}:`, err);
    });

    return verification;
  }

  /**
   * Reject a verification submission with reason
   */
  async rejectVerification(id: string, rejectReason: string, reviewedBy: string) {
    if (!rejectReason || !rejectReason.trim()) {
      throw new ErrorHandler("Reject reason is required", 400);
    }

    const verification = await this.getVerificationById(id);

    verification.status = "rejected";
    verification.rejectReason = rejectReason.trim();
    verification.reviewedAt = new Date();
    verification.reviewedBy = reviewedBy;

    await verification.save();
    logger.info(`Verification ${id} rejected by ${reviewedBy} (reason: ${rejectReason})`);

    return verification;
  }

  /**
   * Mark a verification or client as exempt
   */
  async exemptVerification(data: {
    clientId: string;
    jobsiteId?: string;
    country?: string;
    exemptReason?: string;
    reviewedBy: string;
  }) {
    const { clientId, jobsiteId, country, exemptReason, reviewedBy } = data;

    if (!clientId) {
      throw new ErrorHandler("clientId is required", 400);
    }

    const client = await User.findByPk(clientId);
    if (!client) {
      throw new ErrorHandler("Client not found", 404);
    }

    const targetCountry = country || client.country || "Australia";

    if (jobsiteId) {
      let verification = await JobsiteVerification.findOne({
        where: {
          clientId,
          jobsiteId: { [Op.iLike]: jobsiteId },
        },
      });

      if (!verification) {
        verification = await JobsiteVerification.create({
          clientId,
          jobsiteId,
          country: targetCountry,
          status: "exempt",
          exemptReason: exemptReason?.trim() || "Exempted by admin",
          reviewedAt: new Date(),
          reviewedBy,
        });
      } else {
        verification.status = "exempt";
        verification.exemptReason = exemptReason?.trim() || "Exempted by admin";
        verification.reviewedAt = new Date();
        verification.reviewedBy = reviewedBy;
        await verification.save();
      }

      return verification;
    }

    // Exempt all jobsites for this client
    const configs = await JobsiteConfig.findAll({
      where: getCountryMatchCondition(targetCountry),
    });

    const results = [];
    for (const conf of configs) {
      let verification = await JobsiteVerification.findOne({
        where: {
          clientId,
          jobsiteId: { [Op.iLike]: conf.jobsiteId },
        },
      });

      if (!verification) {
        verification = await JobsiteVerification.create({
          clientId,
          jobsiteId: conf.jobsiteId,
          country: targetCountry,
          status: "exempt",
          exemptReason: exemptReason?.trim() || "Exempted by admin",
          reviewedAt: new Date(),
          reviewedBy,
        });
      } else {
        verification.status = "exempt";
        verification.exemptReason = exemptReason?.trim() || "Exempted by admin";
        verification.reviewedAt = new Date();
        verification.reviewedBy = reviewedBy;
        await verification.save();
      }
      results.push(verification);
    }

    return results;
  }

  /**
   * Remove exemption for a client or specific jobsite verification
   */
  async unexemptVerification(data: {
    clientId: string;
    jobsiteId?: string;
    country?: string;
    reviewedBy: string;
  }) {
    const { clientId, jobsiteId, country, reviewedBy } = data;

    if (!clientId) {
      throw new ErrorHandler("clientId is required", 400);
    }

    const client = await User.findByPk(clientId);
    if (!client) {
      throw new ErrorHandler("Client not found", 404);
    }

    const targetCountry = country || client.country || "Australia";

    if (jobsiteId) {
      const verification = await JobsiteVerification.findOne({
        where: {
          clientId,
          jobsiteId: { [Op.iLike]: jobsiteId },
        },
      });

      if (verification && verification.status === "exempt") {
        verification.status = verification.proofFileRef ? "pending" : "not_started";
        verification.exemptReason = null;
        verification.reviewedAt = new Date();
        verification.reviewedBy = reviewedBy;
        await verification.save();
        return verification;
      }
      return verification;
    }

    // Unexempt all jobsites for this client
    const verifications = await JobsiteVerification.findAll({
      where: { clientId, status: "exempt" },
    });

    const results = [];
    for (const v of verifications) {
      v.status = v.proofFileRef ? "pending" : "not_started";
      v.exemptReason = null;
      v.reviewedAt = new Date();
      v.reviewedBy = reviewedBy;
      await v.save();
      results.push(v);
    }

    return results;
  }

  /**
   * Retrieve active reject reasons for dropdown
   */
  async getRejectReasons() {
    try {
      const reasons = await JobsiteRejectReason.findAll({
        where: { isActive: true },
        order: [["displayOrder", "ASC"], ["reason", "ASC"]],
      });
      if (reasons.length > 0) {
        return reasons;
      }
    } catch (err) {
      logger.warn("Could not query JobsiteRejectReason table, returning defaults:", err);
    }

    // Default presets if table is empty
    return [
      { id: "1", reason: "Document unreadable, blurry, or low quality", isActive: true, displayOrder: 1 },
      { id: "2", reason: "Name on proof does not match client account", isActive: true, displayOrder: 2 },
      { id: "3", reason: "Proof does not show completed jobsite verification", isActive: true, displayOrder: 3 },
      { id: "4", reason: "Screenshot is missing required account or profile details", isActive: true, displayOrder: 4 },
      { id: "5", reason: "Document is expired or invalid", isActive: true, displayOrder: 5 },
      { id: "6", reason: "Incorrect jobsite submitted for this requirement", isActive: true, displayOrder: 6 },
    ] as any;
  }

  /**
   * Retrieve jobsite configs grouped by country
   */
  async getJobsiteConfigsGrouped() {
    const configs = await JobsiteConfig.findAll({
      order: [["country", "ASC"], ["jobsiteId", "ASC"]],
    });

    const grouped: Record<string, JobsiteConfig[]> = {};
    for (const conf of configs) {
      if (!grouped[conf.country]) {
        grouped[conf.country] = [];
      }
      grouped[conf.country].push(conf);
    }

    return grouped;
  }

  /**
   * Update required toggle for a specific jobsite-country pair
   */
  async toggleJobsiteRequired(data: {
    jobsiteId: string;
    country: string;
    required: boolean;
  }) {
    const { jobsiteId, country, required } = data;

    let config = await JobsiteConfig.findOne({
      where: { jobsiteId, country },
    });

    if (!config) {
      config = await JobsiteConfig.create({
        jobsiteId,
        country,
        required,
      });
    } else {
      config.required = required;
      await config.save();
    }

    logger.info(`Jobsite ${jobsiteId} for ${country} required set to ${required}`);
    return config;
  }

  /**
   * Update video guide URL for a specific jobsite-country pair
   */
  async updateVideoGuideUrl(data: {
    jobsiteId: string;
    country: string;
    videoGuideUrl: string;
  }) {
    const { jobsiteId, country, videoGuideUrl } = data;

    let config = await JobsiteConfig.findOne({
      where: { jobsiteId, country },
    });

    if (!config) {
      config = await JobsiteConfig.create({
        jobsiteId,
        country,
        required: true,
        videoGuideUrl: videoGuideUrl?.trim() || null,
      });
    } else {
      config.videoGuideUrl = videoGuideUrl?.trim() || null;
      await config.save();
    }

    logger.info(`Updated video guide URL for ${jobsiteId} (${country})`);
    return config;
  }

  /**
   * Add a new jobsite to jobsite_config
   */
  async addJobsiteConfig(data: {
    jobsiteId: string;
    country: string;
    required?: boolean;
    videoGuideUrl?: string;
  }) {
    const { jobsiteId, country, required = true, videoGuideUrl } = data;

    if (!jobsiteId || !jobsiteId.trim() || !country || !country.trim()) {
      throw new ErrorHandler("jobsiteId and country are required", 400);
    }

    const cleanJobsiteId = jobsiteId.trim();
    const cleanCountry = country.trim();

    let config = await JobsiteConfig.findOne({
      where: { jobsiteId: cleanJobsiteId, country: cleanCountry },
    });

    if (config) {
      config.required = required;
      if (videoGuideUrl !== undefined) {
        config.videoGuideUrl = videoGuideUrl.trim() || null;
      }
      await config.save();
    } else {
      config = await JobsiteConfig.create({
        jobsiteId: cleanJobsiteId,
        country: cleanCountry,
        required,
        videoGuideUrl: videoGuideUrl?.trim() || null,
      });
    }

    logger.info(`Added/updated jobsite config ${cleanJobsiteId} for ${cleanCountry}`);
    return config;
  }
}

export const jobsiteVerificationService = new JobsiteVerificationService();
