import { Request, Response } from "express";
import { loginUser as loginUserService, promoteUserToAdmin, handleGetUserInfo } from "../../services/user.service";
import catchAsyncError from "../../utils/catchAsyncError";
import { getServiceLogger } from "../../utils/createLogger";
import { accessTokenOptions } from "../../utils/tokensOption";
import { ACCESS_TOKEN_COOKIE_NAME } from "../../config/env";

const logger = getServiceLogger("user-controller");

// Login User
export const loginUser = catchAsyncError(
  async (req: Request, res: Response) => {
    const { email, password } = req.body;

    logger.info(`Processing login request for email: ${email}`);

    const { user, accessToken } = await loginUserService(req, { email, password });

    // Set access token in httpOnly cookie
    res.cookie(ACCESS_TOKEN_COOKIE_NAME, accessToken, accessTokenOptions);

    logger.info(`Login successful for user: ${user.firstName} ${user.lastName} (${user.email})`);

    res.apiSuccess(
      {
        user,
        accessToken,
      },
      `Welcome Back ${user.firstName}`,
    );
  },
);

// Promote User to Admin
export const promoteToAdmin = catchAsyncError(
  async (req: Request, res: Response) => {
    const { userId } = req.params;
    const { role } = req.body;
    const { user } = req; // Authenticated user from middleware

    logger.info(`Processing promotion request for user ID: ${userId} to role: ${role}`);

    const promotedUser = await promoteUserToAdmin(userId, role, user.id);

    logger.info(`User ${promotedUser.firstName} ${promotedUser.lastName} (${promotedUser.email}) promoted to ${promotedUser.role}`);

    res.apiSuccess(
      {
        user: promotedUser,
      },
      `User successfully promoted to ${promotedUser.role}`,
    );
  },
);

// Get User Information
export const getUserInfo = catchAsyncError(
  async (req: Request, res: Response) => {
    const { userId } = req.params;

    logger.info(`Processing user info request for user ID: ${userId}`);

    const { user } = await handleGetUserInfo(userId);

    logger.info(`User info retrieved for user: ${user.firstName} ${user.lastName} (${user.email})`);

    res.apiSuccess(
      {
        user,
      },
      "User information retrieved successfully",
    );
  },
);

// Get Current User Profile
export const getCurrentUserProfile = catchAsyncError(
  async (req: Request, res: Response) => {
    const { user } = req;

    logger.info(`Processing profile request for authenticated user: ${user.email}`);

    // Get full user information including cached data
    const { user: fullUser } = await handleGetUserInfo(user.id);

    logger.info(`Profile retrieved for user: ${fullUser.firstName} ${fullUser.lastName} (${fullUser.email})`);

    res.apiSuccess(
      {
        user: fullUser,
      },
      "User profile retrieved successfully",
    );
  },
);
