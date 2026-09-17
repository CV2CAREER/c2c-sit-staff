import { NextFunction, Request, Response } from "express";
import catchAsyncError from "../utils/catchAsyncError";
import ErrorHandler from "../utils/errorHandler";
import { getConnectedRedis } from "../config/redis";
import { isRedisUsable } from "../utils/helpers";
import { ACCESS_TOKEN_COOKIE_NAME } from "../config/env";
import BlacklistedToken from "../models/v1/blacklistedToken.model";
import { getServiceLogger } from "../utils/createLogger";

const logger = getServiceLogger("checkBlacklistedToken");

export const checkBlacklistedTokens = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const redisClient = await getConnectedRedis();

    let token: string | undefined;

    // Try Authorization header first, then cookie, then query param (for SSE)
    const authHeader = req.headers.authorization;
    
    token = authHeader?.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : req.cookies[ACCESS_TOKEN_COOKIE_NAME]
        || (typeof req.query.token === 'string' ? req.query.token : undefined);

    if (token) {
      req.authToken = token;
    }

    // 3️⃣ Reject if no token found
    if (!token) {
      return next(
        new ErrorHandler("Unauthorized: Authentication required", 401),
      );
    }

    // 4️⃣ Check Redis blacklist (check all possible keys)
    const redisKeyAccess = `BLACKLIST:accessToken:${token}`;

    let isBlacklisted: string | null | undefined = null;

    if (isRedisUsable(redisClient)) {
      const [accessHit] = await Promise.all([redisClient?.get(redisKeyAccess)]);

      isBlacklisted = accessHit;
    }

    if (isBlacklisted) {
      return next(new ErrorHandler("Restricted: Token has been revoked", 401));
    }

    // 5️⃣ Fallback: Database blacklist check
    const isBlacklistedDB = await BlacklistedToken.findOne({
      where: { token },
    });

    if (isBlacklistedDB) {
      return next(new ErrorHandler("Restricted: Token has been revoked", 401));
    }

    next();
  },
);
