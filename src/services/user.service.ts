import { getServiceLogger } from "../utils/createLogger";
import { User } from "../models/v1/user.model";
import ErrorHandler from "../utils/errorHandler";
import { Op } from "sequelize";
import bcrypt from "bcryptjs";
import { getCachedUser, setCachedUser } from "./cache/user.cache.service";
import { hopeUserExists, hopeUserIdExists } from "../utils/user-helper";
import { validate as isUuid } from "uuid";
import { SlackService } from "./slack.service";
import { SlackChannel, SlackEventType, SlackNode, SlackProvider, SlackSeverity } from "../utils/enum";
import { getEnvironmentFromHost } from "../utils/slack-helpers";
import { validateSignInInput } from "../validators/input.validator";
import { signInCredentials } from "./signin.service";
import BlacklistedToken from "../models/v1/blacklistedToken.model";
import jwt from "jsonwebtoken";
import { SIGN_IN_ACCESS_SECRET_KEY } from "../config/env";

const logger = getServiceLogger("user");

export const handleGetUserInfo = async (userId: string) => {
  if (!isUuid(userId)) {
    throw new ErrorHandler("Invalid user ID.", 400);
  }

  let user: User | null = await getCachedUser(userId);

  if (user) logger.info("User fetched from REDIS");

  if (!user) {
    user = await hopeUserIdExists(userId);

    setCachedUser(userId, user);
  }

  return { user };
};

// Login User
export const loginUser = async (req: any, body: { email: string; password: string }) => {
  const { email, password } = body;
  const host = req.headers.host || req.headers.origin || "localhost";
  const location = getEnvironmentFromHost(host);

  const errorMessage = validateSignInInput({ email, password });
  if (errorMessage) {
    throw new ErrorHandler(errorMessage, 400);
  }

  const user = await hopeUserExists(email);

  const isPasswordSame = await bcrypt.compare(password, user.password);

  // handle logic wrong credentials
  if (!isPasswordSame) {
    throw new ErrorHandler(`Invalid credentials`, 400);
  }

  // Check if user has a valid staff role
  const validStaffRoles = ["coach", "admin", "assistant", "technology", "cse", "partner", "sales"];
  if (!validStaffRoles.includes(user.role)) {
    throw new ErrorHandler("Access denied. This account does not have the required permissions to access this system.", 403);
  }

  if (!user.isEmailVerified) {
    // Send Slack notification for unverified user login attempt
    setImmediate(async () => {
      try {
        await SlackService.notify({
          location,
          host,
          node: SlackNode.USER_MANAGEMENT,
          provider: SlackProvider.SYSTEM,
          severity: SlackSeverity.INFO,
          trigger: `Unverified user login attempt: ${user.email}`,
          type: SlackEventType.USER_TRIGGERED,
          channel: SlackChannel.TOWN_CRIER,
          body: `Unverified user attempted to login.
What happened: ${user.firstName} ${user.lastName} (${user.email}) attempted to login but email is not verified.
Immediate impact: User needs to verify account or contact support.
Next steps: User should verify email or contact support for assistance.`,
        });
        logger.info(`✅ Slack notified of unverified user login: ${user.email}`);
      } catch (err) {
        logger.error(`❌ Slack notification failed: ${err}`);
      }
    });

    throw new ErrorHandler("This account is not a verified account. Please verify your account or contact support.", 400);
  }

  // reset the token verified too false back incase a user wants to reset later on
  if (user.resetTokenVerified) {
    user.resetTokenVerified = false;
  }
  await user.save();

  // generate credentials
  const { accessToken } = await signInCredentials(user);

  return { user, accessToken };
};

// Promote User to Admin
export const promoteUserToAdmin = async (userId: string, newRole: string) => {
  logger.info(`Attempting to promote user ID: ${userId} to role: ${newRole}`);

  // Check if the requesting user is an admin
  //   const requestingUser = await User.findByPk(requestingUserId);
  //   if (!requestingUser) {
  //     logger.warn(`Promotion failed: Requesting user not found: ${requestingUserId}`);
  //     throw new ErrorHandler("Requesting user not found", 404);
  //   }

  //   if (requestingUser.role !== "admin") {
  //     logger.warn(`Promotion failed: User ${requestingUserId} (${requestingUser.email}) is not an admin`);

  //     // Send Slack notification for unauthorized promotion attempt
  //     setImmediate(async () => {
  //       try {
  //         await SlackService.notify({
  //           node: SlackNode.USER_MANAGEMENT,
  //           provider: SlackProvider.SYSTEM,
  //           severity: SlackSeverity.INFO,
  //           trigger: "Unauthorized promotion attempt",
  //           type: SlackEventType.USER_TRIGGERED,
  //           channel: SlackChannel.TOWN_CRIER,
  //           body: `Unauthorized promotion attempt detected.
  // What happened: ${requestingUser.firstName} ${requestingUser.lastName} (${requestingUser.email}) attempted to promote user ${userId} to ${newRole}.
  // Immediate impact: Promotion blocked - user is not an admin.
  // Next steps: Only admin users can perform promotions. Consider escalating if this was an authorized request.`,
  //         });
  //         logger.info(`✅ Slack notified of unauthorized promotion attempt: ${requestingUser.email}`);
  //       } catch (err) {
  //         logger.error(`❌ Slack notification failed: ${err}`);
  //       }
  //     });

  //     throw new ErrorHandler("Only admin users can promote users to admin roles", 403);
  //   }

  const user = await User.findByPk(userId);

  if (!user) {
    logger.warn(`Promotion failed: User not found for ID: ${userId}`);
    throw new ErrorHandler("User not found", 404);
  }

  if (user.role === newRole) {
    logger.info(`Promotion skipped: User ${userId} already has role ${newRole}`);
    return user; // No change needed
  }

  // Update user role
  user.role = newRole as any;
  await user.save();

  // Send Slack notification
  setImmediate(async () => {
    try {
      await SlackService.notify({
        node: SlackNode.MESSAGING,
        provider: SlackProvider.SYSTEM,
        severity: SlackSeverity.INFO,
        trigger: "User promotion to admin",
        type: SlackEventType.USER_REGISTRATION,
        channel: SlackChannel.TOWN_CRIER,
        teamMentions: "CSM",
        body: `${user.firstName} ${user.lastName} (Email: ${user.email}) has been promoted to ${newRole}.\nImmediate impact: User role updated and stakeholders notified.`,
      });
      logger.info(`[PromoteUserToAdmin] Slack notification sent for user ${user.id}`);
    } catch (error) {
      logger.error(`[PromoteUserToAdmin] Failed to send Slack notification: ${error}`);
    }
  });

  logger.info(`User ${user.firstName} ${user.lastName} (${user.email}) successfully promoted to ${user.role}`);
  return user;
};

// Logout User
export const logoutUser = async (token: string, userId: string) => {
  logger.info(`Processing logout request for user ID: ${userId}`);

  try {
    // Decode the token to get expiration time
    const decoded = jwt.decode(token) as any;
    const expiresAt = new Date(decoded.exp * 1000); // Convert from seconds to milliseconds

    // Add token to blacklist database
    await BlacklistedToken.create({
      token,
      expiresAt,
    });

    logger.info(`Token blacklisted for user: ${userId}`);
  } catch (error) {
    logger.error(`Failed to blacklist token for user ${userId}: ${error}`);
    // Continue with logout even if blacklisting fails
  }

  logger.info(`Logout successful for user: ${userId}`);
  return { message: "Logout successful" };
};

// Get all users with role 'client'
export const getClients = async () => {
  logger.info(`Retrieving all clients from database`);

  const clients = await User.findAll({
    where: {
      role: 'client',
      isActive: true,
      isDeleted: false
    },
    attributes: {
      exclude: ['password', 'accessToken', 'adminPassword']
    },
    order: [['createdAt', 'DESC']]
  });

  logger.info(`Retrieved ${clients.length} clients from database`);
  return clients;
};

// Get all users with role 'assistant' (returned as PC - Placement Control)
export const getAssistants = async () => {
  logger.info(`Retrieving all assistants from database`);

  const assistants = await User.findAll({
    where: {
      role: 'assistant',
      isActive: true,
      isDeleted: false
    },
    attributes: {
      exclude: ['password', 'accessToken', 'adminPassword']
    },
    order: [['createdAt', 'DESC']]
  });

  // Transform the response to return 'PC' instead of 'assistant'
  const pcUsers = assistants.map(assistant => ({
    ...assistant.toJSON(),
    role: 'PC' // Change role from 'assistant' to 'PC'
  }));

  logger.info(`Retrieved ${pcUsers.length} assistants (returned as PC) from database`);
  return pcUsers;
};

// Get all users with selected staff roles
export const getUsersByRoles = async (roles: string[] = ['assistant', 'admin', 'coach', 'technology']) => {
  logger.info(`Retrieving all users with roles: ${roles.join(', ')}`);

  const users = await User.findAll({
    where: {
      role: roles,
      isActive: true,
      isDeleted: false
    },
    attributes: {
      exclude: ['password', 'accessToken', 'adminPassword']
    },
    order: [['createdAt', 'DESC']]
  });

  logger.info(`Retrieved ${users.length} users with staff roles from database`);
  return users;
};

// Get all users (for admin and assistant roles)
export const getAllUsers = async (query: {
  page?: number | string;
  limit?: number | string;
  active?: boolean | string;
  recycle?: boolean | string;
  q?: string;
  search?: string;
  userType?: string;
  role?: string;
  plan?: string;
  startDate?: string;
  endDate?: string;
  from?: string;
  to?: string;
} = {}) => {
  logger.info(`Retrieving all users from database with filters`);

  const parseOptionalBoolean = (value: unknown): boolean | undefined => {
    if (typeof value === "boolean") {
      return value;
    }
    if (typeof value !== "string") {
      return undefined;
    }
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") {
      return true;
    }
    if (normalized === "false") {
      return false;
    }
    return undefined;
  };

  const parseOptionalDate = (value: unknown, fieldName: string): Date | undefined => {
    if (typeof value !== "string" || value.trim().length === 0) {
      return undefined;
    }
    const parsedDate = new Date(value);
    if (Number.isNaN(parsedDate.getTime())) {
      throw new ErrorHandler(`Invalid ${fieldName}.`, 400);
    }
    return parsedDate;
  };

  // Parse query parameters (they come as strings from Express)
  const page = query.page ? parseInt(String(query.page), 10) : undefined;
  const limit = query.limit ? parseInt(String(query.limit), 10) : undefined;
  const active = parseOptionalBoolean(query.active);
  const recycle = parseOptionalBoolean(query.recycle);
  const q = typeof query.q === "string" ? query.q : query.search;
  const userType =
    typeof query.userType === "string" ? query.userType : query.role;
  const plan = typeof query.plan === "string" ? query.plan : undefined;
  const startDate = parseOptionalDate(query.startDate ?? query.from, "startDate");
  const endDate = parseOptionalDate(query.endDate ?? query.to, "endDate");

  if (startDate && endDate && startDate.getTime() > endDate.getTime()) {
    throw new ErrorHandler("startDate cannot be after endDate.", 400);
  }
  
  const where: any = {};
  
  // Recycle bin filter (show deleted users)
  if (recycle === true) {
    where.isDeleted = true;
    // Don't apply active filter when showing recycled users (deleted users are inactive)
  } else {
    where.isDeleted = false;
    // Active status filter (only for non-recycled users)
    if (typeof active === 'boolean') {
      where.isActive = active;
    } else {
      where.isActive = true;
    }
  }
  
  // Search filter
  if (q) {
    where[Op.or] = [
      { email: { [Op.iLike]: `%${q}%` } },
      { firstName: { [Op.iLike]: `%${q}%` } },
      { lastName: { [Op.iLike]: `%${q}%` } },
    ];
  }
  
  // User Type / Role filter
  if (userType) {
    where.role = userType;
  }
  
  // Plan filter
  if (plan) {
    where.planId = plan;
  }

  // Date range filter
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) {
      where.createdAt[Op.gte] = startDate;
    }
    if (endDate) {
      where.createdAt[Op.lte] = endDate;
    }
  }

  // Pagination handling
  const options: any = {
    where,
    attributes: {
      exclude: ['password', 'accessToken', 'adminPassword']
    },
    order: [['createdAt', 'DESC']]
  };
  
  if (limit && page) {
    options.limit = limit;
    options.offset = (page - 1) * limit;
  }

  const users = await User.findAll(options);

  logger.info(`Retrieved ${users.length} users from database`);
  return users;
};
