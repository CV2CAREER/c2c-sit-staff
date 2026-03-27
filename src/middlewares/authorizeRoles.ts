import { getServiceLogger } from "../utils/createLogger";
import { NextFunction, Request, Response } from "express";
import catchAsyncError from "../utils/catchAsyncError";
import ErrorHandler from "../utils/errorHandler";

const logger = getServiceLogger("authorization");

/**
 * Middleware to authorize users based on their roles
 * @param allowedRoles - Array of roles that are allowed to access the route
 */
export const authorizeRoles = (...allowedRoles: string[]) => {
  return catchAsyncError(
    async (req: Request, res: Response, next: NextFunction) => {
      const user = req.user;

      if (!user) {
        logger.warn(`🔒 Authorization failed: No user found in request`);
        return next(new ErrorHandler("Authentication required", 401));
      }

      if (!allowedRoles.includes(user.role)) {
        logger.warn(
          `🔒 Authorization failed: User ${user.email} (${user.role}) attempted to access restricted route ${req.method} ${req.path}. Allowed roles: ${allowedRoles.join(", ")}`
        );
        return next(
          new ErrorHandler(
            `Access denied. Required role(s): ${allowedRoles.join(", ")}`,
            403
          )
        );
      }

      logger.info(
        `✅ Authorization successful: User ${user.email} (${user.role}) authorized for ${req.method} ${req.path}`
      );

      next();
    }
  );
};