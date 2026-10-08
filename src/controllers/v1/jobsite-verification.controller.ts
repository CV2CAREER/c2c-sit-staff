import { Request, Response } from "express";
import catchAsyncError from "../../utils/catchAsyncError";
import { jobsiteVerificationService } from "../../services/jobsite-verification.service";
import ErrorHandler from "../../utils/errorHandler";
import { getServiceLogger } from "../../utils/createLogger";

const logger = getServiceLogger("jobsite-verification-controller");

/**
 * GET /api/v1/admin/jobsite-verifications
 * List verification queue with search, filter, and summary stats
 */
export const listJobsiteVerifications = catchAsyncError(
  async (req: Request, res: Response) => {
    const { status, country, jobsiteId, clientId, search, page, limit } = req.query as Record<string, string>;

    const result = await jobsiteVerificationService.listVerifications({
      status: status as any,
      country,
      jobsiteId,
      clientId,
      search,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });

    return res.apiSuccess(result, "Jobsite verifications retrieved successfully");
  }
);

/**
 * GET /api/v1/admin/jobsite-verifications/client/:clientId
 * Get all verifications for a specific client with summary counts & exemption state
 */
export const getClientJobsiteVerifications = catchAsyncError(
  async (req: Request, res: Response) => {
    const { clientId } = req.params;
    if (!clientId) {
      throw new ErrorHandler("clientId parameter is required", 400);
    }

    const result = await jobsiteVerificationService.getClientVerifications(clientId);
    return res.apiSuccess(result, "Client jobsite verifications retrieved successfully");
  }
);

/**
 * GET /api/v1/admin/jobsite-verifications/reject-reasons
 * Get active preset reject reasons
 */
export const getJobsiteRejectReasons = catchAsyncError(
  async (req: Request, res: Response) => {
    const reasons = await jobsiteVerificationService.getRejectReasons();
    return res.apiSuccess(reasons, "Jobsite reject reasons retrieved successfully");
  }
);

/**
 * GET /api/v1/admin/jobsite-verifications/configs
 * Get jobsite configs grouped by country
 */
export const getJobsiteConfigs = catchAsyncError(
  async (req: Request, res: Response) => {
    const configs = await jobsiteVerificationService.getJobsiteConfigsGrouped();
    return res.apiSuccess(configs, "Jobsite configs retrieved successfully");
  }
);

/**
 * POST /api/v1/admin/jobsite-verifications/:id/verify
 * Approve/verify a submission
 */
export const verifyJobsiteVerification = catchAsyncError(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const reviewer = req.user?.id || req.user?.email || "staff";

    const result = await jobsiteVerificationService.verifyVerification(id, reviewer);
    return res.apiSuccess(result, "Jobsite verification verified successfully");
  }
);

/**
 * POST /api/v1/admin/jobsite-verifications/:id/reject
 * Reject a submission with reason
 */
export const rejectJobsiteVerification = catchAsyncError(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { rejectReason } = req.body;
    const reviewer = req.user?.id || req.user?.email || "staff";

    const result = await jobsiteVerificationService.rejectVerification(id, rejectReason, reviewer);
    return res.apiSuccess(result, "Jobsite verification rejected");
  }
);

/**
 * POST /api/v1/admin/jobsite-verifications/exempt
 * Exempt a client or specific jobsite verification
 */
export const exemptJobsiteVerification = catchAsyncError(
  async (req: Request, res: Response) => {
    const { clientId, jobsiteId, country, exemptReason } = req.body;
    const reviewer = req.user?.id || req.user?.email || "staff";

    const result = await jobsiteVerificationService.exemptVerification({
      clientId,
      jobsiteId,
      country,
      exemptReason,
      reviewedBy: reviewer,
    });
    return res.apiSuccess(result, "Exemption updated successfully");
  }
);

/**
 * POST /api/v1/admin/jobsite-verifications/unexempt
 * Remove exemption for a client or specific jobsite verification
 */
export const unexemptJobsiteVerification = catchAsyncError(
  async (req: Request, res: Response) => {
    const { clientId, jobsiteId, country } = req.body;
    const reviewer = req.user?.id || req.user?.email || "staff";

    const result = await jobsiteVerificationService.unexemptVerification({
      clientId,
      jobsiteId,
      country,
      reviewedBy: reviewer,
    });
    return res.apiSuccess(result, "Exemption removed successfully");
  }
);

/**
 * POST /api/v1/admin/jobsite-verifications/configs/toggle-required
 * Toggle Required/Off for a specific jobsite-country combination
 */
export const toggleJobsiteRequired = catchAsyncError(
  async (req: Request, res: Response) => {
    const { jobsiteId, country, required } = req.body;
    if (!jobsiteId || !country || required === undefined) {
      throw new ErrorHandler("jobsiteId, country, and required are required", 400);
    }

    const result = await jobsiteVerificationService.toggleJobsiteRequired({
      jobsiteId,
      country,
      required: Boolean(required),
    });
    return res.apiSuccess(result, "Jobsite requirement updated");
  }
);

/**
 * POST /api/v1/admin/jobsite-verifications/configs/video-guide
 * Save video guide URL for a specific jobsite-country combination
 */
export const updateJobsiteVideoGuide = catchAsyncError(
  async (req: Request, res: Response) => {
    const { jobsiteId, country, videoGuideUrl } = req.body;
    if (!jobsiteId || !country) {
      throw new ErrorHandler("jobsiteId and country are required", 400);
    }

    const result = await jobsiteVerificationService.updateVideoGuideUrl({
      jobsiteId,
      country,
      videoGuideUrl,
    });
    return res.apiSuccess(result, "Video guide URL saved successfully");
  }
);

/**
 * POST /api/v1/admin/jobsite-verifications/configs/add
 * Add a new jobsite to jobsite_config
 */
export const addJobsiteConfig = catchAsyncError(
  async (req: Request, res: Response) => {
    const { jobsiteId, country, required, videoGuideUrl } = req.body;
    const result = await jobsiteVerificationService.addJobsiteConfig({
      jobsiteId,
      country,
      required,
      videoGuideUrl,
    });
    return res.apiSuccess(result, "New jobsite added successfully");
  }
);
