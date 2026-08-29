import { getServiceLogger } from "../utils/createLogger";
import { User } from "../models/v1/user.model";
import { Referrer } from "../models/v1/referrer.model";
import ErrorHandler from "../utils/errorHandler";
import { Op, fn, col } from "sequelize";
import bcrypt from "bcryptjs";
import { getCachedUser, setCachedUser } from "./cache/user.cache.service";
import { hopeUserExists, hopeUserIdExists } from "../utils/user-helper";
import { SlackService } from "./slack.service";
import { SlackChannel, SlackEventType, SlackNode, SlackProvider, SlackSeverity } from "../utils/enum";
import { getEnvironmentFromHost } from "../utils/slack-helpers";
import { validateSignInInput } from "../validators/input.validator";
import { signInCredentials } from "./signin.service";
import BlacklistedToken from "../models/v1/blacklistedToken.model";
import jwt from "jsonwebtoken";
import { Profile } from "../models/v1/profile.model";
import { Credentials } from "../models/v1/credentials.model";
import { Aggregator } from "../models/v1/aggregator.model";
import { Plan } from "../models/v1/plan.model";

const logger = getServiceLogger("user");

export const handleGetUserInfo = async (userId: string) => {
  if (!userId) {
    throw new ErrorHandler("Invalid user ID.", 400);
  }

  const user = await User.findByPk(userId, {
    include: [{ model: Plan, as: "activePlan" }],
  });

  if (!user) throw new ErrorHandler("No record of this account", 404);

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
  const validStaffRoles = ["coach", "admin", "assistant", "technology", "cse", "sales"];
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

// attributes: [
//           'id', 'planId', 'campaignEnd',
//           'weeklyMax', 'assurance', 'orderNumber', 'subDurationDays', 'capitalizedInflight',
//           'capitalizedFlight', 'capitalizedHold', 'throttleListing', 'aliasEmail', 'aliasPassword',
//           'externalPassword', 'assignedPcId', 'assignedPcName', 'pcEmail', 'lastApplication',
//           'firstApplication', 'firstApplicationAggregator', 'lastApplicationSource',
//           'doneCount', 'doneSource', 'batch', 'caft', 'isAdminTriggered'
//         ]

// Get all users with role 'client' - Enhanced with all required fields
export const getClients = async (query: {
  page?: number | string;
  limit?: number | string;
  status?: string;
  q?: string;
} = {}) => {
  logger.info(`Retrieving clients from database with filters`);

  // Parse query parameters
  const page = query.page ? parseInt(query.page as string, 10) : 1;
  const limit = query.limit ? parseInt(query.limit as string, 10) : 20;
  const status = query.status || 'active';
  const { q } = query;
  
  const where: any = {
    role: 'client'
  };
  
  // Status filter
  switch (status) {
    case 'active':
      where.isDeleted = false;
      where.isActive = true;
      break;
    case 'deleted':
      where.isDeleted = true;
      break;
    case 'all':
      // No filter - return all including active and deleted
      break;
    default:
      // Default to active
      where.isDeleted = false;
      where.isActive = true;
  }
  
  // Search filter
  if (q) {
    where[Op.or] = [
      { email: { [Op.iLike]: `%${q}%` } },
      { firstName: { [Op.iLike]: `%${q}%` } },
      { lastName: { [Op.iLike]: `%${q}%` } },
    ];
  }

  // Get total count
  const total = await User.count({ where });

  // Optimized query with all required joins
  const options: any = {
    where,
    attributes: {
      exclude: ['password', 'accessToken', 'adminPassword']
    },
    include: [
      {
        model: Profile,
        as: 'profile',
        required: false,
        attributes: [
          'id', 'planId'
        ]
      },
      {
        model: Credentials,
        foreignKey: 'clientId',
        required: true,
        attributes: [
          'id', 'SeekAnswerPriority'
        ]
      },
      {
        model: Aggregator,
        as: 'aggregators',
        required: false,
        attributes: ['name', 'isEnabled']
      },
      {
        model: Plan,
        as: 'activePlan',
        required: false,
        attributes: ['title', 'expiresAt', 'createdAt']
      }
    ],
    order: [['createdAt', 'DESC']],
    limit,
    offset: (page - 1) * limit
  };

  const clients = await User.findAll(options);

  // Transform and calculate all required fields
  const enhancedClients = clients.map(client => {
    const clientJson = client.toJSON();
    const profile = clientJson.profile || {};
    const credentials = clientJson.credentials || {};
    const aggregators = clientJson.aggregators || [];
    
    // Create aggregator status map
    const aggregatorStatus: Record<string, boolean> = {};
    aggregators.forEach((agg: any) => {
      const key = agg.name.toLowerCase().replace(/\s+/g, '');
      aggregatorStatus[key] = agg.isEnabled;
    });

    // Calculate subscription dates from plan
    const today = new Date();
    const activePlan = clientJson.activePlan;
    const planCreatedAt = activePlan?.createdAt ? new Date(activePlan.createdAt) : null;
    const planDurationDays = activePlan?.durationDays || 0;
    
    const subStartDate = planCreatedAt;
    const subEndDate = planCreatedAt && planDurationDays 
      ? new Date(planCreatedAt.getTime() + (planDurationDays * 24 * 60 * 60 * 1000)) 
      : null;
    
    // Calculate days remaining / expired
    let subToExpireDays = 0;
    let subExpired = false;
    let subDurationDays = planDurationDays;
    
    if (subEndDate) {
      const diffTime = subEndDate.getTime() - today.getTime();
      subToExpireDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      subExpired = subToExpireDays < 0;
      
      // Calculate remaining days passed
      if (subStartDate && subDurationDays) {
        const totalPassed = Math.ceil((today.getTime() - subStartDate.getTime()) / (1000 * 60 * 60 * 24));
        subDurationDays = Math.max(0, subDurationDays - totalPassed);
      }
    }

    // Capitalized status
    const capitalized = {
      inflight: !!profile.capitalizedInflight,
      flight: !!profile.capitalizedFlight,
      hold: !!profile.capitalizedHold
    };

    return {
      // All original user fields
      ...clientJson,
      
      // Additional required fields
      order: profile.orderNumber,
      returnCount: clientJson.returnCount || 0,
      subStartDate: profile.subStartDate,
      assurance: profile.assurance,
      weeklyMax: profile.weeklyMax,
      subDurationDays,
      subEndDate: profile.subEndDate,
      graceDuration: profile.graceDuration,
      campaignEnd: profile.campaignEnd,
      capitalized,
      subToExpireDays: Math.max(0, subToExpireDays),
      subExpired,
      isActiveTriggeredByAdmin: !!profile.isAdminTriggered,
      answerPriority: !!credentials.SeekAnswerPriority,
      
      // Aggregator statuses
      seekAggregator: !!aggregatorStatus['seek'],
      linkedinAggregator: !!aggregatorStatus['linkedin'],
      jobserveAggregator: !!aggregatorStatus['jobserve'],
      escapecityAggregator: !!aggregatorStatus['escapecity'],
      workforceaustraliaAggregator: !!aggregatorStatus['workforceaustralia'],
      indeedAggregator: !!aggregatorStatus['indeed'],
      monsterAggregator: !!aggregatorStatus['monster'],
      joraAggregator: !!aggregatorStatus['jora'],
      adzunaAggregator: !!aggregatorStatus['adzuna'],
      careeroneAggregator: !!aggregatorStatus['careerone'],
      reedAggregator: !!aggregatorStatus['reed'],
      adeccoAggregator: !!aggregatorStatus['adecco'],
      cvlibraryAggregator: !!aggregatorStatus['cvlibrary'],
      nhsjobsAggregator: !!aggregatorStatus['nhsjobs'],
      
      // Credential fields
      aliasEmail: profile.aliasEmail,
      aliasPassword: profile.aliasPassword,
      externalPassword: profile.externalPassword,
      
      // PC Assignment
      pcName: profile.assignedPcName,
      pcEmail: profile.pcEmail,
      
      // Application metrics
      lastApplication: profile.lastApplication,
      firstApplication: profile.firstApplication,
      firstApplicationAggregator: profile.firstApplicationAggregator,
      throttleListing: !!profile.throttleListing,
      lastApplicationSource: profile.lastApplicationSource,
      done: profile.doneCount || 0,
      doneSource: profile.doneSource,
      batch: profile.batch,
      caft: profile.caft
    };
  });

  logger.info(`Retrieved ${enhancedClients.length} of ${total} clients from database`);
  
  return {
    clients: enhancedClients,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  };
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
    if (userType === "ambassador") {
      where.isAmbassador = true;
    } else {
      where.role = userType;
    }
  }
  
  // Plan filter — selectedPlan stores the plan title (e.g. "Coral", "Gold")
  if (plan) {
    where.selectedPlan = { [Op.iLike]: plan };
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

  // Attach referral counts — Referrer.referrer stores the referring user's email
  const emails = users.map((u) => u.email).filter(Boolean);
  const referralCounts = emails.length
    ? await Referrer.findAll({
        where: { referrer: { [Op.in]: emails }, isDeleted: false },
        attributes: ["referrer", [fn("COUNT", col("id")), "count"]],
        group: ["referrer"],
        raw: true,
      })
    : [];
  const referralCountMap = new Map(
    referralCounts.map((r: any) => [r.referrer, parseInt(r.count, 10)]),
  );

  const usersWithReferrals = users.map((u) => ({
    ...u.toJSON(),
    referralsCount: referralCountMap.get(u.email) || 0,
  }));

  logger.info(`Retrieved ${users.length} users from database`);
  return usersWithReferrals;
};

// Get all clients — only full name and email (for dropdowns / selectors)
export const getClientNameList = async () => {
  logger.info("Retrieving client name list");

  const clients = await User.findAll({
    where: { role: "client", isActive: true, isDeleted: false },
    attributes: ["firstName", "lastName"],
    order: [
      ["firstName", "ASC"],
      ["lastName", "ASC"],
    ],
  });

  const result = clients.map((c) => ({
    fullName: `${c.firstName} ${c.lastName}`.trim(),
    email: c.email,
    label: `${c.firstName} ${c.lastName} (${c.email})`.trim(),
  }));

  logger.info(`Retrieved ${result.length} clients for name list`);
  return result;
};

// Update authenticated user profile
export const updateUserProfile = async (userId: string, updateData: {
  firstName?: string;
  middleName?: string;
  lastName?: string;
  phoneNumber?: string;
  password?: string;
  country?: string;
}) => {
  if (!userId) {
    throw new ErrorHandler("Invalid user ID.", 400);
  }

  const user = await User.findByPk(userId);
  if (!user) {
    throw new ErrorHandler("User not found.", 404);
  }

  const allowedFields = ['firstName', 'middleName', 'lastName', 'phoneNumber', 'country'];

  // Handle password separately
  if (updateData.password) {
    const { validatePasswordStrength } = await import("../validators/password.validator");
    const passwordError = validatePasswordStrength(updateData.password);
    if (passwordError) {
      throw new ErrorHandler(passwordError, 400);
    }
    user.password = await bcrypt.hash(updateData.password, 10);
  }

  // Update other fields
  for (const field of allowedFields) {
    if (updateData[field as keyof typeof updateData] !== undefined) {
      (user as any)[field] = updateData[field as keyof typeof updateData];
    }
  }

  await user.save();

  // Clear cached user data
  await setCachedUser(userId, null);

  logger.info(`User profile updated for user: ${user.firstName} ${user.lastName} (${user.email})`);

  return { user };
};
