import jwt from "jsonwebtoken";
import { User } from "../models/v1/user.model";
import ErrorHandler from "../utils/errorHandler";
import { fieldEncryption } from "../utils/field-encryption";
import { Role } from "../utils/enum";
import { getServiceLogger } from "../utils/createLogger";
import { CLIENT_APP_DOMAIN, VIEW_AS_USER_JWT_SECRET } from "../config/env";

const logger = getServiceLogger("view-as-user-service");

const STAFF_DASHBOARD_MAP: Partial<Record<Role, string>> = {
  [Role.ADMIN]: "/admin/dashboard",
  [Role.COACH]: "/coach/dashboard",
  [Role.ASSISTANT]: "/assistant/dashboard",
  [Role.PARTNER]: "/partner/dashboard",
  [Role.CUSTOMER]: "/cse/dashboard",
  [Role.CSE]: "/cse/dashboard",
  [Role.SALES]: "/sales/dashboard",
  [Role.TECHNOLOGY]: "/technology/dashboard",
  [Role.BUSINESS]: "/business/dashboard",
};

export interface ViewAsUserResult {
  success: boolean;
  redirectUrl?: string;
  email?: string;
  dashboardUrl?: string;
  viewAsUserInternal?: boolean;
}

export const viewAsUserService = async (
  requestingUserEmail: string,
  requestingUserRole: string,
  targetEmail: string
): Promise<ViewAsUserResult> => {
  if (!targetEmail || !targetEmail.trim()) {
    throw new ErrorHandler("Target user email is required.", 400);
  }

  const targetUserId = await fieldEncryption.findUserByEmail(targetEmail.trim().toLowerCase());
  const targetUser = targetUserId ? await User.findByPk(targetUserId, {
    attributes: ["id", "role", "email"],
  }) : null;

  if (!targetUser) {
    logger.warn(`Target user not found: ${targetEmail}`);
    throw new ErrorHandler("Target user not found.", 404);
  }

  // Assistants can only view client or guest users
  if (requestingUserRole === Role.ASSISTANT) {
    if (targetUser.role !== Role.CLIENT && targetUser.role !== Role.GUEST) {
      logger.warn(
        `Assistant ${requestingUserEmail} attempted to view user with role: ${targetUser.role}`
      );
      throw new ErrorHandler(
        "Assistants can only view users with 'client' or 'guest' roles.",
        403
      );
    }
  }

  // External redirect flow for client/guest users
  if (targetUser.role === Role.CLIENT || targetUser.role === Role.GUEST) {
    const token = jwt.sign(
      {
        userId: targetUser.id,
        email: targetUser.email,
        role: targetUser.role,
        viewedByUserEmail: requestingUserEmail,
        viewedByUserRole: requestingUserRole,
      },
      VIEW_AS_USER_JWT_SECRET as string,
      { expiresIn: "5m" }
    );

    const redirectUrl = `${CLIENT_APP_DOMAIN}/api/auth/view-as-user-login?token=${token}`;
    logger.info(
      `Generated view-as-user redirect for ${requestingUserEmail} → ${targetEmail}`
    );
    return { success: true, redirectUrl };
  }

  // Internal staff re-auth flow — admin only
  if (requestingUserRole !== Role.ADMIN) {
    throw new ErrorHandler(
      "Only administrators can view as internal staff users.",
      403
    );
  }

  const dashboardUrl = STAFF_DASHBOARD_MAP[targetUser.role as Role] ?? "/login";
  logger.info(
    `Prepared internal view-as-staff for ${requestingUserEmail} → ${targetEmail} (${dashboardUrl})`
  );

  return {
    success: true,
    email: targetUser.email,
    dashboardUrl,
    viewAsUserInternal: true,
  };
};
