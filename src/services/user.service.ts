import { getServiceLogger } from "../utils/createLogger";
import { User } from "../models/v1/user.model";
import ErrorHandler from "../utils/errorHandler";
import bcrypt from "bcryptjs";
import { getCachedUser, setCachedUser } from "./cache/user.cache.service";
import { hopeUserExists, hopeUserIdExists } from "../utils/user-helper";
import { validate as isUuid } from "uuid";
import { SlackService } from "./slack.service";
import { SlackChannel, SlackEventType, SlackNode, SlackProvider, SlackSeverity } from "../utils/enum";
import { getEnvironmentFromHost } from "../utils/slack-helpers";
import { validateSignInInput } from "../validators/input.validator";
import { signInCredentials } from "./signin.service";

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
  const validStaffRoles = ["coach", "admin", "assistant"];
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
          channel: SlackChannel.CRY_WOLF,
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
export const promoteUserToAdmin = async (userId: string, newRole: string, requestingUserId: string) => {
  logger.info(`Attempting to promote user ID: ${userId} to role: ${newRole}`);
  
  // Check if the requesting user is an admin
  const requestingUser = await User.findByPk(requestingUserId);
  if (!requestingUser) {
    logger.warn(`Promotion failed: Requesting user not found: ${requestingUserId}`);
    throw new ErrorHandler("Requesting user not found", 404);
  }

  if (requestingUser.role !== "admin") {
    logger.warn(`Promotion failed: User ${requestingUserId} (${requestingUser.email}) is not an admin`);
    
    // Send Slack notification for unauthorized promotion attempt
    setImmediate(async () => {
      try {
        await SlackService.notify({
          node: SlackNode.USER_MANAGEMENT,
          provider: SlackProvider.SYSTEM,
          severity: SlackSeverity.INFO,
          trigger: "Unauthorized promotion attempt",
          type: SlackEventType.USER_TRIGGERED,
          channel: SlackChannel.CRY_WOLF,
          body: `Unauthorized promotion attempt detected.
What happened: ${requestingUser.firstName} ${requestingUser.lastName} (${requestingUser.email}) attempted to promote user ${userId} to ${newRole}.
Immediate impact: Promotion blocked - user is not an admin.
Next steps: Only admin users can perform promotions. Consider escalating if this was an authorized request.`,
        });
        logger.info(`✅ Slack notified of unauthorized promotion attempt: ${requestingUser.email}`);
      } catch (err) {
        logger.error(`❌ Slack notification failed: ${err}`);
      }
    });

    throw new ErrorHandler("Only admin users can promote users to admin roles", 403);
  }

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
