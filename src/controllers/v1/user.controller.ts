import { Request, Response } from "express";
import {
  loginUser as loginUserService,
  promoteUserToAdmin,
  handleGetUserInfo,
  logoutUser as logoutUserService,
  getClients as getClientsService,
  getAssistants as getAssistantsService,
  getUsersByRoles as getUsersByRolesService,
  getAllUsers as getAllUsersService,
  getClientNameList as getClientNameListService,
} from "../../services/user.service";
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
    // const { user } = req; // Authenticated user from middleware

    logger.info(`Processing promotion request for user ID: ${userId} to role: ${role}`);

    const promotedUser = await promoteUserToAdmin(userId, role);

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

// Logout User
export const logoutUser = catchAsyncError(
  async (req: Request, res: Response) => {
    const { user } = req;
    const token = req.authToken;

    if (!token) {
      logger.warn(`Logout failed: No token provided for user: ${user.email}`);
      return res.apiSuccess(
        {},
        "No active session found",
      );
    }

    logger.info(`Processing logout request for user: ${user.email}`);

    // Blacklist the token
    await logoutUserService(token, user.id);

    // Clear the cookie
    res.clearCookie(ACCESS_TOKEN_COOKIE_NAME, accessTokenOptions);

    logger.info(`Logout successful for user: ${user.email}`);

    res.apiSuccess(
      {},
      "Logout successful",
    );
  },
);

// Get all users with role 'client'
export const getClients = catchAsyncError(
  async (req: Request, res: Response) => {
    logger.info(`Processing request to get clients with filters`);

    const result = await getClientsService(req.query);

    logger.info(`Retrieved ${result.clients.length} of ${result.pagination.total} clients`);

    res.apiSuccess(
      result,
      "Clients retrieved successfully",
    );
  },
);

// Get all users with role 'assistant' (returned as PC - Placement Control)
export const getAssistants = catchAsyncError(
  async (req: Request, res: Response) => {
    logger.info(`Processing request to get all assistants`);

    const pcUsers = await getAssistantsService();

    logger.info(`Retrieved ${pcUsers.length} assistants (returned as PC)`);

    res.apiSuccess(
      {
        pcUsers,
        count: pcUsers.length
      },
      "Placement Control (PC) retrieved successfully",
    );
  },
);

// Get all staff users with roles assistant, admin, coach, technology
export const getUsersByRoles = catchAsyncError(
  async (req: Request, res: Response) => {
    logger.info(`Processing request to get users by staff roles`);

    const users = await getUsersByRolesService();

    logger.info(`Retrieved ${users.length} staff users`);

    res.apiSuccess(
      {
        users,
        count: users.length
      },
      "Staff users retrieved successfully",
    );
  },
);

// Get all clients — full name and email only (for dropdowns / selectors)
export const getClientNameList = catchAsyncError(
  async (req: Request, res: Response) => {
    logger.info("Processing request to get client name list");

    const clients = await getClientNameListService();

    logger.info(`Retrieved ${clients.length} clients for name list`);

    res.apiSuccess(
      { clients, count: clients.length },
      "Client name list retrieved successfully",
    );
  },
);

// Get all users (for admin and assistant roles)
export const getAllUsers = catchAsyncError(
  async (req: Request, res: Response) => {
    logger.info(`Processing request to get all users`);

    const users = await getAllUsersService(req.query);

    logger.info(`Retrieved ${users.length} users`);

    res.apiSuccess(
      {
        users,
        count: users.length
      },
      "Users retrieved successfully",
    );
  },
);
