import { getServiceLogger } from "../utils/createLogger";
import { NextFunction, Request, Response } from "express";
import catchAsyncError from "../utils/catchAsyncError";
import ErrorHandler from "../utils/errorHandler";
import jwt from "jsonwebtoken";
import { SIGN_IN_ACCESS_SECRET_KEY } from "../config/env";
import { handleGetUserInfo } from "../services/user.service";
import { decryptObjectData } from "../utils/security";
import { JwtPayload } from "../types/token.types";

// Extend Request interface to include authToken
declare global {
  namespace Express {
    interface Request {
      authToken?: string;
    }
  }
}

const logger = getServiceLogger("authentication");

export const isUserAuthenticated = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const token = req.authToken;

    if (!token) {
      logger.warn(
        `🔒 Unauthorized request — no token provided: ${req.method} ${req.path}`,
      );
      return next(new ErrorHandler("You are not currently logged in", 401));
    }

    try {
      const decodeAccess = jwt.verify(
        token,
        SIGN_IN_ACCESS_SECRET_KEY as string,
      ) as JwtPayload;

      let userData: { id: string; role: string };
      let userId: string;

      // Handle both encrypted and direct token formats
      if (decodeAccess.data) {
        // Format: { data: encrypted_payload }
        const decrypted = decryptObjectData(decodeAccess.data);

        if (!decrypted) {
          logger.warn(
            `🔒 Failed to decrypt access token for: ${req.method} ${req.path}`,
          );
          return next(new ErrorHandler("Error decrypting access token", 401));
        }

        userData = decrypted;
        userId = userData.id;
      } else if ((decodeAccess as any).userId && (decodeAccess as any).role) {
        // Format: { userId, email, role, iat, exp }
        userData = {
          id: (decodeAccess as any).userId,
          role: (decodeAccess as any).role
        };
        userId = userData.id;
      } else {
        logger.warn(
          `🔒 Invalid token structure for: ${req.method} ${req.path}`,
        );
        return next(new ErrorHandler("Invalid token structure", 401));
      }

      logger.info(
        `🔐 Authenticating user: ${userId} (${userData.role}) → ${req.method} ${req.path}`,
      );

      const { user } = await handleGetUserInfo(userId);

      req.user = user;

      logger.info(`✅ Authenticated: ${user.email} (${user.role})`);

      return next();
    } catch (error) {
      logger.error(
        `🔒 Token verification failed for: ${req.method} ${req.path} - ${error}`,
      );
      return next(new ErrorHandler("Token verification failed", 401));
    }
  },
);
