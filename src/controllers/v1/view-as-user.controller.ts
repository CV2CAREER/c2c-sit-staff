import { Request, Response } from "express";
import catchAsyncError from "../../utils/catchAsyncError";
import { getServiceLogger } from "../../utils/createLogger";
import { viewAsUserService } from "../../services/view-as-user.service";

const logger = getServiceLogger("view-as-user-controller");

export const viewAsUser = catchAsyncError(
  async (req: Request, res: Response) => {
    const { targetEmail } = req.body;
    const { user } = req;

    logger.info(
      `View-as-user initiated by ${user.role} (${user.email}) for target: ${targetEmail}`
    );

    const result = await viewAsUserService(user.email, user.role, targetEmail);

    logger.info(
      `View-as-user successful for ${user.email} targeting ${targetEmail}`
    );

    res.apiSuccess(result, "View as user initiated successfully");
  }
);
