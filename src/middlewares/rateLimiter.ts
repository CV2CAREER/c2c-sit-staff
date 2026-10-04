import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { Request, Response } from "express";

const handler = (message: string) => (_req: Request, res: Response) => {
  res.status(429).json({ success: false, message, statusCode: 429 });
};

/**
 * Brute-force protection for staff/admin login.
 * Key: IP + email so one account can't be hammered from an IP, and one IP can't
 * spray many accounts. Allows 10 attempts per 15 minutes.
 */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  keyGenerator: (req: Request) =>
    `${ipKeyGenerator(req.ip ?? "")}:${(req.body?.email ?? "").toLowerCase()}`,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: handler(
    "Too many login attempts. Please wait 15 minutes before trying again.",
  ),
});

/**
 * Protection for OTP send/verify and password-reset flows.
 * Allows 5 requests per hour per IP+email.
 */
export const sensitiveActionLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  keyGenerator: (req: Request) =>
    `${ipKeyGenerator(req.ip ?? "")}:${(req.body?.email ?? "").toLowerCase()}`,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: handler(
    "Too many attempts. Please wait before trying again.",
  ),
});
