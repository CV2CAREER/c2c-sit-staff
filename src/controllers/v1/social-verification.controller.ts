import { Response } from "express";
import catchAsyncError from "@/utils/catchAsyncError";
import { AdminSocialVerificationService } from "@/services/admin/social-verification.service";
import { getServiceLogger } from "@/utils/createLogger";

const logger = getServiceLogger("admin-social-verification-controller");

export const listSocialVerificationQueue = catchAsyncError(
  async (req: any, res: Response) => {
    logger.info("Listing social verification queue");
    const result = await AdminSocialVerificationService.listQueue({
      q: req.query?.q,
      status: req.query?.status,
      page: req.query?.page ? Number(req.query.page) : undefined,
      limit: req.query?.limit ? Number(req.query.limit) : undefined,
    });
    return res.apiSuccess(result, "Social verification queue fetched", 200);
  },
);

export const getUserSocialSubmissions = catchAsyncError(
  async (req: any, res: Response) => {
    const { userId } = req.params;
    logger.info(`Fetching social submissions for user ${userId}`);
    const result = await AdminSocialVerificationService.getUserSubmissions(userId);
    return res.apiSuccess(result, "User social submissions fetched", 200);
  },
);

export const approveSocialVerification = catchAsyncError(
  async (req: any, res: Response) => {
    const { id } = req.params;
    const row = await AdminSocialVerificationService.approveRow(id, req.user?.id);
    return res.apiSuccess(row, "Social verification approved", 200);
  },
);

export const rejectSocialVerification = catchAsyncError(
  async (req: any, res: Response) => {
    const { id } = req.params;
    const result = await AdminSocialVerificationService.rejectRow(id, req.user?.id);
    return res.apiSuccess(result, "Social verification rejected", 200);
  },
);

export const exemptUserFromSocialVerification = catchAsyncError(
  async (req: any, res: Response) => {
    const { userId } = req.params;
    const result = await AdminSocialVerificationService.exemptUser(userId, req.user?.id);
    return res.apiSuccess(result, "User exempted from social verification", 200);
  },
);

export const unExemptUserFromSocialVerification = catchAsyncError(
  async (req: any, res: Response) => {
    const { userId } = req.params;
    const result = await AdminSocialVerificationService.unExemptUser(userId, req.user?.id);
    return res.apiSuccess(result, "User exemption removed", 200);
  },
);
